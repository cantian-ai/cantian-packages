// 注意只重试非http错误，避免本机网络抖动造成的问题
const basicFetch: typeof fetch = async (input, init?) => {
  let lastError: any;
  for (let i = 0; i < 2; i++) {
    if (i !== 0) {
      await new Promise((r) => setTimeout(r, 1000));
    }
    const startedAt = new Date().toISOString();
    try {
      return await fetch(input, init);
    } catch (error) {
      if (init?.signal?.aborted) {
        throw error;
      }
      lastError = error;
      console.warn(`FETCH_ERROR_${i + 1}_TIMES`, { input, init, startedAt, now: new Date().toISOString() }, error);
    }
  }
  console.error(`FETCH_ERROR_LAST_TIME`, { input, init }, lastError);
  throw lastError;
};

export const createWithTimeoutFetch = (timeout: number, originalFetch: typeof fetch = basicFetch) => {
  const withTimeoutFetch: typeof fetch = (input, init?) => {
    const timeoutSignal = AbortSignal.timeout(timeout);
    return originalFetch(input, {
      ...init,
      signal: init?.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal,
    });
  };
  return withTimeoutFetch;
};

export const createThrowHttpErrorFetch = (originalFetch: typeof fetch = basicFetch) => {
  const throwHttpErrorFetch: typeof fetch = async (input, init?) => {
    const response = await originalFetch(input, init);
    if (!response.ok) {
      const text = await response.text();
      console.error(`FETCH_ERROR_HTTP_NOT_OK`, { input, init, text });
      throw new Error(`Fetch failed(${response.status}): ${text}`);
    }
    return response;
  };
  return throwHttpErrorFetch;
};
