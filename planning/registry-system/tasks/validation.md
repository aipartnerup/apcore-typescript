# Task: Validation

## Goal

Implement `validateModule()` which performs duck-type structural validation on a module object. Checks that the module has `inputSchema` (non-null object), `outputSchema` (non-null object), `description` (non-empty string), and `execute` (function). Returns an array of error strings -- empty array means valid. Unlike Python's `issubclass` checks, TypeScript uses duck typing to validate structural conformance.

## Files Involved

- `src/registry/validation.ts` -- Validation implementation
- `tests/registry/test-validation.test.ts` -- Validation tests

## Steps (TDD)

### Step 1: Valid module returns empty error array

```typescript
import { describe, it, expect } from 'vitest';
import { validateModule } from '../../src/registry/validation.js';

describe('validateModule', () => {
  it('should return empty array for a valid module', () => {
    const validModule = {
      inputSchema: { type: 'object', properties: {} },
      outputSchema: { type: 'object', properties: {} },
      description: 'A valid module',
      execute: async () => ({}),
    };
    const errors = validateModule(validModule);
    expect(errors).toEqual([]);
  });
});
```

### Step 2: Missing inputSchema

```typescript
it('should report missing inputSchema', () => {
  const mod = {
    outputSchema: { type: 'object' },
    description: 'Test',
    execute: async () => ({}),
  };
  const errors = validateModule(mod);
  expect(errors).toHaveLength(1);
  expect(errors[0]).toContain('inputSchema');
});
```

### Step 3: Missing outputSchema

```typescript
it('should report missing outputSchema', () => {
  const mod = {
    inputSchema: { type: 'object' },
    description: 'Test',
    execute: async () => ({}),
  };
  const errors = validateModule(mod);
  expect(errors).toHaveLength(1);
  expect(errors[0]).toContain('outputSchema');
});
```

### Step 4: Missing or empty description

```typescript
it('should report missing description', () => {
  const mod = {
    inputSchema: { type: 'object' },
    outputSchema: { type: 'object' },
    execute: async () => ({}),
  };
  const errors = validateModule(mod);
  expect(errors.some((e) => e.includes('description'))).toBe(true);
});

it('should report empty string description', () => {
  const mod = {
    inputSchema: { type: 'object' },
    outputSchema: { type: 'object' },
    description: '',
    execute: async () => ({}),
  };
  const errors = validateModule(mod);
  expect(errors.some((e) => e.includes('description'))).toBe(true);
});
```

### Step 5: Missing execute method

```typescript
it('should report missing execute method', () => {
  const mod = {
    inputSchema: { type: 'object' },
    outputSchema: { type: 'object' },
    description: 'Test module',
  };
  const errors = validateModule(mod);
  expect(errors.some((e) => e.includes('execute'))).toBe(true);
});
```

### Step 6: Multiple validation errors

```typescript
it('should accumulate all validation errors', () => {
  const errors = validateModule({});
  expect(errors.length).toBeGreaterThanOrEqual(3);
  expect(errors.some((e) => e.includes('inputSchema'))).toBe(true);
  expect(errors.some((e) => e.includes('outputSchema'))).toBe(true);
  expect(errors.some((e) => e.includes('description'))).toBe(true);
  expect(errors.some((e) => e.includes('execute'))).toBe(true);
});
```

### Step 7: Non-object inputSchema/outputSchema

```typescript
it('should reject non-object inputSchema', () => {
  const mod = {
    inputSchema: 'not an object',
    outputSchema: { type: 'object' },
    description: 'Test',
    execute: async () => ({}),
  };
  const errors = validateModule(mod);
  expect(errors.some((e) => e.includes('inputSchema'))).toBe(true);
});

it('should reject null inputSchema', () => {
  const mod = {
    inputSchema: null,
    outputSchema: { type: 'object' },
    description: 'Test',
    execute: async () => ({}),
  };
  const errors = validateModule(mod);
  expect(errors.some((e) => e.includes('inputSchema'))).toBe(true);
});
```

### Step 8: Constructor fallback for class-based modules

```typescript
it('should check constructor for schema when instance lacks it', () => {
  class MyModule {
    static inputSchema = { type: 'object' };
    static outputSchema = { type: 'object' };
    description = 'Class-based module';
    execute = async () => ({});
  }
  const instance = new MyModule();
  const errors = validateModule(instance);
  expect(errors).toEqual([]);
});
```

## Acceptance Criteria

- [x] Valid module with inputSchema (object), outputSchema (object), description (string), execute (function) returns `[]`
- [x] Missing `inputSchema` produces descriptive error string
- [x] Missing `outputSchema` produces descriptive error string
- [x] Missing or empty `description` produces descriptive error string
- [x] Missing `execute` method produces descriptive error string
- [x] Non-object `inputSchema`/`outputSchema` (string, null, number) produces error
- [x] All errors are accumulated and returned together
- [x] Constructor properties are checked as fallback for class instances
- [x] Function accepts `unknown` type parameter for flexibility
- [x] All tests pass with `vitest`

## Dependencies

- `types` task (interfaces for context)

## Estimated Time

1 hour
