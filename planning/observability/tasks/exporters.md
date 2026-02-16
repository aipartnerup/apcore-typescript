# Task: StdoutExporter and InMemoryExporter

## Goal

Implement two `SpanExporter` implementations: `StdoutExporter` that serializes spans to stdout via `JSON.stringify`, and `InMemoryExporter` that stores spans in a bounded array with FIFO eviction. Note: `OTLPExporter` (OpenTelemetry Protocol) is not implemented -- this is a known gap for future work.

## Files Involved

- `src/observability/tracing.ts` -- StdoutExporter and InMemoryExporter classes
- `tests/observability/test-tracing.test.ts` -- Unit tests for both exporters

## Steps (TDD)

### 1. Write failing tests for InMemoryExporter

```typescript
describe('InMemoryExporter', () => {
  it('collects and retrieves spans', () => {
    const exporter = new InMemoryExporter();
    const span = createSpan({ traceId: 't1', name: 'test', startTime: 0 });
    exporter.export(span);
    expect(exporter.getSpans()).toHaveLength(1);
    expect(exporter.getSpans()[0].traceId).toBe('t1');
  });

  it('respects max_spans limit', () => {
    const exporter = new InMemoryExporter(3);
    for (let i = 0; i < 5; i++) {
      exporter.export(createSpan({ traceId: `t${i}`, name: 'test', startTime: i }));
    }
    const spans = exporter.getSpans();
    expect(spans).toHaveLength(3);
    expect(spans[0].traceId).toBe('t2'); // oldest evicted
  });

  it('clear removes all spans', () => {
    const exporter = new InMemoryExporter();
    exporter.export(createSpan({ traceId: 't1', name: 'test', startTime: 0 }));
    exporter.clear();
    expect(exporter.getSpans()).toHaveLength(0);
  });

  it('getSpans returns defensive copy', () => {
    const exporter = new InMemoryExporter();
    exporter.export(createSpan({ traceId: 't1', name: 'test', startTime: 0 }));
    const spans = exporter.getSpans();
    spans.pop(); // mutate the copy
    expect(exporter.getSpans()).toHaveLength(1); // original unaffected
  });
});
```

### 2. Implement StdoutExporter

```typescript
export class StdoutExporter implements SpanExporter {
  export(span: Span): void {
    console.log(JSON.stringify(span));
  }
}
```

Simple passthrough: serialize the span as a JSON string and write to stdout via `console.log`. No buffering or batching.

### 3. Implement InMemoryExporter

```typescript
export class InMemoryExporter implements SpanExporter {
  private _spans: Span[] = [];
  private _maxSpans: number;

  constructor(maxSpans: number = 10_000) {
    this._maxSpans = maxSpans;
  }

  export(span: Span): void {
    this._spans.push(span);
    while (this._spans.length > this._maxSpans) {
      this._spans.shift(); // FIFO eviction
    }
  }

  getSpans(): Span[] {
    return [...this._spans]; // defensive copy
  }

  clear(): void {
    this._spans = [];
  }
}
```

Key design decisions:
- Default `maxSpans` of 10,000 (configurable via constructor)
- `shift()` for FIFO eviction (O(n) but acceptable for expected volumes, unlike Python's O(1) `deque.popleft()`)
- `getSpans()` returns a spread copy to prevent external mutation of internal state
- No thread locking needed (Node.js single-threaded)

### 4. Run tests and verify all pass

## Known Gap: OTLPExporter

The Python implementation includes an `OTLPExporter` for shipping spans to OpenTelemetry-compatible backends. This is **not yet implemented** in the TypeScript version. The `SpanExporter` interface is designed to be forward-compatible -- a future `OTLPExporter` would implement `export(span: Span): void` and handle HTTP/gRPC transport to an OTLP collector.

## Acceptance Criteria

- [x] `StdoutExporter` implements `SpanExporter` and calls `console.log(JSON.stringify(span))`
- [x] `InMemoryExporter` stores spans in a bounded array with configurable `maxSpans` (default 10,000)
- [x] FIFO eviction via `shift()` when array exceeds `maxSpans`
- [x] `getSpans()` returns a defensive copy via spread operator
- [x] `clear()` empties the internal span array
- [x] OTLPExporter absence is documented as a known gap
- [x] All tests pass with `vitest`

## Dependencies

- **span-model** -- Requires `Span` interface and `SpanExporter` interface

## Estimated Time

1.5 hours
