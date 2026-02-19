import { Semaphore } from 'async-mutex';
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
};

const DEFAULT_MAX_ROUNDS = 10;

export class BaseLlm<T extends Options = Options> {
  public semaphore: Semaphore;

  constructor(public url: string, public apiKey: string, public model: string) {
    this.semaphore = new Semaphore(10);
  }

  async *stream(messages: InputItem[], options?: T): AsyncGenerator<ModelChunk> {
    throw new Error('Method not implemented.');
  }

  // 实际场景中不需要考虑带上tool调用的情况！
  async invoke(input: MessageChunk[], options?: T) {
    let message = '';
    let usage: UsageChunk | undefined;
    for await (const chunk of this.stream(input, options)) {
      switch (chunk.type) {
        case 'MESSAGE':
          message += chunk.content;
          break;
        case 'USAGE':
          usage = chunk;
          break;
      }
    }
    return { message, usage };
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
      if (toolCalls.length) {
        for (const toolCall of toolCalls) {
          yield { ...toolCall, type: 'TOOL_CALLING' } satisfies ToolCallingChunk;
          const it = executeTool(toolCall, modelOptions!.tools!, options?.context);
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
      saveAgentUsage(agentUsage, options.logMeta);
    }
    yield agentUsage;
  }
}
