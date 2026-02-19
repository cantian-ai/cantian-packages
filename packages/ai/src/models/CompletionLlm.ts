import { sse } from 'cantian-request';
import { JSONSchema } from 'json-schema-to-ts';
import { saveModelUsage } from '../tokenUsage.js';
import { InputItem, MessageChunk, ModelCallingChunk, ModelChunk, TokenChunk, ToolCallChunk, UsageChunk } from '../type.js';
import { filterMessage } from '../util.js';
import { BaseLlm, Options } from './BaseLlm.js';

type CompletionModelOptions = {
  temperature?: number;
  textSchema?: JSONSchema;
  extRequestParams?: any;
} & Options;

const COST_DOLLAR_PER_M = 0.6;

type ToolCallAcc = {
  id?: string;
  name?: string;
  arguments?: string;
};

export class CompletionLlm extends BaseLlm<CompletionModelOptions> {
  async *stream(messages: InputItem[], options?: CompletionModelOptions): AsyncGenerator<ModelChunk> {
    const [, release] = await this.semaphore.acquire();
    const startedAt = Date.now();

    try {
      const [url, init] = this.buildCompletionRequestParams(messages, options);
      const response = sse(url, init);

      const usageContent: Partial<UsageChunk> = {
        type: 'USAGE',
        model: this.model,
        input: JSON.parse(init.body as string),
      };

      const toolCallMap = new Map<number, ToolCallAcc>();

      let assistantText = '';
      let assistantRole: 'assistant' = 'assistant';

      yield { type: 'MODEL_CALLING', url, init } satisfies ModelCallingChunk;

      for await (const chunk of response) {
        if (!chunk) continue;
        if (chunk.data === '[DONE]') break;

        const data = JSON.parse(chunk.data);
        const choice = data.choices?.[0];
        if (!choice) continue;

        const delta = choice.delta ?? {};

        /** ---------- role ---------- */
        if (delta.role) {
          assistantRole = delta.role;
        }

        /** ---------- text token ---------- */
        if (typeof delta.content === 'string' && delta.content.length) {
          if (usageContent.firstTokenCostMs === undefined) {
            usageContent.firstTokenCostMs = Date.now() - startedAt;
          }

          assistantText += delta.content;

          yield {
            type: 'TOKEN',
            delta: delta.content,
          } satisfies TokenChunk;
        }

        /** ---------- tool_calls delta ---------- */
        if (Array.isArray(delta.tool_calls)) {
          for (const call of delta.tool_calls) {
            const index = call.index;
            const acc = toolCallMap.get(index) ?? { arguments: '' };

            if (call.id) acc.id = call.id;
            if (call.function?.name) acc.name = call.function.name;
            if (call.function?.arguments) {
              acc.arguments = (acc.arguments ?? '') + call.function.arguments;
            }

            toolCallMap.set(index, acc);
          }
        }

        /** ---------- finish ---------- */
        if (choice.finish_reason === 'tool_calls') {
          const sortedCalls = [...toolCallMap.entries()].sort(([a], [b]) => a - b).map(([, acc]) => acc);

          const outputs: any[] = [];

          for (const acc of sortedCalls) {
            const toolChunk: ToolCallChunk = {
              type: 'TOOL_CALL',
              callId: acc.id!,
              name: acc.name!,
              arguments: acc.arguments ?? '',
            };

            yield toolChunk;

            outputs.push({
              type: 'function_call',
              call_id: acc.id!,
              name: acc.name!,
              arguments: acc.arguments ?? '',
            });
          }

          usageContent.output = outputs;
        }

        if (choice.finish_reason === 'stop') {
          yield {
            type: 'MESSAGE',
            role: assistantRole,
            content: assistantText,
          } satisfies MessageChunk;

          usageContent.output = [
            {
              type: 'message',
              role: assistantRole,
              content: assistantText,
            },
          ];
        }

        /** ---------- usage ---------- */
        usageContent.totalTokens = data.usage?.total_tokens || 0;
        usageContent.inputUsage = {
          inputTokens: data.usage?.prompt_tokens || 0,
          cachedTokens: data.usage?.prompt_tokens_details?.cached_tokens || 0,
        };
        usageContent.outputUsage = {
          outputTokens: data.usage?.completion_tokens,
          reasoningTokens: 0,
        };
      }

      usageContent.totalCostMs = Date.now() - startedAt;
      usageContent.estimatedCost = (COST_DOLLAR_PER_M * (usageContent.totalTokens || 0)) / 1_000_000;

      if (options?.logMeta) {
        saveModelUsage(usageContent as UsageChunk, options.logMeta);
      }

      yield usageContent as UsageChunk;
    } finally {
      release();
    }
  }

  protected buildCompletionRequestParams(messages: InputItem[], options?: CompletionModelOptions): [string, RequestInit] {
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
          stream: true,
          temperature: options?.temperature,
          messages: messages.map(this.parseInputMessage),
          tools: tools
            ? Object.values(tools).map((tool) => ({
                type: 'function',
                function: {
                  name: tool.name,
                  description: tool.description,
                  parameters: tool.parameters,
                },
              }))
            : undefined,
          response_format: options?.textSchema && {
            type: 'json_schema',
            json_schema: {
              name: 'result',
              schema: options.textSchema,
            },
          },
          ...options?.extRequestParams,
        }),
      },
    ];
  }

  parseInputMessage = (message: InputItem) => {
    if ('type' in message) {
      switch (message.type) {
        case 'MESSAGE':
          return { role: message.role, content: message.content };

        case 'TOOL_CALL':
          return {
            role: 'assistant',
            tool_calls: [
              {
                id: message.callId,
                type: 'function',
                function: {
                  name: message.name,
                  arguments: message.arguments,
                },
              },
            ],
          };

        case 'TOOL_CALL_OUTPUT':
          return {
            role: 'tool',
            tool_call_id: message.callId,
            content: typeof message.result === 'string' ? message.result : JSON.stringify(message.result),
          };

        default:
          throw new Error(`Unexpected message type: ${message.type}`);
      }
    }
    return message;
  };
}
