// Run only in the deployed test environment; no paid models or real mail/network.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { createModelMonitor, createMonitorDeliveryQueue, parseMonitorRetryAfter } from '../dist/monitor/index.js';

if (process.env.MODEL_MONITOR_TEST_ENV !== 'test') {
  throw new Error('Set MODEL_MONITOR_TEST_ENV=test in the test environment to run this suite.');
}

const config = {
  service: 'service-demo', environment: 'test', release: 'revision-demo',
  scenarios: ['demo.respond'],
  targets: [{ provider: 'provider-demo', endpoint: 'https://example.invalid/v1/completions', models: ['model-demo'] }],
};
const request = {
  endpoint: 'https://example.invalid/v1/completions', model: 'model-demo', context: { scenario: 'demo.respond' },
};
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const ack = (event, disposition = 'aggregated') => ({ status: 200,
  data: { eventId: event.eventId, alertId: 'alert-demo', disposition } });
function failure() {
  let event;
  createModelMonitor({ ...config, report(value) { event = value; } })
    .startCall(request).fail(new Error('not exported'), { httpStatus: 503, phase: 'response' });
  assert.ok(event);
  assert.equal(event.timing.receivedResponse, true);
  return event;
}

test('standalone import only uses the pure diagnostic subpath, no root entry/network/timers', () => {
  const target = new URL('../dist/monitor/index.js', import.meta.url).href;
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', `
    import { registerHooks } from 'node:module';
    registerHooks({ resolve(specifier, context, next) {
      if ((specifier !== 'cantian-request/provider-error' && !specifier.startsWith('node:') && !specifier.startsWith('.') && !specifier.startsWith('file:')) ||
        /tokenUsage|\\/models\\/|mcp|mongodb/i.test(specifier)) throw new Error('Unexpected dependency');
      return next(specifier, context);
    }});
    globalThis.fetch = () => { throw new Error('Unexpected network'); };
    globalThis.setTimeout = globalThis.setInterval = () => { throw new Error('Unexpected timer'); };
    const api = await import(${JSON.stringify(target)});
    if (typeof api.createModelMonitor !== 'function') throw new Error('Missing export');
  `], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('failure snapshot removes content, credentials, URL signatures and raw exceptions', () => {
  const secret = 'PRIVATE_PROMPT_SENTINEL';
  let captured;
  const monitor = createModelMonitor({ ...config, report(event) { captured = event; } });
  const call = monitor.startCall({ ...request,
    endpoint: `https://user:password@example.invalid/v1/completions?sig=${secret}#${secret}`,
    body: { messages: secret }, headers: { Authorization: secret }, context: { ...request.context, prompt: secret },
  });
  call.response({ httpStatus: 503, providerRequestId: 'request-demo', body: secret, headers: { key: secret } });
  call.content();
  call.fail(new Error(secret, { cause: { message: secret, code: secret } }), { httpStatus: 503, message: secret });
  const json = JSON.stringify(captured);
  assert.ok(!json.includes(secret));
  assert.ok(!json.includes('password'));
  assert.equal(captured.endpoint, config.targets[0].endpoint);
  assert.equal(captured.providerRequestId, 'request-demo');
  assert.equal(captured.error.code, 'HTTP_503');
  assert.equal(captured.timing.receivedContent, true);
  assert.ok(Buffer.byteLength(json) <= 8192);
  assert.ok(Object.isFrozen(captured) && Object.isFrozen(captured.error) && Object.isFrozen(captured.timing));
});

test('terminal state emits at most once; success and cancellation emit nothing', () => {
  const events = [];
  const monitor = createModelMonitor({ ...config, report(event) { events.push(event); } });
  const failed = monitor.startCall(request);
  failed.fail(undefined, { category: 'protocol', phase: 'parse' });
  failed.fail(new Error('closed'));
  failed.succeed();
  const success = monitor.startCall(request);
  success.succeed(); success.fail();
  const cancelled = monitor.startCall(request);
  cancelled.cancel(); cancelled.fail();
  assert.equal(events.length, 1);
  assert.equal(events[0].error.code, 'PROTOCOL');
});

test('config, context and targets cannot be changed by later caller mutation', () => {
  const events = [];
  const options = structuredClone(config);
  const monitor = createModelMonitor({ ...options, report(event) { events.push(event); } });
  const context = { scenario: 'demo.respond', traceId: 'trace-one' };
  const first = monitor.startCall({ ...request, context });
  context.traceId = 'trace-two';
  options.targets[0].models[0] = 'another-model';
  first.fail();
  monitor.startCall({ ...request, context }).fail();
  assert.equal(events[0].traceId, 'trace-one');
  assert.equal(events[1].traceId, 'trace-two');
  assert.equal(events[1].model, 'model-demo');
  assert.notEqual(events[0].callId, events[1].callId);
});

