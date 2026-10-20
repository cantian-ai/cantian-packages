# AGENTS

## Scope
These rules apply to the whole repository.

## Implementation Rules
1. Keep rules generic and reusable.
Only put cross-repo coding conventions in this file.
Do not add package-specific, module-specific, or business-domain-specific rules here.

2. Prefer TypeScript inference.
Use inline parameter/object typing when possible and rely on inference for locals and return values.
Do not introduce extra `type`/`interface` aliases unless they clearly improve reuse, readability, or public API stability.

3. Keep logic direct.
Avoid unnecessary indirection, over-abstracted helpers, and alias-only variables.
Compute values close to where they are used.

4. Assume valid domain input unless contract/tests require otherwise.
Avoid defensive fallback noise that hides errors or clutters core logic.

5. Keep changes minimal and consistent.
Follow existing project style, naming, and file organization.
Prefer small focused edits over broad refactors unless explicitly requested.

## Review Checklist
Before finishing code changes:
1. `npm run tsc` passes.
2. No unnecessary new types/aliases were introduced.
3. No package-specific policy was added to this file.
