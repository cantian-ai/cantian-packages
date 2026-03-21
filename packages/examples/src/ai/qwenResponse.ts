import { CompletionLlm } from 'cantian-ai';

const llm = new CompletionLlm(
  'https://dashscope.aliyuncs.com/api/v2/apps/protocols/compatible-mode/v1/responses',
  process.env.BAILIAN_API_KEY!,
  'qwen3.5-plus',
  {
    extRequestParams: {
      stream_options: {
        include_usage: true,
      },
    },
  },
);

for await (const chunk of llm.agenticStream([{ role: 'system', content: '你好, 今天天气？' }], {
  tools: {
    getWeather: {
      name: 'getWeather',
      description: 'get weather',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'ISO格式日期，不带时区，不传则表示今天' },
        },
      },
      handler(args, context) {
        return '晴朗';
      },
    },
  },
})) {
  console.log(chunk);
}
