import { describe, it, expect } from 'vitest';
import { Context } from '../../src/context.js';
import {
  createSpan,
  InMemoryExporter,
  StdoutExporter,
  TracingMiddleware,
} from '../../src/observability/tracing.js';

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
    expect(span.parentSpanId).toBeNull();
    expect(span.status).toBe('ok');
    expect(span.events).toEqual([]);
  });
});

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
    expect(spans[0].traceId).toBe('t2');
  });

  it('clear removes all spans', () => {
    const exporter = new InMemoryExporter();
    exporter.export(createSpan({ traceId: 't1', name: 'test', startTime: 0 }));
    exporter.clear();
    expect(exporter.getSpans()).toHaveLength(0);
  });
});

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
    // inner span has outer as parent
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
