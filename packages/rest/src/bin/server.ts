#!/usr/bin/env node
import { inspect } from 'util';
import { registerControllers } from '../handlers.js';

inspect.defaultOptions.depth = 12;

const { JWTS, SCOPE, PORT = 3001 } = process.env;

(await registerControllers({ jwts: JWTS, scope: SCOPE })).listen(PORT, () => {
  console.info(`Server is ready on port ${PORT}.`);
});
