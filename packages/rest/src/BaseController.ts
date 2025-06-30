import Ajv, { ValidateFunction } from 'ajv';
import { Request, Response } from 'express';
import { createLocalJWKSet, jwtVerify } from 'jose';
import { JSONSchema } from 'json-schema-to-ts';
import { IncomingHttpHeaders } from 'node:http';
import { RestError } from './RestError.js';
import { Auth } from './type.js';
import { sendFlatResponse, sendRestResponse } from './util.js';

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
  req: Request;
  res: Response;

  static initBase(options: { jwts: string }) {
    this.jwts = createLocalJWKSet(JSON.parse(options.jwts));
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
    const constructor = this.constructor;
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
    try {
      const constructor = this.constructor;

      await this.authorize();

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
    } catch (error) {
      if (!this.res.headersSent) {
        await this.sendResponse(error);
      }
      return { error };
    } finally {
      console.log({ message: 'Request finished.', elapsed: Date.now() - startedAt });
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
    if (this.constructor.isPublic) {
      return;
    }

    // Extract token
    let token = (this.req.headers['token'] || this.req.headers['authorization']) as string;
    if (!token) {
      throw RestError.unauthorized('Authorization header is required.');
    }
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
        aud: payload.aud as string,
        scopes,
      };

      if (scopes?.includes('*:admin')) {
        this.auth.sub = (this.req.headers['x-personate-sub'] as string) || this.auth.sub;
      }
    } catch (error) {
      if (!(error instanceof RestError)) {
        throw RestError.unauthorized();
      }
      throw error;
    }
  }
}
