import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
import { registerHooks } from 'node:module';
if (process.env.MODEL_MONITOR_TEST_ENV !== 'test') throw new Error('Run in the test environment with MODEL_MONITOR_TEST_ENV=test.');

const originalFetch = globalThis.fetch;
let handleFetch;
globalThis.fetch = (...args) => handleFetch(...args);
// Only replace usage persistence. Exercise the actual model/request/monitor code without a DB.
const hook = registerHooks({ resolve(specifier, context, next) {
  if (specifier === '../tokenUsage.js' && /\/models\//.test(context.parentURL ?? '')) {
    return { shortCircuit: true, url: 'data:text/javascript,' + encodeURIComponent(`
      export function saveModelUsage(...args) {
        globalThis.__monitorUsageCalls.push(args);
        if (globalThis.__monitorUsageError) throw globalThis.__monitorUsageError;
      }
      export function saveAgentUsage() { throw new Error('Agent persistence is out of test scope'); }
    `) };
  }
  return next(specifier, context);
} });
const { CompletionLlm } = await import('../dist/models/CompletionLlm.js');
const { createModelMonitor } = await import('../dist/monitor/index.js');
hook.deregister();
after(() => {
  globalThis.fetch = originalFetch;
  delete globalThis.__monitorUsageCalls; delete globalThis.__monitorUsageError;
});
beforeEach(() => {
  globalThis.__monitorUsageCalls = []; globalThis.__monitorUsageError = undefined;
  handleFetch = async () => { throw new Error('Unexpected test fetch'); };
});
const endpoint = 'https://example.invalid/v1/completions';
const messages = [{ role: 'user', content: 'PRIVATE_SENTINEL' }];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const frame = (data) => `data: ${JSON.stringify(data)}\n\n`;
const token = (content = 'hello') => frame({ choices: [{ delta: { content }, finish_reason: null }] });
const end = (reason = 'stop') => frame({ choices: [{ delta: {}, finish_reason: reason }] });
const response = (text) => new Response(text, { headers: { 'Content-Type': 'text/event-stream', 'x-request-id': 'request-demo' } });
function monitor(events, scenarios = ['demo.respond']) {
  return createModelMonitor({ service: 'service-demo', environment: 'test', scenarios,
    targets: [{ provider: 'provider-demo', endpoint, models: ['model-demo', 'model-final'] }],
    report(event) { events.push(event); } });
}
function model(observer, context = { scenario: 'demo.respond' }) {
  return new CompletionLlm(endpoint, 'PRIVATE_SENTINEL', 'model-demo',
    observer === undefined ? undefined : { monitor: observer, monitorContext: context });
}
async function silenceErrors(action) {
  const error = console.error, warn = console.warn;
  const logs = [];
  console.error = console.warn = (...args) => { logs.push(args); };
  try { return await action(logs); } finally { console.error = error; console.warn = warn; }
}

test('legacy invoke output is identical when monitoring is off or enabled; success emits nothing', async () => {
  const events = [];
  handleFetch = async () => response(token() + end() + 'data: [DONE]\n\n');
  const legacy = await model().invoke(messages);
  const observed = await model(monitor(events)).invoke(messages);
  assert.equal(legacy.message, 'hello');
  assert.equal(observed.message, legacy.message);
  assert.deepEqual(observed.usage.input, legacy.usage.input);
  assert.equal(events.length, 0);
});

test('final request model is observed; control fields never enter request body or usage', async () => {
  const events = [];
  let body;
  handleFetch = async (_url, init) => {
    body = JSON.parse(init.body);
    return new Response('PRIVATE_SENTINEL', { status: 503, headers: { 'x-request-id': 'request-demo' } });
  };
  await silenceErrors(async (logs) => {
    await assert.rejects(model(monitor(events)).invoke(messages, { extRequestParams: { model: 'model-final' } }), /Fetch failed\(503\)/);
    // Legacy request logs retain their original behavior; only monitor events are sanitized.
    assert.ok(JSON.stringify(logs).includes('PRIVATE_SENTINEL'));
  });
  assert.equal(body.model, 'model-final');
  assert.ok(!('monitor' in body) && !('monitorContext' in body));
  assert.equal(events.length, 1);
  assert.equal(events[0].model, 'model-final');
  assert.equal(events[0].error.category, 'http');
  assert.equal(events[0].providerRequestId, 'request-demo');
  assert.equal(events[0].observationLayer, 'sdk');
  assert.ok(!JSON.stringify(events).includes('PRIVATE_SENTINEL'));
  handleFetch = async () => response(token() + end());
  await model(monitor(events)).invoke(messages, { logMeta: { source: 'usage-demo' } });
  const [usage, meta] = globalThis.__monitorUsageCalls[0];
  assert.ok(!('monitor' in usage) && !('monitorContext' in usage.input));
  assert.deepEqual(meta, { source: 'usage-demo' });
});

