# Task: MetricsMiddleware with Stack-Based Timing

## Goal

Implement `MetricsMiddleware` that extends the `Middleware` base class to automatically record call counts, error counts, and execution duration for every module call. Uses a stack-based timing approach via `performance.now()` stored in `context.data` to correctly handle nested module-to-module calls.

## Files Involved

- `src/observability/metrics.ts` -- MetricsMiddleware class
- `src/middleware/base.ts` -- Middleware base class (dependency)
- `src/context.ts` -- Context class with shared `data` record (dependency)
- `src/errors.ts` -- ModuleError for error code extraction (dependency)
- `tests/observability/test-metrics.test.ts` -- Unit tests for MetricsMiddleware

## Steps (TDD)

### 1. Write failing tests for success path

```typescript
describe('MetricsMiddleware', () => {
  it('records call metrics on success', () => {
    const collector = new MetricsCollector();
    const mw = new MetricsMiddleware(collector);
    const ctx = Context.create();

    mw.before('mod.a', {}, ctx);
    mw.after('mod.a', {}, { result: 'ok' }, ctx);

    const snap = collector.snapshot();
    const counters = snap.counters as Record<string, number>;
    expect(counters['apcore_module_calls_total|module_id=mod.a,status=success']).toBe(1);
  });
});
```

### 2. Write failing tests for error path

```typescript
  it('records error metrics on failure', () => {
    const collector = new MetricsCollector();
    const mw = new MetricsMiddleware(collector);
    const ctx = Context.create();

    mw.before('mod.a', {}, ctx);
    mw.onError('mod.a', {}, new Error('boom'), ctx);

    const snap = collector.snapshot();
    const counters = snap.counters as Record<string, number>;
    expect(counters['apcore_module_calls_total|module_id=mod.a,status=error']).toBe(1);
    expect(counters['apcore_module_errors_total|error_code=Error,module_id=mod.a']).toBe(1);
  });
```

### 3. Implement before() with stack-based timing

```typescript
export class MetricsMiddleware extends Middleware {
  private _collector: MetricsCollector;

  constructor(collector: MetricsCollector) {
    super();
    this._collector = collector;
  }

  override before(
    _moduleId: string,
    _inputs: Record<string, unknown>,
    context: Context,
  ): null {
    const starts = (context.data['_metrics_starts'] as number[]) ?? [];
    starts.push(performance.now());
    context.data['_metrics_starts'] = starts;
    return null;
  }
}
```

The timing stack at `context.data['_metrics_starts']` is an array of `performance.now()` values. Each `before()` pushes the current time, and the corresponding `after()`/`onError()` pops it. This stack-based approach correctly pairs start/end times even for nested calls (A calls B calls C).

### 4. Implement after() with duration conversion

```typescript
override after(
  moduleId: string,
  _inputs: Record<string, unknown>,
  _output: Record<string, unknown>,
  context: Context,
): null {
  const starts = context.data['_metrics_starts'] as number[];
  const startTime = starts.pop()!;
  const durationS = (performance.now() - startTime) / 1000;
  this._collector.incrementCalls(moduleId, 'success');
  this._collector.observeDuration(moduleId, durationS);
  return null;
}
```

Key detail: `performance.now()` returns monotonic milliseconds, but Prometheus conventions use seconds. The division by 1000 converts to seconds. This differs from Python's `time.time()` which returns wall-clock seconds directly.

### 5. Implement onError() with error code extraction

```typescript
override onError(
  moduleId: string,
  _inputs: Record<string, unknown>,
  error: Error,
  context: Context,
): null {
  const starts = context.data['_metrics_starts'] as number[];
  const startTime = starts.pop()!;
  const durationS = (performance.now() - startTime) / 1000;
  const errorCode = error instanceof ModuleError ? error.code : error.constructor.name;
  this._collector.incrementCalls(moduleId, 'error');
  this._collector.incrementErrors(moduleId, errorCode);
  this._collector.observeDuration(moduleId, durationS);
  return null;
}
```

Error code is extracted from `ModuleError.code` (structured apcore errors) or falls back to `error.constructor.name` (generic JS errors).

### 6. Run tests and verify all pass

## Acceptance Criteria

- [x] `MetricsMiddleware` extends `Middleware` and accepts a `MetricsCollector` instance
- [x] `before()` pushes `performance.now()` onto `context.data['_metrics_starts']` stack
- [x] `after()` pops start time, computes duration in seconds, records success call + duration
- [x] `onError()` pops start time, computes duration, records error call + error count + duration
- [x] Duration converted from milliseconds to seconds (`/ 1000`) for Prometheus conventions
- [x] Error code extracted from `ModuleError.code` or `error.constructor.name`
- [x] Stack-based timing correctly handles nested module calls
- [x] All tests pass with `vitest`

## Dependencies

- **metrics-collector** -- Requires `MetricsCollector` class

## Estimated Time

2 hours
