# ai

`@cantian/ai` 提供统一的 LLM 抽象，核心入口是 `BaseLlm`：

- `stream()`：底层流式接口，返回 `ModelChunk`
- `invoke()`：单轮调用聚合结果（常用于“只要最终答案”）
- `agenticStream()`：多轮 Agent 流程（模型可调用工具并自动续轮）

## BaseLlm.invoke

### 适用场景

- 你只关心这轮最终文本、是否有 tool call、以及 usage
- 不想自己消费 `TOKEN` 增量流

### 方法签名

```ts
invoke(input: MessageChunk[], options?: T): Promise<{
  toolCall?: ToolCallChunk;
  message: string;
  usage?: UsageChunk;
}>
```

### 行为说明

- 内部会遍历 `stream(input, options)` 并聚合结果
- `MESSAGE` 会拼接到 `message`
- `TOOL_CALL` 只保留最后一个到 `toolCall`
- `USAGE` 只保留最后一个到 `usage`

### 示例

```ts
import { ResponseLlm, MessageChunk } from '@cantian/ai';

const llm = new ResponseLlm(
  process.env.LLM_URL!,
  process.env.LLM_API_KEY!,
  'deepseek-chat',
);

const input: MessageChunk[] = [
  { role: 'system', content: '你是一个简洁的助手' },
  { role: 'user', content: '用一句话解释什么是 RAG' },
];

const { message, toolCall, usage } = await llm.invoke(input, {
  temperature: 0.2,
});

console.log('message:', message);
console.log('toolCall:', toolCall); // 无工具调用时为 undefined
console.log('usage:', usage?.totalTokens);
```

## BaseLlm.agenticStream

### 适用场景

- 需要让模型自动调用工具并继续多轮推理
- 需要实时消费模型 token、工具执行过程、最终 Agent 汇总用量

### 方法签名

```ts
agenticStream(
  messages: any[],
  modelOptions: Omit<T, 'signal' | 'logMeta'>,
  options?: {
    signal?: AbortSignal;
    maxRounds?: number;   // 默认 10
    context?: any;        // 透传给 tool.handler(args, context)
    logMeta?: any;        // 记录 Agent usage
    tokenUsageId?: string;
  },
): AsyncGenerator<AgentChunk>
```

### 执行流程

1. 用当前 `input` 调一次 `stream()`
2. 收到 `TOOL_CALL` 后执行对应工具，并产出工具相关事件
3. 把 `TOOL_CALL` 和 `TOOL_CALL_OUTPUT` 回填到 `input`
4. 如仍有 tool call 且未达到 `maxRounds`，继续下一轮
5. 最后一定产出一个 `AGENT_USAGE` 作为整段流程汇总

### 事件类型

`agenticStream()` 会产出 `AgentChunk`，包括：

- `MODEL_CALLING`: 已发起模型请求（`url`, `init`）
- `TOKEN`: 文本增量（`delta`）
- `MESSAGE`: 本轮完整回复
- `TOOL_CALL`: 模型请求调用工具
- `TOOL_CALLING`: 开始执行工具
- `AGENTIC_TOOL_TOKEN`: 工具执行过程中的增量输出
- `TOOL_CALL_OUTPUT`: 工具执行结果（或错误）
- `USAGE`: 每一轮模型调用用量
- `AGENT_USAGE`: 整个 agent 多轮调用汇总（包含 `tokenUsageId`）

### 示例（含工具）

```ts
import { randomUUID } from 'node:crypto';
import { ResponseLlm, MessageChunk, Tool } from '@cantian/ai';

const llm = new ResponseLlm(
  process.env.LLM_URL!,
  process.env.LLM_API_KEY!,
  'deepseek-chat',
);

const tools: Record<string, Tool<{ cityMap: Record<string, string> }>> = {
  get_weather: {
    name: 'get_weather',
    description: '查询城市天气',
    parameters: {
      type: 'object',
      properties: {
        city: { type: 'string' },
      },
      required: ['city'],
      additionalProperties: false,
    },
    handler: async ({ city }, context) => {
      const weather = context.cityMap[city] || 'unknown';
      return { city, weather };
    },
    toAiText: (result) => `weather=${result.weather}`,
  },
};

const messages: MessageChunk[] = [{ role: 'user', content: '帮我查一下北京天气' }];
const tokenUsageId = randomUUID();

for await (const chunk of llm.agenticStream(
  messages,
  { tools, temperature: 0.2 },
  {
    maxRounds: 5,
    context: { cityMap: { 北京: 'sunny' } },
    tokenUsageId,
    logMeta: { traceId: 'trace-001' },
  },
)) {
  switch (chunk.type) {
    case 'TOKEN':
      process.stdout.write(chunk.delta);
      break;
    case 'TOOL_CALLING':
      console.log('\ncalling tool:', chunk.name);
      break;
    case 'TOOL_CALL_OUTPUT':
      console.log('\ntool output:', chunk.result ?? chunk.error);
      break;
    case 'AGENT_USAGE':
      console.log('\nagent usage id:', chunk.tokenUsageId); // 与传入 tokenUsageId 一致
      console.log('total tokens:', chunk.totalTokens);
      break;
  }
}
```

## tokenUsageId 用法

如果你要在开始前就落库一条消息记录，推荐在 `agenticStream()` 传入 `options.tokenUsageId`。这样：

- 流程开始就有稳定 ID 可关联业务记录
- 最终 `AGENT_USAGE.tokenUsageId` 会返回同一个 ID
