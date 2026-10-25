import { createDiagnosticReporter } from './diagnostics.js';
import { snapshotEvent } from './sanitize.js';
import type { ModelFailureEvent, MonitorDeliveryOptions, MonitorDeliveryQueue, MonitorDeliveryResult } from './types.js';

const MAX_TIMER_MS = 2_147_483_647;

function boundedInteger(value: number | undefined, fallback: number, max: number) {
  const result = value ?? fallback;
  if (!Number.isInteger(result) || result <= 0 || result > max) {
    throw new Error('Invalid model monitor delivery configuration.');
  }
  return result;
}

/** Adapter helper: both Retry-After seconds and HTTP-date are supported. */
export function parseMonitorRetryAfter(value: string | null, now = Date.now()): number | undefined {
  if (!value || value.length > 128) return undefined;
  const milliseconds = /^\d+$/.test(value.trim()) ? Number(value.trim()) * 1000 : Date.parse(value) - now;
  return Number.isFinite(milliseconds) && milliseconds >= 0 && milliseconds <= MAX_TIMER_MS ? milliseconds : undefined;
}

export function createMonitorDeliveryQueue(options: MonitorDeliveryOptions): MonitorDeliveryQueue {
  if (typeof options.send !== 'function') throw new Error('Model monitor send callback is required.');
  const maxEvents = boundedInteger(options.maxEvents, 100, 10000);
  const maxBytes = boundedInteger(options.maxBytes, 1024 * 1024, 16 * 1024 * 1024);
  const concurrency = boundedInteger(options.concurrency, 2, 16);
  const timeoutMs = boundedInteger(options.timeoutMs, 3000, 30000);
  const maxAttempts = boundedInteger(options.maxAttempts, 3, 3);
  const retryDelays = options.retryDelaysMs ?? [1000, 5000];
  if (retryDelays.length !== 2 || retryDelays.some((value) => !Number.isInteger(value) || value < 0 || value > 30000)) {
    throw new Error('Invalid model monitor retry delays.');
  }
  const { send } = options;
  const delays = [...retryDelays];
  const diagnostics = createDiagnosticReporter(options.onDiagnostic);
  type Entry = { event: ModelFailureEvent; bytes: number; attempts: number; readyAt: number; done: boolean };
  const entries = new Set<Entry>();
  // Keep occupied slots until the actual injected send settles, even after its deadline.
  // A callback that ignores abort cannot create unbounded concurrent requests on retries.
  const inFlight = new Map<Entry, AbortController>();
  const waiters = new Set<() => void>();
  let bytes = 0;
  let accepting = true;
  let closed = false;
  let wakeTimer: ReturnType<typeof setTimeout> | undefined;
  let closing: Promise<boolean> | undefined;

  function notifyDrained() { if (!entries.size) for (const waiter of [...waiters]) waiter(); }
  function remove(entry: Entry) {
    if (entries.delete(entry)) bytes -= entry.bytes;
    notifyDrained();
  }
  function finish(entry: Entry, reason?: 'delivery' | 'invalid_ack') {
    entry.done = true;
    if (reason) diagnostics.report({ code: 'MODEL_MONITOR_REPORT_FAILED', count: 1,
      eventId: entry.event.eventId, reason });
    if (!inFlight.has(entry)) remove(entry);
  }
  function retry(entry: Entry, result?: MonitorDeliveryResult) {
    if (entry.attempts >= maxAttempts) { finish(entry, 'delivery'); return; }
    const base = delays[entry.attempts - 1];
    const delay = Math.ceil(base * (1 + Math.random() * 0.2));
    const retryAfter = result?.status === 429 && typeof result.retryAfterMs === 'number' &&
      Number.isFinite(result.retryAfterMs) && result.retryAfterMs >= 0 ? result.retryAfterMs : 0;
    // Do not ignore an excessive Retry-After or create an unbounded timer.
    const budget = delays[1] * 1.2;
    if (retryAfter > budget) { finish(entry, 'delivery'); return; }
    entry.readyAt = Date.now() + Math.max(delay, retryAfter);
  }
  function acknowledge(result: MonitorDeliveryResult, eventId: string) {
    return result.data?.eventId === eventId && typeof result.data.alertId === 'string' &&
      /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(result.data.alertId) &&
      ['aggregated', 'duplicate', 'muted'].includes(result.data.disposition);
  }
  function start(entry: Entry) {
    entry.attempts++;
    const controller = new AbortController();
    inFlight.set(entry, controller);
    let settled = false;
    let handled = false;
    const request = Promise.resolve().then(() => send(entry.event, { signal: controller.signal }));
    let rejectTimeout: (reason: Error) => void;
    const deadline = new Promise<never>((_, reject) => { rejectTimeout = reject; });
    const timeout = setTimeout(() => {
      controller.abort();
      rejectTimeout(new Error('Model monitor delivery timed out.'));
    }, timeoutMs);
    timeout.unref();
    function release() {
      if (!settled || !handled) return;
      inFlight.delete(entry);
      if (entry.done) remove(entry);
      pump();
    }
    // Install handlers for late resolution/rejection before racing. Never leave an unhandled promise.
    request.then(() => { settled = true; release(); }, () => { settled = true; release(); });
    void (async () => {
      try {
        const result = await Promise.race([request, deadline]);
        if (closed) return;
        if (!Number.isInteger(result?.status) || result.status < 100 || result.status > 599) {
          finish(entry, 'invalid_ack');
        } else if (result.status >= 200 && result.status < 300) {
          finish(entry, acknowledge(result, entry.event.eventId) ? undefined : 'invalid_ack');
        } else if ([408, 429].includes(result.status) || result.status >= 500) {
          retry(entry, result);
        } else {
          finish(entry, 'delivery');
        }
      } catch {
        if (!closed) retry(entry);
      } finally {
        clearTimeout(timeout);
        // If abort was ignored, retain the actual operation and its budget until it settles.
        handled = true;
        release();
        if (!closed) pump();
      }
    })();
  }
  function pump() {
    if (wakeTimer) clearTimeout(wakeTimer);
    wakeTimer = undefined;
    if (closed) return;
    for (const entry of entries) {
      if (inFlight.size >= concurrency) break;
      if (!entry.done && !inFlight.has(entry) && entry.readyAt <= Date.now()) start(entry);
    }
    if (inFlight.size < concurrency) {
      const times = [...entries].filter((entry) => !entry.done && !inFlight.has(entry)).map((entry) => entry.readyAt);
      if (times.length) {
        wakeTimer = setTimeout(pump, Math.max(0, Math.min(...times) - Date.now()));
        wakeTimer.unref();
      }
    }
    notifyDrained();
  }
  function flush(waitMs = 3000): Promise<boolean> {
    const budget = Math.max(0, Math.min(3000, Number.isFinite(waitMs) ? waitMs : 3000));
    if (!entries.size) return Promise.resolve(true);
    if (budget === 0) return Promise.resolve(false);
    return new Promise((resolve) => {
      const done = () => { clearTimeout(timer); waiters.delete(done); resolve(true); };
      const timer = setTimeout(() => { waiters.delete(done); resolve(false); }, budget);
      // Explicit flush/close keeps the process alive only for its caller's bounded budget.
      waiters.add(done);
      pump();
    });
  }
  return {
    enqueue(input) {
      if (!accepting) {
        diagnostics.report({ code: 'MODEL_MONITOR_REPORT_FAILED', count: 1, reason: 'closed' });
        return false;
      }
      // Reject before snapshot work when capacity is already exhausted.
      if (entries.size >= maxEvents) {
        diagnostics.report({ code: 'MODEL_MONITOR_QUEUE_FULL', count: 1 });
        return false;
      }
      try {
        const event = snapshotEvent(input);
        const size = Buffer.byteLength(JSON.stringify(event), 'utf8');
        if (bytes + size > maxBytes) {
          diagnostics.report({ code: 'MODEL_MONITOR_QUEUE_FULL', count: 1, eventId: event.eventId });
          return false;
        }
        entries.add({ event, bytes: size, attempts: 0, readyAt: Date.now(), done: false });
        bytes += size;
        pump();
        return true;
      } catch {
        diagnostics.report({ code: 'MODEL_MONITOR_REPORT_FAILED', count: 1, reason: 'invalid_event' });
        return false;
      }
    },
    flush,
    close(waitMs = 3000) {
      if (closing) return closing;
      accepting = false;
      closing = (async () => {
        const drained = await flush(waitMs);
        closed = true;
        if (wakeTimer) clearTimeout(wakeTimer);
        wakeTimer = undefined;
        const dropped = [...entries].filter((entry) => !entry.done).length;
        for (const controller of inFlight.values()) controller.abort();
        if (dropped) diagnostics.report({ code: 'MODEL_MONITOR_REPORT_FAILED', count: dropped, reason: 'closed' });
        entries.clear();
        bytes = 0;
        diagnostics.close();
        notifyDrained();
        return drained;
      })();
      return closing;
    },
    get stats() { return { events: entries.size, bytes, inFlight: inFlight.size, closed: !accepting }; },
  };
}
