import type { ModelCallObservation, ModelMonitor } from './types.js';

/** Isolate optional observers from business calls; final outcomes are delivered once. */
export function startModelCall(monitor: ModelMonitor | false | undefined, input: Parameters<ModelMonitor['startCall']>[0]): ModelCallObservation {
  let call: ModelCallObservation | undefined;
  let ended = false;
  try { if (monitor) call = monitor.startCall(input); } catch {}
  const perform = (action: (value: ModelCallObservation) => void) => {
    if (!call) return;
    try { Promise.resolve(action(call)).catch(() => {}); } catch {}
  };
  const end = (action: (value: ModelCallObservation) => void) => {
    if (ended) return;
    ended = true;
    perform(action);
  };
  return {
    callId: call?.callId ?? '',
    response(details) { if (!ended) perform((value) => value.response(details)); },
    content() { if (!ended) perform((value) => value.content()); },
    fail(error, details) { end((value) => value.fail(error, details)); },
    succeed() { end((value) => value.succeed()); },
    cancel() { end((value) => value.cancel()); },
  };
}