test('unknown endpoints/models/scenarios never emit dynamic content', () => {
  const events = [];
  const monitor = createModelMonitor({ ...config, report(event) { events.push(event); } });
  monitor.startCall({ endpoint: 'https://example.invalid/private-person', model: 'private-model',
    context: { scenario: 'private-scenario', traceId: 'Bearer credential' } }).fail();
  assert.equal(events[0].endpoint, 'unknown');
  assert.equal(events[0].provider, 'unknown');
  assert.equal(events[0].model, 'unknown');
  assert.equal(events[0].scenario, 'unknown');
  assert.ok(!('traceId' in events[0]));
});

test('network cause and timeouts use controlled codes; AbortError is not silently ignored', () => {
  const events = [];
  const monitor = createModelMonitor({ ...config, report(event) { events.push(event); } });
  monitor.startCall(request).fail(new Error('private', { cause: { code: 'ECONNRESET' } }));
  monitor.startCall(request).fail({ name: 'TimeoutError', message: 'private' });
  monitor.startCall(request).fail({ name: 'AbortError', message: 'private' });
  monitor.startCall(request).fail({ get code() { throw new Error('private'); } });
  assert.deepEqual(events.map((e) => e.error.category), ['network', 'timeout', 'unknown', 'unknown']);
  assert.equal(events[0].error.code, 'ECONNRESET');
});

test('sync/async report and diagnostic exceptions never escape or replace original failures', async () => {
  for (const report of [() => { throw new Error('private'); }, async () => { throw new Error('private'); }]) {
    const monitor = createModelMonitor({ ...config, report,
      onDiagnostic: async () => { throw new Error('private'); } });
    assert.doesNotThrow(() => monitor.startCall(request).fail(new Error('model error')));
  }
  await wait(5);
});

test('queue accepts all success dispositions and releases memory after acknowledgment', async () => {
  for (const disposition of ['aggregated', 'duplicate', 'muted']) {
    const queue = createMonitorDeliveryQueue({ send: async (event) => ack(event, disposition) });
    assert.equal(queue.enqueue(failure()), true);
    assert.equal(await queue.flush(100), true);
    assert.equal(queue.stats.bytes, 0);
    assert.equal(await queue.close(), true);
  }
});

test('count and byte budgets include in-flight events; overflow diagnostics are coalesced', async () => {
  let complete;
  const diagnostics = [];
  const queue = createMonitorDeliveryQueue({ maxEvents: 1, concurrency: 1,
    send: (event) => new Promise((resolve) => { complete = () => resolve(ack(event)); }),
    onDiagnostic: (item) => { diagnostics.push(item); } });
  assert.equal(queue.enqueue(failure()), true);
  await wait(1);
  for (let i = 0; i < 5; i++) assert.equal(queue.enqueue(failure()), false);
  assert.equal(queue.stats.events, 1);
  assert.equal(queue.stats.inFlight, 1);
  complete();
  assert.equal(await queue.close(100), true);
  assert.equal(diagnostics.reduce((sum, d) => sum + d.count, 0), 5);
  const bytesQueue = createMonitorDeliveryQueue({ maxBytes: 1, send: async (event) => ack(event) });
  assert.equal(bytesQueue.enqueue(failure()), false);
  assert.equal(bytesQueue.stats.events, 0);
  await bytesQueue.close();
});

test('queue reconstructs the event without invoking toJSON or retaining additional fields', async () => {
  const event = failure();
  let actual;
  const queue = createMonitorDeliveryQueue({ send: async (value) => { actual = value; return ack(value); } });
  assert.equal(queue.enqueue({ ...event, body: 'PRIVATE_PROMPT_SENTINEL',
    error: { ...event.error, safeMessage: 'PRIVATE_PROMPT_SENTINEL' },
    toJSON() { throw new Error('Must not run'); } }), true);
  assert.equal(await queue.close(100), true);
  assert.ok(!JSON.stringify(actual).includes('PRIVATE_PROMPT_SENTINEL'));
});

test('retryable HTTP responses and thrown network failures reuse eventId, at most three attempts', async () => {
  for (const status of [408, 429, 503, undefined]) {
    const ids = [];
    const diagnostics = [];
    const queue = createMonitorDeliveryQueue({ retryDelaysMs: [0, 0],
      onDiagnostic: (value) => { diagnostics.push(value); },
      send: async (event) => {
        ids.push(event.eventId);
        if (status === undefined) throw new Error('private network content');
        return { status };
      } });
    queue.enqueue(failure());
    assert.equal(await queue.close(200), true);
    assert.equal(ids.length, 3);
    assert.equal(new Set(ids).size, 1);
    assert.equal(diagnostics.reduce((sum, d) => sum + d.count, 0), 1);
    assert.ok(!JSON.stringify(diagnostics).includes('private'));
  }
});

