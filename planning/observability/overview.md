# Feature: Observability

## Overview

The Observability module provides the three pillars of runtime visibility for apcore: distributed tracing, metrics collection, and structured logging. All three integrate into the executor's middleware pipeline as composable `Middleware` subclasses that use stack-based state in the shared `context.data` record to correctly handle nested module-to-module calls. Tracing produces `Span` objects exported through pluggable `SpanExporter` implementations. Metrics are collected via `MetricsCollector` with Prometheus-compatible text export. Logging is handled by `ContextLogger` with JSON and text output formats, automatic `_secret_`-prefixed key redaction, and a `fromContext()` factory that binds trace/module/caller metadata.

## Scope

### Included

- `Span` interface and `createSpan()` factory function for trace span creation
- `SpanExporter` interface with `StdoutExporter` (JSON.stringify to stdout) and `InMemoryExporter` (bounded array with shift() eviction)
- `TracingMiddleware` with stack-based span management and 4 sampling strategies: `full`, `proportional`, `error_first`, `off`
- `MetricsCollector` with counter and histogram support, string-encoded composite keys (`name|key1=val1,key2=val2`), Prometheus text format export, and convenience methods (`incrementCalls`, `incrementErrors`, `observeDuration`)
- `MetricsMiddleware` with stack-based `performance.now()` timing and automatic call/error/duration recording
- `ContextLogger` with JSON and text output formats, level filtering (trace/debug/info/warn/error/fatal), `_secret_`-prefixed key redaction, and `fromContext()` static factory
- `ObsLoggingMiddleware` with stack-based timing, configurable input/output logging, and start/complete/error structured log events

### Excluded

- `OTLPExporter` for OpenTelemetry Protocol export (not yet implemented -- noted as a gap for future work)
- OpenTelemetry SDK bridge or direct OTel integration
- Persistent metric storage or time-series database integration
- Log file rotation or external log shipping
- Dashboard or alerting configuration

## Technology Stack

- **TypeScript 5.5+** with strict mode
- **Node.js >= 18.0.0** with ES Module support (`performance.now()`, `node:crypto`)
- **vitest** for unit testing

## Task Execution Order

| # | Task File | Description | Status |
|---|-----------|-------------|--------|
| 1 | [span-model](./tasks/span-model.md) | Span interface and createSpan() factory, SpanExporter interface | completed |
| 2 | [exporters](./tasks/exporters.md) | StdoutExporter and InMemoryExporter implementations | completed |
| 3 | [tracing-middleware](./tasks/tracing-middleware.md) | TracingMiddleware with stack-based spans and sampling strategies | completed |
| 4 | [metrics-collector](./tasks/metrics-collector.md) | MetricsCollector with counters, histograms, and Prometheus export | completed |
| 5 | [metrics-middleware](./tasks/metrics-middleware.md) | MetricsMiddleware with stack-based performance.now() timing | completed |
| 6 | [context-logger](./tasks/context-logger.md) | ContextLogger with JSON/text formats, redaction, fromContext() | completed |
| 7 | [obs-logging-middleware](./tasks/obs-logging-middleware.md) | ObsLoggingMiddleware with stack-based timing and structured logs | completed |

## Progress

| Total | Completed | In Progress | Pending |
|-------|-----------|-------------|---------|
| 7     | 7         | 0           | 0       |

## Reference Documents

- [Observability Feature Specification](../../features/observability.md)
