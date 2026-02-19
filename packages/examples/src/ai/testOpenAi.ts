import OpenAI from 'openai';

const endpoint = 'https://cantian-openai.services.ai.azure.com/openai/v1/';
const modelName = 'DeepSeek-V3.2';
const deployment_name = 'DeepSeek-V3.2';
const api_key = process.env.AZURE_DEEPSEEK_API_KEY;

const client = new OpenAI({
  baseURL: endpoint,
  apiKey: api_key,
});

async function main() {
  const completion = await client.chat.completions.create({
    messages: [
      { role: 'system', content: 'You talk like a pirate.' },
      { role: 'user', content: '今天日期' },
    ],
    model: deployment_name,
    tools: [
      {
        type: 'function',
        function: {
          name: 'getDate',
          description: '获取今天日期',
          parameters: {},
        },
      },
    ],
  });

  console.log(completion.choices[0]);
}

main();
