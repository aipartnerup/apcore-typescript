# Task: TracingMiddleware with Sampling Strategies

## Goal

Implement `TracingMiddleware` that extends the `Middleware` base class to provide distributed tracing through the executor pipeline. The middleware uses a stack-based approach to manage nested spans via `context.data`, supports 4 sampling strategies (`full`, `proportional`, `error_first`, `off`), and delegates span export to a pluggable `SpanExporter`.

## Files Involved

- `src/observability/tracing.ts` -- TracingMiddleware class
- `src/middleware/base.ts` -- Middleware base class (dependency)
- `src/context.ts` -- Context class with shared `data` record (dependency)
- `tests/observability/test-tracing.test.ts` -- Unit tests for TracingMiddleware

## Steps (TDD)

### 1. Write failing tests for TracingMiddleware

```typescript
describe('TracingMiddleware', () => {
  it('creates and exports spans on success', () => {
    const exporter = new InMemoryExporter();
    const mw = new TracingMiddleware(exporter);
    const ctx = Context.create();

    mw.before('mod.a', {}, ctx);
    mw.after('mod.a', {}, { result: 'ok' }, ctx);

    const spans = exporter.getSpans();
    expect(spans).toHaveLength(1);
    expect(spans[0].name).toBe('apcore.module.execute');
    expect(spans[0].status).toBe('ok');
    expect(spans[0].attributes['moduleId']).toBe('mod.a');
  });

  it('creates error spans', () => {
    const exporter = new InMemoryExporter();
    const mw = new TracingMiddleware(exporter);
    const ctx = Context.create();

    mw.before('mod.err', {}, ctx);
    mw.onError('mod.err', {}, new Error('fail'), ctx);

    const spans = exporter.getSpans();
    expect(spans).toHaveLength(1);
    expect(spans[0].status).toBe('error');
    expect(spans[0].attributes['success']).toBe(false);
  });

  it('supports nested spans with parent chain', () => {
    const exporter = new InMemoryExporter();
    const mw = new TracingMiddleware(exporter);
    const ctx = Context.create();

    mw.before('mod.outer', {}, ctx);
    mw.before('mod.inner', {}, ctx);
    mw.after('mod.inner', {}, {}, ctx);
    mw.after('mod.outer', {}, {}, ctx);

    const spans = exporter.getSpans();
    expect(spans).toHaveLength(2);
    expect(spans[0].parentSpanId).toBe(spans[1].spanId);
  });

  it('off strategy does not export', () => {
    const exporter = new InMemoryExporter();
    const mw = new TracingMiddleware(exporter, 1.0, 'off');
    const ctx = Context.create();

    mw.before('mod.a', {}, ctx);
    mw.after('mod.a', {}, {}, ctx);

    expect(exporter.getSpans()).toHaveLength(0);
  });

  it('error_first exports errors even when not sampled', () => {
    const exporter = new InMemoryExporter();
    const mw = new TracingMiddleware(exporter, 0.0, 'error_first');
    const ctx = Context.create();

    mw.before('mod.a', {}, ctx);
    mw.onError('mod.a', {}, new Error('fail'), ctx);

    expect(exporter.getSpans()).toHaveLength(1);
  });

  it('throws on invalid sampling rate', () => {
    const exporter = new InMemoryExporter();
    expect(() => new TracingMiddleware(exporter, -0.1)).toThrow();
    expect(() => new TracingMiddleware(exporter, 1.5)).toThrow();
  });

  it('throws on invalid sampling strategy', () => {
    const exporter = new InMemoryExporter();
    expect(() => new TracingMiddleware(exporter, 1.0, 'invalid')).toThrow();
  });
});
```

### 2. Implement sampling strategy validation

```typescript
const VALID_STRATEGIES = new Set(['full', 'proportional', 'error_first', 'off']);

export class TracingMiddleware extends Middleware {
  constructor(
    exporter: SpanExporter,
    samplingRate: number = 1.0,
    samplingStrategy: string = 'full',
  ) {
    super();
    if (samplingRate < 0.0 || samplingRate > 1.0) {
      throw new Error(`sampling_rate must be between 0.0 and 1.0, got ${samplingRate}`);
    }
    if (!VALID_STRATEGIES.has(samplingStrategy)) {
      throw new Error(`sampling_strategy must be one of ${[...VALID_STRATEGIES].join(', ')}, got '${samplingStrategy}'`);
    }
    // ...
  }
}
```

### 3. Implement _shouldSample() with strategy logic

The sampling decision is computed once per context and cached at `context.data['_tracing_sampled']`:

- **full**: Always sample (`decision = true`)
- **off**: Never sample (`decision = false`)
- **proportional**: Sample with probability `samplingRate` (`Math.random() < samplingRate`)
- **error_first**: Same as proportional for the decision, but errors are always exported regardless

### 4. Implement before() with stack-based span creation

```typescript
override before(moduleId: string, _inputs: Record<string, unknown>, context: Context): null {
  this._shouldSample(context);
  const spansStack = (context.data['_tracing_spans'] as Span[]) ?? [];
  context.data['_tracing_spans'] = spansStack;
  const parentSpanId = spansStack.length > 0
    ? spansStack[spansStack.length - 1].spanId
    : null;

  const span = createSpan({
    traceId: context.traceId,
    name: 'apcore.module.execute',
    startTime: performance.now(),
    parentSpanId,
    attributes: { moduleId, method: 'execute', callerId: context.callerId },
  });
  spansStack.push(span);
  return null;
}
```

### 5. Implement after() and onError() with span finalization

Both methods pop the top span from the stack, set `endTime`, compute `duration_ms`, set status, and conditionally export. `onError()` additionally checks `error_first` strategy to force export.

### 6. Run tests and verify all pass

## Acceptance Criteria

- [x] `TracingMiddleware` extends `Middleware` and accepts `exporter`, `samplingRate`, `samplingStrategy`
- [x] Constructor validates `samplingRate` in `[0.0, 1.0]` and `samplingStrategy` in valid set
- [x] 4 strategies implemented: `full` (always), `proportional` (random), `error_first` (random + always-export-errors), `off` (never)
- [x] Sampling decision computed once per context and cached at `_tracing_sampled`
- [x] Stack-based span management at `context.data['_tracing_spans']` handles nested calls
- [x] `parentSpanId` correctly chains from top-of-stack span
- [x] Span attributes include `moduleId`, `method`, `callerId`, `duration_ms`, `success`
- [x] Error spans include `error_code` from `error.code` or `error.constructor.name`
- [x] All tests pass with `vitest`

## Dependencies

- **span-model** -- Requires `Span`, `createSpan()`, `SpanExporter`
- **exporters** -- Requires `InMemoryExporter` for testing

## Estimated Time

3 hours
