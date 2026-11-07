/** Log only request metadata: headers, bodies, credentials and query parameters stay private. */
export function requestLogMetadata(input: Parameters<typeof fetch>[0], init?: RequestInit) {
  let url: string;
  try {
    const parsed = new URL(input instanceof Request ? input.url : String(input));
    url = `${parsed.origin}${parsed.pathname}`;
  } catch {
    url = '[invalid URL]';
  }
  return { url, method: init?.method ?? (input instanceof Request ? input.method : 'GET') };
}
