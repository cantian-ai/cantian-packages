import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
if (process.env.MODEL_MONITOR_TEST_ENV !== 'test') throw new Error('Run in the test environment with MODEL_MONITOR_TEST_ENV=test.');
const originalFetch = globalThis.fetch;
let handleFetch;
globalThis.fetch = (...args) => handleFetch(...args);
const { createRetryFetch, createThrowHttpErrorFetch, HttpRequestError, sse } = await import('../dist/index.js');
after(() => { globalThis.fetch = originalFetch; });
beforeEach(() => { handleFetch = async () => { throw new Error('Unexpected test fetch'); }; });
const url = 'https://example.invalid/v1/completions?signature=PRIVATE_SENTINEL';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const consume = async (iterable) => { const result = []; for await (const item of iterable) result.push(item); return result; };
const stream = (text) => new Response(text, { headers: { 'Content-Type': 'text/event-stream', 'x-request-id': 'request-demo' } });

async function captureLogs(action) {
  const entries = [];
  const warn = console.warn, error = console.error;
  console.warn = console.error = (...args) => { entries.push(args); };
  try { await action(entries); }
  finally { console.warn = warn; console.error = error; }
}

test('network retry count, predicate and original error identity and legacy logs stay unchanged', async () => {
  const failure = new Error('PRIVATE_SENTINEL', { cause: { code: 'ECONNRESET' } });
  let attempts = 0;
  const observations = [];
  const request = createRetryFetch(async () => { attempts++; throw failure; }, () => true,
    (event) => { observations.push(event); });
  await captureLogs(async (logs) => {
    await assert.rejects(request(url, { headers: { Authorization: 'PRIVATE_SENTINEL' }, body: 'PRIVATE_SENTINEL' }),
      (error) => error === failure);
    assert.equal(attempts, 2);
    assert.deepEqual(observations.filter((e) => e.type === 'attempt').map((e) => e.attempt), [1, 2]);
    assert.equal(observations.filter((e) => e.type === 'error').length, 1);
    assert.ok(!JSON.stringify(observations).includes('PRIVATE_SENTINEL'));
    assert.ok(JSON.stringify(logs).includes('PRIVATE_SENTINEL'));
  });
  attempts = 0;
  const noRetry = createRetryFetch(async () => { attempts++; throw failure; }, () => false);
  await assert.rejects(noRetry(url), (error) => error === failure);
  assert.equal(attempts, 1);
});

test('observer sync/async exceptions do not replace a successful response or consume its body', async () => {
  for (const observer of [() => { throw new Error('observer'); }, async () => { throw new Error('observer'); }]) {
    const response = new Response('original body');
    const request = createThrowHttpErrorFetch(async () => response, observer);
    assert.equal(await request(url), response);
    assert.equal(await response.text(), 'original body');
  }
  await wait(1);
});

test('HTTP error keeps legacy message and exposes only safe structured properties to observation while retaining legacy logs', async () => {
  const observations = [];
  const request = createThrowHttpErrorFetch(async () => new Response('PRIVATE_SENTINEL', {
    status: 503, headers: { 'x-request-id': 'request-demo', 'Retry-After': '2', 'Set-Cookie': 'PRIVATE_SENTINEL' },
  }), (event) => { observations.push(event); });
  await captureLogs(async (logs) => {
    await assert.rejects(request(url), (error) => {
      assert.ok(error instanceof HttpRequestError);
      assert.equal(error.message, 'Fetch failed(503): PRIVATE_SENTINEL');
      assert.equal(error.status, 503);
      assert.equal(error.requestId, 'request-demo');
      assert.equal(error.retryAfterMs, 2000);
      return true;
    });
    assert.equal(observations.find((e) => e.type === 'error').category, 'http');
    assert.ok(!JSON.stringify(observations).includes('PRIVATE_SENTINEL'));
    assert.ok(JSON.stringify(logs).includes('PRIVATE_SENTINEL'));
  });
});

test('SSE output is unchanged and response/content metadata is observed without extra reads', async () => {
  const text = 'data: {"choices":[]}\n\ndata: [DONE]\n\n';
  handleFetch = async () => stream(text);
  const observations = [];
  const chunks = await consume(sse(url, {}, { observer: (event) => { observations.push(event); } }));
  assert.deepEqual(chunks.map((c) => c.data), ['{"choices":[]}', '[DONE]']);
  assert.equal(observations.filter((e) => e.type === 'content').length, 1);
  assert.equal(observations.find((e) => e.type === 'response').requestId, 'request-demo');
  assert.equal(observations.filter((e) => e.type === 'error').length, 0);
});

test('SSE transient network failure then success emits no terminal error', async () => {
  let attempts = 0;
  const observations = [];
  handleFetch = async () => {
    if (++attempts === 1) throw new Error('PRIVATE_SENTINEL', { cause: { code: 'ECONNRESET' } });
    return stream('data: [DONE]\n\n');
  };
  await captureLogs(async () => {
    await consume(sse(url, {}, { observer: (event) => { observations.push(event); } }));
  });
  assert.equal(attempts, 2);
  assert.equal(observations.filter((e) => e.type === 'error').length, 0);
});

