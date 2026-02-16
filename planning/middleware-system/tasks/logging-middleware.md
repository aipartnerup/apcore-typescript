# Task: LoggingMiddleware with Logger Interface and Timing

## Goal

Implement a `LoggingMiddleware` that provides structured logging for every module call lifecycle phase (before, after, onError). It uses a pluggable `Logger` interface with `info()` and `error()` methods, defaults to `console.log`/`console.error`, and measures execution duration with `performance.now()`. The middleware stores its start timestamp on `context.data['_logging_mw_start']` and computes duration in the `after()` phase. Logging of inputs, outputs, and errors is individually configurable.

## Files Involved

| File | Action |
|------|--------|
| `src/middleware/logging.ts` | Create -- LoggingMiddleware class and Logger interface |
| `src/middleware/base.ts` | Read -- Middleware base class (dependency) |
| `tests/test-middleware.test.ts` | Extend -- Unit tests for logging middleware (or separate test file) |

## Steps (TDD)

### Step 1: Define the Logger interface

```typescript
export interface Logger {
  info(message: string, extra?: Record<string, unknown>): void;
  error(message: string, extra?: Record<string, unknown>): void;
}
```

### Step 2: Implement the default logger

```typescript
const defaultLogger: Logger = {
  info(message: string, extra?: Record<string, unknown>) {
    console.log(message, extra ?? '');
  },
  error(message: string, extra?: Record<string, unknown>) {
    console.error(message, extra ?? '');
  },
};
```

### Step 3: Write failing tests for before() logging and timing

```typescript
import { describe, it, expect, vi } from 'vitest';
import { LoggingMiddleware, Logger } from '../src/middleware/logging.js';
import { Context, createIdentity } from '../src/context.js';

function makeContext(): Context {
  return Context.create(null, createIdentity('test-user'));
}

describe('LoggingMiddleware', () => {
  it('before() stores start time on context.data and logs START message', () => {
    const logs: Array<{ message: string; extra: Record<string, unknown> }> = [];
    const mockLogger: Logger = {
      info(message, extra) { logs.push({ message, extra: extra ?? {} }); },
      error(message, extra) { logs.push({ message, extra: extra ?? {} }); },
    };
    const mw = new LoggingMiddleware({ logger: mockLogger });
    const ctx = makeContext();

    const result = mw.before('mod.test', { x: 1 }, ctx);

    expect(result).toBeNull();
    expect(ctx.data['_logging_mw_start']).toBeTypeOf('number');
    expect(logs).toHaveLength(1);
    expect(logs[0].message).toContain('START mod.test');
    expect(logs[0].extra['moduleId']).toBe('mod.test');
  });
});
```

### Step 4: Implement before() with performance.now() timing

```typescript
override before(
  moduleId: string,
  inputs: Record<string, unknown>,
  context: Context,
): null {
  context.data['_logging_mw_start'] = performance.now();

  if (this._logInputs) {
    const redacted = context.redactedInputs ?? inputs;
    this._logger.info(`[${context.traceId}] START ${moduleId}`, {
      traceId: context.traceId,
      moduleId,
      callerId: context.callerId,
      inputs: redacted,
    });
  }

  return null;
}
```

Key design choice: `performance.now()` provides sub-millisecond resolution and is available in Node.js 18+ globally. It is preferable to `Date.now()` for duration measurement because it is monotonic and not affected by system clock adjustments.

### Step 5: Write failing tests for after() logging with duration

```typescript
it('after() logs END message with duration', () => {
  const logs: Array<{ message: string; extra: Record<string, unknown> }> = [];
  const mockLogger: Logger = {
    info(message, extra) { logs.push({ message, extra: extra ?? {} }); },
    error() {},
  };
  const mw = new LoggingMiddleware({ logger: mockLogger });
  const ctx = makeContext();

  mw.before('mod.test', { x: 1 }, ctx);
  const result = mw.after('mod.test', { x: 1 }, { y: 2 }, ctx);

  expect(result).toBeNull();
  expect(logs).toHaveLength(2); // START + END
  expect(logs[1].message).toContain('END mod.test');
  expect(logs[1].extra['durationMs']).toBeTypeOf('number');
});
```

### Step 6: Implement after() with duration calculation

```typescript
override after(
  moduleId: string,
  _inputs: Record<string, unknown>,
  output: Record<string, unknown>,
  context: Context,
): null {
  const startTime = (context.data['_logging_mw_start'] as number) ?? performance.now();
  const durationMs = performance.now() - startTime;

  if (this._logOutputs) {
    this._logger.info(
      `[${context.traceId}] END ${moduleId} (${durationMs.toFixed(2)}ms)`,
      {
        traceId: context.traceId,
        moduleId,
        durationMs,
        output,
      },
    );
  }

  return null;
}
```

### Step 7: Write failing tests for onError() logging

