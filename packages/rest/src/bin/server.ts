#!/usr/bin/env node
import { getTraceId } from 'cantian-als';
import 'cantian-log';
import { initLog } from 'cantian-log';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:https';
import { parseArgs } from 'node:util';
import { registerControllers } from '../handlers.js';

const { JWKS, PORT = 3001 } = process.env;
const { 'https-cert': cert, 'https-key': key } = parseArgs({
  options: { 'https-cert': { type: 'string' }, 'https-key': { type: 'string' } },
}).values;

if (!JWKS) {
  throw new Error('The env JWKS is undefined.');
}
if (!!cert !== !!key) {
  throw new Error('Both --https-cert and --https-key are required.');
}

initLog({
  addTags() {
    const traceId = getTraceId();
    if (traceId) {
      return { traceId, machineId: process.env.CONTAINER_APP_REPLICA_NAME || '-' };
    }
  },
});

const app = await registerControllers({ jwks: JWKS });
const server = cert && key ? createServer({ cert: await readFile(cert), key: await readFile(key) }, app) : app;

const listener = server.listen(PORT, () => {
  console.info(`Server is ready on port ${PORT}.`);
});

process.on('SIGTERM', () => {
  listener.close();
  console.info('SIGTERM received. Keep alive so that async jobs can finish successfully.');
  setInterval(() => {
    console.info(`${process.env.CONTAINER_APP_REPLICA_NAME} keeps alive.`);
  }, 10000);
});

process.on('uncaughtException', (err) => {
  console.error('uncaughtException', err);
});

process.on('unhandledRejection', (err) => {
  console.error('unhandledRejection', err);
});
