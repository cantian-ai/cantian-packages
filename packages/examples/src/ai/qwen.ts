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
    'qwen3-max',
  );

  const result = await completion.invoke(
    [
      { role: 'assistant', content: '' },
      { role: 'user', content: '你好' },
    ],
    {
      logMeta: { traceId: 'gaga2' },
      textSchema: {
        type: 'object',
        properties: {
          text: { type: 'string' },
        },
        additionalProperties: false,
        required: ['text'],
      },
    },
  );
  console.log(JSON.stringify(result, undefined, 2));
  console.log(JSON.parse(result.message));
  console.log('Done');
})();
