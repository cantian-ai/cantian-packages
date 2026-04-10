import { CompletionLlm, Tool } from 'cantian-ai';
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
  const completion = new CompletionLlm(
    'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    process.env.BAILIAN_API_KEY!,
    'deepseek-v3.2',
  );

  const result = await completion.invoke(
    [
      { role: 'assistant', content: '任何情况下，你必须先调用echo工具来回显用户消息' },
      { role: 'user', content: '你好' },
    ],
    {
      logMeta: { traceId: 'gaga2' },
      tools: {
        echo: {
          name: 'echo',
          description: '回显',
          parameters: {
            type: 'object',
            properties: {
              text: { type: 'string' },
            },
            required: ['text'],
            additionalProperties: false,
          },
          handler() {},
        },
      },
    },
  );
  console.log(JSON.stringify(result, undefined, 2));
  console.log(result.toolCall);
  console.log('Done');
})();
