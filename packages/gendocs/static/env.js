export function resolveApiBase() {
  const { hostname } = window.location;
  return hostname === 'localhost' || hostname === '127.0.0.1'
    ? '/rest'
    : 'https://openapi-dev.cantian.ai/rest';
}

export function resolveApi(path) {
  return `${resolveApiBase()}${path}`;
}
