import { nanoid } from 'cantian-mongodb';
import { Collection } from 'mongodb';
import { db } from './db.js';
import { Auth } from './type.js';

export type ApiKeyPrincipal = Auth;
export type CreateApiKeyOptions = {
  name: string;
  sub: string;
  scopes?: string[];
  client_id?: string;
};
export type ApiKeyListItem = {
  id: string;
  key: string;
  name: string;
  sub: string;
  scopes?: string[];
  client_id?: string;
  createdAt: string;
  updatedAt: string;
};

type ApiKeyDocument = {
  _id?: string;
  key: string;
  name: string;
  sub: string;
  scopes?: string[];
  client_id?: string;
  createdAt: string;
  updatedAt: string;
};

const mongoCollection: Collection<ApiKeyDocument> = db.collection<ApiKeyDocument>('api-key');

export const verifyApiKey = async (apiKey: string): Promise<ApiKeyPrincipal | undefined> => {
  const document = await mongoCollection.findOne({
    key: apiKey,
  });
  if (!document) {
    return undefined;
  }
  return {
    sub: document.sub,
    scopes: document.scopes,
    client_id: document.client_id,
  };
};

export const createApiKey = async (options: CreateApiKeyOptions) => {
  const key = `ct-${nanoid(24)}`;
  const now = new Date().toISOString();
  const name = options.name?.trim();
  const sub = options.sub?.trim();
  if (!name) {
    throw new Error('name is required.');
  }
  if (!sub) {
    throw new Error('sub is required.');
  }

  const doc = {
    key,
    name,
    sub,
    scopes: options.scopes,
    client_id: options.client_id?.trim(),
    createdAt: now,
    updatedAt: now,
  };

  const result = await mongoCollection.insertOne(doc);
  return { id: result.insertedId, ...doc };
};

export const deleteApiKey = async (sub: string, key: string) => {
  const result = await mongoCollection.deleteOne({ sub, key });
  return result.deletedCount > 0;
};

export const updateApiKeyName = async (sub: string, id: string, name: string) => {
  const result = await mongoCollection.updateOne(
    { _id: id, sub },
    {
      $set: {
        name,
        updatedAt: new Date().toISOString(),
      },
    },
  );
  return result.matchedCount > 0;
};

export const listApiKeys = async (sub: string): Promise<ApiKeyListItem[]> => {
  const docs = await mongoCollection.find({ sub }).toArray();
  return docs.map(({ _id: id, ...rest }) => ({ id, ...rest }));
};

export const buildCollection = async () => {
  await mongoCollection.createIndex({ key: 1 }, { unique: true });
};
