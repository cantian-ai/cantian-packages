import { createThrowHttpErrorFetch, createWithTimeoutFetch } from './basic.js';

export { api } from './api.js';
export * from './basic.js';
export { sse } from './sse.js';
export const request = createThrowHttpErrorFetch(createWithTimeoutFetch(10000, fetch));
