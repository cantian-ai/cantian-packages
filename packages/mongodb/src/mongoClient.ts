import { JSONSchema } from 'json-schema-to-ts';
import { Collection, CreateIndexesOptions, MongoClient, ObjectId, SearchIndexDescription } from 'mongodb';

export type Index = { key: any; options?: CreateIndexesOptions };

export type Model = {
  schema: JSONSchema;
  indexes?: Index[];
  searchIndexes?: SearchIndexDescription[];
  collection: Collection;
};

export const mongoClient = new MongoClient(process.env.MONGODB_URL, {
  connectTimeoutMS: 3000,
  socketTimeoutMS: 90000,
  rejectUnauthorized: false,
  pkFactory: {
    createPk: () => new ObjectId().toHexString(),
  },
});

export const db = mongoClient.db(process.env.MONGODB_DB, { ignoreUndefined: true });
