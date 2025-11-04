import { JSONSchema } from 'json-schema-to-ts';
import { Collection, CreateIndexesOptions, Db, SearchIndexDescription } from 'mongodb';
import assert from 'node:assert';
import { Index, Model, mongoClient } from './mongoClient.js';

export type Indexes = { key: any; options?: CreateIndexesOptions; vectorOptions?: Record<string, any> }[];

export function generateIndexName(index: Index) {
  if (index.options?.name) {
    return index.options.name;
  }
  const key = index.key;
  return Object.entries(key)
    .map(([k, v]) => `${k}_${v}`)
    .join('_');
}

async function migrateSchema(db: Db, collectionName: string, schema: JSONSchema) {
  const existingCollections = await db
    .listCollections({
      name: collectionName,
    })
    .toArray();
  if (existingCollections.length) {
    await db.command({
      collMod: collectionName,
      validator: { $jsonSchema: schema },
    });
    console.info(`Update collection '${collectionName}' successfully with schema: ${JSON.stringify(schema)}`);
  } else {
    await db.createCollection(collectionName, {
      validator: { $jsonSchema: schema },
    });
    console.info(`Create collection '${collectionName}' successfully with schema: ${JSON.stringify(schema)}`);
  }
}

type SearchIndex = { name: string; definition: SearchIndexDescription };
async function migrateSearch(collection: Collection, indexes: SearchIndexDescription[]) {
  const remoteIndexMap: Record<string, SearchIndex> = {};
  const existingIndexes = collection.listSearchIndexes();
  for await (const existingIndex of existingIndexes) {
    remoteIndexMap[existingIndex.name] = existingIndex as SearchIndex;
  }

  const localIndexMap: Record<string, SearchIndex> = {};
  for (const localIndex of indexes) {
    if (!localIndex.name) {
      throw new Error(`Index name is required when migrating search indexes for ${collection.collectionName}.`);
    }
    localIndexMap[localIndex.name!] = localIndex as SearchIndex;
  }

  // Remove remote indexes that are not in the local indexes
  for (const remoteIndex of Object.values(remoteIndexMap)) {
    if (!localIndexMap[remoteIndex.name]) {
      await collection.dropSearchIndex(remoteIndex.name);
      console.info(`Remove the search index ${remoteIndex.name} for ${collection.collectionName} successfully.`);
    }
  }

  // Create local indexes that are not in the remote indexes
  for (const localIndex of indexes) {
    const remoteIndex = remoteIndexMap[localIndex.name!];
    if (!remoteIndex) {
      await collection.createSearchIndex(localIndex);
      console.info(`Create the search index ${localIndex.name} for ${collection.collectionName} successfully.`, localIndex);
    } else if (!isSameDefinition((remoteIndex as any).latestDefinition, localIndex.definition)) {
      throw new Error(
        `Give a new name to the search index ${localIndex.name} for ${collection.collectionName} to avoid conflict.`,
      );
    } else {
      console.info(`The search index ${localIndex.name} for ${collection.collectionName} is already up to date.`);
    }
  }
}

export const migrate = async (db: Db, model: Model) => {
  const collectionName = model.collection.collectionName;
  await migrateSchema(db, collectionName, model.schema);

  if (model.indexes?.length) {
    for (const index of model.indexes) {
      const indexOption = { ...index.options, name: generateIndexName(index) };
      await model.collection.createIndex(index.key, indexOption);
      console.info(`Create a general index for ${collectionName} successfully.`, indexOption);
    }
  }

  const existingIndexes = await model.collection.listIndexes().toArray();
  const existingIndexMap: Record<string, any> = {};
  for (const existingIndex of existingIndexes) {
    existingIndexMap[existingIndex.name] = existingIndex;
  }

  for (const existingIndex of existingIndexes) {
    if (existingIndex.name === '_id_') {
      continue;
    }
    const inUsed = model.indexes?.find((v) => {
      return existingIndex.name === generateIndexName(v);
    });
    if (!inUsed) {
      await model.collection.dropIndex(existingIndex.name);
      console.info(`Removed an index from ${collectionName} successfully.`, existingIndex);
    }
  }

  if (model.searchIndexes?.length) {
    await migrateSearch(model.collection, model.searchIndexes);
  }
};

export type MigrateRemoteEvent = {
  dbName: string;
  collections: { collectionName: string; schema: Model['schema']; indexes: Model['indexes'] }[];
};

export const migrateRemoteHandler = async (event: MigrateRemoteEvent) => {
  const db = mongoClient.db(event.dbName, { ignoreUndefined: true });
  for (const collectionConfig of event.collections) {
    const collection = db.collection(collectionConfig.collectionName);
    await migrate(db, {
      schema: collectionConfig.schema,
      indexes: collectionConfig.indexes,
      collection,
    });
  }
};

function pickDefinedFields(def: any, template: any): any {
  if (Array.isArray(template)) {
    return template.map((t, i) => pickDefinedFields(def?.[i], t));
  } else if (template && typeof template === 'object') {
    const result: any = {};
    for (const key of Object.keys(template)) {
      result[key] = pickDefinedFields(def?.[key], template[key]);
    }
    return result;
  }
  return def;
}

function isSameDefinition(remoteDef: any, localDef: any): boolean {
  const filteredRemote = pickDefinedFields(remoteDef, localDef);
  try {
    assert.deepStrictEqual(filteredRemote, localDef);
    return true;
  } catch {
    return false;
  }
}
