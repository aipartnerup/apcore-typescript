import { describe, it, expect } from 'vitest';
import { MetricsCollector, MetricsMiddleware } from '../../src/observability/metrics.js';
import { Context } from '../../src/context.js';

describe('MetricsCollector', () => {
  it('increments counters', () => {
    const collector = new MetricsCollector();
    collector.increment('test_counter', { method: 'GET' });
    collector.increment('test_counter', { method: 'GET' });
    const snap = collector.snapshot();
    expect((snap['counters'] as Record<string, number>)['test_counter|method=GET']).toBe(2);
  });

  it('observes histogram values', () => {
    const collector = new MetricsCollector();
    collector.observe('test_hist', { module: 'a' }, 0.05);
    collector.observe('test_hist', { module: 'a' }, 0.5);
    const snap = collector.snapshot();
    const hists = snap['histograms'] as Record<string, Record<string, number>>;
    expect(hists['sums']['test_hist|module=a']).toBeCloseTo(0.55);
    expect(hists['counts']['test_hist|module=a']).toBe(2);
  });

  it('convenience methods work', () => {
    const collector = new MetricsCollector();
    collector.incrementCalls('mod.a', 'success');
    collector.incrementErrors('mod.a', 'TIMEOUT');
    collector.observeDuration('mod.a', 0.1);

    const snap = collector.snapshot();
    const counters = snap['counters'] as Record<string, number>;
    expect(counters['apcore_module_calls_total|module_id=mod.a,status=success']).toBe(1);
    expect(counters['apcore_module_errors_total|error_code=TIMEOUT,module_id=mod.a']).toBe(1);
  });

  it('reset clears all data', () => {
    const collector = new MetricsCollector();
    collector.incrementCalls('mod.a', 'success');
    collector.observeDuration('mod.a', 0.1);
    collector.reset();
    const snap = collector.snapshot();
    expect(Object.keys(snap['counters'] as Record<string, unknown>)).toHaveLength(0);
  });

  it('exportPrometheus produces valid format', () => {
    const collector = new MetricsCollector();
    collector.incrementCalls('mod.a', 'success');
    collector.observeDuration('mod.a', 0.05);
    const output = collector.exportPrometheus();
    expect(output).toContain('# HELP');
    expect(output).toContain('# TYPE');
    expect(output).toContain('apcore_module_calls_total');
    expect(output).toContain('apcore_module_duration_seconds');
  });

  it('empty collector returns empty prometheus string', () => {
    const collector = new MetricsCollector();
    expect(collector.exportPrometheus()).toBe('');
  });
});

describe('MetricsMiddleware', () => {
  it('records call metrics on success', () => {
    const collector = new MetricsCollector();
    const mw = new MetricsMiddleware(collector);
    const ctx = Context.create();

    mw.before('mod.a', {}, ctx);
    mw.after('mod.a', {}, { result: 'ok' }, ctx);

    const snap = collector.snapshot();
    const counters = snap['counters'] as Record<string, number>;
    expect(counters['apcore_module_calls_total|module_id=mod.a,status=success']).toBe(1);
  });

  it('records error metrics on failure', () => {
    const collector = new MetricsCollector();
    const mw = new MetricsMiddleware(collector);
    const ctx = Context.create();

    mw.before('mod.a', {}, ctx);
    mw.onError('mod.a', {}, new Error('boom'), ctx);

    const snap = collector.snapshot();
    const counters = snap['counters'] as Record<string, number>;
    expect(counters['apcore_module_calls_total|module_id=mod.a,status=error']).toBe(1);
    expect(counters['apcore_module_errors_total|error_code=Error,module_id=mod.a']).toBe(1);
  });
});
