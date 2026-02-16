# Task: Strict Mode

## Goal

Implement the strict-mode transformation utilities for converting JSON Schemas to OpenAI-compatible strict mode format (Algorithm A23). This includes `toStrictSchema()` for full strict conversion, `stripExtensions()` for removing vendor extensions and defaults, and `applyLlmDescriptions()` for substituting `x-llm-description` into `description` fields.

## Files Involved

- `src/schema/strict.ts` -- `toStrictSchema()`, `stripExtensions()`, `applyLlmDescriptions()`, internal `convertToStrict()`
- `tests/schema/test-strict.test.ts` -- Unit tests

## Steps

### 1. Implement deepCopy utility

```typescript
function deepCopy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
```

Used internally to ensure all transformations operate on copies, never mutating the original schema.

### 2. Implement applyLlmDescriptions()

Recursively walk the schema tree. At each object node, if both `x-llm-description` and `description` exist, replace `description` with the value of `x-llm-description`. Recurse into `properties`, `items`, `oneOf`/`anyOf`/`allOf`, and `definitions`/`$defs`.

```typescript
export function applyLlmDescriptions(node: unknown): void {
  if (typeof node !== 'object' || node === null || Array.isArray(node)) return;

  const obj = node as Record<string, unknown>;
  if ('x-llm-description' in obj && 'description' in obj) {
    obj['description'] = obj['x-llm-description'];
  }

  if ('properties' in obj && typeof obj['properties'] === 'object' && obj['properties'] !== null) {
    for (const prop of Object.values(obj['properties'] as Record<string, unknown>)) {
      applyLlmDescriptions(prop);
    }
  }
  // ... recurse into items, oneOf, anyOf, allOf, definitions, $defs
}
```

TDD: Test root-level description replacement. Test nested property description replacement. Test no-op when `x-llm-description` is absent.

### 3. Implement stripExtensions()

Recursively remove all keys starting with `x-` and the `default` key from every object node. Recurse into all nested objects and arrays.

```typescript
export function stripExtensions(node: unknown): void {
  if (typeof node !== 'object' || node === null || Array.isArray(node)) return;

  const obj = node as Record<string, unknown>;
  const keysToRemove = Object.keys(obj).filter(
    (k) => (typeof k === 'string' && k.startsWith('x-')) || k === 'default',
  );
  for (const k of keysToRemove) {
    delete obj[k];
  }

  for (const value of Object.values(obj)) {
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'object' && item !== null) {
            stripExtensions(item);
          }
        }
      } else {
        stripExtensions(value);
      }
    }
  }
}
```

TDD: Test `x-sensitive`, `x-custom`, `x-llm-description` are removed. Test `default` is removed. Test nested structures are processed. Test non-extension keys survive.

### 4. Implement convertToStrict() (internal)

For each object node with `type: "object"` and `properties`:
1. Set `additionalProperties: false`
2. Collect existing `required` array into a Set
3. Find optional properties (not in `required`)
4. For optional properties with a `type` field: wrap type in array with `"null"` (e.g., `"string"` -> `["string", "null"]`)
5. For optional properties without a `type` field: wrap in `{ oneOf: [originalSchema, { type: "null" }] }`
6. Set `required` to sorted array of ALL property names

Recurse into `properties`, `items`, `oneOf`/`anyOf`/`allOf`, and `definitions`/`$defs`.

```typescript
function convertToStrict(node: unknown): void {
  // ... see implementation in src/schema/strict.ts
}
```

TDD: Test `additionalProperties: false` is added. Test all properties become required. Test optional properties get null-union wrapping. Test already-required properties keep their original type.

### 5. Implement toStrictSchema() composition

Compose the three operations: deep-copy, strip extensions, then convert to strict.

```typescript
export function toStrictSchema(schema: Record<string, unknown>): Record<string, unknown> {
  const result = deepCopy(schema);
  stripExtensions(result);
  convertToStrict(result);
  return result;
}
```

TDD: Test that the original schema is not mutated. Test full pipeline: extensions removed, `additionalProperties: false` set, all required, optionals nullable.

## Acceptance Criteria

- [x] `applyLlmDescriptions()` replaces `description` with `x-llm-description` where both exist
- [x] `applyLlmDescriptions()` recurses into `properties`, `items`, `oneOf`/`anyOf`/`allOf`, `definitions`/`$defs`
- [x] `applyLlmDescriptions()` is a no-op when `x-llm-description` is absent
- [x] `stripExtensions()` removes all `x-` prefixed keys recursively
- [x] `stripExtensions()` removes `default` keys recursively
- [x] `stripExtensions()` preserves non-extension keys
- [x] `stripExtensions()` handles nested objects and arrays
- [x] `toStrictSchema()` sets `additionalProperties: false` on all object schemas
- [x] `toStrictSchema()` makes all properties required (sorted alphabetically)
- [x] `toStrictSchema()` wraps optional type-bearing properties with null type array
- [x] `toStrictSchema()` wraps optional non-type properties with `oneOf` null union
- [x] `toStrictSchema()` does not mutate the original schema (returns deep copy)
- [x] `toStrictSchema()` strips extensions before strict conversion
- [x] All tests pass with `vitest`

## Dependencies

- None (standalone utility, no internal dependencies)

## Estimated Time

2 hours
