import { MongoClient } from 'mongodb';
import { RestError } from './RestError.js';

type RateLimitModel = {
  _id: string;
  count: number;
  expireAt: Date;
};

type AlertModel = {
  _id: string;
  createdAt: string;
  updatedAt: string;
};

const mongoClient = new MongoClient(process.env.MONGODB_URL!, {
  connectTimeoutMS: 3000,
  socketTimeoutMS: 3000,
  rejectUnauthorized: false,
});

const db = mongoClient.db('rest');
const rateLimitCollection = db.collection<RateLimitModel>('rate-limit');
const alertCollection = db.collection<AlertModel>('alert');

export const rateLimit = async (key: string, requestPerMinute: number) => {
  const expireAt = new Date(Date.now() + 60000);
  const result = (await rateLimitCollection.findOneAndUpdate(
    { _id: key },
    {
      $setOnInsert: { expireAt: expireAt },
      $inc: { count: 1 },
    },
    { upsert: true, returnDocument: 'after' },
  ))!;
  if (result.count > requestPerMinute) {
    const now = new Date().toISOString();
    await alertCollection.findOneAndUpdate(
      { _id: key },
      {
        $setOnInsert: { createdAt: now },
        $set: { updatedAt: now },
      },
      { upsert: true },
    );
    throw RestError.tooManyRequests();
  }
};

export const buildCollection = async () => {
  await rateLimitCollection.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 });
};
