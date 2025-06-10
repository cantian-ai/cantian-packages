export function openApiPathToExpressPath(path) {
  return path.replace(/\{([a-zA-Z0-9_-]+)\}/g, ':$1');
}
