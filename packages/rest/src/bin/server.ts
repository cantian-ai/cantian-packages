#!/usr/bin/env node
import { registerControllers } from '../handlers.js';

const { JWTS, SCOPE, PORT = 3001 } = process.env;

(await registerControllers({ jwts: JWTS, scope: SCOPE })).listen(PORT, () => {
  console.info(`Server is ready on port ${PORT}.`);
});