test('monitor object replacement is atomic and per-call false overrides instance default', async () => {
  const first = [], second = [];
  const monitorA = monitor(first), monitorB = monitor(second);
  const llm = model(monitorA);
  const options = llm.withDefaultModelOptions({ monitor: monitorB, monitorContext: { traceId: 'trace-override' } });
  assert.equal(options.monitor, monitorB);
  assert.deepEqual(options.monitorContext, { scenario: 'demo.respond', traceId: 'trace-override' });
  handleFetch = async () => new Response('failure', { status: 401 });
  await silenceErrors(async () => {
    await assert.rejects(llm.invoke(messages, { monitor: monitorB }));
    await assert.rejects(llm.invoke(messages, { monitor: false }));
  });
  assert.equal(first.length, 0);
  assert.equal(second.length, 1);
});

test('default monitorContext is independently snapshotted across concurrent calls', async () => {
  const events = [];
  const defaults = { scenario: 'demo.respond', traceId: 'trace-default' };
  const llm = model(monitor(events), defaults);
  handleFetch = async () => new Response('failure', { status: 503 });
  await silenceErrors(async () => {
    await Promise.allSettled([
      llm.invoke(messages, { monitorContext: { traceId: 'trace-one' } }),
      llm.invoke(messages, { monitorContext: { traceId: 'trace-two' } }),
    ]);
  });
  assert.deepEqual(events.map((e) => e.traceId).sort(), ['trace-one', 'trace-two']);
  assert.equal(defaults.traceId, 'trace-default');
  assert.notEqual(events[0].callId, events[1].callId);
});

test('network attempts do not double-report invoke/stream and recovered retry emits nothing', async () => {
  for (const recover of [false, true]) {
    const events = [];
    let attempts = 0;
    const failure = new Error('PRIVATE_SENTINEL', { cause: { code: 'ECONNRESET' } });
    handleFetch = async () => {
      attempts++;
      if (recover && attempts === 2) return response(token() + end());
      throw failure;
    };
    await silenceErrors(async () => {
      if (recover) assert.equal((await model(monitor(events)).invoke(messages)).message, 'hello');
      else await assert.rejects(model(monitor(events)).invoke(messages), (error) => error === failure);
    });
    assert.equal(attempts, 2);
    assert.equal(events.length, recover ? 0 : 1);
    if (!recover) assert.equal(events[0].error.code, 'ECONNRESET');
  }
});

test('HTTP 200 provider error is reported once without changing previously ignored control flow', async () => {
  for (const payload of [frame({ error: { message: 'PRIVATE_SENTINEL' } }),
    'event: error\ndata: {"message":"PRIVATE_SENTINEL"}\n\n']) {
    const events = [];
    handleFetch = async () => response(payload + 'data: [DONE]\n\n');
    const result = await model(monitor(events)).invoke(messages);
    assert.equal(result.message, '');
    assert.equal(events.length, 1);
    assert.equal(events[0].httpStatus, 200);
    assert.equal(events[0].error.category, 'protocol');
    assert.ok(!JSON.stringify(events).includes('PRIVATE_SENTINEL'));
  }
});

test('JSON decode failure retains original SyntaxError and emits a single protocol failure', async () => {
  const events = [];
  handleFetch = async () => response('data: {PRIVATE_SENTINEL\n\n');
  await assert.rejects(model(monitor(events)).invoke(messages), SyntaxError);
  assert.equal(events.length, 1);
  assert.equal(events[0].error.category, 'protocol');
  assert.equal(events[0].error.phase, 'parse');
});

test('clean premature EOF is observed but does not create a new business throw', async () => {
  const events = [];
  handleFetch = async () => response(token());
  const result = await model(monitor(events)).invoke(messages);
  assert.equal(result.message, ''); // Existing behavior requires a finish chunk to emit MESSAGE.
  assert.equal(events.length, 1);
  assert.equal(events[0].error.phase, 'read');
  assert.equal(events[0].error.category, 'protocol');
});

test('stop, length, tool finish, content filter, DONE and missing usage are not false alarms', async () => {
  for (const terminal of [end(), end('length'), end('tool_calls'), end('content_filter'), 'data: [DONE]\n\n']) {
    const events = [];
    handleFetch = async () => response(token() + terminal);
    await model(monitor(events)).invoke(messages);
    assert.equal(events.length, 0);
  }
});

test('downstream output validation failures are not model protocol errors', async () => {
  const events = [];
  handleFetch = async () => response(token('not-json') + end());
  const result = await model(monitor(events)).invoke(messages);
  assert.throws(() => JSON.parse(result.message), SyntaxError);
  assert.equal(events.length, 0);
});

