# Task: Middleware Base Class

## Goal

Implement the `Middleware` base class that defines the three lifecycle hooks for the middleware pipeline: `before()`, `after()`, and `onError()`. Each hook returns `Record<string, unknown> | null` -- returning `null` signals "no transformation" and the pipeline passes the original value through. The base class provides no-op defaults so subclasses only need to override the hooks they care about.

## Files Involved

| File | Action |
|------|--------|
| `src/middleware/base.ts` | Create -- Middleware base class |
| `tests/test-middleware.test.ts` | Create -- Unit tests for base class hooks |

## Steps (TDD)

### Step 1: Write failing tests for `before()` default behavior

Write a test that instantiates `Middleware` and calls `before()` with a module ID, inputs record, and context. Assert it returns `null`.

```typescript
import { describe, it, expect } from 'vitest';
import { Middleware } from '../src/middleware/base.js';
import { Context, createIdentity } from '../src/context.js';

function makeContext(): Context {
  return Context.create(null, createIdentity('test-user'));
}

describe('Middleware base class', () => {
  it('before() returns null by default', () => {
    const mw = new Middleware();
    const ctx = makeContext();
    expect(mw.before('mod.a', { x: 1 }, ctx)).toBeNull();
  });
});
```

### Step 2: Write failing tests for `after()` default behavior

```typescript
it('after() returns null by default', () => {
  const mw = new Middleware();
  const ctx = makeContext();
  expect(mw.after('mod.a', { x: 1 }, { y: 2 }, ctx)).toBeNull();
});
```

### Step 3: Write failing tests for `onError()` default behavior

```typescript
it('onError() returns null by default', () => {
  const mw = new Middleware();
  const ctx = makeContext();
  expect(mw.onError('mod.a', { x: 1 }, new Error('boom'), ctx)).toBeNull();
});
```

### Step 4: Implement the Middleware class

```typescript
import type { Context } from '../context.js';

export class Middleware {
  before(
    _moduleId: string,
    _inputs: Record<string, unknown>,
    _context: Context,
  ): Record<string, unknown> | null {
    return null;
  }

  after(
    _moduleId: string,
    _inputs: Record<string, unknown>,
    _output: Record<string, unknown>,
    _context: Context,
  ): Record<string, unknown> | null {
    return null;
  }

  onError(
    _moduleId: string,
    _inputs: Record<string, unknown>,
    _error: Error,
    _context: Context,
  ): Record<string, unknown> | null {
    return null;
  }
}
```

### Step 5: Run tests and confirm all pass

```bash
npx vitest run tests/test-middleware.test.ts
```

## Acceptance Criteria

- [x] `Middleware` class is exported from `src/middleware/base.ts`
- [x] `before(moduleId, inputs, context)` returns `null` by default
- [x] `after(moduleId, inputs, output, context)` returns `null` by default
- [x] `onError(moduleId, inputs, error, context)` returns `null` by default
- [x] All parameters use underscore-prefixed names to indicate intentional non-use
- [x] Type signature uses `Record<string, unknown> | null` return type
- [x] Imports `Context` as a type-only import
- [x] All tests pass with `vitest`

## Dependencies

- `src/context.ts` -- `Context` class (used as parameter type)

## Estimated Time

1 hour
