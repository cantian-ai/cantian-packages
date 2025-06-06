import 'express';

export type Auth = {
  sub: string;
  name: string;
  aud: string;
  scopes?: string[];
};

declare module 'express-serve-static-core' {
  interface Request {
    auth?: Auth;
  }
}

export {};
