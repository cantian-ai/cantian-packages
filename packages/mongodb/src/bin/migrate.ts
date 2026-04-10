#!/usr/bin/env node

import { globSync } from 'node:fs';
import { migrate } from '../migration.js';
import { db, Model } from '../mongoClient.js';

let [, , modelDir] = process.argv;

if (!modelDir) {
  modelDir = 'dist/models';
}

const modelFiles = globSync(`${modelDir}/*.{js,ts}`);
for (const file of modelFiles) {
  if (file.endsWith('.d.ts')) {
    continue;
  }
  const model = (await import(`${process.cwd()}/${file}`)).default as Model;
  if (model) {
    await migrate(db, model);
  }
}

process.exit();
