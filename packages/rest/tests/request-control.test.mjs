import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { registerHooks } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import request from 'supertest';

if (process.env.MODEL_MONITOR_TEST_ENV !== 'test') {
  throw new Error('Run in the test environment with MODEL_MONITOR_TEST_ENV=test.');
}
const previousService = process.env.SERVICE_NAME;
process.env.SERVICE_NAME = 'rest-test';
// No database or real credentials are used. Tests exercise actual controller/router code.
const hook = registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL?.endsWith('/rest/dist/BaseController.js')) {
    if (specifier === './apiKey.js') return { shortCircuit: true,
      url: 'data:text/javascript,export async function verifyApiKey(){throw new Error("Unexpected auth access");}' };
    if (specifier === './rateLimit.js') return { shortCircuit: true,
      url: 'data:text/javascript,export async function rateLimit(){throw new Error("Unexpected database access");}' };
  }
  return next(specifier, context);
} });
const { BaseController } = await import('../dist/BaseController.js');
const { RestError } = await import('../dist/RestError.js');
const { createControllerRouter } = await import('../dist/handlers.js');
hook.deregister();
const dir = await mkdtemp(join(tmpdir(), 'rest-control-'));
after(async () => {
  await rm(dir, { recursive: true, force: true });
  if (previousService === undefined) delete process.env.SERVICE_NAME;
  else process.env.SERVICE_NAME = previousService;
});

async function controllerLogs(suppress) {
  const logs = [];
  class Controller extends BaseController {
    static method = 'post';
    static path = '/monitor';
    async authorize() {
      assert.equal(logs.length, 1, 'initial log precedes authorization');
      throw RestError.unauthorized();
    }
  }
  if (suppress) Controller.skipRequestLogging = true;
  const data = { prompt: 'PRIVATE_SENTINEL' };
  const c = new Controller({
    req: { body: data, method: 'POST', path: '/PRIVATE_SENTINEL', params: {},
      headers: { 'x-secret': 'PRIVATE_SENTINEL', authorization: 'PRIVATE_SENTINEL' } },
    res: { headersSent: false, status() { return this; }, json() { return this; } },
  });
  const log = console.log;
  console.log = (entry) => logs.push(entry);
  try {
    const result = await c.execute();
    assert.equal(result.error.statusCode, 401);
  } finally { console.log = log; }
  return { logs, data };
}

test('opt-in omits body and x headers before failed authorization and logs route template', async () => {
  const { logs } = await controllerLogs(true);
  assert.deepEqual(logs[0], { message: 'Received a request.', endpoint: 'post /monitor' });
  assert.ok(!JSON.stringify(logs).includes('PRIVATE_SENTINEL'));
});

test('default controller retains original complete initial request log', async () => {
  const { logs, data } = await controllerLogs(false);
  assert.equal(logs[0].data, data);
  assert.deepEqual(logs[0].xHeaders, { 'x-secret': 'PRIVATE_SENTINEL' });
  assert.equal(logs[0].endpoint, 'POST /PRIVATE_SENTINEL');
});

async function testApp(beforeRouter) {
  const app = express();
  if (beforeRouter) app.use(beforeRouter);
  app.use(await createControllerRouter({ controllerDir: dir, jwks: '{"keys":[]}' }));
  app.use((req, res) => res.sendStatus(204));
  return app;
}

test('invalid JSON returns fixed 400 and never logs or echoes parser body', async () => {
  const app = await testApp();
  const logs = [], original = console.error;
  console.error = (...args) => logs.push(args);
  try {
    const response = await request(app).post('/monitor').set('Content-Type', 'application/json')
      .send('{"prompt":"PRIVATE_SENTINEL"').timeout({ response: 2000, deadline: 4000 });
    assert.equal(response.status, 400);
    assert.deepEqual(response.body, { error: 'Invalid JSON' });
    assert.ok(!JSON.stringify(logs).includes('PRIVATE_SENTINEL'));
  } finally { console.error = original; }
});

test('default parser limit remains in force and oversized JSON returns fixed 413', async () => {
  const app = await testApp();
  const response = await request(app).post('/monitor').send({ prompt: 'x'.repeat(110 * 1024) })
    .timeout({ response: 2000, deadline: 4000 });
  assert.equal(response.status, 413);
  assert.deepEqual(response.body, { error: 'Payload too large' });
  assert.equal((await request(app).post('/monitor').send({ ok: true })).status, 204);
});

test('non-parser SyntaxError reaches the next error handler without hanging', async () => {
  const error = new SyntaxError('application error');
  const app = await testApp((req, res, next) => next(error));
  app.use((err, req, res, next) => {
    assert.equal(err, error);
    res.status(503).json({ handled: true });
  });
  const response = await request(app).post('/monitor').timeout({ response: 2000, deadline: 4000 });
  assert.equal(response.status, 503);
  assert.deepEqual(response.body, { handled: true });
});

test('errors after response headers are sent reach the next handler', async () => {
  const error = Object.assign(new Error('parser error'), { type: 'entity.parse.failed' });
  const app = await testApp((req, res, next) => { res.write('started'); next(error); });
  app.use((err, req, res, next) => {
    assert.equal(err, error);
    res.end(' handled');
  });
  const response = await request(app).post('/monitor').timeout({ response: 2000, deadline: 4000 });
  assert.equal(response.text, 'started handled');
});
