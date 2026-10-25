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
- `REASONING_TOKEN`: 推理增量（`delta`）
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

## Optional failure monitor (`cantian-ai/monitor`)

This entry point provides observation and bounded delivery primitives. Importing it does not
load the root AI entry point, models, token usage, databases, credentials or internal URLs.
It installs no global hooks, signal handlers, intervals or network clients. Constructing a
monitor/queue also does not start an idle timer. CompletionLlm now supports explicit opt-in
integration as described below; other model protocol coverage remains separate work.

```ts
import { createModelMonitor, createMonitorDeliveryQueue } from 'cantian-ai/monitor';

const queue = createMonitorDeliveryQueue({
  // Supply the application's HTTP adapter. It must honor this independent signal,
  // bound response reads and never log its credentials, body or raw exceptions.
  async send(event, { signal }) {
    const response = await sendToMonitorReceiver(event, signal);
    // Unwrap the receiver's HTTP JSON envelope into {status, data, retryAfterMs}.
    return response;
  },
  onDiagnostic(diagnostic) {
    applicationLogger(diagnostic); // Only stable codes, counts and opaque event IDs.
  },
});

const monitor = createModelMonitor({
  service: 'service-demo',
  environment: 'test',
  release: 'revision-demo',
  scenarios: ['demo.respond'],
  targets: [{
    provider: 'provider-demo',
    endpoint: 'https://example.invalid/v1/completions',
    models: ['model-demo'],
  }],
  report(event) { queue.enqueue(event); },
});

// At the final request-building boundary, pass metadata only. Do not pass a body,
// headers object, prompt, output, or whole business context to this monitor.
const call = monitor.startCall({
  endpoint: 'https://example.invalid/v1/completions',
  model: 'model-demo',
  context: { scenario: 'demo.respond', traceId: 'trace-demo' },
  timeoutMs: 45000,
  observationLayer: 'transport',
});
call.response({ httpStatus: 503, providerRequestId: 'request-demo' });
call.fail(undefined, { phase: 'response', httpStatus: 503 });
// The caller owns shutdown; nothing installs process-wide signal handlers.
await queue.close();
```

`response()` and `content()` only mark that headers/content have been received.
`fail()` reports at most once; `succeed()` and deliberate `cancel()` terminate without
reporting. Distinguish caller cancellation from a timeout at the integration boundary;
a raw `AbortError` is not silently discarded. All instances and contexts are independent.
`report` must enqueue synchronously rather than wait on network/database work. Its sync
throws and async rejections are isolated; model observations never await delivery.

Targets and scenarios are trusted, fixed deployment configuration. Endpoints are matched
by origin + exact fixed path; userinfo, query and fragment are never emitted. Dynamic paths
must be resolved to a configured fixed route at the adapter boundary. Unmatched endpoints,
models and scenarios become `unknown`. Do not place content, credentials or user identifiers
in configuration values or opaque request/trace IDs. Malformed identifiers are omitted or
rejected rather than copied/truncated. Provider errors use local templates and a small
allowlist of network codes, never raw message/stack/cause. Optional providerCode/providerMessage
retain bounded supplier diagnostics after conservative sanitization; arbitrary provider bodies
and unverified free text are omitted.

Event snapshots are rebuilt from known scalar fields, frozen and capped at 8 KiB UTF-8 JSON.
No arbitrary `toJSON`, additional nested fields or original error objects are serialized.
Diagnostic callbacks receive only safe metadata; repeated diagnostic codes are coalesced
within one second. No default logger writes to the console.

Delivery defaults: **100 events / 1 MiB including in-flight events / concurrency 2**.
A send has its own 3-second AbortSignal deadline. Total attempts are capped at 3 (initial
send + 2 retries), delayed about 1 and 5 seconds with jitter. Network exceptions, 408, 429
and 5xx are retryable. Other statuses and malformed success acknowledgments are terminal.
All retries reuse `eventId`. A 2xx acknowledgment must match `eventId`, contain an opaque
`alertId`, and use `aggregated`, `duplicate` or `muted`. The adapter must unwrap `data` from
the receiver JSON envelope; `parseMonitorRetryAfter` handles either Retry-After format.
A 429 Retry-After is honored within the configured retry-delay budget (default 6 seconds);
if longer, the event is dropped with a failure diagnostic instead of retrying prematurely.

