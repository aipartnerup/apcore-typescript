# Task: MiddlewareManager with Onion-Model Execution

## Goal

Implement the `MiddlewareManager` class that manages middleware registration and executes the onion-model pipeline. The manager provides `add()`, `remove()` (by reference identity), and `snapshot()` for list management. It exposes `executeBefore()` (forward order), `executeAfter()` (reverse order), and `executeOnError()` (reverse over executed subset, first non-null recovery wins). Also implement `MiddlewareChainError` extending `ModuleError` to wrap failures during the `before()` phase with tracking of which middlewares have already executed.

## Files Involved

| File | Action |
|------|--------|
| `src/middleware/manager.ts` | Create -- MiddlewareManager and MiddlewareChainError |
| `src/errors.ts` | Read -- ModuleError base class (dependency) |
| `tests/test-middleware-manager.test.ts` | Create -- Unit tests for manager and chain error |

## Steps (TDD)

### Step 1: Write failing tests for add/remove/snapshot

```typescript
import { describe, it, expect } from 'vitest';
import { Middleware } from '../src/middleware/base.js';
import { MiddlewareManager } from '../src/middleware/manager.js';

describe('MiddlewareManager', () => {
  it('starts empty', () => {
    const mgr = new MiddlewareManager();
    expect(mgr.snapshot()).toEqual([]);
  });

  it('add and snapshot', () => {
    const mgr = new MiddlewareManager();
    mgr.add(new Middleware());
    mgr.add(new Middleware());
    expect(mgr.snapshot()).toHaveLength(2);
  });

  it('snapshot returns a copy', () => {
    const mgr = new MiddlewareManager();
    mgr.add(new Middleware());
    const snap = mgr.snapshot();
    snap.pop();
    expect(mgr.snapshot()).toHaveLength(1);
  });

  it('remove by identity', () => {
    const mgr = new MiddlewareManager();
    const mw1 = new Middleware();
    const mw2 = new Middleware();
    mgr.add(mw1);
    mgr.add(mw2);
    expect(mgr.remove(mw1)).toBe(true);
    expect(mgr.snapshot()).toEqual([mw2]);
  });

  it('remove returns false when not found', () => {
    const mgr = new MiddlewareManager();
    expect(mgr.remove(new Middleware())).toBe(false);
  });
});
```

### Step 2: Implement add, remove, snapshot

```typescript
import { Middleware } from './base.js';

export class MiddlewareManager {
  private _middlewares: Middleware[] = [];

  add(middleware: Middleware): void {
    this._middlewares.push(middleware);
  }

  remove(middleware: Middleware): boolean {
    for (let i = 0; i < this._middlewares.length; i++) {
      if (this._middlewares[i] === middleware) {
        this._middlewares.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  snapshot(): Middleware[] {
    return [...this._middlewares];
  }
}
```

No thread locking is needed -- Node.js is single-threaded. The Python implementation uses `threading.Lock`; in TypeScript, `snapshot()` returning a shallow copy is sufficient to guard against mutations during iteration.

### Step 3: Write failing tests for executeBefore (forward order)

```typescript
it('executeBefore runs in forward order', () => {
  const mgr = new MiddlewareManager();
  mgr.add(new TaggingMiddleware('A'));
  mgr.add(new TaggingMiddleware('B'));
  mgr.add(new TaggingMiddleware('C'));
  const ctx = makeContext();
  const [result, executed] = mgr.executeBefore('mod.test', { trail: '' }, ctx);
  expect(result['trail']).toBe('ABC');
  expect(executed).toHaveLength(3);
});

it('executeBefore passes original inputs when all return null', () => {
  const mgr = new MiddlewareManager();
  mgr.add(new Middleware());
  const ctx = makeContext();
  const [result] = mgr.executeBefore('mod.test', { x: 42 }, ctx);
  expect(result).toEqual({ x: 42 });
});
```

### Step 4: Implement executeBefore

```typescript
executeBefore(
  moduleId: string,
  inputs: Record<string, unknown>,
  context: Context,
): [Record<string, unknown>, Middleware[]] {
  let currentInputs = inputs;
  const executedMiddlewares: Middleware[] = [];
  const middlewares = this.snapshot();

  for (const mw of middlewares) {
    executedMiddlewares.push(mw);
    try {
      const result = mw.before(moduleId, currentInputs, context);
      if (result !== null) {
        currentInputs = result;
      }
    } catch (e) {
      throw new MiddlewareChainError(e as Error, executedMiddlewares);
    }
  }

  return [currentInputs, executedMiddlewares];
}
```

### Step 5: Write failing tests for executeAfter (reverse order)

```typescript
it('executeAfter runs in reverse order', () => {
  const mgr = new MiddlewareManager();
  mgr.add(new TaggingMiddleware('A'));
  mgr.add(new TaggingMiddleware('B'));
  mgr.add(new TaggingMiddleware('C'));
  const ctx = makeContext();
  const result = mgr.executeAfter('mod.test', {}, { trail: '' }, ctx);
  expect(result['trail']).toBe('CBA');
});
```

### Step 6: Implement executeAfter

