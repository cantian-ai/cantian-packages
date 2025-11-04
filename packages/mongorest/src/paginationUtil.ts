import { JSONSchema } from 'json-schema-to-ts';
import { Collection } from 'mongodb';
import { modelsToApiObjects, OriginModel } from './modelUtil.js';

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
  default: [{ field: 'createdAt', order: -1 }],
} as const satisfies JSONSchema;

export const STRING_TYPE_FILTER = {
  type: ['object', 'string'],
  properties: {
    $gt: { type: 'string', description: 'Filter by field greater than the given value.' },
    $lt: { type: 'string', description: 'Filter by field less than the given value.' },
    $in: { type: 'array', items: { type: 'string' }, description: 'Filter by field in the given array.' },
    $eq: { type: 'string', description: 'Filter by field equal to the given value.' },
    $regex: {
      type: 'string',
      description: 'Filter by field matching the given regex. Do not wrap the regex by `/`. Example: `^abc`',
    },
  },
  additionalProperties: false,
} as const satisfies JSONSchema;

export const NUMBER_TYPE_FILTER = {
  type: ['object', 'number'],
  properties: {
    $gt: { type: 'number', description: 'Filter by field greater than the given value.' },
    $lt: { type: 'number', description: 'Filter by field less than the given value.' },
    $in: { type: 'array', items: { type: 'number' }, description: 'Filter by field in the given array.' },
    $eq: { type: 'number', description: 'Filter by field equal to the given value.' },
  },
  additionalProperties: false,
} as const satisfies JSONSchema;

export const INTEGER_TYPE_FILTER = {
  type: ['object', 'integer'],
  properties: {
    $gt: { type: 'integer', description: 'Filter by field greater than the given value.' },
    $lt: { type: 'integer', description: 'Filter by field less than the given value.' },
    $in: { type: 'array', items: { type: 'integer' }, description: 'Filter by field in the given array.' },
    $eq: { type: 'integer', description: 'Filter by field equal to the given value.' },
  },
  additionalProperties: false,
} as const satisfies JSONSchema;

export const buildFilterFieldSchema = (type: 'string' | 'number') => {
  const schema = {
    type: 'object',
    properties: {
      $gt: { type, description: 'Filter by field greater than the given value.' },
      $lt: { type, description: 'Filter by field less than the given value.' },
      $in: { type: 'array', items: { type }, description: 'Filter by field in the given array.' },
      $eq: { type, description: 'Filter by field equal to the given value.' },
    } as { $gt: JSONSchema; $lt: JSONSchema; $in: JSONSchema; $regex?: JSONSchema },
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

export const buildSearchResultSchema = <T extends JSONSchema>(options: { itemSchema: T }) => {
  const schema = {
    type: 'object',
    properties: {
      results: { type: 'array', items: options.itemSchema as T },
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
    required: ['results'],
    additionalProperties: false,
  } as const satisfies JSONSchema;
  return schema;
};

export function fixIdField<T extends { id?: any }>(fields: T): Omit<T, 'id'> & { _id?: T['id'] } {
  const fixedFields = { ...fields };
  if (fixedFields.id) {
    (fixedFields as any)._id = fixedFields.id;
    delete (fixedFields as any).id;
  }
  return fixedFields as any;
}

export function fixRegex(filter: Record<string, any>) {
  const fixedFilter = { ...filter };
  for (const key in fixedFilter) {
    if (typeof fixedFilter[key] === 'object') {
      for (const op of Object.keys(fixedFilter[key])) {
        if (op === '$regex') {
          fixedFilter[key][op] = new RegExp(escapeRegexExceptDot(fixedFilter[key][op]), 'i');
        }
      }
    }
  }
  return fixedFilter;
}

/**
 * Execute a paginated query with total count in a single database call
 * @param options - Query options containing collection, pagination, query, and sort
 * @returns Promise containing results and pagination metadata
 */
export async function search<T extends OriginModel>(options: SearchOptions<T>): Promise<PaginationResult<T>> {
  const { collection, filter = {}, sort = [{ field: 'createdAt', order: -1 }], pagination = {} } = options;
  const limit = pagination.limit ?? 100;
  const offset = pagination.offset ?? 0;

  let sortObject = {};
  for (const sortItem of sort) {
    sortObject[sortItem.field] = sortItem.order;
  }
  sortObject = fixIdField(sortObject);

  const fixedFilter = fixRegex(fixIdField(filter));

  // Use aggregation to get both results and total count in one query
  const [aggregateResult] = await collection
    .aggregate([
      { $match: fixedFilter },
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

// $regex只支持点号
function escapeRegexExceptDot(str) {
  // 先替换反斜杠 + 点号 为一个占位符
  str = str.replace(/\\\./g, '__LITERAL_DOT__');

  // 转义除了点号以外的所有正则特殊字符
  str = str.replace(/([*+?^${}()|[\]\\])/g, '\\$&');

  // 再把占位符替换回字面量点号
  str = str.replace(/__LITERAL_DOT__/g, '\\.');

  return str;
}
