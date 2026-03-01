import { createTraceHandler } from 'cantian-als';
import cors from 'cors';
import express, { json, Request, Response } from 'express';
import { existsSync } from 'node:fs';
import { glob } from 'node:fs/promises';
import { BaseController } from './BaseController.js';
import { RestError } from './RestError.js';
import { app } from './app.js';
import { CONTROLLER_DIR, INIT_FILE, openApiPathToExpressPath, REST_BASE_PATH } from './util.js';

export const createBizHandler = (c: typeof BaseController) => async (req: Request, res: Response, next) => {
  const controller = new c({
    req: req,
    res: res,
  });
  try {
    const result = await controller.execute();
    if (result?.error && !(result.error instanceof RestError)) {
      throw result.error;
    }
  } catch (error) {
    console.error(error);
  }
  next();
};

export const createControllerRouter = async (options: { controllerDir: string; jwks: string }) => {
  const { controllerDir, jwks } = options;
  const allowedMethods = ['get', 'post', 'patch', 'delete'] as const;
  const controllerFiles = glob('**/*.js', { cwd: controllerDir });
  const router = express.Router();
  router.use(
    json({
      verify: (req, res, buf) => {
        (req as Request).rawBody = buf;
      },
    }),
  );

  BaseController.initBase({ jwks });

  for await (const controllerFile of controllerFiles) {
    const parts = controllerFile.split('/');
    const method = parts.pop()?.replace('.js', '').toLowerCase() as (typeof allowedMethods)[number];
    if (!allowedMethods.includes(method as any)) {
      throw new Error(`The method is invalid for the file ${controllerFile}.`);
    }
    const urlPath = '/' + parts.map((p) => openApiPathToExpressPath(p)).join('/');
    const { default: c }: { default: typeof BaseController } = await import(`${controllerDir}/${controllerFile}`);

    c.init({ method, path: urlPath });

    const corsOptions = c.corsOptions;
    if (corsOptions) {
      router.options(urlPath, cors(corsOptions));
      router[method](urlPath, cors(corsOptions), createBizHandler(c));
    } else {
      router[method](urlPath, createBizHandler(c));
    }
    console.log(`Route: ${method.toUpperCase()} ${urlPath}`);
  }
  router.use((err, req, res, next) => {
    if (err instanceof SyntaxError && !res.headersSent) {
      res.status(400).json({
        error: 'Invalid JSON',
      });
    } else {
      console.error(err);
    }
  });
  return router;
};

export const registerControllers = async (options: { jwks: string }) => {
  const { jwks } = options;

  app.use(createTraceHandler());

  if (existsSync(INIT_FILE)) {
    const { default: init } = await import(INIT_FILE);
    await init();
  }

  if (existsSync(CONTROLLER_DIR)) {
    const router = await createControllerRouter({
      controllerDir: CONTROLLER_DIR,
      jwks,
    });
    app.use(REST_BASE_PATH, router);
  }
  return app;
};
