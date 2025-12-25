import Ajv, { ValidateFunction } from 'ajv';
import { Request, Response } from 'express';
import { createLocalJWKSet, jwtVerify } from 'jose';
import { JSONSchema } from 'json-schema-to-ts';
import { IncomingHttpHeaders } from 'node:http';
import { rateLimit } from './rateLimit.js';
import { RestError } from './RestError.js';
import { Auth } from './type.js';
import { sendFlatResponse, sendRestResponse } from './util.js';

const SERVICE_NAME = process.env.SERVICE_NAME;
if (!SERVICE_NAME) {
  throw new Error(`Env SERVICE_NAME is required.`);
}
const DEFAULT_RPM = Number(process.env.DEFAULT_RPM) || 60;

export class BaseController {
  static useHttpCode?: boolean;
  static summary: string;
  static description: string;

  static dataAjv = new Ajv.default({ removeAdditional: true, useDefaults: true });
  static validateData: ValidateFunction | undefined;

  static resultAjv = new Ajv.default({ removeAdditional: true, useDefaults: true });
  static validateResult: ValidateFunction | undefined;

  static jwts: ReturnType<typeof createLocalJWKSet>;
  static isPublic?: boolean;
  static scope?: string;

  static method: string;
  static path: string;

  declare ['constructor']: typeof BaseController;

  data?: any;
  auth?: Auth;
  pathParams?: Record<string, string>;
  rawBody?: Buffer;
  headers?: IncomingHttpHeaders;
  source?: string;
  req: Request;
  res: Response;

  static initBase(options: { jwks: string }) {
    this.jwts = createLocalJWKSet(JSON.parse(options.jwks));
  }

  static init(options: { method: string; path: string }) {
    const dataSchema = this.dataSchema();
    this.validateData = dataSchema ? this.dataAjv.compile(dataSchema) : undefined;

    const resultSchema = this.resultSchema();
    this.validateResult = resultSchema ? this.resultAjv.compile(resultSchema) : undefined;

    this.method = options.method;
    this.path = options.path;
  }

  constructor(event: { req: Request; res: Response }) {
    this.data = event.req.body;
    this.pathParams = event.req.params;
    this.rawBody = event.req.rawBody;
    this.headers = event.req.headers;
    this.req = event.req;
    this.res = event.res;
  }

  static dataSchema(): JSONSchema | undefined {
    return undefined;
  }

  static resultSchema(): JSONSchema | undefined {
    return undefined;
  }

  async execute() {
    const startedAt = Date.now();
    console.log({
      message: 'Received a request.',
      endpoint: `${this.req.method} ${this.req.path}`,
      data: this.data,
    });
    const constructor = this.constructor;
    let error: null | any = null;
    try {
      await this.authorize();

      // admin和public接口都不限流
      if (this.constructor.scope !== '*:admin' && this.auth) {
        // 由后端发起的代理调用不限流
        if (!(this.auth.scopes?.includes('*:admin') && this.req.get('x-personate-sub'))) {
          await rateLimit(`${SERVICE_NAME}/${this.auth.sub}`, DEFAULT_RPM);
        }
      }

      // Validate data
      if (constructor.validateData && !constructor.validateData(this.data)) {
        throw RestError.badRequest('Invalid request body.', constructor.validateData.errors?.[0]);
      }

      // Run and validate result
      const result = await this.run();
      if (constructor.validateResult) {
        if (!constructor.validateResult(result)) {
          throw RestError.internal('Unexpected result.', constructor.validateResult.errors?.[0]);
        }
      }
      await this.sendResponse(undefined, result);
      return { result };
    } catch (err) {
      error = true;
      if (!this.res.headersSent) {
        await this.sendResponse(err);
      }
      return { error: err };
    } finally {
      console.log({
        error,
        method: constructor.method,
        path: constructor.path,
        message: 'Request finished.',
        elapsed: Date.now() - startedAt,
        source: this.source,
        sub: this.auth?.sub,
      });
      this.finallyCallback();
    }
  }

  async sendResponse(error, result?) {
    if (this.constructor.useHttpCode) {
      return sendRestResponse(error, result, this.res);
    } else {
      return sendFlatResponse(error, result, this.res);
    }
  }

  async finallyCallback() {}

  async run(): Promise<any> {
    throw RestError.internal('Method not implemented.');
  }

  async authorize() {
    this.source = this.req.get('x-source');
    const isPublic = this.constructor.isPublic;

    // Extract token
    let token = (this.req.headers['token'] || this.req.headers['authorization']) as string;
    if (!token && !isPublic) {
      throw RestError.unauthorized('Authorization header is required.');
    }

    if (token) {
      if (token.startsWith('Bearer ')) {
        token = token.replace('Bearer ', '');
      }

      // Validate token
      try {
        const { payload } = await jwtVerify(token, this.constructor.jwts);

        const scopes = (payload.scope as string | undefined)?.split(' ');
        if (this.constructor.scope && !scopes?.includes(this.constructor.scope)) {
          throw RestError.forbidden();
        }

        this.auth = {
          sub: payload.sub as string,
          name: payload.name as string,
          scopes,
        };

        if (!this.source) {
          this.source = payload.client_id as string;
        }

        if (scopes?.includes('*:admin')) {
          this.auth.sub = (this.req.headers['x-personate-sub'] as string) || this.auth.sub;
        }
      } catch (error) {
        if (!isPublic) {
          if (!(error instanceof RestError)) {
            throw RestError.unauthorized();
          }
          throw error;
        } else {
          console.log(`PUBLIC_ACCESS_WITH_INVALID_TOKEN`);
        }
      }
    }
  }
}
