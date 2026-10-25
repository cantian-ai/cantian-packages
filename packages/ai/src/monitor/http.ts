import { createModelMonitor } from './monitor.js';
import { createMonitorDeliveryQueue, parseMonitorRetryAfter } from './delivery.js';
import type { ModelMonitorDiagnostic, ModelMonitorDiagnosticHandler, ModelMonitorTarget, MonitorDeliveryResult } from './types.js';

const MAX_ACK_BYTES = 8192;
function diagnostic(event: ModelMonitorDiagnostic) {
  console.warn(event.code, { count: event.count, ...(event.eventId ? { eventId: event.eventId } : {}),
    ...(event.reason ? { reason: event.reason } : {}) });
}

async function readAcknowledgement(response: Response): Promise<MonitorDeliveryResult['data']> {
  if (!response.body) return undefined;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_ACK_BYTES) return undefined;
      chunks.push(value);
    }
    let data: unknown;
    try { ({ data } = JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { return undefined; }
    if (!data || typeof data !== 'object') return undefined;
    const ack = data as Record<string, unknown>;
    if (typeof ack.eventId !== 'string' || typeof ack.alertId !== 'string' ||
      !['aggregated', 'duplicate', 'muted'].includes(ack.disposition as string)) return undefined;
    return { eventId: ack.eventId, alertId: ack.alertId,
      disposition: ack.disposition as 'aggregated' | 'duplicate' | 'muted' };
  } finally {
    try { await reader.cancel(); } catch {}
    reader.releaseLock();
  }
}

// Explicit construction supports tests without changing global fetch or online model routing.
export function createHttpModelMonitor(options: {
  service: string; environment: 'test' | 'prod'; reportUrl: string; apiKey: string; release?: string;
  scenarios: readonly string[]; targets: readonly ModelMonitorTarget[]; onDiagnostic?: ModelMonitorDiagnosticHandler;
}, request: typeof fetch = fetch) {
  const url = new URL(options.reportUrl);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !options.apiKey) {
    throw new Error('MODEL_MONITOR_INVALID_CONFIG');
  }
  const monitor = createModelMonitor({
    service: options.service, environment: options.environment, release: options.release,
    scenarios: options.scenarios, targets: options.targets, onDiagnostic: options.onDiagnostic ?? diagnostic,
    report(event) { queue.enqueue(event); },
  });
  const queue = createMonitorDeliveryQueue({
    onDiagnostic: options.onDiagnostic ?? diagnostic,
    async send(event, { signal }) {
      // Independent fetch: no legacy helper can log Authorization, init or the event.
      const response = await request(url.href, { method: 'POST', redirect: 'error', signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${options.apiKey}` },
        body: JSON.stringify(event) });
      const retryAfterMs = parseMonitorRetryAfter(response.headers.get('retry-after'));
      if (!response.ok) {
        try { await response.body?.cancel(); } catch {}
        return { status: response.status, retryAfterMs };
      }
      return { status: response.status, data: await readAcknowledgement(response), retryAfterMs };
    },
  });
  return { monitor, flush: () => queue.flush(3000), close: () => queue.close(3000) };
}
