import { sse } from 'cantian-request';
import { JSONSchema } from 'json-schema-to-ts';
import { saveModelUsage } from '../tokenUsage.js';
import { InputItem, MessageChunk, ModelCallingChunk, ModelChunk, TokenChunk, ToolCallChunk, UsageChunk } from '../type.js';
import { filterMessage } from '../util.js';
import { BaseLlm, Options } from './BaseLlm.js';

type DeepseekModelOptions = {
  thinking?: { type: 'enabled' | 'disabled' | 'auto' };
  reasoning?: {
    effort: 'minimal' | 'low' | 'medium' | 'high';
  };
  temperature?: number;
  textSchema?: JSONSchema;
} & Options;

const COST_DOLLAR_PER_M = 0.6;

export class ResponseLlm extends BaseLlm<DeepseekModelOptions> {
  async *stream(messages: InputItem[], options?: DeepseekModelOptions): AsyncGenerator<ModelChunk> {
    const [, release] = await this.semaphore.acquire();
    try {
      const [url, init] = this.buildResponseRequestParams(messages, options);
      const startedAt = Date.now();
      const response = sse(url, init);
      let usageContent: Partial<UsageChunk> = { type: 'USAGE', model: this.model, input: JSON.parse(init.body as string) };
      yield { type: 'MODEL_CALLING', url, init } satisfies ModelCallingChunk;
      for await (const chunk of response) {
        if (chunk) {
          if (chunk.data === '[DONE]') {
            break;
          }

          const data = JSON.parse(chunk.data);
          switch (chunk.event) {
            case 'response.output_text.delta':
              if (usageContent.firstTokenCostMs === undefined) {
                usageContent.firstTokenCostMs = Date.now() - startedAt;
              }
              yield { type: 'TOKEN', delta: data.delta } satisfies TokenChunk;
              break;
            case 'response.output_item.done':
              const itemType = data.item.type;
              if (itemType === 'message') {
                if (data.item.content[0]) {
                  yield {
                    type: 'MESSAGE',
                    role: data.item.role,
                    content: data.item.content[0].text,
                  } satisfies MessageChunk;
                }
              } else if (itemType === 'function_call') {
                yield {
                  type: 'TOOL_CALL',
                  callId: data.item.call_id,
                  arguments: data.item.arguments,
                  name: data.item.name,
                } satisfies ToolCallChunk;
              }
              break;
            case 'response.completed':
              const usage = data.response.usage;
              usageContent.totalTokens = usage.total_tokens;
              usageContent.inputUsage = {
                inputTokens: usage.input_tokens,
                cachedTokens: usage.input_tokens_details.cached_tokens,
              };
              usageContent.outputUsage = {
                outputTokens: usage.output_tokens,
                reasoningTokens: usage.output_tokens_details.reasoning_tokens,
              };
              usageContent.output = data.response.output;
              break;
            default:
              break;
          }
        }
      }
      usageContent.totalCostMs = Date.now() - startedAt;
      usageContent.estimatedCost = (COST_DOLLAR_PER_M * (usageContent.totalTokens || 0)) / 1000000;
      if (options?.logMeta) {
        saveModelUsage(usageContent as UsageChunk, options.logMeta);
      }
      yield usageContent as UsageChunk;
    } finally {
      release();
    }
  }

  protected buildResponseRequestParams(messages: InputItem[], options?: DeepseekModelOptions) {
    let tools = options?.tools;
    if (!tools || !Object.keys(tools).length || options?.finalRound) {
      tools = undefined;
    }
    messages = messages.filter(filterMessage);
    return [
      this.url,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: options?.signal,
        body: JSON.stringify({
          model: this.model,
          input: messages.map(this.parseInputMessage),
          stream: true,
          thinking: options?.thinking,
          reasoning: options?.reasoning,
          temperature: options?.temperature,
          tools: tools
            ? Object.values(tools).map((tool) => ({
                type: 'function',
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters,
              }))
            : undefined,
          text: options?.textSchema && {
            format: {
              type: 'json_schema',
              name: 'result',
              schema: options.textSchema,
            },
          },
        }),
      },
    ] as [string, RequestInit];
  }

  parseInputMessage = (message: InputItem) => {
    if ('type' in message) {
      switch (message.type) {
        case 'MESSAGE':
          return { role: message.role, content: message.content };
        case 'TOOL_CALL':
          return {
            type: 'function_call',
            call_id: message.callId,
            arguments: message.arguments,
            name: message.name,
          };
        case 'TOOL_CALL_OUTPUT':
          return this.buildToolCallMessage(message.callId, message.error || message.aiText || message.result);
        default:
          throw new Error(`Unexpected message type: ${message.type}`);
      }
    }
    return message;
  };

  buildToolCallMessage = (callId: string, output: any) => {
    if (typeof output !== 'string' && !(output instanceof String)) {
      if (output instanceof Error) {
        output = `Error: ${output.message}`;
      } else {
        output = JSON.stringify(output);
      }
    }
    return { type: 'function_call_output', call_id: callId, output };
  };
}
