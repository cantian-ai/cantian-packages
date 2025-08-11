import { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { db } from './mongoClient.js';

export const trashModelSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    source: { type: 'string' },
    origin: { type: 'object' },
    deletedAt: { type: 'string' },
  },
  additionalProperties: false,
  required: ['source', 'origin', 'deletedAt'],
} as const satisfies JSONSchema;

export type TrashModel = FromSchema<typeof trashModelSchema>;

const trashCollection = db.collection('trash');

export const moveToTrash = async (source: string, origin: Record<string, any> | Record<string, any>[]) => {
  if (origin) {
    if (!Array.isArray(origin)) {
      origin = [origin];
    }
    const now = new Date().toISOString();
    const records = origin.map((o) => ({
      source,
      origin: o,
      deletedAt: now,
    }));
    await trashCollection.insertMany(records);
  }
};
