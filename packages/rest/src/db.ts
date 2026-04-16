import { mongoClient } from 'cantian-mongodb';

export const db = mongoClient.db('rest');
