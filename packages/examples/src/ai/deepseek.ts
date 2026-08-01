import { CompletionLlm, Tool } from 'cantian-ai';
import util from 'node:util';

util.inspect.defaultOptions.depth = 12;

(async () => {
  // const url = 'https://openapi-dev.cantian.ai/mcp?tools=Get_bazi_from_solar,Get_bazi_from_lunar';
  // const authorization = process.env.API_KEY_INTERNAL!;
  // const tools = await listAgentTools({ url, authorization });
  const tools = {
    getTime: {
      name: 'getTime',
      description: 'Get date',
      parameters: { type: 'object' },
      async *handler(args, context) {
        await new Promise((r) => setTimeout(r, 1000));
        yield { process: 'first' };
        await new Promise((r) => setTimeout(r, 1000));
        yield { process: 'second' };
        await new Promise((r) => setTimeout(r, 1000));
        yield { date: new Date().toISOString() };
      },
      toAiText(result) {
        return `今天${result[result.length - 1].date}`;
      },
    },
    getDress: {
      name: 'getDress',
      description: '获取今日适合的衣着颜色',
      handler(args, context) {
        return '红色';
      },
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'YYYY-MM-DD' },
        },
        required: ['date'],
        additionalProperties: false,
      },
    },
  } satisfies Record<string, Tool>;

  const completion = new CompletionLlm(
    'https://api.deepseek.com/chat/completions',
    process.env.ORIGIN_DEEPSEEK_API_KEY!,
    'deepseek-v4-pro',
    {
      temperature: 0.8,
      extRequestParams: {
        // thinking: { type: 'disabled' },
        stream_options: {
          include_usage: true,
        },
      },
    },
  );
  try {
    for await (const chunk of completion.agenticStream(
      [{ role: 'user', content: '今天穿什么颜色好' }],
      {
        tools,
      },
      {
        context: { userId: 'abcd' },
        logMeta: { traceId: 'abcdefg' },
      },
    )) {
      console.log(chunk);
    }
  } catch (error) {
    console.error(error);
  }
  console.log('DONE');
})();
