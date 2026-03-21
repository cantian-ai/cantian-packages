import { ResponseLlm, SkillManager } from 'cantian-ai';

const skillManager = new SkillManager({ dir: 'skills' });
const deepseek = new ResponseLlm(
  'https://ark.cn-beijing.volces.com/api/v3/responses',
  process.env.DEEPSEEK_API_KEY!,
  'deepseek-v3-1-250821',
);
try {
  for await (const chunk of deepseek.agenticStream(
    [
      { role: 'system', content: skillManager.getPrompt() },
      { role: 'user', content: '今天日期？' },
    ],
    {
      tools: {
        read: skillManager.getReadTool(),
        runScript: skillManager.getRunScriptTool(),
      },
    },
    {
      context: { userId: 'abcd' },
      maxRounds: 10,
      logMeta: { traceId: 'abcdefg' },
    },
  )) {
    console.log(chunk);
  }
} catch (error) {
  console.error(error);
}
