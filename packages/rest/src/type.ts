import 'express';

export type Auth = {
  sub: string;
  scopes?: string[];
  client_id?: string;
  [key: string]: any;
};

declare module 'express-serve-static-core' {
  interface Request {
    rawBody: Buffer;
  }
}

export {};
