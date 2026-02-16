# Task: ContextLogger with JSON/Text Formats and Redaction

## Goal

Implement `ContextLogger` that provides structured logging with JSON and text output formats, numeric level filtering (trace/debug/info/warn/error/fatal), automatic redaction of `_secret_`-prefixed keys, and a `fromContext()` static factory method that binds trace, module, and caller metadata from a `Context` instance.

## Files Involved

- `src/observability/context-logger.ts` -- ContextLogger class, LEVELS map, WritableOutput interface
- `src/context.ts` -- Context class (dependency for `fromContext()`)
- `tests/observability/test-context-logger.test.ts` -- Unit tests for ContextLogger

## Steps (TDD)

### 1. Write failing tests for basic logging

```typescript
function createBufferOutput() {
  const lines: string[] = [];
  return {
    output: { write: (s: string) => lines.push(s) },
    lines,
  };
}

describe('ContextLogger', () => {
  it('logs JSON format by default', () => {
    const { output, lines } = createBufferOutput();
    const logger = new ContextLogger({ output });
    logger.info('test message');
    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]);
    expect(parsed.level).toBe('info');
    expect(parsed.message).toBe('test message');
    expect(parsed.timestamp).toBeDefined();
    expect(parsed.logger).toBe('apcore');
  });

  it('logs text format', () => {
    const { output, lines } = createBufferOutput();
    const logger = new ContextLogger({ format: 'text', output });
    logger.info('test message');
    expect(lines[0]).toContain('[INFO]');
    expect(lines[0]).toContain('test message');
  });
});
```

### 2. Define WritableOutput interface and level map

```typescript
interface WritableOutput {
  write(s: string): void;
}

const LEVELS: Record<string, number> = {
  trace: 0,
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50,
};
```

### 3. Implement ContextLogger constructor with options

```typescript
export class ContextLogger {
  constructor(options?: {
    name?: string;      // default: 'apcore'
    format?: string;    // 'json' (default) or 'text'
    level?: string;     // minimum level, default: 'info'
    redactSensitive?: boolean;  // default: true
    output?: WritableOutput;    // default: process.stderr
  }) { /* ... */ }
}
```

### 4. Write failing tests for level filtering

```typescript
it('respects log level filtering', () => {
  const { output, lines } = createBufferOutput();
  const logger = new ContextLogger({ level: 'warn', output });
  logger.debug('should not appear');
  logger.info('should not appear');
  logger.warn('should appear');
  logger.error('should appear');
  expect(lines).toHaveLength(2);
});
```

### 5. Implement _emit() with level check and dual format output

The internal `_emit()` method:
1. Checks if the message level meets the minimum threshold
2. Redacts `_secret_`-prefixed keys in the `extra` record if `redactSensitive` is true
3. Builds a log entry record with `timestamp`, `level`, `message`, `trace_id`, `module_id`, `caller_id`, `logger`, `extra`
4. Serializes as JSON (`JSON.stringify + newline`) or text (`timestamp [LEVEL] [trace=...] [module=...] message extras`)

### 6. Write failing tests for redaction

```typescript
it('redacts _secret_ prefix keys', () => {
  const { output, lines } = createBufferOutput();
  const logger = new ContextLogger({ output });
  logger.info('test', { _secret_token: 'abc123', name: 'Bob' });
  const parsed = JSON.parse(lines[0]);
  expect(parsed.extra._secret_token).toBe('***REDACTED***');
  expect(parsed.extra.name).toBe('Bob');
});

it('does not redact when disabled', () => {
  const { output, lines } = createBufferOutput();
  const logger = new ContextLogger({ output, redactSensitive: false });
  logger.info('test', { _secret_token: 'abc123' });
  const parsed = JSON.parse(lines[0]);
  expect(parsed.extra._secret_token).toBe('abc123');
});
```

### 7. Implement _secret_ redaction in _emit()

```typescript
if (extra != null && this._redactSensitive) {
  redactedExtra = {};
  for (const [k, v] of Object.entries(extra)) {
    redactedExtra[k] = k.startsWith('_secret_') ? '***REDACTED***' : v;
  }
}
```

### 8. Write failing tests for fromContext()

```typescript
it('fromContext sets trace/module/caller', () => {
  const { output, lines } = createBufferOutput();
  const ctx = Context.create(undefined, createIdentity('user1'));
  const childCtx = ctx.child('mod.test');
  const logger = ContextLogger.fromContext(childCtx, 'test-logger', { output });
  logger.info('context log');
  const parsed = JSON.parse(lines[0]);
  expect(parsed.trace_id).toBe(ctx.traceId);
  expect(parsed.module_id).toBe('mod.test');
  expect(parsed.logger).toBe('test-logger');
});
```

### 9. Implement fromContext() static factory

```typescript
static fromContext(context: Context, name: string, options?: {
  format?: string;
  level?: string;
  redactSensitive?: boolean;
  output?: WritableOutput;
}): ContextLogger {
  const logger = new ContextLogger({ name, ...options });
  logger._traceId = context.traceId;
  logger._moduleId = context.callChain.length > 0
    ? context.callChain[context.callChain.length - 1]
    : null;
  logger._callerId = context.callerId;
  return logger;
}
```

### 10. Implement all 6 log level methods

```typescript
trace(message: string, extra?: Record<string, unknown>): void { this._emit('trace', message, extra); }
debug(message: string, extra?: Record<string, unknown>): void { this._emit('debug', message, extra); }
info(message: string, extra?: Record<string, unknown>): void { this._emit('info', message, extra); }
warn(message: string, extra?: Record<string, unknown>): void { this._emit('warn', message, extra); }
error(message: string, extra?: Record<string, unknown>): void { this._emit('error', message, extra); }
fatal(message: string, extra?: Record<string, unknown>): void { this._emit('fatal', message, extra); }
```

### 11. Run tests and verify all pass

## Acceptance Criteria

- [x] `ContextLogger` supports JSON (default) and text output formats
- [x] 6 log levels: trace (0), debug (10), info (20), warn (30), error (40), fatal (50)
- [x] Level filtering suppresses messages below the configured minimum level
- [x] `_secret_`-prefixed extra keys redacted to `***REDACTED***` when `redactSensitive` is true (default)
- [x] Redaction can be disabled via `redactSensitive: false`
- [x] `fromContext()` binds `traceId`, `moduleId` (last in callChain), and `callerId` from a Context
- [x] JSON format includes: timestamp, level, message, trace_id, module_id, caller_id, logger, extra
- [x] Text format: `timestamp [LEVEL] [trace=...] [module=...] message extras`
- [x] Default output is `process.stderr`; custom `WritableOutput` accepted via options
- [x] All tests pass with `vitest`

## Dependencies

- None (independent pillar, but uses `Context` from core-executor for `fromContext()`)

## Estimated Time

2 hours
