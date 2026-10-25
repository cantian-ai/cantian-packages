export type ModelErrorCategory = 'http' | 'network' | 'timeout' | 'protocol' | 'client' | 'unknown';
export type ModelFailurePhase = 'connect' | 'response' | 'read' | 'parse' | 'unknown';
export type ModelObservationLayer = 'transport' | 'sdk' | 'protocol';

export type ModelMonitorContext = {
  scenario: string;
  traceId?: string;
};

/** Trusted configuration, never derived from prompt text or error messages. */
export type ModelMonitorTarget = {
  provider: string;
  endpoint: string;
  models: readonly string[];
};

export type ModelFailureEvent = Readonly<{
  eventId: string;
  callId: string;
  occurredAt: string;
  service: string;
  environment: string;
  release?: string;
  scenario: string;
  traceId?: string;
  provider: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  model: string;
  httpStatus?: number;
  providerRequestId?: string;
  error: Readonly<{
    category: ModelErrorCategory;
    code: string;
    phase: ModelFailurePhase;
    safeMessage: string;
    providerCode?: string;
    providerMessage?: string;
  }>;
  timing: Readonly<{
    durationMs: number;
    timeoutMs?: number;
    receivedResponse: boolean;
    receivedContent: boolean;
  }>;
  observationLayer: ModelObservationLayer;
}>;

export type ModelFailureDetails = {
  providerCode?: string;
  providerMessage?: string;
  category?: ModelErrorCategory;
  phase?: ModelFailurePhase;
  httpStatus?: number;
  providerRequestId?: string;
};

export type ModelCallObservation = {
  readonly callId: string;
  response(details: { httpStatus?: number; providerRequestId?: string }): void;
  content(): void;
  fail(error?: unknown, details?: ModelFailureDetails): void;
  succeed(): void;
  cancel(): void;
};

export type ModelMonitor = {
  startCall(options: {
    endpoint: string;
    model: string;
    method?: ModelFailureEvent['method'];
    context: ModelMonitorContext;
    timeoutMs?: number;
    observationLayer?: ModelObservationLayer;
  }): ModelCallObservation;
};

export type ModelMonitorDiagnostic = Readonly<{
  code: 'MODEL_MONITOR_INVALID_CONFIG' | 'MODEL_MONITOR_QUEUE_FULL' | 'MODEL_MONITOR_REPORT_FAILED';
  count: number;
  eventId?: string;
  reason?: 'invalid_event' | 'report_callback' | 'delivery' | 'invalid_ack' | 'closed';
}>;

/** Implementations must not log the original exception, request init or credentials. */
export type ModelMonitorDiagnosticHandler = (diagnostic: ModelMonitorDiagnostic) => void | Promise<void>;

export type ModelMonitorOptions = {
  service: string;
  environment: string;
  release?: string;
  scenarios: readonly string[];
  targets: readonly ModelMonitorTarget[];
  report(event: ModelFailureEvent): void | Promise<void>;
  onDiagnostic?: ModelMonitorDiagnosticHandler;
};

export type MonitorDeliveryResult = {
  status: number;
  data?: { eventId: string; alertId: string; disposition: 'aggregated' | 'duplicate' | 'muted' };
  retryAfterMs?: number;
};

export type MonitorDeliveryOptions = {
  /** Return HTTP status + decoded data envelope; honor signal and bound response reads. */
  send(event: ModelFailureEvent, options: { signal: AbortSignal }): Promise<MonitorDeliveryResult>;
  onDiagnostic?: ModelMonitorDiagnosticHandler;
  maxEvents?: number;
  maxBytes?: number;
  concurrency?: number;
  timeoutMs?: number;
  maxAttempts?: number;
  retryDelaysMs?: readonly [number, number];
};

export type MonitorDeliveryQueue = {
  enqueue(event: ModelFailureEvent): boolean;
  flush(timeoutMs?: number): Promise<boolean>;
  close(timeoutMs?: number): Promise<boolean>;
  readonly stats: Readonly<{ events: number; bytes: number; inFlight: number; closed: boolean }>;
};
