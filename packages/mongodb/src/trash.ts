import { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { Collection, Document, Filter } from 'mongodb';
import { db } from './mongoClient.js';

export const trashModelSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    source: { type: 'string' },
    origin: { type: 'object' },
    deletedAt: { type: 'string' },
    group: { type: 'string' },
  },
  additionalProperties: false,
  required: ['source', 'origin', 'deletedAt'],
} as const satisfies JSONSchema;

export type TrashModel = FromSchema<typeof trashModelSchema>;

const trashCollection = db.collection('trash');

export const moveToTrash = async (
  sourceCollection: Collection<any>,
  origin: Record<string, any> | Record<string, any>[],
  group?: string,
) => {
  if (origin) {
    if (!Array.isArray(origin)) {
      origin = [origin];
    }
    if (origin.length) {
      const now = new Date().toISOString();
      const records = origin.map((o) => ({
        source: sourceCollection.collectionName,
        origin: o,
        deletedAt: now,
        group,
      }));
      await trashCollection.insertMany(records);
      await sourceCollection.deleteMany({
        _id: { $in: origin.map((o) => o._id) },
      });
    }
  }
};

export async function moveToTrashByFilter<T extends Document>(
  sourceCollection: Collection<T>,
  filter: Filter<T>,
  group?: string,
) {
  const limit = 500;
  const maxLoop = 100;
  let i = 0;
  for (; i < maxLoop; i++) {
    const origin = await sourceCollection.find(filter).limit(limit).toArray();
    if (origin.length) {
      await moveToTrash(sourceCollection, origin, group);
    }
    if (origin.length < limit) {
      break;
    }
  }
  if (i >= maxLoop) {
    console.error({ message: 'Too many records to be deleted.', collection: sourceCollection.collectionName, filter });
  }
}
