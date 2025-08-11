import { JSONSchema } from 'json-schema-to-ts';
import { Collection } from 'mongodb';
import { modelSchemaToApiSchema, modelsToApiObjects, OriginModel } from './modelUtil.js';

export interface Pagination {
  offset: number;
  limit: number;
}

export interface PaginationResult<T extends OriginModel> {
  results: (Omit<T, '_id'> & { id: string })[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

export interface SearchOptions<T extends OriginModel> {
  collection: Collection<T>;
  pagination?: Partial<Pagination>;
  filter?: object;
  sort?: { field: string; order: 1 | -1 }[];
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

export const SORT_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      field: { type: 'string', description: 'The field name to sort by.' },
      order: { type: 'number', enum: [1, -1], description: '1: ASC, -1: DESC.' },
    },
    required: ['field', 'order'],
    additionalProperties: false,
  },
  default: [{ field: 'id', order: -1 }],
  description: 'The sort order. Default is `[{id: -1}]` which means sort by `id` in descending order.',
} as const satisfies JSONSchema;

export const buildFilterFieldSchema = (type: 'string' | 'number') => {
  const schema = {
    type: 'object',
    properties: {
      $gt: { type: type, description: 'Filter by field greater than the given value.' },
      $lt: { type: type, description: 'Filter by field less than the given value.' },
    } as { $gt: JSONSchema; $lt: JSONSchema; $regex?: JSONSchema },
    additionalProperties: false,
  } as const satisfies JSONSchema;
  if (type === 'string') {
    schema.properties.$regex = {
      type: 'string',
      description: 'Filter by field matching the given regex. Do not wrap the regex by `/`. Example: `^abc`',
    };
  }
  return schema;
};

export const buildSearchReulstSchema = (options: {
  modelSchema;
  deleteFields?: string[];
  addFields?: Record<string, JSONSchema>;
}) => {
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
export async function search<T extends OriginModel>(options: SearchOptions<T>): Promise<PaginationResult<T>> {
  const { collection, filter = {}, sort = [{ field: 'id', order: -1 }], pagination = {} } = options;
  const limit = pagination.limit ?? 100;
  const offset = pagination.offset ?? 0;

  const sortObject = {};
  const fixedSort = sort.map((item) => {
    if (item.field === 'id') {
      return { field: '_id', order: item.order };
    }
    return item;
  });
  for (const sortItem of fixedSort) {
    sortObject[sortItem.field] = sortItem.order;
  }

  // Use aggregation to get both results and total count in one query
  const [aggregateResult] = await collection
    .aggregate([
      { $match: filter },
      {
        $facet: {
          results: [{ $sort: sortObject }, { $skip: offset }, { $limit: limit }],
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