test('ordinary 4xx and invalid acknowledgment are terminal without retry', async () => {
  for (const status of [400, 401, 403, 413, 200]) {
    let attempts = 0;
    const queue = createMonitorDeliveryQueue({ retryDelaysMs: [0, 0], send: async () => {
      attempts++; return { status, data: { eventId: 'different-id', alertId: 'alert-demo', disposition: 'aggregated' } };
    } });
    queue.enqueue(failure());
    assert.equal(await queue.close(100), true);
    assert.equal(attempts, 1);
  }
});

test('429 Retry-After is honored within budget, excessive delay stops retrying', async () => {
  assert.equal(parseMonitorRetryAfter('2'), 2000);
  assert.equal(parseMonitorRetryAfter('Thu, 01 Jan 1970 00:00:02 GMT', 1000), 1000);
  assert.equal(parseMonitorRetryAfter('not-a-date'), undefined);
  for (const retryAfterMs of [1, 100000]) {
    let attempts = 0;
    const queue = createMonitorDeliveryQueue({ retryDelaysMs: [1, 5], send: async (event) => {
      attempts++; return attempts === 1 ? { status: 429, retryAfterMs } : ack(event);
    } });
    queue.enqueue(failure());
    assert.equal(await queue.close(100), true);
    assert.equal(attempts, retryAfterMs === 1 ? 2 : 1);
  }
});

test('deadlines abort each attempt with independent signals, without exceeding attempt cap', async () => {
  const signals = [];
  const queue = createMonitorDeliveryQueue({ timeoutMs: 5, retryDelaysMs: [0, 0],
    send: (_event, { signal }) => new Promise((_, reject) => {
      signals.push(signal);
      signal.addEventListener('abort', () => reject(new Error('private')), { once: true });
    }) });
  queue.enqueue(failure());
  assert.equal(await queue.close(200), true);
  assert.equal(signals.length, 3);
  assert.equal(new Set(signals).size, 3);
  assert.ok(signals.every((signal) => signal.aborted));
});

test('send that ignores abort keeps its slot and budget rather than spawning unlimited requests', async () => {
  let attempts = 0;
  const queue = createMonitorDeliveryQueue({ timeoutMs: 5, retryDelaysMs: [0, 0],
    concurrency: 1, maxEvents: 1, send: () => { attempts++; return new Promise(() => {}); } });
  queue.enqueue(failure());
  assert.equal(await queue.flush(30), false);
  assert.equal(queue.stats.inFlight, 1);
  assert.equal(queue.stats.events, 1);
  assert.equal(attempts, 1);
  assert.equal(queue.enqueue(failure()), false);
  assert.equal(await queue.close(0), false);
  assert.equal(queue.enqueue(failure()), false);
});

test('concurrency includes settled-but-not-yet-processed sends; no duplicate starts', async () => {
  let active = 0;
  let maximum = 0;
  const seen = [];
  const queue = createMonitorDeliveryQueue({ concurrency: 2, send: async (event) => {
    active++; maximum = Math.max(maximum, active); seen.push(event.eventId);
    await wait(2); active--; return ack(event);
  } });
  for (let i = 0; i < 8; i++) queue.enqueue(failure());
  assert.equal(await queue.close(300), true);
  assert.ok(maximum <= 2);
  assert.equal(seen.length, 8);
  assert.equal(new Set(seen).size, 8);
});

test('close aborts outstanding delivery, refuses new entries and is idempotent', async () => {
  let aborted = false;
  const queue = createMonitorDeliveryQueue({ send: (_event, { signal }) => new Promise((_, reject) => {
    signal.addEventListener('abort', () => { aborted = true; reject(new Error('private')); }, { once: true });
  }) });
  queue.enqueue(failure());
  await wait(1);
  const closing = queue.close(5);
  assert.equal(queue.enqueue(failure()), false);
  assert.equal(queue.close(5), closing);
  assert.equal(await closing, false);
  assert.equal(aborted, true);
  assert.equal(queue.stats.events, 0);
  assert.equal(queue.stats.bytes, 0);
});


test('provider diagnostics survive frozen event/queue snapshots without changing HTTP grouping code', async () => {
  let captured, delivered;
  const monitor = createModelMonitor({ ...config, report(event) { captured = event; } });
  monitor.startCall(request).fail(undefined, { httpStatus: 401, providerCode: 'invalid_model',
    providerMessage: "Model 'PRIVATE_SENTINEL' does not exist." });
  assert.equal(captured.error.code, 'HTTP_401'); assert.equal(captured.error.providerCode, 'invalid_model');
  assert.equal(captured.error.providerMessage, "Model '[REDACTED]' does not exist.");
  const queue = createMonitorDeliveryQueue({ send: async (event) => { delivered = event; return ack(event); } });
  queue.enqueue(captured); await queue.flush(); await queue.close();
  assert.equal(delivered.error.providerCode, 'invalid_model');
  assert.ok(!JSON.stringify(delivered).includes('PRIVATE_SENTINEL'));
});