```typescript
it('onError() logs ERROR message with redacted inputs', () => {
  const logs: Array<{ message: string; extra: Record<string, unknown> }> = [];
  const mockLogger: Logger = {
    info() {},
    error(message, extra) { logs.push({ message, extra: extra ?? {} }); },
  };
  const mw = new LoggingMiddleware({ logger: mockLogger });
  const ctx = makeContext();

  const result = mw.onError('mod.test', { x: 1 }, new Error('boom'), ctx);

  expect(result).toBeNull();
  expect(logs).toHaveLength(1);
  expect(logs[0].message).toContain('ERROR mod.test');
  expect(logs[0].extra['error']).toBe('Error: boom');
});
```

### Step 8: Implement onError()

```typescript
override onError(
  moduleId: string,
  inputs: Record<string, unknown>,
  error: Error,
  context: Context,
): null {
  if (this._logErrors) {
    const redacted = context.redactedInputs ?? inputs;
    this._logger.error(`[${context.traceId}] ERROR ${moduleId}: ${error}`, {
      traceId: context.traceId,
      moduleId,
      error: String(error),
      inputs: redacted,
    });
  }

  return null;
}
```

### Step 9: Write tests for configuration flags

```typescript
it('respects logInputs=false', () => {
  const logs: string[] = [];
  const mockLogger: Logger = {
    info(msg) { logs.push(msg); },
    error() {},
  };
  const mw = new LoggingMiddleware({ logger: mockLogger, logInputs: false });
  const ctx = makeContext();
  mw.before('mod.test', { x: 1 }, ctx);
  expect(logs).toHaveLength(0);
  // But timing is still stored
  expect(ctx.data['_logging_mw_start']).toBeTypeOf('number');
});

it('respects logOutputs=false', () => {
  const logs: string[] = [];
  const mockLogger: Logger = {
    info(msg) { logs.push(msg); },
    error() {},
  };
  const mw = new LoggingMiddleware({ logger: mockLogger, logOutputs: false });
  const ctx = makeContext();
  mw.before('mod.test', {}, ctx);
  mw.after('mod.test', {}, { y: 1 }, ctx);
  expect(logs).toHaveLength(1); // Only START, no END
});

it('respects logErrors=false', () => {
  const logs: string[] = [];
  const mockLogger: Logger = {
    info() {},
    error(msg) { logs.push(msg); },
  };
  const mw = new LoggingMiddleware({ logger: mockLogger, logErrors: false });
  const ctx = makeContext();
  mw.onError('mod.test', {}, new Error('boom'), ctx);
  expect(logs).toHaveLength(0);
});
```

### Step 10: Implement constructor with options

```typescript
export class LoggingMiddleware extends Middleware {
  private _logger: Logger;
  private _logInputs: boolean;
  private _logOutputs: boolean;
  private _logErrors: boolean;

  constructor(options?: {
    logger?: Logger;
    logInputs?: boolean;
    logOutputs?: boolean;
    logErrors?: boolean;
  }) {
    super();
    this._logger = options?.logger ?? defaultLogger;
    this._logInputs = options?.logInputs ?? true;
    this._logOutputs = options?.logOutputs ?? true;
    this._logErrors = options?.logErrors ?? true;
  }
}
```

### Step 11: Write test for redactedInputs usage

```typescript
it('uses context.redactedInputs when available', () => {
  const logs: Array<{ extra: Record<string, unknown> }> = [];
  const mockLogger: Logger = {
    info(_msg, extra) { logs.push({ extra: extra ?? {} }); },
    error() {},
  };
  const mw = new LoggingMiddleware({ logger: mockLogger });
  const ctx = makeContext();
  (ctx as any).redactedInputs = { x: '***' };

  mw.before('mod.test', { x: 'secret' }, ctx);

  expect(logs[0].extra['inputs']).toEqual({ x: '***' });
});
```

### Step 12: Run all tests and confirm green

```bash
npx vitest run tests/test-middleware.test.ts
```

## Acceptance Criteria

- [x] `Logger` interface is exported with `info(message, extra?)` and `error(message, extra?)` methods
- [x] Default logger delegates to `console.log` and `console.error`
- [x] `LoggingMiddleware` extends `Middleware`
- [x] `before()` stores `performance.now()` on `context.data['_logging_mw_start']` and logs START
- [x] `after()` computes duration from stored start time and logs END with `durationMs`
- [x] `onError()` logs ERROR with trace ID, module ID, and stringified error
- [x] Uses `context.redactedInputs` when available instead of raw inputs
- [x] `logInputs`, `logOutputs`, `logErrors` flags default to `true` and are individually configurable
- [x] All hooks return `null` (logging middleware does not transform inputs/outputs)
- [x] Duration is formatted with `.toFixed(2)` in the log message
- [x] All tests pass with `vitest`

## Dependencies

- `src/middleware/base.ts` -- `Middleware` base class (task: base)
- `src/context.ts` -- `Context` class with `traceId`, `callerId`, `data`, `redactedInputs` properties

## Estimated Time

2 hours
