# Task: Unified Async Execution Path

## Goal

Implement the unified async execution model for the TypeScript executor. Unlike the Python implementation which requires separate `call()` (sync) and `call_async()` methods with a complex sync/async bridge (daemon threads, new event loops, `asyncio.to_thread`), the TypeScript implementation uses a single async `call()` method that transparently handles both sync and async module `execute()` functions via `Promise.resolve()`.

## Files Involved

- `src/executor.ts` -- `call()` method, `_executeWithTimeout()` (~50 lines of async-specific logic)
- `tests/test-executor.test.ts` -- Tests for async/sync module handling

## Steps

### 1. Verify Promise.resolve() handles both sync and async (TDD)

Write tests demonstrating that `Promise.resolve(syncFn())` and `Promise.resolve(asyncFn())` both produce the same awaitable result:

```typescript
describe('unified async execution', () => {
  it('handles sync execute function', async () => {
    const syncModule = {
      execute: (inputs: Record<string, unknown>) => ({ result: inputs['x'] }),
      // ... schemas
    };
    const result = await executor.call('sync.mod', { x: 42 });
    expect(result).toEqual({ result: 42 });
  });

  it('handles async execute function', async () => {
    const asyncModule = {
      execute: async (inputs: Record<string, unknown>) => {
        await new Promise(r => setTimeout(r, 10));
        return { result: inputs['x'] };
      },
      // ... schemas
    };
    const result = await executor.call('async.mod', { x: 42 });
    expect(result).toEqual({ result: 42 });
  });
});
```

### 2. Verify timeout works for both execution modes (TDD)

```typescript
it('times out slow sync execution', async () => {
  // Sync module that blocks (while-loop spin)
  // Promise.race with setTimeout catches this
});

it('times out slow async execution', async () => {
  // Async module with long await
  // Promise.race with setTimeout catches this
});
```

### 3. Document the architectural simplification

The Python implementation requires ~260 lines for sync/async bridging:
- `call_async()` -- async pipeline duplicate
- `_execute_async()` -- async-aware execution dispatch
- `_run_async_in_sync()` -- bridge for async modules in sync context
- `_run_in_new_thread()` -- daemon thread with new event loop
- `_execute_on_error_async()` -- async-aware error recovery
- `_is_async_module()` -- cached async detection with thread lock

The TypeScript version eliminates all of this with a single pattern:
```typescript
const result = await Promise.resolve(module.execute(inputs, ctx));
```

This works because:
1. `Promise.resolve(value)` wraps sync values in a resolved Promise
2. `Promise.resolve(promise)` returns the same Promise (identity for thenables)
3. `await` unwraps both cases identically
4. `Promise.race` provides timeout for both sync and async paths

### 4. Verify middleware hooks work for both module types (TDD)

Test that middleware `before()`, `after()`, and `onError()` execute correctly regardless of whether the module's `execute()` is sync or async.

### 5. Run full test suite

```bash
npx vitest run tests/test-executor.test.ts
```

## Acceptance Criteria

- [x] Single `call()` method handles both sync and async modules
- [x] `Promise.resolve()` transparently wraps sync return values
- [x] `Promise.race` provides timeout enforcement for both execution modes
- [x] No async detection cache needed (no `_isAsyncModule()`, no thread lock)
- [x] No separate `callAsync()` method needed
- [x] No daemon threads, new event loops, or `to_thread()` bridges needed
- [x] Middleware hooks work identically for sync and async modules
- [x] Error propagation works for both sync throws and async rejections
- [x] All tests pass with `vitest`; zero errors from `tsc --noEmit`

## Dependencies

- Task: execution-pipeline (base `call()` implementation with `_executeWithTimeout()`)

## Estimated Time

4 hours
