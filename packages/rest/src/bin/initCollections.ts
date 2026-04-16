#!/usr/bin/env node

import { buildCollection as buildApiKeyCollection } from '../apiKey.js';
import { buildCollection as buildRateLimitCollection } from '../rateLimit.js';

await buildRateLimitCollection();
await buildApiKeyCollection();

console.log('Done!');
process.exit();
