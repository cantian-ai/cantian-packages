import { DeepseekModel, Tool } from 'cantian-ai';
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
      async handler(args, context) {
        throw new Error('Try again');
      },
      toAiText(result) {
        return `今天${result.date}`;
      },
    },
  } satisfies Record<string, Tool>;

  const deepseek = new DeepseekModel(
    'https://ark.cn-beijing.volces.com/api/v3/responses',
    process.env.DEEPSEEK_API_KEY!,
    'deepseek-v3-1-250821',
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
