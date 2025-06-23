import { createTraceHandler } from 'cantian-als';
import cors from 'cors';
import express, { json, Request, Response } from 'express';
import { createLocalJWKSet, jwtVerify } from 'jose';
import { existsSync } from 'node:fs';
import { glob } from 'node:fs/promises';
import { BaseController } from './BaseController.js';
import { RestError } from './RestError.js';
import { app } from './app.js';
import { openApiPathToExpressPath } from './util.js';

export const createAuthHandler = (options: { jwts: string; scope?: string }) => {
  const jwts = createLocalJWKSet(JSON.parse(options.jwts));
  return async (req: Request, res, next) => {
    let token = (req.headers['token'] || req.headers['authorization']) as string;
    if (!token) {
      throw RestError.unauthorized('Authorization header is required.');
    }
    if (token.startsWith('Bearer ')) {
      token = token.replace('Bearer ', '');
    }
    try {
      const { payload } = await jwtVerify(token, jwts);

      const scopes = (payload.scope as string | undefined)?.split(' ');
      if (options.scope) {
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

      if (scopes?.includes('*:admin')) {
        req.auth.sub = req.header('x-personate-sub') || req.auth.sub;
      }

      return next();
    } catch (error) {
      if (!(error instanceof RestError)) {
        throw RestError.unauthorized();
      }
      throw error;
    }
  };
};

export const createBizHandler = (c: typeof BaseController) => async (req: Request, res: Response, next) => {
  const controller = new c({
    data: req.body,
    auth: req.auth,
    pathParams: req.params,
    rawBody: req.rawBody,
    headers: req.headers,
  });
  if (c.useHttpCode) {
    req.useHttpCode = c.useHttpCode;
  }
  const result = await controller.execute();
  sendResponse(undefined, result, req, res);
  next();
};

export const createControllerRouter = async (options: { controllerDir: string; jwts?: string; defaultScope?: string }) => {
  const { controllerDir, jwts, defaultScope } = options;
  const allowedMethods = ['get', 'post', 'patch'] as const;
  const controllerFiles = glob('**/*.js', { cwd: controllerDir });
  const router = express.Router();
  router.use(cors());
  router.use(
    json({
      verify: (req, res, buf) => {
        (req as Request).rawBody = buf;
      },
    }),
  );
  router.use((req, res, next) => {
    console.log({
      event: 'REQUEST',
      time: new Date().toISOString(),
      method: req.method,
      path: req.path,
      data: req.body,
      headers: req.headers,
    });
    next();
  });
  for await (const controllerFile of controllerFiles) {
    const parts = controllerFile.split('/');
    const method = parts.pop()?.replace('.js', '').toLowerCase() as (typeof allowedMethods)[number];
    if (!allowedMethods.includes(method as any)) {
      throw new Error(`The method is invalid for the file ${controllerFile}.`);
    }
    const urlPath = '/' + parts.map((p) => openApiPathToExpressPath(p)).join('/');
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
    console.log({
      event: 'RESPONSE',
      time: new Date().toISOString(),
      statusCode: res.statusCode,
    });
    next();
  });
  return router;
};

export const catchError = (err, req, res: Response, next) => {
  let json;
  if (err instanceof RestError) {
    json = {
      code: err.statusCode,
      data: err.errorData,
    };
  } else {
    console.error(err);
    json = {
      code: 500,
      data: {},
    };
  }
  sendResponse(err, undefined, req, res);
  next();
};

export const registerControllers = async (options: { jwts?: string; scope?: string }) => {
  const { jwts, scope } = options;

  app.use(createTraceHandler());

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

function sendResponse(error, result, req: Request, res: Response) {
  let code, data;
  if (error) {
    if (error instanceof RestError) {
      code = error.statusCode;
      data = error.errorData;
    } else {
      code = 500;
      data = {};
    }
  } else {
    code = 200;
    data = result;
  }
  if (req.useHttpCode) {
    res.status(code).json(data);
  } else {
    res.status(200).json({
      code: code === 200 ? 1 : code,
      data,
    });
  }
}