Queue parameters are finite and validated; maxAttempts cannot exceed 3. Retry delays are a
pair of milliseconds. `enqueue()` returns false on overflow, invalid input or closure.
The queue has no cross-process durability and does not deduplicate received events.
If a send callback ignores cancellation, its in-flight slot and event budget stay occupied
until it actually settles, so ignored deadlines cannot produce unlimited requests.
`flush(timeoutMs)` waits at most 3 seconds and returns whether drained. `close(timeoutMs)`
stops admission, flushes for that same bounded budget, then aborts outstanding sends and
drops queued events. Closing is idempotent; the caller must still ensure its adapter honors
AbortSignal. Work may be lost on process termination. Queue retry scheduling does not keep
an otherwise idle process alive; an explicit bounded flush/close does.

### Test-environment verification

The suite uses injected send functions and synthetic data, with no paid model or real mail
calls. Per the rollout plan, run it **in the deployed test environment**, after building the
package, with Node.js 22.15+ (the import-isolation test uses `module.registerHooks`):

```sh
MODEL_MONITOR_TEST_ENV=test npm run test:monitor --workspace=cantian-ai
```

Tests live in `packages/ai/tests/monitor.test.mjs` and are not included in the public npm
payload. Include the source test file with the test-environment validation job/artifact;
installing the npm tarball alone does not install the suite. Building/type checking and
`npm pack --dry-run` are static checks, not evidence the test-environment suite passed.

## CompletionLlm opt-in monitoring

`CompletionLlm.stream()` and `invoke()` now accept `monitor` and `monitorContext` in their
existing options object. They are also supported as instance defaults. No monitor means
no failure events, queue or extra network request; importing the AI root does not enable it.
A per-call monitor replaces the instance monitor **by reference**, and `monitor: false`
disables the current call. Context merges instance defaults with per-call known fields
(`scenario`, `traceId`) into a new snapshot, never a shared mutable object.

```ts
import { CompletionLlm } from 'cantian-ai';
// `monitor` is explicitly created/configured with the monitor subpath shown above.
const llm = new CompletionLlm(endpoint, apiKey, modelName, {
  monitor,
  monitorContext: { scenario: 'demo.respond' },
});
await llm.invoke(input, { monitorContext: { traceId: 'trace-demo' } });
await llm.invoke(input, { monitor: false });
```

The integration reuses the already parsed final request for the actual `model`, after
`extRequestParams` overrides. It never puts local monitor/context objects into the provider
body or existing usage metadata. `invoke` consumes `stream` and records only one failure
at that boundary, not one per wrapper or recovered transport attempt. Observation layer is
`sdk`; transport attempt numbers remain available to the optional request-layer observer.

HTTP/network/read/parser failures, 200 responses with provider error payloads, and SSE
`event: error` are observed. Chat Completions terminates with `[DONE]` **or** a nonempty
`finish_reason`; neither missing usage nor `length` is itself an error. A clean EOF with
neither termination signal is reported as protocol/read failure, without adding a new
business throw. Protocol errors that were previously ignored remain ignored by the business
loop; existing JSON parse exceptions and request errors still propagate. Raw provider error
messages are not copied into monitoring events. Original `MODEL_CALLING`/`USAGE` chunks and
usage persistence retain their business data and behavior; do not repurpose those as safe
monitoring snapshots.

Caller abort/consumer return is quiet, while actual timeout reasons are reported. Observer
failures cannot replace model errors or outputs. Observation ends before usage persistence,
so usage-storage failures or downstream output JSON/schema validation do not become provider
faults. This change does **not** implement ResponseLlm or complete Agent multi-round
monitoring coverage; those remain the later B01 task.

`npm run test:monitor --workspace=cantian-ai` now includes both monitor primitives and
CompletionLlm integration tests, gated by `MODEL_MONITOR_TEST_ENV=test`. Integration tests
exercise the real model/request/monitor code using injected fetch/stream responses and a
usage-persistence stub; no database, model provider or mail service is contacted. Run these
in the deployed test environment; they were not executed locally during implementation.

### Provider diagnostic fields

Starting with this source revision, `error.providerCode` (up to 64 ASCII bytes) and
`error.providerMessage` (up to 512 UTF-8 bytes) are optional. HTTP `error.code` / `safeMessage`
retain their controlled semantics. CompletionLlm forwards sanitized HTTP/SSE error fields;
snapshots and delivery repeat sanitization, preventing callbacks from bypassing the boundary.
No original Error.message or successful response body is used as a diagnostic source.

The monitor uses only the pure `cantian-request/provider-error` subpath for the shared
sanitizer. It still imports no request root, fetch wrapper, MongoDB, model or MCP module.
Descriptions must match a reviewed diagnostic sentence after redaction; unknown/unsafe
free text is omitted. This permits useful supplier codes such as `invalid_model` without
forwarding a body or prompt echo. The receiving service must also validate/sanitize the
optional fields before storing or rendering them. Deploy a compatible receiver before the
new sender; old events remain valid when both fields are absent.
