import { sanitizeProviderError } from './providerError.js';
export type RequestFailurePhase = 'connect' | 'response' | 'read' | 'parse';
export type RequestFailure = {
  type: 'error';
  category: 'http' | 'network' | 'timeout' | 'protocol' | 'cancelled';
  phase: RequestFailurePhase;
  code: string;
  status?: number;
  requestId?: string;
  providerCode?: string;
  providerMessage?: string;
};
export type RequestObservation =
  | { type: 'attempt'; attempt: number }
  | { type: 'response'; status: number; requestId?: string; retryAfterMs?: number }
  | { type: 'content' }
  | RequestFailure;
export type RequestObserver = (event: Readonly<RequestObservation>) => void | Promise<void>;

/** Observation must never change control flow or forward raw errors/body/headers. */
export function observeRequest(observer: RequestObserver | undefined, event: RequestObservation) {
  if (!observer) return;
  try { Promise.resolve(observer(Object.freeze(event))).catch(() => {}); } catch {}
}

function safeRequestId(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 && value.length <= 128 &&
    /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/.test(value) && !/^(?:sk-|ct-|bearer)/i.test(value) ? value : undefined;
}

export function responseMetadata(response: Response, errorText?: string) {
  let requestId: string | undefined;
  for (const name of ['x-request-id', 'request-id', 'x-ms-request-id', 'apim-request-id', 'x-bce-request-id', 'x-tt-logid']) {
    const value = safeRequestId(response.headers.get(name));
    if (value) { requestId = value; break; }
  }
  // Reuse the legacy error-body text only when small; never clone/read a successful body.
  if (!requestId && errorText && errorText.length <= 8192 && new TextEncoder().encode(errorText).byteLength <= 8192) {
    try {
      const data = JSON.parse(errorText);
      requestId = safeRequestId(data?.request_id ?? data?.error?.request_id);
    } catch {}
  }
  const retryAfter = response.headers.get('retry-after');
  let retryAfterMs: number | undefined;
  if (retryAfter && retryAfter.length <= 128) {
    const value = /^\d+$/.test(retryAfter.trim()) ? Number(retryAfter.trim()) * 1000 : Date.parse(retryAfter) - Date.now();
    if (Number.isFinite(value) && value >= 0 && value <= 2_147_483_647) retryAfterMs = value;
  }
  return { status: response.status, ...(requestId ? { requestId } : {}),
    ...(retryAfterMs === undefined ? {} : { retryAfterMs }) };
}

const networkCodes = new Set(['ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'EPIPE',
  'ENETUNREACH', 'EHOSTUNREACH', 'UND_ERR_CONNECT', 'UND_ERR_SOCKET', 'CERT_HAS_EXPIRED',
  'DEPTH_ZERO_SELF_SIGNED_CERT', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE']);
const timeoutCodes = new Set(['ETIMEDOUT', 'ESOCKETTIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT']);

export function requestFailure(error: unknown, options: {
  phase: RequestFailurePhase;
  signal?: AbortSignal;
  timeout?: boolean;
  protocol?: boolean;
  status?: number;
  requestId?: string;
}): RequestFailure {
  let code: string | undefined;
  let timeout = options.timeout ?? false;
  let errorStatus: number | undefined;
  let abortError = false;
  let requestId = safeRequestId(options.requestId);
  let providerDetails = {};
  let current = error;
  for (let depth = 0; depth < 3 && current && typeof current === 'object'; depth++) {
    try {
      const item = current as { name?: unknown; code?: unknown; cause?: unknown; status?: unknown; requestId?: unknown; providerCode?: unknown; providerMessage?: unknown };
      if (item.name === 'TimeoutError') timeout = true;
      if (item.name === 'AbortError') abortError = true;
      requestId ??= safeRequestId(item.requestId);
      if (depth === 0) providerDetails = sanitizeProviderError(item.providerCode, item.providerMessage);
      if (typeof item.status === 'number' && Number.isInteger(item.status) && item.status >= 400 && item.status <= 599) {
        errorStatus = item.status;
      }
      if (typeof item.code === 'string' && item.code.length <= 64 &&
        (networkCodes.has(item.code) || timeoutCodes.has(item.code))) { code = item.code; break; }
      current = item.cause;
    } catch { break; }
  }
  // An aborted signal alone must not hide an independently observed network/protocol error.
  try {
    if (options.signal?.aborted) {
      if (error === options.signal.reason) abortError = true;
      if (abortError && options.signal.reason?.name === 'TimeoutError') timeout = true;
    }
  } catch {}
  const category = timeout || (code && timeoutCodes.has(code)) ? 'timeout' : options.protocol ? 'protocol' :
    options.signal?.aborted && abortError ? 'cancelled' : errorStatus ? 'http' : 'network';
  const status = errorStatus ?? options.status;
  return { type: 'error', ...providerDetails, category, phase: category === 'http' ? 'response' : options.phase,
    code: category === 'http' ? `HTTP_${errorStatus}` :
      category === 'timeout' ? (code && timeoutCodes.has(code) ? code : 'TIMEOUT') :
      category === 'network' ? (code ?? 'NETWORK') : category.toUpperCase(),
    ...(status === undefined ? {} : { status }), ...(requestId ? { requestId } : {}) };
}
