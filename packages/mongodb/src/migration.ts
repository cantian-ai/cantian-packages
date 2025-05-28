import { JSONSchema } from 'json-schema-to-ts';
import { CreateIndexesOptions, Db, IndexSpecification } from 'mongodb';
import { Model, mongoClient } from './mongoClient.js';

export type Indexes = { key: any; options?: CreateIndexesOptions; vectorOptions?: Record<string, any> }[];

export function generateIndexName(key: IndexSpecification) {
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

export const migrate = async (db: Db, model: Model) => {
  const collectionName = model.collection.collectionName;
  await migrateSchema(db, collectionName, model.schema);

  if (model.indexes?.length) {
    for (const index of model.indexes) {
      const indexOption = { ...index.options, name: generateIndexName(index.key) };
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
      return existingIndex.name === generateIndexName(v.key);
    });
    if (!inUsed) {
      await model.collection.dropIndex(existingIndex.name);
      console.info(`Removed an index from ${collectionName} successfully.`, existingIndex);
    }
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
