import { Agent, AgentTool, DeepseekModel } from 'cantian-ai';

(async () => {
  const url = 'https://openapi-dev.cantian.ai/mcp?tools=Get_bazi_from_solar,Get_bazi_from_lunar';
  const authorization = process.env.API_KEY_INTERNAL!;
  // const tools = await listAgentTools({ url, authorization });
  const tools = [
    {
      name: 'getDate',
      description: 'Get date',
      parameters: { type: 'object' },
      handler(args, context, controller) {
        return { date: new Date().toISOString() };
      },
    },
  ] satisfies AgentTool[];

  const deepseek = new DeepseekModel(
    'https://ark.cn-beijing.volces.com/api/v3/responses',
    process.env.DEEPSEEK_API_KEY!,
    'deepseek-v3-1-250821',
  );
  const agent = new Agent({ model: deepseek, tools });
  try {
    for await (const chunk of agent.stream([{ role: 'user', content: '今天日期？' }], {
      context: { userId: 'abcd' },
    })) {
      console.log(chunk);
    }
  } catch (error) {
    console.error(error);
  }
})();
