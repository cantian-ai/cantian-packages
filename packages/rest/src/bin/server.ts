#!/usr/bin/env node
import { getTraceId } from 'cantian-als';
import 'cantian-log';
import { initLog } from 'cantian-log';
import { registerControllers } from '../handlers.js';

const { JWKS, ADMIN_KID, PORT = 3001 } = process.env;

if (!JWKS) {
  throw new Error('The env JWKS is undefined.');
}

initLog({
  addTags() {
    const traceId = getTraceId();
    if (traceId) {
      return { traceId, machineId: process.env.CONTAINER_APP_REPLICA_NAME || '-' };
    }
  },
});

(await registerControllers({ jwks: JWKS })).listen(PORT, () => {
  console.info(`Server is ready on port ${PORT}.`);
});

process.on('SIGTERM', () => {
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
