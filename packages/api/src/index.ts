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
  };
  if (options.personateSub) {
    headers['x-personate-sub'] = options.personateSub;
  }

  const response = await fetch(`${basepath}${path}`, {
    headers,
    body: data ? JSON.stringify(data) : undefined,
    method,
  });
  if (response.ok) {
    return await response.json();
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
