#!/usr/bin/env node

import { glob } from 'node:fs';
import { migrate } from '../migration.js';
import { db, Model } from '../mongoClient.js';

let [, , modelDir] = process.argv;

if (!modelDir) {
  modelDir = 'dist/models';
}

const modelFiles = await new Promise<string[]>((r) =>
  glob(`${modelDir}/*.js`, (err, files) => {
    if (err) throw err;
    r(files);
  }),
);
for (const file of modelFiles) {
  const model = (await import(`${process.cwd()}/${file}`)).default as Model;
  if (model) {
    await migrate(db, model);
  }
}

process.exit();
