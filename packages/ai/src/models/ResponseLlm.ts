import { sse } from 'cantian-request';
import type { RequestObserver } from 'cantian-request';
import { extractProviderError } from 'cantian-request/provider-error';
import { startModelCall } from '../monitor/call.js';
import { JSONSchema } from 'json-schema-to-ts';
import { saveModelUsage } from '../tokenUsage.js';
import { InputItem, MessageChunk, ModelCallingChunk, ModelChunk, TokenChunk, ToolCallChunk, UsageChunk } from '../type.js';
import { filterMessage, toolOutputToAiText } from '../util.js';
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
    options = this.withDefaultModelOptions(options);
    const [, release] = await this.semaphore.acquire();
    let call: ReturnType<typeof startModelCall> | undefined;
    let transportFailed = false;
    let sawCompletion = false;
    try {
      const [url, init] = this.buildResponseRequestParams(messages, options);
      const startedAt = Date.now();
      const requestBody = JSON.parse(init.body as string);
      call = startModelCall(options?.monitor, {
        endpoint: url, model: typeof requestBody.model === 'string' ? requestBody.model : 'unknown', method: 'POST',
        context: { scenario: options?.monitorContext?.scenario ?? 'unknown', traceId: options?.monitorContext?.traceId },
        timeoutMs: options?.idleTimeoutMs ?? 45000, observationLayer: 'sdk',
      });
      const observer: RequestObserver = (event) => {
        if (event.type === 'response') call?.response({ httpStatus: event.status, providerRequestId: event.requestId });
        else if (event.type === 'content') call?.content();
        else if (event.type === 'error') {
          transportFailed = true;
          if (event.category === 'cancelled') call?.cancel();
          else call?.fail({ code: event.code }, { category: event.category, phase: event.phase,
            httpStatus: event.status, providerRequestId: event.requestId,
            providerCode: event.providerCode, providerMessage: event.providerMessage });
        }
      };
      const response = sse(url, init, { idleTimeoutMs: options?.idleTimeoutMs ?? 45000, observer });
      let usageContent: Partial<UsageChunk> = {
        type: 'USAGE',
        model: this.model,
        input: requestBody,
      };
      yield { type: 'MODEL_CALLING', url, init } satisfies ModelCallingChunk;
      for await (const chunk of response) {
        if (chunk) {
          if (chunk.data === '[DONE]') {
            break;
          }

          let data: any;
          try { data = JSON.parse(chunk.data); }
          catch (error) { call.fail(error, { category: 'protocol', phase: 'parse' }); throw error; }
          if (chunk.event === 'error' || chunk.event === 'response.failed' || chunk.event === 'response.incomplete' || data?.error) {
            const requestId = data?.request_id ?? data?.response?.request_id;
            if (typeof requestId === 'string') call.response({ providerRequestId: requestId });
            call.fail(undefined, { category: 'protocol', phase: 'parse',
              ...(Buffer.byteLength(chunk.data) <= 8192 ? extractProviderError(data?.response?.error ? data.response : data) : {}) });
          }
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
              sawCompletion = true;
              const usage = data.response.usage;
              usageContent.totalTokens = usage.total_tokens;
              usageContent.inputUsage = {
                inputTokens: usage.input_tokens,
                cachedTokens: usage.input_tokens_details?.cached_tokens,
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
      if (options?.signal?.aborted) call.cancel();
      else if (!sawCompletion) call.fail(undefined, { category: 'protocol', phase: 'read' });
      else call.succeed();
      usageContent.totalCostMs = Date.now() - startedAt;
      usageContent.estimatedCost = (COST_DOLLAR_PER_M * (usageContent.totalTokens || 0)) / 1000000;
      if (options?.logMeta) {
        saveModelUsage(usageContent as UsageChunk, options.logMeta, url);
      }
      yield usageContent as UsageChunk;
    } catch (error) {
      if (options?.signal?.aborted && !transportFailed) call?.cancel();
      else call?.fail(error, { category: 'client', phase: 'parse' });
      throw error;
    } finally {
      call?.cancel();
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
          ...options?.extRequestParams,
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
          return {
            type: 'function_call_output',
            call_id: message.callId,
            output: toolOutputToAiText(message.error ?? message.aiText ?? message.result),
          };
        default:
          throw new Error(`Unexpected message type: ${message.type}`);
      }
    }
    return message;
  };
}
