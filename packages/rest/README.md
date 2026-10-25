# cantian-rest

## Optional request log suppression

Set `static skipRequestLogging = true` on a `BaseController` subclass to omit the
request body and all `x-*` headers from its initial request log, before authorization.
The entry still records the method and registered route template. The default
retains the existing complete request log. No authentication, validation, response,
or rate-limit behavior changes.

```ts
export default class MonitorController extends BaseController {
  static skipRequestLogging = true;
  // Configure scope/schema and implement run as usual.
}
```

This flag only controls the initial framework request log. It does not sanitize
existing business error logs, response error details, or application logging.
The monitoring receiver must continue to validate fields and use safe error summaries.

## Parser errors

The router keeps the default Express JSON size limit. Invalid JSON returns HTTP 400
with `{"error":"Invalid JSON"}`; an oversized body returns HTTP 413 with
`{"error":"Payload too large"}`. The parser error body, message and request headers
are not logged or returned by this handler. Other errors and errors after headers
have been sent are passed to the next Express error handler.

## Test-environment verification

After building, run with Node.js 22.15+ in the test environment:

```sh
MODEL_MONITOR_TEST_ENV=test node --test packages/rest/tests/request-control.test.mjs
```

Tests use synthetic requests and stub authentication/persistence dependencies. They
are not included in the published package. Runtime verification is separate from
the local TypeScript build and syntax checks.
