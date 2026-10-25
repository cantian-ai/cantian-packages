/** Pure, bounded diagnostics shared by transport, monitor and receiver. No I/O or raw errors. */
export function sanitizeProviderError(code: unknown, message: unknown) {
  const rawCode = typeof code === 'number' && Number.isSafeInteger(code) ? String(code) : code;
  const providerCode = typeof rawCode === 'string' && rawCode.length <= 64 &&
    /^-?[A-Za-z0-9][A-Za-z0-9_.:-]*$/.test(rawCode) && !/^-?(?:sk-|ct-|bearer)/i.test(rawCode) &&
    !/[A-Za-z0-9_-]{25,}/.test(rawCode) ? rawCode : undefined;
  let providerMessage: string | undefined;
  if (typeof message === 'string' && message.length > 0 && message.length <= 8192) {
    let text = message.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
    text = text.replace(/https?:\/\/[^\s<>"']+/gi, '[URL removed]')
      .replace(/\b(?:Bearer|Basic)\s+[^\s,;]+/gi, '[REDACTED]')
      .replace(/\b(?:sk-|ct-)[A-Za-z0-9_-]+/gi, '[REDACTED]')
      .replace(/\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[REDACTED]')
      .replace(/(["'`])[^"'`]*\1/g, "'[REDACTED]'")
      .replace(/\b((?:model|deployment)\s+)(?!is\b|was\b|has\b|does\b|not\b)([A-Za-z0-9][A-Za-z0-9_.:/-]*)(?=\s+(?:is|was|has|does|not)\b)/gi, '$1[REDACTED]');
    // Full diagnostic sentences only: unmatched free text might echo partial user input.
    // No arbitrary text wildcard is accepted, even after credential redaction.
    const messages = [
      /^(?:the )?(?:requested )?(?:model|deployment)(?: ['"`]?\[REDACTED\]['"`]?)? (?:(?:(?:is|was) )?(?:invalid|unavailable|disabled|deprecated|retired|not found|not supported|not available|not accessible)|does not exist|has been (?:disabled|retired|deprecated))(?: or you do not have access to it)?[.!]?$/i,
      /^(?:invalid|incorrect|missing|expired|revoked|malformed|unsupported) (?:api key|access token|authentication token|credentials?|authorization|model|request|parameter|argument|request parameter)(?:[ :]+['"`]?\[REDACTED\]['"`]?)?[.!]?$/i,
      /^(?:authentication|authorization|permission|access) (?:failed|denied|required)[.!]?$/i,
      /^(?:rate limit (?:exceeded|reached)|too many requests|quota exceeded|insufficient quota|internal server error|service unavailable|request timed out|connection timed out)(?:[.!] (?:please )?try again later)?[.!]?$/i,
      /^(?:模型(?:['"`]?\[REDACTED\]['"`]?)?(?:不存在|无效|已下线|不可用|已停用)|无效的API密钥|API密钥无效|鉴权失败|权限不足|请求过于频繁|服务暂时不可用)[。.!]?$/,
    ];
    if (messages.some((pattern) => pattern.test(text))) {
      let bytes = 0;
      providerMessage = '';
      for (const character of text) {
        const size = new TextEncoder().encode(character).byteLength;
        if (bytes + size > 512) break;
        providerMessage += character; bytes += size;
      }
    }
  }
  return { ...(providerCode ? { providerCode } : {}), ...(providerMessage ? { providerMessage } : {}) };
}

/** Caller supplies only bounded, already parsed error JSON; never a response/request object. */
export function extractProviderError(data: unknown) {
  try {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
    const root = data as Record<string, unknown>;
    const error = root.error && typeof root.error === 'object' && !Array.isArray(root.error)
      ? root.error as Record<string, unknown> : root;
    return sanitizeProviderError(error.code ?? error.error_code, error.message ?? error.error_msg);
  } catch { return {}; }
}
