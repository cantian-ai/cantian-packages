import { getTraceId } from 'cantian-als';
import { limitFunction } from 'p-limit';

export type API_OPTIONS = {
  basepath?: string;
  path: string; // Without '/rest' prefix
  key?: string;
  method: 'GET' | 'POST' | 'PATCH';
  data?: Object;
  personateSub?: string;
  source?: string;
  locale?: string;
};

const limitedFetch = limitFunction(
  ((url, options) => {
    const abortController = new AbortController();
    const id = setTimeout(() => abortController.abort(), 10000);
    return fetch(url, options).finally(() => clearTimeout(id));
  }) as typeof fetch,
  { concurrency: 10 },
);

export const api = async (options: API_OPTIONS) => {
  const { basepath = process.env.API_BASEPATH, path, key = process.env.API_KEY_INTERNAL, data, method } = options;

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
    'x-trace-id': getTraceId(),
  };
  if (options.personateSub) {
    headers['x-personate-sub'] = options.personateSub;
  }
  if (options.source) {
    headers['x-source'] = options.source;
  }
  if (options.locale) {
    headers['x-locale'] = options.locale;
  }

  let response: Response;
  let startedAt = Date.now();
  const body = data ? JSON.stringify(data) : undefined;
  const url = `${basepath}${path}`;
  try {
    response = await limitedFetch(url, { headers, body, method });
  } catch (error1) {
    const elapsed1 = Date.now() - startedAt;
    console.log({ message: 'Fetch failed first time. Retry later.', options, error1, elapsed1 });
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      response = await limitedFetch(url, { headers, body, method });
      console.log({ message: 'Fetch succeeded second time.', options, elapsed: Date.now() - startedAt });
    } catch (error2) {
      console.error({ message: 'Fetch failed second time.', options, error: error2, elapsed: Date.now() - startedAt });
      throw error2;
    }
  }

  if (response.ok) {
    const result = (await response.json()) as { code: number; data: any };
    if (result.code !== 1) {
      throw new Error(JSON.stringify(result));
    }
    return result.data;
  } else {
    const text = await response.text();
    console.error({
      message: 'Request Cantian API failed.',
      options,
      response: {
        statusCode: response.status,
        text: text,
      },
    });
    throw new Error(text);
  }
};
