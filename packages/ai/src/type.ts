import { ValidateFunction } from 'ajv';
import { JSONSchema } from 'json-schema-to-ts';

export type Role = 'user' | 'assistant' | 'system' | 'developer';

export type MessageChunk = {
  type?: 'MESSAGE';
  role: Role;
  content: string;
};
export type ToolCallChunk = {
  type: 'TOOL_CALL';
  name: string;
  arguments: string;
  callId: string;
};
export type ToolCallOutputChunk = {
  type: 'TOOL_CALL_OUTPUT';
  callId: string;
  name: string;
  result?: any;
  aiText?: string;
  error?: any;
};
export type InputItem = MessageChunk | ToolCallChunk | ToolCallOutputChunk;

// chunk类型：发送大模型请求
export type ModelCallingChunk = {
  type: 'MODEL_CALLING';
  url: string;
  init: any;
};

// chunk类型：agent开始请求tool
export type ToolCallingChunk = {
  type: 'TOOL_CALLING';
  name: string;
  arguments: string;
  callId: string;
};

// chunk类型：收到一段文本token
export type TokenChunk = {
  type: 'TOKEN';
  delta: string;
};

export type AgenticToolToken = {
  type: 'AGENTIC_TOOL_TOKEN';
  data: any;
};

// chunk类型：收到usage数据，可用来识别大模型调用结束
export type UsageChunk = {
  type: 'USAGE';
  model: string;
  totalTokens: number;
  inputUsage: {
    inputTokens: number;
    cachedTokens: number;
  };
  outputUsage: {
    outputTokens: number;
    reasoningTokens: number;
  };
  firstTokenCostMs: number;
  totalCostMs: number;
  estimatedCost: number;
  input: any;
  output: any;
};

// chunk类型：Agent的usage
export type AgentUsageChunk = {
  type: 'AGENT_USAGE';
  totalTokens: number;
  model: string;
  inputUsage: {
    inputTokens: number;
    cachedTokens: number;
  };
  outputUsage: {
    outputTokens: number;
    reasoningTokens: number;
  };
  firstTokenCostMs: number;
  totalCostMs: number;
  estimatedCost: number;
  rounds: { input: any; output: any }[];
};

export type Tool<Context = any, Result = any> = {
  name: string;
  description?: string;
  parameters: JSONSchema;
  handler: (args, context: Context) => Result | Promise<Result> | AsyncGenerator<AgenticToolToken>;
  validate?: ValidateFunction;
  toAiText?: (result: any, context: Context, args) => string | Promise<string>;
};

export type ModelChunk = ModelCallingChunk | TokenChunk | MessageChunk | ToolCallChunk | UsageChunk;
export type AgentChunk = ModelChunk | AgenticToolToken | ToolCallingChunk | ToolCallOutputChunk | AgentUsageChunk;

export {};
