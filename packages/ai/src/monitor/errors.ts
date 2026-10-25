import { sanitizeProviderError } from 'cantian-request/provider-error';
import type { ModelErrorCategory, ModelFailureDetails, ModelFailurePhase } from './types.js';

const networkCodes = new Set([
  'ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'EPIPE', 'ENETUNREACH', 'EHOSTUNREACH',
  'UND_ERR_CONNECT', 'UND_ERR_SOCKET', 'CERT_HAS_EXPIRED', 'DEPTH_ZERO_SELF_SIGNED_CERT',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
]);
const timeoutCodes = new Set(['ETIMEDOUT', 'ESOCKETTIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT']);
const phases = new Set<ModelFailurePhase>(['connect', 'response', 'read', 'parse', 'unknown']);
const categories = new Set<ModelErrorCategory>(['http', 'network', 'timeout', 'protocol', 'client', 'unknown']);

/** Only inspect known primitive codes/name, at most three causes; never retain messages or stacks. */
export function normalizeModelError(error: unknown, details: ModelFailureDetails = {}) {
  let code: string | undefined;
  let isTimeout = false;
  let current = error;
  for (let depth = 0; depth < 3 && current && typeof current === 'object'; depth++) {
    try {
      const item = current as { code?: unknown; name?: unknown; cause?: unknown };
      if (typeof item.code === 'string' && item.code.length <= 64 &&
        (networkCodes.has(item.code) || timeoutCodes.has(item.code))) {
        code = item.code;
        break;
      }
      if (item.name === 'TimeoutError') isTimeout = true;
      current = item.cause;
    } catch { break; }
  }
  const status = typeof details.httpStatus === 'number' && Number.isInteger(details.httpStatus) &&
    details.httpStatus >= 400 && details.httpStatus <= 599 ? details.httpStatus : undefined;
  const category: ModelErrorCategory = details.category && categories.has(details.category) ? details.category :
    status ? 'http' : isTimeout || (code && timeoutCodes.has(code)) ? 'timeout' : code ? 'network' : 'unknown';
  const phase = details.phase && phases.has(details.phase) ? details.phase : 'unknown';
  // No raw provider message/code is accepted. Provider-specific mappings can be added explicitly later.
  const safeMessage = category === 'http' ? `Model provider returned HTTP ${status ?? 'error'}.` : {
    network: 'Model connection failed.', timeout: 'Model call timed out.',
    protocol: 'Invalid model response protocol.', client: 'Model client failed.',
    unknown: 'Model call failed.',
  }[category];
  let normalizedCode = category.toUpperCase();
  if (category === 'http') normalizedCode = status ? `HTTP_${status}` : 'HTTP_ERROR';
  else if (code && ((category === 'network' && networkCodes.has(code)) ||
    (category === 'timeout' && timeoutCodes.has(code)))) normalizedCode = code;
  return { category, code: normalizedCode, phase, safeMessage,
    ...sanitizeProviderError(details.providerCode, details.providerMessage) };
}