test('SSE HTTP failure produces one terminal error after response metadata', async () => {
  handleFetch = async () => new Response('PRIVATE_SENTINEL', { status: 429, headers: { 'request-id': 'request-demo' } });
  const observations = [];
  await captureLogs(async () => {
    await assert.rejects(consume(sse(url, {}, { observer: (event) => { observations.push(event); } })), HttpRequestError);
  });
  assert.equal(observations.filter((e) => e.type === 'error').length, 1);
  assert.equal(observations.at(-1).category, 'http');
  assert.equal(observations.at(-1).requestId, 'request-demo');
  assert.ok(!JSON.stringify(observations).includes('PRIVATE_SENTINEL'));
});

test('connection timeout is observed as timeout and original timeout message is retained', async () => {
  handleFetch = (_url, { signal }) => new Promise((_, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  });
  const observations = [];
  await assert.rejects(consume(sse(url, {}, { idleTimeoutMs: 10, observer: (event) => { observations.push(event); } })),
    /SSE idle timeout while waiting for response/);
  assert.equal(observations.at(-1).category, 'timeout');
  assert.equal(observations.at(-1).phase, 'connect');
});

test('caller abort differs from caller-provided timeout signal', async () => {
  for (const timeout of [false, true]) {
    const controller = new AbortController();
    const signal = timeout ? AbortSignal.timeout(10) : controller.signal;
    handleFetch = (_url, { signal }) => new Promise((_, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    });
    const observations = [];
    const operation = consume(sse(url, { signal }, { observer: (event) => { observations.push(event); } }));
    const timer = timeout ? undefined : setTimeout(() => controller.abort(), 5);
    try { await assert.rejects(operation); } finally { clearTimeout(timer); }
    assert.equal(observations.at(-1).category, timeout ? 'timeout' : 'cancelled');
  }
});

test('an aborted signal does not hide an independently observed network failure', async () => {
  const controller = new AbortController();
  controller.abort();
  const failure = new Error('PRIVATE_SENTINEL', { cause: { code: 'ECONNRESET' } });
  const observations = [];
  const request = createRetryFetch(async () => { throw failure; }, () => true,
    (event) => { observations.push(event); });
  await assert.rejects(request(url, { signal: controller.signal }), (error) => error === failure);
  assert.equal(observations.at(-1).category, 'network');
  assert.equal(observations.at(-1).code, 'ECONNRESET');
});

test('response body read failure preserves exception identity and read phase', async () => {
  const failure = new Error('PRIVATE_SENTINEL', { cause: { code: 'ECONNRESET' } });
  let pulls = 0;
  handleFetch = async () => new Response(new ReadableStream({ pull(controller) {
    if (pulls++ === 0) controller.enqueue(new TextEncoder().encode('data: {"first":true}\n\n'));
    else controller.error(failure);
  } }), { headers: { 'x-request-id': 'request-demo' } });
  const observations = [];
  await assert.rejects(consume(sse(url, {}, { observer: (event) => { observations.push(event); } })),
    (error) => error === failure);
  assert.equal(observations.at(-1).phase, 'read');
  assert.equal(observations.at(-1).code, 'ECONNRESET');
  assert.equal(observations.at(-1).requestId, 'request-demo');
});

test('SSE parsing failure is protocol, while consumer return is quiet and closes reader', async () => {
  const observations = [];
  handleFetch = async () => stream('invalid-field: PRIVATE_SENTINEL\n\n');
  await assert.rejects(consume(sse(url, {}, { observer: (event) => { observations.push(event); } })));
  assert.equal(observations.at(-1).category, 'protocol');
  assert.equal(observations.at(-1).phase, 'parse');
  let cancelled = 0;
  handleFetch = async () => new Response(new ReadableStream({ start(controller) {
    controller.enqueue(new TextEncoder().encode('data: {"first":true}\n\n'));
  }, cancel() { cancelled++; } }));
  observations.length = 0;
  const iterator = sse(url, {}, { observer: (event) => { observations.push(event); } });
  await iterator.next();
  await iterator.return();
  assert.equal(cancelled, 1);
  assert.equal(observations.filter((e) => e.type === 'error').length, 0);
});

test('read idle timeout remains a timeout, not user cancellation', async () => {
  handleFetch = async () => new Response(new ReadableStream({ start() {} }));
  const observations = [];
  await assert.rejects(consume(sse(url, {}, { idleTimeoutMs: 5, observer: (event) => { observations.push(event); } })),
    /SSE idle timeout while waiting for data/);
  assert.equal(observations.at(-1).category, 'timeout');
  assert.equal(observations.at(-1).phase, 'read');
});

