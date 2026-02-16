# Task: Sensitive Field Redaction Utility

## Goal

Implement the `redactSensitive` utility that walks input/output dictionaries and replaces values of fields marked `x-sensitive: true` in the schema with `***REDACTED***`. This ensures sensitive data never appears in logs or error reports.

## Files Involved

- `src/executor.ts` -- `redactSensitive()`, `_redactFields()`, `_redactSecretPrefix()`, `REDACTED_VALUE` constant
- `tests/test-redaction.test.ts` -- Redaction unit tests

## Steps

### 1. Define REDACTED_VALUE constant (TDD)

```typescript
export const REDACTED_VALUE = '***REDACTED***';
```

Test: verify constant value is `"***REDACTED***"`.

### 2. Implement redactSensitive (TDD)

- Accept `data: Record<string, unknown>` and `schemaDict: Record<string, unknown>`
- Deep copy via `JSON.parse(JSON.stringify(data))` to avoid mutating original
- Call `_redactFields()` for schema-based redaction
- Call `_redactSecretPrefix()` for key-prefix-based redaction
- Return the redacted copy

```typescript
export function redactSensitive(
  data: Record<string, unknown>,
  schemaDict: Record<string, unknown>,
): Record<string, unknown> {
  const copy = JSON.parse(JSON.stringify(data));
  _redactFields(copy, schemaDict);
  _redactSecretPrefix(copy);
  return copy;
}
```

Test: deep copy (original not mutated), no mutation of original data.

### 3. Implement _redactFields (TDD)

- In-place redaction on the deep copy
- Read `properties` from `schemaDict`; return early if missing
- For each property: if `x-sensitive: true`, replace value with `REDACTED_VALUE` (skip `null`/`undefined`)
- For nested objects (`type: 'object'` with `properties`): recurse into the value dict
- For arrays (`type: 'array'` with `items`): if items have `x-sensitive`, redact each item; if items are objects with properties, recurse into each dict item

Test: flat fields, nested objects, arrays with `x-sensitive` items.

### 4. Implement _redactSecretPrefix (TDD)

- In-place redaction of any key starting with `_secret_`
- Replace non-null values with `REDACTED_VALUE`

Test: keys starting with `_secret_` redacted, non-matching keys preserved.

### 5. Verify tests pass

```bash
npx vitest run tests/test-redaction.test.ts
```

## Acceptance Criteria

- [x] Original data dict is never mutated (`JSON.parse(JSON.stringify())` deep copy)
- [x] Fields with `x-sensitive: true` in schema are replaced with `***REDACTED***`
- [x] `null`/`undefined` values are not redacted (remain as-is)
- [x] Nested object fields are recursively redacted
- [x] Array items with `x-sensitive` are individually redacted
- [x] Array items that are objects with properties are recursively redacted
- [x] Keys starting with `_secret_` are redacted regardless of schema
- [x] Non-sensitive fields pass through unchanged
- [x] All tests pass with `vitest`; zero errors from `tsc --noEmit`

## Dependencies

- None (standalone utility, used by execution-pipeline task at step 5)

## Estimated Time

2 hours
