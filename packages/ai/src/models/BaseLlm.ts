import { Semaphore } from 'async-mutex';
import { randomUUID } from 'node:crypto';
import { saveAgentUsage } from '../tokenUsage.js';
import {
  AgentChunk,
  AgenticToolToken,
  AgentUsageChunk,
  InputItem,
  MessageChunk,
  ModelChunk,
  Tool,
  ToolCallChunk,
  ToolCallingChunk,
  ToolCallOutputChunk,
  UsageChunk,
} from '../type.js';
import { executeTool } from '../util.js';

export type Options = {
  tools?: Record<string, Tool>;
  signal?: AbortSignal;
  finalRound?: boolean;
  logMeta?: any; // Enable trace if truthy
  extRequestParams?: any;
};

type AgenticStreamOptions = {
  signal?: AbortSignal;
  maxRounds?: number;
  context?: any;
  logMeta?: any;
  tokenUsageId?: string;
};

const DEFAULT_MAX_ROUNDS = 10;

export class BaseLlm<T extends Options = Options> {
  public semaphore: Semaphore;

  constructor(
    public url: string,
    public apiKey: string,
    public model: string,
    private readonly defaultModelOptions?: Partial<T>,
  ) {
    this.semaphore = new Semaphore(10);
  }

  protected withDefaultModelOptions(options?: Partial<T>) {
    return this.mergeOptions(this.defaultModelOptions, options) as T;
  }

  async *stream(messages: InputItem[], options?: T): AsyncGenerator<ModelChunk> {
    throw new Error('Method not implemented.');
  }

  async invoke(input: MessageChunk[], options?: T) {
    let message = '';
    let usage: UsageChunk | undefined;
    let toolCall: ToolCallChunk | undefined;
    for await (const chunk of this.stream(input, options)) {
      switch (chunk.type) {
        case 'MESSAGE':
          message += chunk.content;
          break;
        case 'USAGE':
          usage = chunk;
          break;
        case 'TOOL_CALL':
          toolCall = chunk;
          break;
      }
    }
    return { toolCall, message, usage };
  }

  async *agenticStream(
    messages: any[],
    modelOptions: Omit<T, 'signal' | 'logMeta'>,
    options?: AgenticStreamOptions,
  ): AsyncGenerator<AgentChunk> {
    const input: InputItem[] = [...messages];
    let roundIndex = 0;
    let toolCalls: ToolCallChunk[];
    const maxRounds = options?.maxRounds || DEFAULT_MAX_ROUNDS;
    const tokenUsageId = options?.tokenUsageId || randomUUID();
    const agentUsage = {
      type: 'AGENT_USAGE',
      tokenUsageId,
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
      const mergedModelOptions = this.withDefaultModelOptions(modelOptions as T);
      const response = this.stream(input, {
        ...mergedModelOptions,
        finalRound: roundIndex === maxRounds - 1,
        signal: options?.signal,
      });
      toolCalls = [];
      for await (const chunk of response) {
        switch (chunk.type) {
          case 'TOKEN':
          case 'MESSAGE':
            yield chunk;
            break;
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
      if (toolCalls.length) {
        for (const toolCall of toolCalls) {
          yield { ...toolCall, type: 'TOOL_CALLING' } satisfies ToolCallingChunk;
          const it = executeTool(toolCall, mergedModelOptions.tools!, options?.context);
          let result: {
            error?: any;
            result?: any;
            aiText?: string;
          };
          while (true) {
            const { value, done } = await it.next();
            if (done) {
              result = value;
              break;
            }
            yield { type: 'AGENTIC_TOOL_TOKEN', data: value } satisfies AgenticToolToken;
          }
          const toolCallOutputChunk: ToolCallOutputChunk = {
            type: 'TOOL_CALL_OUTPUT',
            name: toolCall.name,
            callId: toolCall.callId,
            error: result.error,
            result: result.result,
            aiText: result.aiText,
          };
          input.push(toolCallOutputChunk);
          yield toolCallOutputChunk;
        }
      }
      roundIndex++;
    } while (toolCalls.length && roundIndex < maxRounds && !options?.signal?.aborted);
    agentUsage.totalCostMs = Date.now() - startedTimestamp;
    if (options?.logMeta) {
      saveAgentUsage(agentUsage, options.logMeta, this.url);
    }
    yield agentUsage;
  }

  private mergeOptions(base?: any, override?: any) {
    if (base === undefined) return override;
    if (override === undefined) return base;
    if (Array.isArray(base) || Array.isArray(override)) return override;
    if (!this.isPlainObject(base) || !this.isPlainObject(override)) return override;

    const merged: Record<string, any> = { ...base };
    for (const [key, value] of Object.entries(override)) {
      if (value === undefined) continue;
      merged[key] = this.mergeOptions(merged[key], value);
    }
    return merged;
  }

  private isPlainObject(value: unknown): value is Record<string, any> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
