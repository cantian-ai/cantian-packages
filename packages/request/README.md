# request

## Optional HTTP/SSE observation

```ts
import { sse } from 'cantian-request';
import type { RequestObserver } from 'cantian-request';

const observer: RequestObserver = (event) => {
  // Event metadata only: attempt, response status/request ID, first content or failure.
  // Never append the original request, credentials, body or exception to these logs.
  recordSafeTransportEvent(event);
};

for await (const chunk of sse(url, init, { idleTimeoutMs: 45000, observer })) {
  consumeOriginalSseChunk(chunk);
}
```

Observation is opt-in and synchronous dispatch never waits for an async observer. Synchronous
throws and asynchronous rejections are isolated. Events contain no raw request/response,
URL, header object, error message, stack, cause, or body. Only allowlisted primitive request
IDs, status, Retry-After milliseconds, controlled codes/failure phases and optional sanitized provider diagnostics are exposed.
`content` marks the first received bytes, without copying them. Successful bodies are not
read or cloned by the HTTP wrapper to obtain metadata.

`createRetryFetch(fetch, shouldRetry?, observer?)` retains its existing maximum of two
network attempts with the original 1-second retry delay and predicate. It emits attempt
numbers and a final failure; a recovered first attempt emits no terminal error. The predicate
still receives the original arguments/error. `createThrowHttpErrorFetch(fetch, observer?)`
adds response/HTTP failure metadata. Use `sse(..., {observer})` for an SSE lifecycle: it forwards
attempt/response metadata but suppresses lower-layer error duplicates and emits one terminal
SSE error. Observing multiple independently composed wrappers can observe each layer's
failure separately; do not treat those as additional model calls.

Caller cancellation is distinguished from connection/read timeouts and independent network
or protocol errors. No retry, timeout, AbortSignal composition, SSE chunk or caller exception
behavior is changed. Consumer return/break closes the reader without emitting a failure.
A normal EOF is not classified as a generic SSE protocol failure: the model layer applies
its own termination contract. ResponseLlm and other consumers retain their current behavior.

HTTP failures now use `HttpRequestError extends Error`, with `status`, optional `requestId`
and `retryAfterMs`. `name`/message retain existing Error behavior, including
`Fetch failed(status): body`. When headers have no ID, an already-read error JSON of at most 8 KiB can supply
`request_id` (root or `error.request_id`); no arbitrary body field is exported.
The original error body read remains part of the previous
business error behavior; the observer adds no body read or copy. Raw message text must not
be used for monitoring events or monitoring logs. Existing transport error logs retain their
previous request parameters, headers, response text and original exceptions; observation
does not sanitize these legacy logs. Network/read/parser exceptions are rethrown unchanged.

## Test-environment verification

After building, run in the deployed test environment:

```sh
MODEL_MONITOR_TEST_ENV=test npm run test:observation --workspace=cantian-request
```

The suite injects fetch/ReadableStream responses and uses synthetic data; it does not start
a local HTTP service, access paid models or send mail. The file is in `packages/request/tests`
and must be included in the test validation artifact/job; tests are not in the public npm
payload. There is no test-environment runtime verification claim from a type check alone.

## Bounded provider diagnostics

HTTP JSON errors of at most 8 KiB reuse the existing error-body read. Known `error.code` /
`error.message`, `error_code` / `error_msg`, and root `code` / `message` fields may supply
optional `providerCode` (64 ASCII bytes) and `providerMessage` (512 UTF-8 bytes).
The existing `Error.message`, old error logs and retry/timeout behavior are unchanged.

`cantian-request/provider-error` exports pure `extractProviderError` and
`sanitizeProviderError` helpers, without loading fetch wrappers or starting work.
Messages lose quoted values, credential patterns and URLs, and must then match a bounded,
reviewed diagnostic sentence. Arbitrary free text is omitted, never merely truncated and
labelled safe. Opaque/credential-shaped codes are omitted. This is deliberately conservative:
unknown descriptions may be hidden until their safe sentence form is supported. No original
Error, stack, body, prompt or request header object is exported by the observer.