test('request-id fallback uses only bounded error JSON metadata, never the error message', async () => {
  for (const large of [false, true]) {
    const observations = [];
    const body = JSON.stringify({ request_id: 'request-body', error: { message: large ? 'x'.repeat(9000) : 'PRIVATE_SENTINEL' } });
    const request = createThrowHttpErrorFetch(async () => new Response(body, { status: 503 }),
      (event) => { observations.push(event); });
    await captureLogs(async (logs) => {
      await assert.rejects(request(url), (error) => {
        assert.equal(error.requestId, large ? undefined : 'request-body');
        assert.equal(error.message, `Fetch failed(503): ${body}`);
        return true;
      });
      assert.ok(!JSON.stringify(observations).includes('PRIVATE_SENTINEL'));
      assert.equal(logs.find((entry) => entry[0] === 'FETCH_ERROR_HTTP_NOT_OK')[1].text, body);
    });
    assert.equal(observations.at(-1).requestId, large ? undefined : 'request-body');
  }
});

// A custom caller-abort reason can have status-like fields; it remains caller cancellation.
test('explicit caller abort reason is cancellation even when it carries a status field', async () => {
  const reason = Object.assign(new Error('caller abort'), { status: 503 });
  const controller = new AbortController();
  controller.abort(reason);
  const events = [];
  const request = createRetryFetch(async () => { throw reason; }, () => true, (event) => { events.push(event); });
  await assert.rejects(request(url, { signal: controller.signal }), (error) => error === reason);
  assert.equal(events.at(-1).category, 'cancelled');
});

test('opting into SSE observation does not switch the captured fetch implementation', async () => {
  const injectedFetch = globalThis.fetch;
  handleFetch = async () => stream('data: [DONE]\n\n');
  globalThis.fetch = () => { throw new Error('Unexpected replacement fetch'); };
  try {
    assert.equal((await consume(sse(url))).length, 1);
    assert.equal((await consume(sse(url, {}, { observer() {} }))).length, 1);
  } finally { globalThis.fetch = injectedFetch; }
});


test('provider diagnostics preserve original code and redact quoted model/credential values', async () => {
  const { sanitizeProviderError, extractProviderError } = await import('../dist/providerError.js');
  assert.deepEqual(sanitizeProviderError('invalid_model', "The model 'PRIVATE_SENTINEL' does not exist."),
    { providerCode: 'invalid_model', providerMessage: "The model '[REDACTED]' does not exist." });
  assert.deepEqual(extractProviderError({ error_code: 336001, error_msg: 'Permission denied.' }),
    { providerCode: '336001', providerMessage: 'Permission denied.' });
  const masked = sanitizeProviderError('invalid_api_key', 'Invalid API key: sk-PRIVATE_SENTINEL');
  assert.equal(masked.providerCode, 'invalid_api_key');
  assert.ok(!JSON.stringify(masked).includes('PRIVATE_SENTINEL'));
  assert.ok(new TextEncoder().encode(masked.providerMessage ?? '').byteLength <= 512);
});

test('unverified free text, prompt echoes, body structures and unsafe codes are omitted', async () => {
  const { sanitizeProviderError } = await import('../dist/providerError.js');
  for (const message of ['PRIVATE_SENTINEL', 'Invalid model. PRIVATE_SENTINEL',
    'The request contains prompt: PRIVATE_SENTINEL', '{"messages":[{"content":"PRIVATE_SENTINEL"}]}', 'x'.repeat(9000)]) {
    assert.deepEqual(sanitizeProviderError('invalid_model', message), { providerCode: 'invalid_model' });
  }
  assert.deepEqual(sanitizeProviderError('sk-PRIVATE_SENTINEL', undefined), {});
  assert.deepEqual(sanitizeProviderError('x'.repeat(65), undefined), {});
  assert.deepEqual(sanitizeProviderError({}, {}), {});
});

test('HTTP provider error metadata survives SSE boundary and keeps legacy Error.message', async () => {
  const text = JSON.stringify({ error: { code: 'invalid_model', message: "Model 'PRIVATE_SENTINEL' is invalid." } });
  const observations = [];
  handleFetch = async () => new Response(text, { status: 401 });
  await captureLogs(async () => {
    await assert.rejects(consume(sse(url, undefined, { observer: (event) => observations.push(event) })),
      (error) => error.message === `Fetch failed(401): ${text}`);
  });
  const errors = observations.filter((event) => event.type === 'error');
  assert.equal(errors.length, 1); assert.equal(errors[0].code, 'HTTP_401');
  assert.equal(errors[0].providerCode, 'invalid_model');
  assert.equal(errors[0].providerMessage, "Model '[REDACTED]' is invalid.");
  assert.ok(!JSON.stringify(observations).includes('PRIVATE_SENTINEL'));
});

test('error-body extraction budget omits diagnostics from large responses without a second read', async () => {
  const body = JSON.stringify({ error: { code: 'invalid_model', message: 'Permission denied.', detail: 'x'.repeat(9000) } });
  await captureLogs(async () => {
    const request = createThrowHttpErrorFetch(async () => new Response(body, { status: 401 }));
    await assert.rejects(request(url), (error) => error.providerCode === undefined && error.message === `Fetch failed(401): ${body}`);
  });
});
