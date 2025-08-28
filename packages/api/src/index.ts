import { getTraceId } from 'cantian-als';

export type API_OPTIONS = {
  basepath?: string;
  path: string; // Without '/rest' prefix
  key?: string;
  method: 'GET' | 'POST' | 'PATCH';
  data?: Object;
  personateSub?: string;
};

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

  let response: Response;

  try {
    response = await fetch(`${basepath}${path}`, {
      headers,
      body: data ? JSON.stringify(data) : undefined,
      method,
    });
  } catch (error) {
    console.error({
      message: 'Fetch failed.',
      options,
      error,
    });
    throw error;
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
