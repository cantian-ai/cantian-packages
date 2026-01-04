import { getTraceId } from 'cantian-als';
import { limitFunction } from 'p-limit';
import { createThrowHttpErrorFetch, createWithTimeoutFetch } from './basic.js';

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

const basicApi = createThrowHttpErrorFetch(createWithTimeoutFetch(10000, fetch));

export const api = limitFunction(
  async (options: API_OPTIONS) => {
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
    const body = data ? JSON.stringify(data) : undefined;
    const url = `${basepath}${path}`;
    const init = { headers, body, method };
    const response = await basicApi(url, init);
    if (response.status !== 204) {
      const text = await response.text();
      let result: { code: number; data: any };
      try {
        result = JSON.parse(text);
      } catch (error) {
        console.log(`FETCH_ERROR_API_INVALID_JSON`, { url, init, text });
        throw new Error(`API returns a non-JSON string: ${text}`);
      }
      if (result.code !== 1) {
        throw new Error(JSON.stringify(result));
      }
      return result.data;
    }
  },
  { concurrency: 10 },
);
