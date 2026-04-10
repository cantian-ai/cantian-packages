import { mongoClient } from 'cantian-mongodb';
import { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { AgentUsageChunk, UsageChunk } from './type.js';

export const tokenUsageModelSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    tokenUsageId: { type: 'string' },
    url: { type: 'string' },
    model: { type: 'string' },
    totalTokens: { type: 'number' },
    totalCostMs: { type: 'number' },
    inputUsage: {
      type: 'object',
      properties: {
        inputTokens: { type: 'number' },
        cachedTokens: { type: 'number' },
      },
      required: ['inputTokens', 'cachedTokens'],
      additionalProperties: false,
    },
    outputUsage: {
      type: 'object',
      properties: {
        outputTokens: { type: 'number' },
        reasoningTokens: { type: 'number' },
      },
      required: ['outputTokens', 'reasoningTokens'],
      additionalProperties: false,
    },
    rounds: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          input: true,
          output: true,
        },
        required: ['input', 'output'],
        additionalProperties: false,
      },
    },
    firstTokenCostMs: { type: 'number' },
    estimatedCost: { type: 'number' },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
  additionalProperties: true,
} as const satisfies JSONSchema;

export type TokenUsage = FromSchema<typeof tokenUsageModelSchema>;

const db = mongoClient.db('agent-service');
export const tokenUsageCollection = db.collection<TokenUsage>('tokenUsages');

export const saveModelUsage = async (usageChunk: UsageChunk, meta: any, url: string) => {
  const now = new Date().toISOString();
  const tokenUsage: TokenUsage = {
    ...meta,
    url,
    model: usageChunk.model,
    totalTokens: usageChunk.totalTokens,
    firstTokenCostMs: usageChunk.firstTokenCostMs,
    totalCostMs: usageChunk.totalCostMs,
    rounds: [{ input: usageChunk.input, output: usageChunk.output }],
    estimatedCost: usageChunk.estimatedCost,
    inputUsage: usageChunk.inputUsage,
    outputUsage: usageChunk.outputUsage,
    createdAt: now,
    updatedAt: now,
  };
  await tokenUsageCollection.insertOne(tokenUsage);
};

export const saveAgentUsage = async (agentUsageChunk: AgentUsageChunk, meta: any, url: string) => {
  const now = new Date().toISOString();
  const tokenUsage: TokenUsage = {
    ...meta,
    tokenUsageId: agentUsageChunk.tokenUsageId,
    url,
    model: agentUsageChunk.model,
    totalTokens: agentUsageChunk.totalTokens,
    firstTokenCostMs: agentUsageChunk.firstTokenCostMs,
    totalCostMs: agentUsageChunk.totalCostMs,
    rounds: agentUsageChunk.rounds,
    estimatedCost: agentUsageChunk.estimatedCost,
    inputUsage: agentUsageChunk.inputUsage,
    outputUsage: agentUsageChunk.outputUsage,
    createdAt: now,
    updatedAt: now,
  };
  await tokenUsageCollection.insertOne(tokenUsage);
};
