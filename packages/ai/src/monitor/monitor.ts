import { randomUUID } from 'node:crypto';
import { normalizeModelError } from './errors.js';
import { createDiagnosticReporter } from './diagnostics.js';
import { finiteMilliseconds, httpStatus, normalizeEndpoint, prepareTargets, safeIdentifier, snapshotEvent } from './sanitize.js';
import type { ModelFailureDetails, ModelMonitor, ModelMonitorOptions } from './types.js';

export function createModelMonitor(options: ModelMonitorOptions): ModelMonitor {
  if (!safeIdentifier(options.service, 64) || !safeIdentifier(options.environment, 64) ||
    (options.release !== undefined && !safeIdentifier(options.release)) || !options.scenarios.length ||
    options.scenarios.some((scenario) => !safeIdentifier(scenario, 64)) || typeof options.report !== 'function') {
    throw new Error('Invalid model monitor configuration.');
  }
  const targets = prepareTargets(options.targets);
  const scenarios = new Set(options.scenarios);
  // Copy config primitives: caller mutation cannot change already-started observations.
  const { service, environment, release, report } = options;
  const diagnostic = createDiagnosticReporter(options.onDiagnostic);
  return {
    startCall(input) {
      const callId = randomUUID();
      const startedAt = performance.now();
      const endpoint = normalizeEndpoint(input.endpoint);
      const target = targets.find((item) => item.endpoint === endpoint && item.models.has(input.model)) ??
        targets.find((item) => item.endpoint === endpoint);
      const metadata = {
        service, environment, ...(release ? { release } : {}),
        scenario: scenarios.has(input.context.scenario) ? input.context.scenario : 'unknown',
        traceId: safeIdentifier(input.context.traceId),
        provider: target?.provider ?? 'unknown', endpoint: target?.endpoint ?? 'unknown',
        model: target?.models.has(input.model) ? input.model : 'unknown',
        method: input.method ?? 'POST', timeoutMs: finiteMilliseconds(input.timeoutMs),
        observationLayer: input.observationLayer ?? 'sdk',
      };
      let finished = false;
      let receivedResponse = false;
      let receivedContent = false;
      let status: number | undefined;
      let requestId: string | undefined;
      return {
        callId,
        response(details) {
          if (finished) return;
          receivedResponse = true;
          status = httpStatus(details.httpStatus) ?? status;
          requestId = safeIdentifier(details.providerRequestId) ?? requestId;
        },
        content() { if (!finished) receivedContent = true; },
        succeed() { finished = true; },
        cancel() { finished = true; },
        fail(error?: unknown, details: ModelFailureDetails = {}) {
          if (finished) return;
          finished = true;
          try {
            status = httpStatus(details.httpStatus) ?? status;
            requestId = safeIdentifier(details.providerRequestId) ?? requestId;
            receivedResponse = receivedResponse || status !== undefined;
            const event = snapshotEvent({
              ...metadata, callId, eventId: randomUUID(), occurredAt: new Date().toISOString(),
              httpStatus: status, providerRequestId: requestId,
              error: normalizeModelError(error, { ...details, httpStatus: status }),
              timing: { durationMs: Math.min(86_400_000, Math.max(0, Math.round(performance.now() - startedAt))),
                timeoutMs: metadata.timeoutMs, receivedResponse, receivedContent },
            });
            try {
              Promise.resolve(report(event)).catch(() => diagnostic.report({
                code: 'MODEL_MONITOR_REPORT_FAILED', count: 1, eventId: event.eventId, reason: 'report_callback',
              }));
            } catch {
              diagnostic.report({ code: 'MODEL_MONITOR_REPORT_FAILED', count: 1,
                eventId: event.eventId, reason: 'report_callback' });
            }
          } catch {
            diagnostic.report({ code: 'MODEL_MONITOR_REPORT_FAILED', count: 1, reason: 'invalid_event' });
          }
        },
      };
    },
  };
}
