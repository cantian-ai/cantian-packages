import { DeepseekModel, Tool } from 'cantian-ai';
import { JSONSchema } from 'json-schema-to-ts';

const schema = {
  type: 'object',
  properties: {
    format: { type: 'string' },
  },
  additionalProperties: false,
} satisfies JSONSchema;

(async () => {
  const tools: Tool<typeof schema>[] = [
    {
      name: 'getDate',
      description: '获取日期',
      parameters: schema,
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
  );

  // try {
  //   for await (const chunk of deepseek.stream([{ role: 'user', content: '你好，今天日期？' }], {})) {
  //     console.log(chunk);
  //   }
  // } catch (error) {
  //   console.error(error);
  // }
  const result = await deepseek.invoke([{ role: 'user', content: '你好' }], { logMeta: { traceId: 'gaga1' } });
  console.log(result);
})();
