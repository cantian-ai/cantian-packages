import { extractProviderError } from './providerError.js';
import { observeRequest, requestFailure, responseMetadata } from './observation.js';
import type { RequestObserver } from './observation.js';

// 注意只重试非http错误，避免本机网络抖动造成的问题
export const createRetryFetch = (
  originalFetch: typeof fetch = fetch,
  shouldRetry: (
    error: unknown,
    input: Parameters<typeof fetch>[0],
    init: Parameters<typeof fetch>[1],
  ) => boolean = () => true,
  observer?: RequestObserver,
) => {
  const retryFetch: typeof fetch = async (input, init?) => {
    let lastError: unknown;
    for (let i = 0; i < 2; i++) {
      if (i !== 0) {
        await new Promise((r) => setTimeout(r, 1000));
      }
      const startedAt = new Date().toISOString();
      observeRequest(observer, { type: 'attempt', attempt: i + 1 });
      try {
        return await originalFetch(input, init);
      } catch (error) {
        const failure = requestFailure(error, { phase: 'connect', signal: init?.signal ?? undefined });
        if (init?.signal?.aborted || !shouldRetry(error, input, init)) {
          observeRequest(observer, failure);
          throw error;
        }
        lastError = error;
        console.warn(`FETCH_ERROR_${i + 1}_TIMES`, { input, init, startedAt, now: new Date().toISOString() }, error);
      }
    }
    const failure = requestFailure(lastError, { phase: 'connect', signal: init?.signal ?? undefined });
    console.error('FETCH_ERROR_LAST_TIME', { input, init }, lastError);
    observeRequest(observer, failure);
    throw lastError;
  };
  return retryFetch;
};

export const createWithTimeoutFetch = (timeout: number, originalFetch: typeof fetch = createRetryFetch()) => {
  const withTimeoutFetch: typeof fetch = (input, init?) => {
    const timeoutSignal = AbortSignal.timeout(timeout);
    return originalFetch(input, {
      ...init,
      signal: init?.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal,
    });
  };
  return withTimeoutFetch;
};

/** Retains the existing error message; structured metadata contains no body or credentials. */
export class HttpRequestError extends Error {
  readonly status: number;
  readonly requestId?: string;
  readonly retryAfterMs?: number;
  readonly providerCode?: string;
  readonly providerMessage?: string;

  constructor(response: Response, text: string) {
    super(`Fetch failed(${response.status}): ${text}`);
    const metadata = responseMetadata(response, text);
    this.status = metadata.status;
    this.requestId = metadata.requestId;
    this.retryAfterMs = metadata.retryAfterMs;
    if (text.length <= 8192 && new TextEncoder().encode(text).byteLength <= 8192) {
      try {
        const details = extractProviderError(JSON.parse(text));
        this.providerCode = details.providerCode;
        this.providerMessage = details.providerMessage;
      } catch {}
    }
  }
}

export const createThrowHttpErrorFetch = (originalFetch: typeof fetch = createRetryFetch(), observer?: RequestObserver) => {
  const throwHttpErrorFetch: typeof fetch = async (input, init?) => {
    let response: Response;
    try { response = await originalFetch(input, init); }
    catch (error) {
      observeRequest(observer, requestFailure(error, { phase: 'connect', signal: init?.signal ?? undefined }));
      throw error;
    }
    if (observer) observeRequest(observer, { type: 'response', ...responseMetadata(response) });
    if (!response.ok) {
      const metadata = responseMetadata(response);
      // Existing business behavior reads this body to construct Error.message. Monitoring adds no
      // extra read/copy, and never passes the text or original Error to its observer.
      let text: string;
      try { text = await response.text(); }
      catch (error) {
        observeRequest(observer, requestFailure(error, { phase: 'read', ...metadata, signal: init?.signal ?? undefined }));
        throw error;
      }
      const error = new HttpRequestError(response, text);
      console.error('FETCH_ERROR_HTTP_NOT_OK', { input, init, text });
      observeRequest(observer, requestFailure(error, { phase: 'response', ...metadata }));
      throw error;
    }
    return response;
  };
  return throwHttpErrorFetch;
};
