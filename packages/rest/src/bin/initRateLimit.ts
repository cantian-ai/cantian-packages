#!/usr/bin/env node

import { buildCollection } from '../rateLimit.js';

await buildCollection();

console.log('Done!');
process.exit();
