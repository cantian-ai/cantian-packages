import cors from 'cors';
import express, { json, Request, Response } from 'express';
import { createLocalJWKSet, createRemoteJWKSet, jwtVerify } from 'jose';
import { existsSync } from 'node:fs';
import { glob } from 'node:fs/promises';
import { BaseController } from './BaseController.js';
import { RestError } from './RestError.js';
import { app } from './app.js';

export const createAuthHandler = (options: { jwts: string; scope?: string }) => async (req: Request, res, next) => {
  const authorization = req.headers['authorization'];
  if (!authorization) {
    throw RestError.unauthorized('Authorization header is required.');
  }
  const [tokenType, token] = authorization.split(' ');
  if (tokenType !== 'Bearer') {
    throw RestError.unauthorized('Authorization token type is unsupported.');
  }
  try {
    let jwts;
    if (options.jwts.startsWith('http')) {
      jwts = createRemoteJWKSet(new URL(options.jwts));
    } else {
      jwts = createLocalJWKSet(JSON.parse(jwts));
    }
    const { payload } = await jwtVerify(token, jwts);

    let scopes: string[] | undefined;
    if (options.scope) {
      scopes = (payload.scope as string | undefined)?.split(' ');
      if (!scopes?.includes(options.scope)) {
        throw RestError.forbidden();
      }
    }

    req.auth = {
      sub: payload.sub as string,
      name: payload.name as string,
      aud: payload.aud as string,
      scopes,
    };
    return next();
  } catch (error) {
    throw RestError.unauthorized();
  }
};

export const createBizHandler = (c: typeof BaseController) => async (req: Request, res: Response, next) => {
  const controller = new c({
    data: req.body,
    auth: req.auth,
    pathParams: req.params,
  });
  const result = await controller.execute();
  res.status(c.successStatusCode).json(result);
  next();
};

export const createControllerRouter = async (options: { controllerDir: string; jwts?: string; defaultScope?: string }) => {
  const { controllerDir, jwts, defaultScope } = options;
  const allowedMethods = ['get', 'post', 'patch'] as const;
  const controllerFiles = glob('**/*.js', { cwd: controllerDir });
  const router = express.Router();
  router.use(json());
  router.use((req, res, next) => {
    console.log(
      JSON.stringify({
        event: 'REQUEST',
        time: new Date().toISOString(),
        method: req.method,
        path: req.path,
        data: req.body,
      }),
    );
    next();
  });
  for await (const controllerFile of controllerFiles) {
    const parts = controllerFile.split('/');
    const method = parts.pop()?.replace('.js', '').toLowerCase() as (typeof allowedMethods)[number];
    if (!allowedMethods.includes(method as any)) {
      throw new Error(`The method is invalid for the file ${controllerFile}.`);
    }
    const urlPath = '/' + parts.join('/');
    const { default: c }: { default: typeof BaseController } = await import(`${controllerDir}/${controllerFile}`);
    if (!c.isPublic) {
      if (!jwts) {
        throw new Error(`A JWTS configuration is required since the controller ${urlPath}/${method} is private.`);
      }
      router[method](urlPath, createAuthHandler({ jwts, scope: c.scope || defaultScope }));
    }
    router[method](urlPath, createBizHandler(c));
    console.log(`Route: ${method.toUpperCase()} ${urlPath}`);
  }
  router.use(catchError);
  router.use((req, res, next) => {
    console.log(
      JSON.stringify({
        event: 'RESPONSE',
        time: new Date().toISOString(),
        statusCode: res.statusCode,
      }),
    );
    next();
  });
  return router;
};

export const catchError = (err, req, res: Response, next) => {
  if (err instanceof RestError) {
    res.status(err.statusCode).json({
      error: {
        data: err.errorData,
        message: err.errorMessage,
      },
    });
  } else {
    console.error(err);
    res.status(500).json({
      error: {
        message: 'Internal error.',
      },
    });
  }
  next();
};

export const registerControllers = async (options: { jwts?: string; scope?: string }) => {
  const { jwts, scope } = options;

  app.use(cors());

  if (existsSync('dist/controllers')) {
    const controllerDir = process.cwd() + '/dist/controllers/';
    const router = await createControllerRouter({
      controllerDir,
      jwts,
      defaultScope: scope,
    });
    app.use('/rest', router);
  }
  return app;
};
