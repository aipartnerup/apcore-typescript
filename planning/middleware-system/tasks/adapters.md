# Task: BeforeMiddleware and AfterMiddleware Adapters

## Goal

Implement `BeforeMiddleware` and `AfterMiddleware` adapter classes that wrap callback functions into the middleware interface. These adapters enable lightweight, functional middleware creation without requiring users to subclass `Middleware`. Each adapter delegates a single lifecycle hook to the provided callback while inheriting no-op behavior for the other hooks from the base class. Also define `BeforeCallback` and `AfterCallback` type aliases for the callback signatures.

## Files Involved

| File | Action |
|------|--------|
| `src/middleware/adapters.ts` | Create -- BeforeMiddleware, AfterMiddleware, and callback types |
| `tests/test-middleware.test.ts` | Extend -- Unit tests for adapter classes |

## Steps (TDD)

### Step 1: Define callback type aliases

```typescript
export type BeforeCallback = (
  moduleId: string,
  inputs: Record<string, unknown>,
  context: Context,
) => Record<string, unknown> | null;

export type AfterCallback = (
  moduleId: string,
  inputs: Record<string, unknown>,
  output: Record<string, unknown>,
  context: Context,
) => Record<string, unknown> | null;
```

### Step 2: Write failing tests for BeforeMiddleware

```typescript
describe('BeforeMiddleware', () => {
  it('wraps a callback and delegates to before()', () => {
    const mw = new BeforeMiddleware((moduleId, inputs) => {
      return { ...inputs, injected: moduleId };
    });
    const ctx = makeContext();
    const result = mw.before('mod.x', { a: 1 }, ctx);
    expect(result).toEqual({ a: 1, injected: 'mod.x' });
  });

  it('after() still returns null', () => {
    const mw = new BeforeMiddleware(() => ({ replaced: true }));
    const ctx = makeContext();
    expect(mw.after('mod.x', {}, {}, ctx)).toBeNull();
  });

  it('onError() still returns null', () => {
    const mw = new BeforeMiddleware(() => ({ replaced: true }));
    const ctx = makeContext();
    expect(mw.onError('mod.x', {}, new Error('fail'), ctx)).toBeNull();
  });

  it('can return null from callback', () => {
    const mw = new BeforeMiddleware(() => null);
    const ctx = makeContext();
    expect(mw.before('mod.x', { a: 1 }, ctx)).toBeNull();
  });
});
```

### Step 3: Implement BeforeMiddleware

```typescript
import type { Context } from '../context.js';
import { Middleware } from './base.js';

export class BeforeMiddleware extends Middleware {
  private _callback: BeforeCallback;

  constructor(callback: BeforeCallback) {
    super();
    this._callback = callback;
  }

  override before(
    moduleId: string,
    inputs: Record<string, unknown>,
    context: Context,
  ): Record<string, unknown> | null {
    return this._callback(moduleId, inputs, context);
  }
}
```

### Step 4: Write failing tests for AfterMiddleware

```typescript
describe('AfterMiddleware', () => {
  it('wraps a callback and delegates to after()', () => {
    const mw = new AfterMiddleware((moduleId, _inputs, output) => {
      return { ...output, processedBy: moduleId };
    });
    const ctx = makeContext();
    const result = mw.after('mod.y', { a: 1 }, { out: 42 }, ctx);
    expect(result).toEqual({ out: 42, processedBy: 'mod.y' });
  });

  it('before() still returns null', () => {
    const mw = new AfterMiddleware(() => ({ replaced: true }));
    const ctx = makeContext();
    expect(mw.before('mod.y', {}, ctx)).toBeNull();
  });

  it('onError() still returns null', () => {
    const mw = new AfterMiddleware(() => ({ replaced: true }));
    const ctx = makeContext();
    expect(mw.onError('mod.y', {}, new Error('fail'), ctx)).toBeNull();
  });

  it('can return null from callback', () => {
    const mw = new AfterMiddleware(() => null);
    const ctx = makeContext();
    expect(mw.after('mod.y', {}, { out: 1 }, ctx)).toBeNull();
  });
});
```

### Step 5: Implement AfterMiddleware

```typescript
export class AfterMiddleware extends Middleware {
  private _callback: AfterCallback;

  constructor(callback: AfterCallback) {
    super();
    this._callback = callback;
  }

  override after(
    moduleId: string,
    inputs: Record<string, unknown>,
    output: Record<string, unknown>,
    context: Context,
  ): Record<string, unknown> | null {
    return this._callback(moduleId, inputs, output, context);
  }
}
```

### Step 6: Run tests and confirm all pass

```bash
npx vitest run tests/test-middleware.test.ts
```

## Acceptance Criteria

- [x] `BeforeCallback` type alias is exported with signature `(moduleId, inputs, context) => Record<string, unknown> | null`
- [x] `AfterCallback` type alias is exported with signature `(moduleId, inputs, output, context) => Record<string, unknown> | null`
- [x] `BeforeMiddleware` extends `Middleware` and delegates only `before()` to the callback
- [x] `BeforeMiddleware.after()` and `BeforeMiddleware.onError()` return `null` (inherited no-op)
- [x] `AfterMiddleware` extends `Middleware` and delegates only `after()` to the callback
- [x] `AfterMiddleware.before()` and `AfterMiddleware.onError()` return `null` (inherited no-op)
- [x] Callbacks stored as `private _callback` fields
- [x] Both adapters use `override` keyword on the delegated method
- [x] All tests pass with `vitest`

## Dependencies

- `src/middleware/base.ts` -- `Middleware` base class (task: base)
- `src/context.ts` -- `Context` class (type import)

## Estimated Time

1.5 hours
