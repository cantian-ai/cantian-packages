import { AsyncLocalStorage } from 'async_hooks';

function generateTraceId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

if (!globalThis.__alsInstance) {
  globalThis.__alsInstance = new AsyncLocalStorage<{ traceId: string }>();
}
export const createTraceHandler = (options?: { generateTraceId?: () => string }) => (req, res, next) => {
  const traceId = req.headers['x-trace-id'] || options?.generateTraceId?.() || generateTraceId();
  globalThis.__alsInstance.run({ traceId }, () => {
    next();
  });
};

export const getTraceId = () => {
  return globalThis.__alsInstance.getStore()?.traceId;
};
