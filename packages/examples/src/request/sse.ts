import { sse } from 'cantian-request';

(async () => {
  try {
    const apikey = process.env.DEEPSEEK_API_KEY;
    const data = {
      model: 'deepseek-v3-1-250821',
      input: [
        {
          role: 'user',
          content: '你好',
        },
      ],
      stream: true,
    };
    const response = await sse('https://ark.cn-beijing.volces.com/api/v3/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apikey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    for await (const event of response) {
      console.log(event);
    }
  } catch (error) {
    console.log('Catch error', error);
  }
})();
