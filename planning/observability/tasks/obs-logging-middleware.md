# Task: ObsLoggingMiddleware with Stack-Based Timing

## Goal

Implement `ObsLoggingMiddleware` that extends the `Middleware` base class to provide structured logging of module call lifecycle events (start, complete, error) with stack-based `performance.now()` timing and configurable input/output logging. Delegates all log output to a `ContextLogger` instance.

## Files Involved

- `src/observability/context-logger.ts` -- ObsLoggingMiddleware class
- `src/middleware/base.ts` -- Middleware base class (dependency)
- `src/context.ts` -- Context class with shared `data` record (dependency)
- `tests/observability/test-context-logger.test.ts` -- Unit tests for ObsLoggingMiddleware

## Steps (TDD)

### 1. Write failing tests for before/after lifecycle

```typescript
describe('ObsLoggingMiddleware', () => {
  it('logs before and after', () => {
    const { output, lines } = createBufferOutput();
    const logger = new ContextLogger({ output });
    const mw = new ObsLoggingMiddleware({ logger });
    const ctx = Context.create();

    mw.before('mod.a', { name: 'Alice' }, ctx);
    mw.after('mod.a', { name: 'Alice' }, { result: 'ok' }, ctx);

    expect(lines).toHaveLength(2);
    const before = JSON.parse(lines[0]);
    const after = JSON.parse(lines[1]);
    expect(before.message).toBe('Module call started');
    expect(before.extra.module_id).toBe('mod.a');
    expect(after.message).toBe('Module call completed');
    expect(after.extra.duration_ms).toBeDefined();
  });
});
```

### 2. Write failing tests for error lifecycle

```typescript
  it('logs onError', () => {
    const { output, lines } = createBufferOutput();
    const logger = new ContextLogger({ output });
    const mw = new ObsLoggingMiddleware({ logger });
    const ctx = Context.create();

    mw.before('mod.a', {}, ctx);
    mw.onError('mod.a', {}, new Error('boom'), ctx);

    expect(lines).toHaveLength(2);
    const errorLog = JSON.parse(lines[1]);
    expect(errorLog.message).toBe('Module call failed');
    expect(errorLog.extra.error_type).toBe('Error');
    expect(errorLog.extra.duration_ms).toBeDefined();
  });
```

### 3. Implement constructor with configurable options

```typescript
export class ObsLoggingMiddleware extends Middleware {
  private _logger: ContextLogger;
  private _logInputs: boolean;
  private _logOutputs: boolean;

  constructor(options?: {
    logger?: ContextLogger;
    logInputs?: boolean;   // default: true
    logOutputs?: boolean;  // default: true
  }) {
    super();
    this._logger = options?.logger ?? new ContextLogger({ name: 'apcore.obs_logging' });
    this._logInputs = options?.logInputs ?? true;
    this._logOutputs = options?.logOutputs ?? true;
  }
}
```

### 4. Implement before() with stack-based timing and start log

```typescript
override before(
  moduleId: string,
  inputs: Record<string, unknown>,
  context: Context,
): null {
  const starts = (context.data['_obs_logging_starts'] as number[]) ?? [];
  starts.push(performance.now());
  context.data['_obs_logging_starts'] = starts;

  const extra: Record<string, unknown> = {
    module_id: moduleId,
    caller_id: context.callerId,
  };
  if (this._logInputs) {
    extra['inputs'] = context.redactedInputs ?? inputs;
  }
  this._logger.info('Module call started', extra);
  return null;
}
```

Note: When `logInputs` is true, the middleware prefers `context.redactedInputs` (already sanitized by the executor's redaction step) over raw inputs.

### 5. Implement after() with completion log and duration

```typescript
override after(
  moduleId: string,
  _inputs: Record<string, unknown>,
  output: Record<string, unknown>,
  context: Context,
): null {
  const starts = context.data['_obs_logging_starts'] as number[];
  const startTime = starts.pop()!;
  const durationMs = performance.now() - startTime;

  const extra: Record<string, unknown> = {
    module_id: moduleId,
    duration_ms: durationMs,
  };
  if (this._logOutputs) {
    extra['output'] = output;
  }
  this._logger.info('Module call completed', extra);
  return null;
}
```

Duration is kept in milliseconds (not converted to seconds like MetricsMiddleware) since this is for human-readable log output, not Prometheus metrics.

### 6. Implement onError() with error details

```typescript
override onError(
  moduleId: string,
  _inputs: Record<string, unknown>,
  error: Error,
  context: Context,
): null {
  const starts = context.data['_obs_logging_starts'] as number[];
  const startTime = starts.pop()!;
  const durationMs = performance.now() - startTime;

  this._logger.error('Module call failed', {
    module_id: moduleId,
    duration_ms: durationMs,
    error_type: error.constructor.name,
    error_message: String(error),
  });
  return null;
}
```

### 7. Run tests and verify all pass

## Acceptance Criteria

- [x] `ObsLoggingMiddleware` extends `Middleware` and accepts optional `logger`, `logInputs`, `logOutputs`
- [x] Defaults to a `ContextLogger` named `apcore.obs_logging` if no logger provided
- [x] `before()` pushes `performance.now()` onto `context.data['_obs_logging_starts']` stack
- [x] `before()` emits "Module call started" at info level with module_id and caller_id
- [x] `before()` includes `context.redactedInputs` (or raw inputs) when `logInputs` is true
- [x] `after()` pops start time, computes duration in milliseconds, emits "Module call completed"
- [x] `after()` includes output when `logOutputs` is true
- [x] `onError()` pops start time, computes duration, emits "Module call failed" at error level
- [x] Error log includes `error_type` (constructor name) and `error_message` (stringified error)
- [x] Stack-based timing correctly handles nested module calls
- [x] All tests pass with `vitest`

## Dependencies

- **context-logger** -- Requires `ContextLogger` class

## Estimated Time

2 hours
