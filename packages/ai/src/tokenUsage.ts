import { mongoClient } from 'cantian-mongodb';
import { AgentUsageChunk, UsageChunk } from './type.js';

type TokenUsage = {
  model: string;
  totalTokens: number;
  totalCostMs: number;
  inputUsage: {
    inputTokens: number;
    cachedTokens: number;
  };
  outputUsage: {
    outputTokens: number;
    reasoningTokens: number;
  };
  rounds: {
    input: any;
    output: any;
  }[];
  estimatedCost: number;
  createdAt: string;
  updatedAt: string;
};

const db = mongoClient.db('agent-service');
const collection = db.collection<TokenUsage>('tokenUsages');

export const saveModelUsage = async (usageChunk: UsageChunk, meta: any) => {
  const now = new Date().toISOString();
  const tokenUsage: TokenUsage = {
    ...meta,
    model: usageChunk.model,
    totalTokens: usageChunk.totalTokens,
    totalCostMs: usageChunk.totalCostMs,
    rounds: [{ input: usageChunk.input, output: usageChunk.output }],
    estimatedCost: usageChunk.estimatedCost,
    inputUsage: usageChunk.inputUsage,
    outputUsage: usageChunk.outputUsage,
    createdAt: now,
    updatedAt: now,
  };
  await collection.insertOne(tokenUsage);
};

export const saveAgentUsage = async (agentUsageChunk: AgentUsageChunk, meta: any) => {
  const now = new Date().toISOString();
  const tokenUsage: TokenUsage = {
    ...meta,
    model: agentUsageChunk.model,
    totalTokens: agentUsageChunk.totalTokens,
    totalCostMs: agentUsageChunk.totalCostMs,
    rounds: agentUsageChunk.rounds,
    estimatedCost: agentUsageChunk.estimatedCost,
    inputUsage: agentUsageChunk.inputUsage,
    outputUsage: agentUsageChunk.outputUsage,
    createdAt: now,
    updatedAt: now,
  };
  await collection.insertOne(tokenUsage);
};
