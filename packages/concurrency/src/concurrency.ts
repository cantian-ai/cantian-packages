import { MongoServerError } from 'cantian-mongodb';
import { concurrencyCollection } from './models/concurrencyModel.js';

export const acquireLock = async (options: { key: string; concurrency: number; acquirer: string }) => {
  const { key, concurrency, acquirer } = options;
  const date = new Date().toISOString();

  try {
    const result = await concurrencyCollection.updateOne(
      {
        _id: key,
        concurrency: { $lt: concurrency },
        acquirers: {
          $not: {
            $elemMatch: { acquirer },
          },
        },
      },
      {
        $inc: { concurrency: 1 },
        $set: {
          updatedAt: date,
        },
        $setOnInsert: {
          createdAt: date,
        },
        $addToSet: {
          acquirers: { acquirer, acquiredAt: date },
        },
      },
      { upsert: true },
    );
    return result.upsertedCount > 0 || result.modifiedCount > 0;
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      return false;
    }
    throw error;
  }
};

export const releaseLock = async (options: { key: string; acquirer: string }) => {
  const { key, acquirer } = options;
  const date = new Date().toISOString();

  const result = await concurrencyCollection.updateOne(
    {
      _id: key,
      concurrency: { $gte: 1 },
      acquirers: { $elemMatch: { acquirer } },
    },
    {
      $inc: { concurrency: -1 },
      $set: { updatedAt: date },
      $pull: { acquirers: { acquirer } },
    },
  );
  return result.modifiedCount > 0;
};
