#!/usr/bin/env node
import { express, registerControllers } from 'cantian-rest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { inspect } from 'node:util';

inspect.defaultOptions.depth = 12;

const { JWTS, SCOPE, PORT = 3001, OPENAPI_SPEC_PATH = 'tmp/openapi.json' } = process.env;

if (!JWTS) {
  throw new Error('The env JWTS is undefined.');
}

const app = await registerControllers({ jwts: JWTS, scope: SCOPE });

const openapiSpecAbsolutePath = `${process.cwd()}/${OPENAPI_SPEC_PATH}`;
if (existsSync(openapiSpecAbsolutePath)) {
  const staticPath = resolve(import.meta.dirname, '../..', 'static');
  app.use(express.static(staticPath));
  app.get('/openapi.json', (_, res) => {
    res.sendFile(openapiSpecAbsolutePath);
  });
}

app.listen(PORT, (error) => {
  if (error) {
    console.error(error);
  } else {
    console.info(`Server is ready on port ${PORT}.`);
  }
});
