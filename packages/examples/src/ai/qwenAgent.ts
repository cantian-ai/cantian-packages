import { CompletionLlm, Tool } from 'cantian-ai';
import util from 'node:util';

util.inspect.defaultOptions.depth = 12;

(async () => {
  // const url = 'https://openapi-dev.cantian.ai/mcp?tools=Get_bazi_from_solar,Get_bazi_from_lunar';
  // const authorization = process.env.API_KEY_INTERNAL!;
  // const tools = await listAgentTools({ url, authorization });
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

  const completion = new CompletionLlm(
    'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    process.env.BAILIAN_API_KEY!,
    'qwen3-max',
  );
  try {
    for await (const chunk of completion.agenticStream(
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
