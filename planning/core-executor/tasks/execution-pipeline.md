# Task: 10-Step Async Execution Pipeline

## Goal

Implement the complete execution pipeline in the `Executor.call()` method, integrating all 10 steps: context creation, safety checks, module lookup, ACL enforcement, input validation with redaction, middleware before chain, module execution with timeout, output validation, middleware after chain, and result return. Unlike the Python implementation which has separate `call()` and `call_async()`, the TypeScript version uses a single async `call()` method.

## Files Involved

- `src/executor.ts` -- `Executor` class: `constructor()`, `call()`, `validate()`, `_executeWithTimeout()`, middleware registration methods (~300 lines)
- `src/errors.ts` -- `ModuleNotFoundError`, `ACLDeniedError`, `SchemaValidationError`, `ModuleTimeoutError`, `InvalidInputError`
- `tests/test-executor.test.ts` -- Full pipeline unit and integration tests

## Steps

### 1. Implement Executor constructor (TDD)

- Accept options object: `{ registry, middlewares?, acl?, config? }`
- Initialize `MiddlewareManager` and register provided middlewares
- Read config values for `defaultTimeout` (30000ms), `globalTimeout` (60000ms), `maxCallDepth` (32), `maxModuleRepeat` (3)

### 2. Implement middleware registration (TDD)

- `use(middleware)` -- adds class-based middleware, returns `this` for chaining
- `useBefore(callback)` -- wraps in `BeforeMiddleware` adapter
- `useAfter(callback)` -- wraps in `AfterMiddleware` adapter
- `remove(middleware)` -- delegates to `MiddlewareManager.remove()`

### 3. Implement call() pipeline (TDD)

- **Step 1**: Create or derive Context via `Context.create()` + `child()` or `context.child()`
- **Step 2**: Run `_checkSafety(moduleId, ctx)`
- **Step 3**: `registry.get(moduleId)`, throw `ModuleNotFoundError` if null
- **Step 4**: `acl.check()` if ACL configured, throw `ACLDeniedError` if denied
- **Step 5**: TypeBox `Value.Check()` for input validation, build `redactedInputs` via `redactSensitive()`
- **Step 6**: `executeBefore()`, handle `MiddlewareChainError` with `onError` recovery
- **Step 7**: `_executeWithTimeout()` via `Promise.race`
- **Step 8**: TypeBox `Value.Check()` for output validation
- **Step 9**: `executeAfter()` in reverse order
- **Step 10**: Return output or propagate error with `onError` recovery

### 4. Implement _executeWithTimeout (TDD)

- Wrap module execution in `Promise.race` against a timeout promise
- Timeout promise rejects with `ModuleTimeoutError` after `timeout_ms` milliseconds
- Uses `setTimeout` for the timeout timer
- Zero timeout: log warning, execute without timeout enforcement
- Negative timeout: throw `InvalidInputError`
- Both sync and async `execute()` return values handled via `Promise.resolve()`

```typescript
private async _executeWithTimeout(
  module: unknown,
  inputs: Record<string, unknown>,
  ctx: Context,
  timeoutMs: number,
): Promise<Record<string, unknown>> {
  if (timeoutMs < 0) throw new InvalidInputError('Timeout cannot be negative');

  const executeFn = (module as any).execute.bind(module);
  const resultPromise = Promise.resolve(executeFn(inputs, ctx));

  if (timeoutMs === 0) {
    // Warning: timeout disabled
    return resultPromise;
  }

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new ModuleTimeoutError(moduleId, timeoutMs)), timeoutMs);
  });

  return Promise.race([resultPromise, timeoutPromise]);
}
```

### 5. Implement validate() (TDD)

- Standalone pre-flight check without execution
- Returns `{ valid: boolean, errors: Array<{ path, message }> }`
- Throws `ModuleNotFoundError` if module not found
- Uses TypeBox `Value.Check()` and `Value.Errors()` for validation

### 6. Verify full pipeline tests pass

```bash
npx vitest run tests/test-executor.test.ts
```

## Acceptance Criteria

- [x] All 10 steps execute in order for the success path
- [x] Each step can independently throw its specific error type
- [x] MiddlewareChainError triggers onError recovery before re-throwing
- [x] Outer exception handler catches errors from steps 6-9 and runs onError on executed middlewares
- [x] Recovery output from onError short-circuits the error and returns the recovery dict
- [x] Timeout enforcement uses `Promise.race` with `setTimeout`
- [x] Timeout of 0 disables enforcement with a logged warning
- [x] Negative timeout throws `InvalidInputError`
- [x] `validate()` returns structured errors without executing the module
- [x] Both sync and async module `execute()` methods handled via `Promise.resolve()`
- [x] All tests pass with `vitest`; zero errors from `tsc --noEmit`

## Dependencies

- Task: setup (Context, Config)
- Task: safety-checks (`_checkSafety` method)
- Task: redaction (`redactSensitive` utility)
- Registry system (module lookup)
- Middleware system (MiddlewareManager)
- Schema system (TypeBox validation)

## Estimated Time

6 hours
