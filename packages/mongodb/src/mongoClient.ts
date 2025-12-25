import { JSONSchema } from 'json-schema-to-ts';
import { Collection, CreateIndexesOptions, MongoClient, SearchIndexDescription } from 'mongodb';
import { customAlphabet } from 'nanoid';

export type Index = { key: any; options?: CreateIndexesOptions };

export type Model = {
  schema: JSONSchema;
  indexes?: Index[];
  searchIndexes?: SearchIndexDescription[];
  collection: Collection;
};

const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const nanoid = customAlphabet(alphabet, 12);

export const mongoClient = new MongoClient(process.env.MONGODB_URL, {
  connectTimeoutMS: 3000,
  socketTimeoutMS: 90000,
  rejectUnauthorized: false,
  pkFactory: {
    createPk: () => nanoid(),
  },
});

export const db = mongoClient.db(process.env.MONGODB_DB || process.env.SERVICE_NAME, { ignoreUndefined: true });