test('consumer return before fetch or during content is quiet', async () => {
  for (const readContent of [false, true]) {
    const events = [];
    let fetched = 0, cancelled = 0;
    handleFetch = async () => {
      fetched++;
      return new Response(new ReadableStream({ start(controller) {
        controller.enqueue(new TextEncoder().encode(token()));
      }, cancel() { cancelled++; } }));
    };
    const iterator = model(monitor(events)).stream(messages);
    assert.equal((await iterator.next()).value.type, 'MODEL_CALLING');
    if (readContent) assert.equal((await iterator.next()).value.type, 'TOKEN');
    await iterator.return();
    assert.equal(events.length, 0);
    assert.equal(fetched, readContent ? 1 : 0);
    assert.equal(cancelled, readContent ? 1 : 0);
  }
});

test('caller abort stays quiet; connection and caller timeout signals produce timeout failures', async () => {
  for (const mode of ['cancel', 'connection-timeout', 'signal-timeout']) {
    const events = [];
    const controller = new AbortController();
    const signal = mode === 'signal-timeout' ? AbortSignal.timeout(10) : controller.signal;
    handleFetch = (_url, { signal }) => new Promise((_, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    });
    const operation = model(monitor(events)).invoke(messages, {
      signal, idleTimeoutMs: mode === 'connection-timeout' ? 10 : 45000,
    });
    const timer = mode === 'cancel' ? setTimeout(() => controller.abort(), 5) : undefined;
    try { await assert.rejects(operation); } finally { clearTimeout(timer); }
    assert.equal(events.length, mode === 'cancel' ? 0 : 1);
    if (mode !== 'cancel') assert.equal(events[0].error.category, 'timeout');
  }
});

test('broken monitor hooks do not alter success or original HTTP errors', async () => {
  handleFetch = async () => response(token() + end());
  assert.equal((await model({ startCall() { throw new Error('observer'); } }).invoke(messages)).message, 'hello');
  const bad = { startCall() { return { callId: 'call-demo',
    async response() { throw new Error('observer'); }, async content() { throw new Error('observer'); },
    async fail() { throw new Error('observer'); }, async succeed() { throw new Error('observer'); },
    async cancel() { throw new Error('observer'); } }; } };
  assert.equal((await model(bad).invoke(messages)).message, 'hello');
  handleFetch = async () => new Response('failure', { status: 503 });
  await silenceErrors(async () => { await assert.rejects(model(bad).invoke(messages), /Fetch failed\(503\)/); });
  await wait(1);
});

test('post-response usage persistence failure does not become a model fault', async () => {
  const events = [];
  const failure = new Error('usage persistence');
  globalThis.__monitorUsageError = failure;
  handleFetch = async () => response(token() + end());
  await assert.rejects(model(monitor(events)).invoke(messages, { logMeta: { source: 'usage-demo' } }),
    (error) => error === failure);
  assert.equal(events.length, 0);
});

test('HTTP and stream error payload request_id is preserved when response headers have no ID', async () => {
  for (const httpFailure of [false, true]) {
    const events = [];
    const body = { request_id: 'request-body', error: { message: 'PRIVATE_SENTINEL' } };
    handleFetch = async () => httpFailure ? new Response(JSON.stringify(body), { status: 503 }) :
      new Response(frame(body) + 'data: [DONE]\n\n');
    await silenceErrors(async () => {
      const operation = model(monitor(events)).invoke(messages);
      if (httpFailure) await assert.rejects(operation);
      else await operation;
    });
    assert.equal(events.length, 1);
    assert.equal(events[0].providerRequestId, 'request-body');
    assert.ok(!JSON.stringify(events).includes('PRIVATE_SENTINEL'));
  }
});


test('HTTP and SSE provider diagnostics reach monitoring without response messages/body leakage', async () => {
  for (const transport of ['http', 'sse']) {
    const events = [];
    const payload = { error: { code: 'invalid_model', message: "Model 'PRIVATE_SENTINEL' is invalid.",
      request_id: 'provider-original-request' } };
    handleFetch = async () => transport === 'http' ? new Response(JSON.stringify(payload), { status: 401 }) : response(frame(payload));
    await silenceErrors(async () => {
      if (transport === 'http') await assert.rejects(model(monitor(events)).invoke(messages));
      else await model(monitor(events)).invoke(messages);
    });
    assert.equal(events.length, 1); assert.equal(events[0].error.providerCode, 'invalid_model');
    assert.equal(events[0].error.providerMessage, "Model '[REDACTED]' is invalid.");
    assert.ok(!JSON.stringify(events).includes('PRIVATE_SENTINEL'));
  }
});
