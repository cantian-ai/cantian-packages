import 'express';

export type Auth = {
  sub: string;
  name: string;
  scopes?: string[];
  client_id?: string;
};

declare module 'express-serve-static-core' {
  interface Request {
    rawBody: Buffer;
  }
}

export {};
