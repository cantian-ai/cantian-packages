import { AsyncLocalStorage } from 'async_hooks';
import { randomBytes } from 'crypto';

function generateTraceId() {
  const buffer = randomBytes(6);
  const bigInt = BigInt('0x' + buffer.toString('hex'));
  return bigInt.toString(36);
}

if (!globalThis.__alsInstance) {
  globalThis.__alsInstance = new AsyncLocalStorage<{ traceId: string }>();
}
export const createTraceHandler = () => (req, res, next) => {
  let traceId: string = req.headers['x-trace-id'];
  if (typeof traceId === 'string') {
    console.log(`Use traceId from header: ${traceId}`);
  } else {
    traceId = generateTraceId();
    console.log(`Generate a new traceId: ${traceId}`);
  }
  globalThis.__alsInstance.run({ traceId }, () => {
    next();
  });
};

export const getTraceId = () => {
  return globalThis.__alsInstance.getStore()?.traceId;
};
