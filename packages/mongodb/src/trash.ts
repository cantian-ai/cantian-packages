import { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { Collection } from 'mongodb';
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

export const moveToTrash = async (sourceCollection: Collection<any>, origin: Record<string, any> | Record<string, any>[]) => {
  if (origin) {
    if (!Array.isArray(origin)) {
      origin = [origin];
    }
    const now = new Date().toISOString();
    const records = origin.map((o) => ({
      source: sourceCollection.collectionName,
      origin: o,
      deletedAt: now,
    }));
    await trashCollection.insertMany(records);
    await sourceCollection.deleteMany({
      _id: { $in: origin.map((o) => o._id) },
    });
  }
};
