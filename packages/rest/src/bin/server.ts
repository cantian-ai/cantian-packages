#!/usr/bin/env node
import { getTraceId } from 'cantian-als';
import 'cantian-log';
import { initLog } from 'cantian-log';
import { registerControllers } from '../handlers.js';

const { JWTS, SCOPE, PORT = 3001 } = process.env;

if (!JWTS) {
  throw new Error('The env JWTS is undefined.');
}

initLog({
  addTags() {
    const traceId = getTraceId();
    if (traceId) {
      return { traceId };
    }
  },
});

(await registerControllers({ jwts: JWTS, scope: SCOPE })).listen(PORT, () => {
  console.info(`Server is ready on port ${PORT}.`);
});