```typescript
executeAfter(
  moduleId: string,
  inputs: Record<string, unknown>,
  output: Record<string, unknown>,
  context: Context,
): Record<string, unknown> {
  let currentOutput = output;
  const middlewares = this.snapshot();

  for (let i = middlewares.length - 1; i >= 0; i--) {
    const result = middlewares[i].after(moduleId, inputs, currentOutput, context);
    if (result !== null) {
      currentOutput = result;
    }
  }

  return currentOutput;
}
```

### Step 7: Write failing tests for executeOnError (reverse, first recovery wins, errors swallowed)

```typescript
it('executeOnError returns first non-null recovery (reverse order)', () => {
  const mgr = new MiddlewareManager();
  const mwA = new RecoveringMiddleware({ recovered: 'A' });
  const mwB = new RecoveringMiddleware({ recovered: 'B' });
  mgr.add(mwA);
  mgr.add(mwB);
  const ctx = makeContext();
  const result = mgr.executeOnError('mod.test', {}, new Error('oops'), ctx, [mwA, mwB]);
  expect(result).toEqual({ recovered: 'B' });
});

it('executeOnError returns null when no recovery', () => {
  const mgr = new MiddlewareManager();
  const mw = new Middleware();
  mgr.add(mw);
  const ctx = makeContext();
  const result = mgr.executeOnError('mod.test', {}, new Error('oops'), ctx, [mw]);
  expect(result).toBeNull();
});

it('executeOnError swallows errors in onError handlers', () => {
  // ThrowingOnError middleware throws inside onError()
  // RecoveringMiddleware before it should still provide recovery
  const result = mgr.executeOnError('mod.test', {}, new Error('original'), ctx, [mwRecover, mwThrow]);
  expect(result).toEqual({ safe: true });
});
```

### Step 8: Implement executeOnError

```typescript
executeOnError(
  moduleId: string,
  inputs: Record<string, unknown>,
  error: Error,
  context: Context,
  executedMiddlewares: Middleware[],
): Record<string, unknown> | null {
  for (let i = executedMiddlewares.length - 1; i >= 0; i--) {
    try {
      const result = executedMiddlewares[i].onError(moduleId, inputs, error, context);
      if (result !== null) {
        return result;
      }
    } catch {
      // Swallow errors in onError handlers
      continue;
    }
  }
  return null;
}
```

### Step 9: Write failing test for MiddlewareChainError

```typescript
it('MiddlewareChainError wraps before() failure', () => {
  class FailingBefore extends Middleware {
    override before(): Record<string, unknown> | null {
      throw new Error('before exploded');
    }
  }
  const mgr = new MiddlewareManager();
  mgr.add(new TaggingMiddleware('A'));
  mgr.add(new FailingBefore());
  const ctx = makeContext();

  let caught: MiddlewareChainError | undefined;
  try {
    mgr.executeBefore('mod.test', { trail: '' }, ctx);
  } catch (e) {
    caught = e as MiddlewareChainError;
  }

  expect(caught).toBeInstanceOf(MiddlewareChainError);
  expect(caught!.original.message).toBe('before exploded');
  expect(caught!.executedMiddlewares).toHaveLength(2);
});
```

### Step 10: Implement MiddlewareChainError

```typescript
import { ModuleError } from '../errors.js';

export class MiddlewareChainError extends ModuleError {
  readonly original: Error;
  readonly executedMiddlewares: Middleware[];

  constructor(original: Error, executedMiddlewares: Middleware[]) {
    super('MIDDLEWARE_CHAIN_ERROR', String(original));
    this.name = 'MiddlewareChainError';
    this.original = original;
    this.executedMiddlewares = executedMiddlewares;
  }
}
```

Key difference from Python: extends `ModuleError` (which extends `Error`), not `Exception`. This integrates with the framework's structured error hierarchy providing `code`, `details`, and `timestamp` properties.

### Step 11: Run all tests and confirm green

```bash
npx vitest run tests/test-middleware-manager.test.ts
```

## Acceptance Criteria

- [x] `MiddlewareManager` is exported from `src/middleware/manager.ts`
- [x] `add()` appends a middleware to the internal list
- [x] `remove()` removes by strict reference identity (`===`) and returns `boolean`
- [x] `snapshot()` returns a shallow copy; mutations to the copy do not affect the internal list
- [x] `executeBefore()` runs in forward registration order, returns `[transformedInputs, executedMiddlewares]`
- [x] `executeBefore()` wraps middleware errors in `MiddlewareChainError`
- [x] `executeAfter()` runs in reverse registration order
- [x] `executeOnError()` runs in reverse over the executed middlewares subset
- [x] `executeOnError()` returns the first non-null recovery value
- [x] `executeOnError()` swallows errors thrown by `onError()` handlers
- [x] `MiddlewareChainError` extends `ModuleError` with `original` and `executedMiddlewares` properties
- [x] No thread locking is used (Node.js single-threaded model)
- [x] All tests pass with `vitest`

## Dependencies

- `src/middleware/base.ts` -- `Middleware` base class (task: base)
- `src/errors.ts` -- `ModuleError` base error class
- `src/context.ts` -- `Context` class (parameter type)

## Estimated Time

3 hours
