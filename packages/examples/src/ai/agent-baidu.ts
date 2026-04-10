import { CompletionLlm, Tool } from 'cantian-ai';
import util from 'node:util';

util.inspect.defaultOptions.depth = 12;

(async () => {
  const tools = {
    getDate: {
      name: 'getDate',
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
  } satisfies Record<string, Tool>;

  const deepseek = new CompletionLlm(
    'https://qianfan.baidubce.com/v2/chat/completions',
    process.env.BAIDU_API_KEY!,
    'deepseek-v3.2',
    { temperature: 1.3 },
  );
  try {
    for await (const chunk of deepseek.agenticStream(
      [{ role: 'user', content: '今天日期？' }],
      {
        tools,
      },
      {
        context: { userId: 'abcd' },
        maxRounds: 2,
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
