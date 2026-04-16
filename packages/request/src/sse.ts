import { createParser, EventSourceMessage } from 'eventsource-parser';
import { createThrowHttpErrorFetch } from './basic.js';

const basicSse = createThrowHttpErrorFetch();

export interface SseExtOptions {
  idleTimeoutMs?: number;
}

const withTimeoutInit = (init: RequestInit | undefined, timeoutSignal: AbortSignal): RequestInit => {
  return {
    ...init,
    signal: init?.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal,
  };
};

export const sse = async function* (input: string | URL | globalThis.Request, init?: RequestInit, extOptions?: SseExtOptions) {
  const idleTimeoutMs = extOptions?.idleTimeoutMs ?? 300000;
  const connectTimeoutController = new AbortController();
  const connectTimeoutId = setTimeout(() => {
    connectTimeoutController.abort(new Error(`SSE idle timeout while waiting for response (${idleTimeoutMs}ms)`));
  }, idleTimeoutMs);

  let response: Response;
  try {
    response = await basicSse(input, withTimeoutInit(init, connectTimeoutController.signal));
  } finally {
    clearTimeout(connectTimeoutId);
  }

  if (!response.body) {
    console.error(`FETCH_ERROR_NO_BODY`);
    throw new Error('No body');
  }
  const reader = response.body.getReader();
  let idleError: Error | undefined;
  let readStartedAt: number | undefined;
  const idleCheckId = setInterval(() => {
    if (!idleError && readStartedAt && Date.now() - readStartedAt >= idleTimeoutMs) {
      const idleMs = Date.now() - readStartedAt;
      idleError = new Error(`SSE idle timeout while waiting for data (${idleMs}ms >= ${idleTimeoutMs}ms)`);
      void reader.cancel(idleError).catch(() => {});
    }
  }, 1000);
  const pending: EventSourceMessage[] = [];
  let parserError: unknown;
  const decoder = new TextDecoder();
  const parser = createParser({
    onEvent(event) {
      pending.push(event);
    },
    onError(error) {
      parserError = error;
    },
  });

  try {
    while (true) {
      while (pending.length) {
        yield pending.shift();
      }

      readStartedAt = Date.now();
      const chunk = await reader.read();
      readStartedAt = undefined;
      if (idleError) {
        throw idleError;
      }
      const { value, done } = chunk;
      if (done) {
        const tail = decoder.decode();
        if (tail) {
          parser.feed(tail);
          if (parserError) {
            throw parserError;
          }
        }
        while (pending.length) {
          yield pending.shift();
        }
        break;
      }

      parser.feed(decoder.decode(value, { stream: true }));
      if (parserError) {
        throw parserError;
      }
    }
  } finally {
    clearInterval(idleCheckId);
    try {
      await reader.cancel();
    } catch {}
    try {
      reader.releaseLock();
    } catch {}
  }
};
