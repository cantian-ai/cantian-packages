import { db, Model } from 'cantian-mongodb';
import { FromSchema, JSONSchema } from 'json-schema-to-ts';

export const concurrencyModelSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    concurrency: {
      type: 'number',
    },
    acquirers: {
      type: 'array',
      items: { type: 'string' },
    },
    lastLockStatus: {
      type: 'string',
      description: 'The status of the last operation. Will not affect the updatedAt field if not SUCCESS.'
    },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
  additionalProperties: false,
} as const satisfies JSONSchema;

export type ConcurrencyModel = FromSchema<typeof concurrencyModelSchema>;

export const concurrencyCollection = db.collection<ConcurrencyModel>('concurrency');

export default {
  schema: concurrencyModelSchema,
  collection: concurrencyCollection,
} satisfies Model;
