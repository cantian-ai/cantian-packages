import { AgentTool, DeepseekModel } from 'cantian-ai';
import { JSONSchema } from 'json-schema-to-ts';

(async () => {
  const tools: AgentTool[] = [
    {
      name: 'getDate',
      description: '获取日期',
      parameters: {
        type: 'object',
        properties: {
          format: { type: 'string' },
        },
      } satisfies JSONSchema,
      handler(args, context) {
        const { format } = args;
        console.log('CONTEXT', context);
        if (format === 'ISO') {
          return new Date().toISOString();
        }
        throw new Error('Only support ISO format');
      },
    },
  ];
  const deepseek = new DeepseekModel(
    'https://ark.cn-beijing.volces.com/api/v3/responses',
    process.env.DEEPSEEK_API_KEY!,
    'deepseek-v3-1-250821',
    { tools },
  );

  // try {
  //   for await (const chunk of deepseek.stream([{ role: 'user', content: '你好，今天日期？' }], {})) {
  //     console.log(chunk);
  //   }
  // } catch (error) {
  //   console.error(error);
  // }
  const result = await deepseek.invoke([{ role: 'user', content: '你好' }]);
  console.log(result);
})();
