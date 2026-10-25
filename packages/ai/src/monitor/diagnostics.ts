import type { ModelMonitorDiagnostic, ModelMonitorDiagnosticHandler } from './types.js';

/** Never forward the caught error to a logger. Coalesce repeated codes within a second. */
export function createDiagnosticReporter(handler?: ModelMonitorDiagnosticHandler) {
  const pending = new Map<ModelMonitorDiagnostic['code'], ModelMonitorDiagnostic>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let nextAt = 0;
  function emit(diagnostic: ModelMonitorDiagnostic) {
    try { Promise.resolve(handler?.(Object.freeze(diagnostic))).catch(() => {}); } catch {}
  }
  function drain() {
    if (timer) clearTimeout(timer);
    timer = undefined;
    nextAt = Date.now() + 1000;
    const items = [...pending.values()];
    pending.clear();
    for (const item of items) emit(item);
  }
  return {
    report(diagnostic: ModelMonitorDiagnostic) {
      if (!handler) return;
      if (Date.now() >= nextAt && !pending.size) {
        nextAt = Date.now() + 1000;
        emit(diagnostic);
        return;
      }
      const previous = pending.get(diagnostic.code);
      pending.set(diagnostic.code, { ...diagnostic, count: (previous?.count ?? 0) + diagnostic.count });
      if (!timer) {
        timer = setTimeout(drain, Math.max(0, nextAt - Date.now()));
        timer.unref();
      }
    },
    close: drain,
  };
}
