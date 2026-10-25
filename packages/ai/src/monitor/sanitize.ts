import type { ModelFailureEvent, ModelMonitorTarget } from './types.js';
import { normalizeModelError } from './errors.js';

export const MAX_MONITOR_EVENT_BYTES = 8 * 1024;

/** Opaque IDs only. Reject rather than truncate malformed IDs or credential-shaped values. */
export function safeIdentifier(value: unknown, maxLength = 128): string | undefined {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength &&
    /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/.test(value) && !/^(?:sk-|ct-|bearer)/i.test(value)
    ? value : undefined;
}

export function finiteMilliseconds(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 86_400_000
    ? Math.round(value) : undefined;
}

export function httpStatus(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 599
    ? value : undefined;
}

/** Targets must specify fixed, trusted paths. Raw dynamic paths are never emitted. */
export function normalizeEndpoint(value: string): string | undefined {
  try {
    // Avoid parsing unbounded input from an accidentally supplied content field.
    if (typeof value !== 'string' || value.length > 4096) return undefined;
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol)) return undefined;
    const endpoint = `${url.origin}${url.pathname}`;
    return endpoint.length <= 1024 ? endpoint : undefined;
  } catch {
    return undefined;
  }
}

export function prepareTargets(targets: readonly ModelMonitorTarget[]) {
  return targets.map((target) => {
    const endpoint = normalizeEndpoint(target.endpoint);
    if (!endpoint || !safeIdentifier(target.provider, 64) || !target.models.length ||
      target.models.some((model) => !safeIdentifier(model, 128))) {
      throw new Error('Invalid model monitor target configuration.');
    }
    return { provider: target.provider, endpoint, models: new Set(target.models) };
  });
}

/** Rebuild a bounded, plain snapshot; never stringify the caller's object/toJSON. */
export function snapshotEvent(input: ModelFailureEvent): ModelFailureEvent {
  const requiredId = (value: unknown, length = 128) => {
    const id = safeIdentifier(value, length);
    if (!id) throw new Error('Invalid model monitor event identifier.');
    return id;
  };
  const occurredAt = input.occurredAt;
  if (typeof occurredAt !== 'string' || occurredAt.length !== 24 ||
    !Number.isFinite(Date.parse(occurredAt)) || new Date(occurredAt).toISOString() !== occurredAt) {
    throw new Error('Invalid model monitor event timestamp.');
  }
  const endpoint = input.endpoint === 'unknown' ? 'unknown' : normalizeEndpoint(input.endpoint);
  if (!endpoint || !['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(input.method)) {
    throw new Error('Invalid model monitor event request metadata.');
  }
  const status = httpStatus(input.httpStatus);
  const normalized = normalizeModelError({ code: input.error.code }, {
    category: input.error.category, phase: input.error.phase, httpStatus: status,
    providerCode: input.error.providerCode, providerMessage: input.error.providerMessage,
  });
  const durationMs = finiteMilliseconds(input.timing.durationMs);
  if (durationMs === undefined || typeof input.timing.receivedResponse !== 'boolean' ||
    typeof input.timing.receivedContent !== 'boolean' ||
    !['transport', 'sdk', 'protocol'].includes(input.observationLayer)) {
    throw new Error('Invalid model monitor event observation metadata.');
  }
  const traceId = safeIdentifier(input.traceId);
  const providerRequestId = safeIdentifier(input.providerRequestId);
  const timeoutMs = finiteMilliseconds(input.timing.timeoutMs);
  const event: ModelFailureEvent = Object.freeze({
    eventId: requiredId(input.eventId), callId: requiredId(input.callId), occurredAt,
    service: requiredId(input.service, 64), environment: requiredId(input.environment, 64),
    ...(input.release === undefined ? {} : { release: requiredId(input.release) }),
    scenario: requiredId(input.scenario, 64), ...(traceId ? { traceId } : {}),
    provider: requiredId(input.provider, 64), endpoint, method: input.method,
    model: requiredId(input.model), ...(status === undefined ? {} : { httpStatus: status }),
    ...(providerRequestId ? { providerRequestId } : {}), error: Object.freeze(normalized),
    timing: Object.freeze({ durationMs, ...(timeoutMs === undefined ? {} : { timeoutMs }),
      receivedResponse: input.timing.receivedResponse, receivedContent: input.timing.receivedContent }),
    observationLayer: input.observationLayer,
  });
  if (Buffer.byteLength(JSON.stringify(event), 'utf8') > MAX_MONITOR_EVENT_BYTES) {
    throw new Error('Model monitor event exceeds size limit.');
  }
  return event;
}
