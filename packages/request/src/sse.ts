import { createParser, EventSourceMessage } from 'eventsource-parser';
import { createRetryFetch, createThrowHttpErrorFetch } from './basic.js';
import { observeRequest, requestFailure } from './observation.js';
import type { RequestFailurePhase, RequestObserver } from './observation.js';

const originalSseFetch = fetch;
const basicSse = createThrowHttpErrorFetch(createRetryFetch(originalSseFetch));

export interface SseExtOptions {
  idleTimeoutMs?: number;
  observer?: RequestObserver;
}

const withTimeoutInit = (init: RequestInit | undefined, timeoutSignal: AbortSignal): RequestInit => {
  return {
    ...init,
    signal: init?.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal,
  };
};

export const sse = async function* (input: string | URL | globalThis.Request, init?: RequestInit, extOptions?: SseExtOptions) {
  const observer = extOptions?.observer;
  const idleTimeoutMs = extOptions?.idleTimeoutMs ?? 300000;
  let phase: RequestFailurePhase = 'connect';
  let status: number | undefined;
  let requestId: string | undefined;
  // Retries expose attempt numbers but only the SSE boundary emits a terminal error.
  const forward: RequestObserver | undefined = observer ? (event) => {
    if (event.type === 'response') {
      phase = 'response';
      status = event.status;
      requestId = event.requestId;
    }
    if (event.type !== 'error') observeRequest(observer, event);
  } : undefined;
  const fetchSse = forward ? createThrowHttpErrorFetch(createRetryFetch(originalSseFetch, () => true, forward), forward) : basicSse;
  const connectTimeoutController = new AbortController();
  const connectTimeoutId = setTimeout(() => {
    connectTimeoutController.abort(new Error(`SSE idle timeout while waiting for response (${idleTimeoutMs}ms)`));
  }, idleTimeoutMs);

  let response: Response;
  try {
    response = await fetchSse(input, withTimeoutInit(init, connectTimeoutController.signal));
  } catch (error) {
    observeRequest(observer, requestFailure(error, { phase, status, requestId,
      signal: init?.signal ?? undefined, timeout: connectTimeoutController.signal.aborted }));
    throw error;
  } finally {
    clearTimeout(connectTimeoutId);
  }

  if (!response.body) {
    console.error('FETCH_ERROR_NO_BODY');
    const error = new Error('No body');
    observeRequest(observer, requestFailure(error, { phase: 'response', status, requestId, protocol: true }));
    throw error;
  }
  let reader: ReadableStreamDefaultReader<Uint8Array>;
  try { reader = response.body.getReader(); }
  catch (error) {
    observeRequest(observer, requestFailure(error, { phase: 'read', status, requestId, signal: init?.signal ?? undefined }));
    throw error;
  }
  let idleError: Error | undefined;
  let readStartedAt: number | undefined;
  let contentObserved = false;
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
      phase = 'read';
      readStartedAt = Date.now();
      const chunk = await reader.read();
      readStartedAt = undefined;
      if (idleError) {
        throw idleError;
      }
      const { value, done } = chunk;
      if (done) {
        phase = 'parse';
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
      if (value?.byteLength && !contentObserved) {
        contentObserved = true;
        observeRequest(observer, { type: 'content' });
      }
      phase = 'parse';
      parser.feed(decoder.decode(value, { stream: true }));
      if (parserError) {
        throw parserError;
      }
    }
  } catch (error) {
    observeRequest(observer, requestFailure(error, { phase, status, requestId,
      signal: init?.signal ?? undefined, timeout: !!idleError, protocol: phase === 'parse' }));
    throw error;
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
