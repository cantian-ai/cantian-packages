import { CompletionLlm } from 'cantian-ai';

const llm = new CompletionLlm(
  'https://qianfan.baidubce.com/v2/chat/completions',
  process.env.BAIDU_API_KEY as string,
  'deepseek-v4-pro',
  { textSchemaType: 'BAIDU' },
);

const response = await llm.invoke(
  [
    {
      role: 'user',
      content: 'hi',
    },
  ],
  {
    temperature: 0.9,

    extRequestParams: {
      temperature: 1.3,
      extRequestParams: {
        max_completion_tokens: 18000,
        thinking: {
          type: 'disabled',
        },
        web_search: {
          enable: false,
        },
      },
    },
  },
);
console.log(response);
