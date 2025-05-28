import fs from 'node:fs';
import { app } from '../app.js';
import { createAuthHandler, createControllerRouter } from '../handlers.js';

const { JWTS, SCOPE, PORT = 3001 } = process.env;

if (fs.existsSync('dist/controllers')) {
  const controllerDir = process.cwd() + '/dist/controllers/';
  const router = await createControllerRouter({
    controllerDir,
    auth: JWTS
      ? createAuthHandler({
          jwts: JWTS,
          scope: SCOPE,
        })
      : undefined,
  });
  app.use('/rest', router);
}

app.listen(PORT, () => {
  console.info(`Server is ready on port ${PORT}.`);
});
