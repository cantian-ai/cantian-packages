import { JSONSchema } from 'json-schema-to-ts';
import { Collection, Document } from 'mongodb';
import { modelSchemaToApiSchema, modelsToApiObjects } from './modelUtil.js';

export interface Pagination {
  offset: number;
  limit: number;
}

export interface PaginationResult<T> {
  results: T[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

export interface SearchOptions<T extends Document> {
  collection: Collection<T>;
  pagination?: Partial<Pagination>;
  filter?: object;
  sort?: object;
}

export const PAGINATION_SCHEMA = {
  type: 'object',
  properties: {
    offset: { type: 'integer', default: 0, minimum: 0 },
    limit: { type: 'integer', default: 100, minimum: 1, maximum: 1000 },
  },
  default: { offset: 0, limit: 100 },
  required: ['offset', 'limit'],
  additionalProperties: false,
} as const satisfies JSONSchema;

export const buildSearchReulstSchema = (options: { modelSchema; deleteFields?: string[] }) => {
  return {
    type: 'object',
    properties: {
      results: { type: 'array', items: modelSchemaToApiSchema(options) },
      pagination: {
        type: 'object',
        properties: {
          limit: { type: 'integer' },
          offset: { type: 'integer' },
          total: { type: 'integer' },
        },
        required: ['limit', 'offset', 'total'],
      },
    },
    required: ['results', 'pagination'],
    additionalProperties: false,
  } as const satisfies JSONSchema;
};

/**
 * Execute a paginated query with total count in a single database call
 * @param options - Query options containing collection, pagination, query, and sort
 * @returns Promise containing results and pagination metadata
 */
export async function search<T extends Document>(options: SearchOptions<T>): Promise<PaginationResult<T>> {
  const { collection, filter = {}, sort = { createdAt: -1 }, pagination = {} } = options;

  // Set default values for limit and offset
  const limit = pagination.limit ?? 100;
  const offset = pagination.offset ?? 0;

  // Use aggregation to get both results and total count in one query
  const [aggregateResult] = await collection
    .aggregate([
      { $match: filter },
      {
        $facet: {
          results: [{ $sort: sort }, { $skip: offset }, { $limit: limit }],
          totalCount: [{ $count: 'count' }],
        },
      },
    ])
    .toArray();

  const results = aggregateResult.results;
  const total = aggregateResult.totalCount[0]?.count || 0;

  return {
    results: modelsToApiObjects({ models: results }),
    pagination: {
      limit: limit,
      offset: offset,
      total: total,
    },
  };
}
