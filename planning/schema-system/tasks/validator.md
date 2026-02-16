# Task: SchemaValidator

## Goal

Implement the `SchemaValidator` class for runtime validation of data against TypeBox `TSchema` objects. Supports a coercion toggle (`Value.Decode` vs `Value.Check`), detailed error collection via `Value.Errors()`, and separate `validateInput()`/`validateOutput()` entry points that return validated data or throw `SchemaValidationError`.

## Files Involved

- `src/schema/validator.ts` -- `SchemaValidator` class
- `src/schema/types.ts` -- `SchemaValidationResult`, `SchemaValidationErrorDetail`, `validationResultToError()`
- `src/errors.ts` -- `SchemaValidationError`
- `tests/schema/test-validator.test.ts` -- Unit tests

## Steps

### 1. Implement constructor with coercion toggle

```typescript
export class SchemaValidator {
  private _coerceTypes: boolean;

  constructor(coerceTypes: boolean = true) {
    this._coerceTypes = coerceTypes;
  }
}
```

TDD: Verify default `coerceTypes` is `true`. Verify explicit `false` disables coercion.

### 2. Implement validate() method

When coercion is enabled, attempt `Value.Decode()`. If it succeeds, return `{ valid: true, errors: [] }`. If it throws, collect errors and return `{ valid: false, errors: [...] }`.

When coercion is disabled, use `Value.Check()`. If it returns `true`, return valid result. Otherwise, collect errors.

```typescript
validate(data: Record<string, unknown>, schema: TSchema): SchemaValidationResult {
  if (this._coerceTypes) {
    try {
      Value.Decode(schema, data);
      return { valid: true, errors: [] };
    } catch {
      return { valid: false, errors: this._collectErrors(schema, data) };
    }
  }

  if (Value.Check(schema, data)) {
    return { valid: true, errors: [] };
  }
  return { valid: false, errors: this._collectErrors(schema, data) };
}
```

TDD: Test valid data returns `{ valid: true }`. Test invalid data returns `{ valid: false }` with non-empty errors array.

### 3. Implement _collectErrors() private method

Iterate over `Value.Errors(schema, data)` and map each `ValueError` to a `SchemaValidationErrorDetail`.

```typescript
private _collectErrors(schema: TSchema, data: unknown): SchemaValidationErrorDetail[] {
  const errors: SchemaValidationErrorDetail[] = [];
  for (const error of Value.Errors(schema, data)) {
    errors.push(this._typeboxErrorToDetail(error));
  }
  return errors;
}
```

TDD: Verify errors have populated `path` and `message` fields.

### 4. Implement _typeboxErrorToDetail() mapping

Map TypeBox `ValueError` fields to `SchemaValidationErrorDetail`:
- `error.path` -> `path` (defaults to `'/'` if empty)
- `error.message` -> `message`
- `error.type` -> `constraint` (stringified)
- `error.schema` -> `expected`
- `error.value` -> `actual`

TDD: Verify detail mapping for nested object errors includes correct JSON path.

### 5. Implement validateInput() method

Call `_validateAndReturn()`. On success, return the (potentially coerced) data. On failure, throw `SchemaValidationError` via `validationResultToError()`.

```typescript
validateInput(data: Record<string, unknown>, schema: TSchema): Record<string, unknown> {
  return this._validateAndReturn(data, schema);
}
```

TDD: Test valid input returns data. Test invalid input throws `SchemaValidationError`.

### 6. Implement validateOutput() method

Same as `validateInput()` -- delegates to `_validateAndReturn()`. Separate method for semantic clarity in the executor pipeline (step 5 vs step 8).

TDD: Test valid output returns data. Test invalid output throws `SchemaValidationError`.

### 7. Implement _validateAndReturn() private method

Shared logic for `validateInput()` and `validateOutput()`. With coercion, use `Value.Decode()` and return the decoded value. Without coercion, use `Value.Check()` and return the original data. On failure, collect errors and throw.

```typescript
private _validateAndReturn(data: Record<string, unknown>, schema: TSchema): Record<string, unknown> {
  if (this._coerceTypes) {
    try {
      return Value.Decode(schema, data) as Record<string, unknown>;
    } catch {
      const result: SchemaValidationResult = {
        valid: false,
        errors: this._collectErrors(schema, data),
      };
      throw validationResultToError(result);
    }
  }
  if (Value.Check(schema, data)) {
    return data;
  }
  const result: SchemaValidationResult = {
    valid: false,
    errors: this._collectErrors(schema, data),
  };
  throw validationResultToError(result);
}
```

TDD: Test both coercion and strict paths for valid and invalid data.

## Acceptance Criteria

- [x] `validate()` returns `{ valid: true, errors: [] }` for conforming data
- [x] `validate()` returns `{ valid: false, errors: [...] }` for non-conforming data with detailed errors
- [x] Coercion mode (`coerceTypes: true`) uses `Value.Decode()` for type coercion
- [x] Strict mode (`coerceTypes: false`) uses `Value.Check()` for exact type matching
- [x] `validateInput()` returns data on success, throws `SchemaValidationError` on failure
- [x] `validateOutput()` returns data on success, throws `SchemaValidationError` on failure
- [x] Error details include `path`, `message`, `constraint`, `expected`, `actual`
- [x] Nested object errors include correct JSON path (e.g., `/nested/x`)
- [x] All tests pass with `vitest`

## Dependencies

- types-and-annotations (for `SchemaValidationResult`, `SchemaValidationErrorDetail`, `validationResultToError()`)

## Estimated Time

2 hours
