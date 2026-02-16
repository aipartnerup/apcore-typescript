# Task: Span Interface and createSpan() Factory

## Goal

Define the `Span` interface representing a single trace span and implement the `createSpan()` factory function that produces span instances with auto-generated span IDs. Also define the `SpanExporter` interface that all exporter implementations must satisfy.

## Files Involved

- `src/observability/tracing.ts` -- Span interface, createSpan() factory, SpanExporter interface
- `tests/observability/test-tracing.test.ts` -- Unit tests for span creation

## Steps (TDD)

### 1. Write failing tests for Span creation

```typescript
import { describe, it, expect } from 'vitest';
import { createSpan } from '../../src/observability/tracing.js';

describe('Span', () => {
  it('createSpan creates span with defaults', () => {
    const span = createSpan({
      traceId: 'trace-1',
      name: 'test.span',
      startTime: 100,
    });
    expect(span.traceId).toBe('trace-1');
    expect(span.name).toBe('test.span');
    expect(span.startTime).toBe(100);
    expect(span.spanId).toBeDefined();
    expect(span.spanId).toHaveLength(16); // randomBytes(8).toString('hex')
    expect(span.parentSpanId).toBeNull();
    expect(span.status).toBe('ok');
    expect(span.endTime).toBeNull();
    expect(span.events).toEqual([]);
    expect(span.attributes).toEqual({});
  });

  it('createSpan accepts custom spanId and parentSpanId', () => {
    const span = createSpan({
      traceId: 'trace-2',
      name: 'child.span',
      startTime: 200,
      spanId: 'custom-span-id-01',
      parentSpanId: 'parent-span-0001',
      attributes: { moduleId: 'mod.a' },
    });
    expect(span.spanId).toBe('custom-span-id-01');
    expect(span.parentSpanId).toBe('parent-span-0001');
    expect(span.attributes['moduleId']).toBe('mod.a');
  });
});
```

### 2. Define the Span interface

Define a TypeScript `interface Span` with the following fields:
- `traceId: string` -- trace identifier linking related spans
- `name: string` -- operation name (e.g., `apcore.module.execute`)
- `startTime: number` -- `performance.now()` timestamp in milliseconds
- `spanId: string` -- unique 16-hex-char identifier
- `parentSpanId: string | null` -- parent span for nesting, null for root spans
- `attributes: Record<string, unknown>` -- key-value metadata
- `endTime: number | null` -- set when span completes, null while active
- `status: string` -- `'ok'` or `'error'`
- `events: Array<Record<string, unknown>>` -- timeline annotations

### 3. Implement createSpan() factory

```typescript
import { randomBytes } from 'node:crypto';

export function createSpan(options: {
  traceId: string;
  name: string;
  startTime: number;
  spanId?: string;
  parentSpanId?: string | null;
  attributes?: Record<string, unknown>;
}): Span {
  return {
    traceId: options.traceId,
    name: options.name,
    startTime: options.startTime,
    spanId: options.spanId ?? randomBytes(8).toString('hex'),
    parentSpanId: options.parentSpanId ?? null,
    attributes: options.attributes ?? {},
    endTime: null,
    status: 'ok',
    events: [],
  };
}
```

### 4. Define the SpanExporter interface

```typescript
export interface SpanExporter {
  export(span: Span): void;
}
```

### 5. Run tests and verify all pass

## Acceptance Criteria

- [x] `Span` interface defines all 9 fields with correct types
- [x] `createSpan()` generates 16-character hex span IDs via `randomBytes(8).toString('hex')`
- [x] Default values: `parentSpanId: null`, `attributes: {}`, `endTime: null`, `status: 'ok'`, `events: []`
- [x] Custom `spanId`, `parentSpanId`, and `attributes` can be provided via options
- [x] `SpanExporter` interface declares a single `export(span: Span): void` method
- [x] All tests pass with `vitest`

## Dependencies

- None (foundational task)

## Estimated Time

1 hour
