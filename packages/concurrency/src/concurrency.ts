import { MongoServerError } from 'cantian-mongodb';
import { concurrencyCollection } from './models/concurrencyModel.js';

export const ACQUIRE_LOCK_RESULT = {
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  DUPLICATED: 'DUPLICATED',
} as const;

export const acquireLock = async (options: { key: string; maxConcurrency: number; acquirer: string }) => {
  const { key, maxConcurrency, acquirer } = options;
  const date = new Date().toISOString();

  try {
    const result = await concurrencyCollection.findOneAndUpdate(
      { _id: key },
      [
        {
          $set: {
            createdAt: { $ifNull: ["$createdAt", date] },
          },
        },
        {
          $set: {
            concurrency: {
              $cond: [
                {
                  $and: [
                    { $lt: ["$concurrency", maxConcurrency] },
                    { $not: { $in: [acquirer, { $ifNull: ["$acquirers", []] }] } },
                  ],
                },
                { $add: [{ $ifNull: ["$concurrency", 0] }, 1] },
                "$concurrency",
              ],
            },
            acquirers: {
              $cond: [
                {
                  $and: [
                    { $lt: ["$concurrency", maxConcurrency] },
                    { $not: { $in: [acquirer, { $ifNull: ["$acquirers", []] }] } },
                  ],
                },
                { $concatArrays: [{ $ifNull: ["$acquirers", []] }, [acquirer]] },
                "$acquirers",
              ],
            },
            updatedAt: {
              $cond: [
                {
                  $and: [
                    { $lt: ["$concurrency", maxConcurrency] },
                    { $not: { $in: [acquirer, { $ifNull: ["$acquirers", []] }] } },
                  ],
                },
                date,
                "$updatedAt",
              ],
            },
            lastLockStatus: {
              $cond: [
                { $in: [acquirer, { $ifNull: ["$acquirers", []] }] },
                "DUPLICATED",
                {
                  $cond: [
                    {
                      $and: [
                        { $lt: ["$concurrency", maxConcurrency] },
                        { $not: { $in: [acquirer, { $ifNull: ["$acquirers", []] }] } },
                      ],
                    },
                    "SUCCESS",
                    "FAILED"
                  ]
                }
              ]
            }
          },
        },
      ],
      {
        upsert: true,
        returnDocument: "after",
        includeResultMetadata: true
      },
    ) as any;

    if (result && result.value && result.value.lastLockStatus) {
      if (result.value.lastLockStatus === "SUCCESS") {
        return ACQUIRE_LOCK_RESULT.SUCCESS;
      } else if (result.value.lastLockStatus === "DUPLICATED") {
        return ACQUIRE_LOCK_RESULT.DUPLICATED;
      } else {
        return ACQUIRE_LOCK_RESULT.FAILED;
      }
    }
    return ACQUIRE_LOCK_RESULT.FAILED;
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      return ACQUIRE_LOCK_RESULT.FAILED;
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
      acquirers: acquirer,
    },
    {
      $inc: { concurrency: -1 },
      $set: { updatedAt: date },
      $pull: { acquirers: acquirer },
    },
  );
  return result.modifiedCount > 0;
};

export const singletonHandleOrThrow = async <T>(options: {
  key: string;
  acquirer: string;
  handler: (result: keyof typeof ACQUIRE_LOCK_RESULT) => T;
}) => {
  const lockResult = await acquireLock({
    key: options.key,
    acquirer: options.acquirer,
    maxConcurrency: 1,
  });

  let error, result;
  try {
    result = await options.handler(lockResult);
  } catch (e) {
    error = e;
  }

  await releaseLock({ key: options.key, acquirer: options.acquirer });

  if (error) {
    throw error;
  }
  return result as T;
};
