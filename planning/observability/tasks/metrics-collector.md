# Task: MetricsCollector with Counters, Histograms, and Prometheus Export

## Goal

Implement `MetricsCollector` that provides in-memory counter and histogram metric primitives with string-encoded composite keys, configurable histogram buckets, and Prometheus text format export. Includes convenience methods for apcore-standard metrics (calls, errors, duration).

## Files Involved

- `src/observability/metrics.ts` -- MetricsCollector class, labelsKey(), parseLabels(), formatLabels() helpers
- `tests/observability/test-metrics.test.ts` -- Unit tests for MetricsCollector

## Steps (TDD)

### 1. Write failing tests for counter operations

```typescript
describe('MetricsCollector', () => {
  it('increments counters', () => {
    const collector = new MetricsCollector();
    collector.increment('test_counter', { method: 'GET' });
    collector.increment('test_counter', { method: 'GET' });
    const snap = collector.snapshot();
    expect(snap.counters['test_counter|method=GET']).toBe(2);
  });

  it('supports custom increment amounts', () => {
    const collector = new MetricsCollector();
    collector.increment('test_counter', { method: 'POST' }, 5);
    const snap = collector.snapshot();
    expect(snap.counters['test_counter|method=POST']).toBe(5);
  });
});
```

### 2. Implement string-encoded key system

Labels are encoded as sorted key-value pairs joined by commas:

```typescript
function labelsKey(labels: Record<string, string>): string {
  return Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join(',');
}
```

Composite keys use the format `name|key1=val1,key2=val2`. Sorting ensures deterministic keys regardless of insertion order. No thread locking is needed because Node.js is single-threaded (unlike the Python implementation which requires locks).

### 3. Implement counter increment

```typescript
increment(name: string, labels: Record<string, string>, amount: number = 1): void {
  const key = `${name}|${labelsKey(labels)}`;
  this._counters.set(key, (this._counters.get(key) ?? 0) + amount);
}
```

### 4. Write failing tests for histogram operations

```typescript
it('observes histogram values', () => {
  const collector = new MetricsCollector();
  collector.observe('test_hist', { module: 'a' }, 0.05);
  collector.observe('test_hist', { module: 'a' }, 0.5);
  const snap = collector.snapshot();
  expect(snap.histograms.sums['test_hist|module=a']).toBeCloseTo(0.55);
  expect(snap.histograms.counts['test_hist|module=a']).toBe(2);
});
```

### 5. Implement histogram observe with bucket tracking

```typescript
observe(name: string, labels: Record<string, string>, value: number): void {
  const lk = labelsKey(labels);
  const key = `${name}|${lk}`;
  this._histogramSums.set(key, (this._histogramSums.get(key) ?? 0) + value);
  this._histogramCounts.set(key, (this._histogramCounts.get(key) ?? 0) + 1);

  for (const b of this._buckets) {
    if (value <= b) {
      const bkey = `${name}|${lk}|${b}`;
      this._histogramBuckets.set(bkey, (this._histogramBuckets.get(bkey) ?? 0) + 1);
    }
  }
  const infKey = `${name}|${lk}|Inf`;
  this._histogramBuckets.set(infKey, (this._histogramBuckets.get(infKey) ?? 0) + 1);
}
```

Default buckets follow Prometheus conventions: `[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0, 60.0]`.

### 6. Write failing tests for Prometheus export

```typescript
it('exportPrometheus produces valid format', () => {
  const collector = new MetricsCollector();
  collector.incrementCalls('mod.a', 'success');
  collector.observeDuration('mod.a', 0.05);
  const output = collector.exportPrometheus();
  expect(output).toContain('# HELP apcore_module_calls_total Total module calls');
  expect(output).toContain('# TYPE apcore_module_calls_total counter');
  expect(output).toContain('# TYPE apcore_module_duration_seconds histogram');
  expect(output).toContain('_bucket{');
  expect(output).toContain('le="+Inf"');
  expect(output).toContain('_sum{');
  expect(output).toContain('_count{');
});

it('empty collector returns empty prometheus string', () => {
  const collector = new MetricsCollector();
  expect(collector.exportPrometheus()).toBe('');
});
```

### 7. Implement exportPrometheus()

Generates Prometheus text format with:
- `# HELP` and `# TYPE` headers (emitted once per metric name)
- Counter lines: `metric_name{label="value"} count`
- Histogram lines: `_bucket{...,le="bound"}`, `_sum{...}`, `_count{...}`
- Labels formatted as `{key="value",le="bound"}` with `le` sorted last

### 8. Implement convenience methods and snapshot/reset

```typescript
incrementCalls(moduleId: string, status: string): void {
  this.increment('apcore_module_calls_total', { module_id: moduleId, status });
}
incrementErrors(moduleId: string, errorCode: string): void {
  this.increment('apcore_module_errors_total', { module_id: moduleId, error_code: errorCode });
}
observeDuration(moduleId: string, durationSeconds: number): void {
  this.observe('apcore_module_duration_seconds', { module_id: moduleId }, durationSeconds);
}
```

### 9. Run tests and verify all pass

## Acceptance Criteria

- [x] `MetricsCollector` stores counters in `Map<string, number>` with string-encoded composite keys
- [x] `increment()` supports custom amounts (default 1)
- [x] `observe()` tracks histogram sums, counts, and per-bucket cumulative counts
- [x] Default histogram buckets match Prometheus standard (13 values + Inf)
- [x] Custom bucket arrays accepted and sorted on construction
- [x] `exportPrometheus()` produces valid Prometheus text format with HELP, TYPE, buckets, sum, count
- [x] Labels sorted alphabetically with `le` last in histogram bucket lines
- [x] `snapshot()` returns counters and histograms as plain objects
- [x] `reset()` clears all internal state
- [x] Convenience methods `incrementCalls()`, `incrementErrors()`, `observeDuration()` use apcore-standard metric names
- [x] No thread locking (Node.js single-threaded -- differs from Python implementation)
- [x] All tests pass with `vitest`

## Dependencies

- None (independent pillar)

## Estimated Time

3 hours
