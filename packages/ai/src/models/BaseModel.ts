import { Semaphore } from 'async-mutex';
import { saveAgentUsage } from '../tokenUsage.js';
import {
  AgentChunk,
  AgenticToolToken,
  AgentUsageChunk,
  InputItem,
  ModelChunk,
  Tool,
  ToolCallChunk,
  ToolCallingChunk,
  ToolCallOutputChunk,
  UsageChunk,
} from '../type.js';
import { executeTool, isAsyncGenerator } from '../util.js';

export type Options = {
  tools?: Record<string, Tool>;
  signal?: AbortSignal;
  finalRound?: boolean;
  logMeta?: any; // Enable trace if truthy
};

const DEFAULT_MAX_ROUNDS = 10;

export class BaseModel<T extends Options = Options> {
  public semaphore: Semaphore;

  constructor(public url: string, public apiKey: string, public model: string) {
    this.semaphore = new Semaphore(10);
  }

  async *stream(messages: InputItem[], options?: T): AsyncGenerator<ModelChunk> {
    throw new Error('Method not implemented.');
  }

  async invoke(messages: InputItem[], options?: T): Promise<{ message: string; usage?: UsageChunk }> {
    throw new Error('Method not implemented.');
  }

  async *agenticStream(
    messages: any[],
    modelOptions: Omit<T, 'signal' | 'logMeta'>,
    options?: { signal?: AbortSignal; maxRounds?: number; context?: any; logMeta?: any },
  ): AsyncGenerator<AgentChunk> {
    const input: InputItem[] = [...messages];
    let roundIndex = 0;
    let toolCalls: ToolCallChunk[];
    const maxRounds = options?.maxRounds || DEFAULT_MAX_ROUNDS;
    const agentUsage = {
      type: 'AGENT_USAGE',
      model: this.model,
      totalTokens: 0,
      inputUsage: {
        inputTokens: 0,
        cachedTokens: 0,
      },
      outputUsage: {
        outputTokens: 0,
        reasoningTokens: 0,
      },
      firstTokenCostMs: 0,
      totalCostMs: 0,
      estimatedCost: 0,
      rounds: [],
    } as AgentUsageChunk satisfies AgentUsageChunk;
    const startedTimestamp = Date.now();
    do {
      const response = this.stream(input, {
        ...(modelOptions as T),
        finalRound: roundIndex === maxRounds - 1,
        signal: options?.signal,
      });
      toolCalls = [];
      for await (const chunk of response) {
        switch (chunk.type) {
          case 'TOKEN':
          case 'MESSAGE':
          case 'MODEL_CALLING':
            yield chunk;
            break;
          case 'USAGE':
            agentUsage.totalTokens += chunk.totalTokens || 0;
            agentUsage.inputUsage.inputTokens += chunk.inputUsage.inputTokens || 0;
            agentUsage.inputUsage.cachedTokens += chunk.inputUsage.cachedTokens || 0;
            agentUsage.outputUsage.outputTokens += chunk.outputUsage.outputTokens || 0;
            agentUsage.outputUsage.reasoningTokens += chunk.outputUsage.reasoningTokens || 0;
            agentUsage.firstTokenCostMs = agentUsage.firstTokenCostMs || chunk.firstTokenCostMs;
            agentUsage.estimatedCost += chunk.estimatedCost;
            agentUsage.rounds.push({ input: chunk.input, output: chunk.output });
            yield chunk;
            break;
          case 'TOOL_CALL':
            toolCalls.push(chunk);
            input.push(chunk);
            yield chunk;
            break;
          default:
            break;
        }
      }
      let hasStreaming = false;
      if (toolCalls.length) {
        for (const toolCall of toolCalls) {
          yield { ...toolCall, type: 'TOOL_CALLING' } satisfies ToolCallingChunk;
          const { error, result, aiText } = await executeTool(toolCall, modelOptions!.tools!, options?.context);
          if (isAsyncGenerator(result)) {
            for await (const chunk of result) {
              yield { type: 'AGENTIC_TOOL_TOKEN', data: chunk } satisfies AgenticToolToken;
            }
            hasStreaming = true;
          } else {
            const toolCallOutputChunk: ToolCallOutputChunk = {
              type: 'TOOL_CALL_OUTPUT',
              name: toolCall.name,
              callId: toolCall.callId,
              error,
              result: result,
              aiText,
            };
            input.push(toolCallOutputChunk);
            yield toolCallOutputChunk;
          }
        }
      }
      roundIndex++;

      // streaming的时候会正常推AI token给客户端展示，不应该再把结果返回给agent，会导致消息错乱
      if (hasStreaming) {
        break;
      }
    } while (toolCalls.length && roundIndex < maxRounds && !options?.signal?.aborted);
    agentUsage.totalCostMs = Date.now() - startedTimestamp;
    if (options?.logMeta) {
      saveAgentUsage(agentUsage, options.logMeta);
    }
    yield agentUsage;
  }
}
