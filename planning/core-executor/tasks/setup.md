# Task: Context, Identity, and Config Classes

## Goal

Implement the foundational data structures for the execution pipeline: `Context` class for per-call metadata propagation, `Identity` interface with `createIdentity()` factory for caller representation, and `Config` accessor for dot-path configuration.

## Files Involved

- `src/context.ts` -- `Context` class and `Identity` interface with `createIdentity()`
- `src/config.ts` -- `Config` class with dot-path key support
- `tests/test-context.test.ts` -- Unit tests for Context and Identity
- `tests/test-config.test.ts` -- Unit tests for Config

## Steps

### 1. Write failing tests (TDD)

Create tests for:
- **Identity**: `createIdentity({ id: 'user-1' })` creates frozen object with defaults (type="user", roles=[], attrs={})
- **Identity immutability**: Frozen identity cannot be mutated at runtime
- **Context.create()**: Creates root context with UUID traceId, empty callChain, shared data dict
- **Context.child()**: Creates child context inheriting traceId, appending moduleId to callChain, sharing data by reference
- **Config.get()**: Dot-path navigation (e.g., `config.get('executor.default_timeout')`)
- **Config.get() with default**: Returns default when key not found

### 2. Implement Identity interface and createIdentity()

```typescript
export interface Identity {
  readonly id: string;
  readonly type: string;
  readonly roles: readonly string[];
  readonly attrs: Readonly<Record<string, unknown>>;
}

export function createIdentity(options: { id: string; type?: string; roles?: string[]; attrs?: Record<string, unknown> }): Identity {
  return Object.freeze({
    id: options.id,
    type: options.type ?? 'user',
    roles: Object.freeze([...(options.roles ?? [])]),
    attrs: Object.freeze({ ...(options.attrs ?? {}) }),
  });
}
```

### 3. Implement Context class

- `create()` static factory: generates traceId via `crypto.randomUUID()`, initializes empty callChain and data
- `child()` method: copies traceId, appends current moduleId to callChain, shares data reference

### 4. Implement Config class

- Constructor takes nested `Record<string, unknown>`
- `get(key, defaultValue?)` splits on `.` and traverses nested records

### 5. Verify tests pass

Run `npx vitest run tests/test-context.test.ts tests/test-config.test.ts`.

## Acceptance Criteria

- [x] `createIdentity()` returns frozen Identity with correct defaults
- [x] `Context.create()` generates UUID v4 traceId
- [x] `Context.child()` shares data dict by reference, appends to callChain
- [x] `Config.get()` supports dot-path navigation
- [x] `Config.get()` returns defaultValue when key not found
- [x] All fields correctly typed with readonly where appropriate

## Dependencies

None -- these are foundational data structures.

## Estimated Time

2 hours
