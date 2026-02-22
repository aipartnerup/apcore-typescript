# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-02-22

### Changed
- Improved performance of `Executor.stream()` with optimized buffering.

### Added
- Introduced `ModuleAnnotations.batchProcessing` for enhanced batch processing capabilities.
- Added new logging features for better observability in the execution pipeline.

### Fixed
- Resolved issues with error handling in `context.ts`.

### Co-Authors
- Claude Opus 4.6 <noreply@anthropic.com>
- New Contributor <newcontributor@example.com>

### Added

- **Error classes and constants**
  - `ModuleExecuteError` — New error class for module execution failures
  - `InternalError` — New error class for general internal errors
  - `ErrorCodes` — Frozen object with all 26 error code strings for consistent error code usage
  - `ErrorCode` — Type definition for all error codes
- **Registry constants**
  - `REGISTRY_EVENTS` — Frozen object with standard event names (`register`, `unregister`)
  - `MODULE_ID_PATTERN` — Regex pattern enforcing lowercase/digits/underscores/dots for module IDs (no hyphens allowed to ensure bijective MCP tool name normalization)
- **Executor methods**
  - `Executor.callAsync()` — Alias for `call()` for compatibility with MCP bridge packages

### Changed

- **Module ID validation** — Registry now validates module IDs against `MODULE_ID_PATTERN` on registration, rejecting IDs with hyphens or invalid characters
- **Event handling** — Registry event validation now uses `REGISTRY_EVENTS` constants instead of hardcoded strings
- **Test updates** — Updated tests to use underscore-separated module IDs instead of hyphens (e.g., `math.add_ten` instead of `math.addTen`, `ctx_test` instead of `ctx-test`)

### Fixed

- **String literals in Registry** — Replaced hardcoded `'register'` and `'unregister'` strings with `REGISTRY_EVENTS.REGISTER` and `REGISTRY_EVENTS.UNREGISTER` constants in event triggers for consistency

## [0.3.0] - 2026-02-20

### Changed
- Use shallow merge for `stream()` accumulation instead of last-chunk.

### Added
- Add `Executor.stream()` async generator and `ModuleAnnotations.streaming` for streaming support in the core execution pipeline.

### Co-Authors
- Claude Opus 4.6 <noreply@anthropic.com>

### Added

- **Error classes and constants**
  - `ModuleExecuteError` — New error class for module execution failures
  - `InternalError` — New error class for general internal errors
  - `ErrorCodes` — Frozen object with all 26 error code strings for consistent error code usage
  - `ErrorCode` — Type definition for all error codes
- **Registry constants**
  - `REGISTRY_EVENTS` — Frozen object with standard event names (`register`, `unregister`)
  - `MODULE_ID_PATTERN` — Regex pattern enforcing lowercase/digits/underscores/dots for module IDs (no hyphens allowed to ensure bijective MCP tool name normalization)
- **Executor methods**
  - `Executor.callAsync()` — Alias for `call()` for compatibility with MCP bridge packages

### Changed

- **Module ID validation** — Registry now validates module IDs against `MODULE_ID_PATTERN` on registration, rejecting IDs with hyphens or invalid characters
- **Event handling** — Registry event validation now uses `REGISTRY_EVENTS` constants instead of hardcoded strings
- **Test updates** — Updated tests to use underscore-separated module IDs instead of hyphens (e.g., `math.add_ten` instead of `math.addTen`, `ctx_test` instead of `ctx-test`)

### Fixed

- **String literals in Registry** — Replaced hardcoded `'register'` and `'unregister'` strings with `REGISTRY_EVENTS.REGISTER` and `REGISTRY_EVENTS.UNREGISTER` constants in event triggers for consistency

## [0.2.0] - 2026-02-20

### Added

- **Error classes and constants**
  - `ModuleExecuteError` — New error class for module execution failures
  - `InternalError` — New error class for general internal errors
  - `ErrorCodes` — Frozen object with all 26 error code strings for consistent error code usage
  - `ErrorCode` — Type definition for all error codes
- **Registry constants**
  - `REGISTRY_EVENTS` — Frozen object with standard event names (`register`, `unregister`)
  - `MODULE_ID_PATTERN` — Regex pattern enforcing lowercase/digits/underscores/dots for module IDs (no hyphens allowed to ensure bijective MCP tool name normalization)
- **Executor methods**
  - `Executor.callAsync()` — Alias for `call()` for compatibility with MCP bridge packages

### Changed

- **Module ID validation** — Registry now validates module IDs against `MODULE_ID_PATTERN` on registration, rejecting IDs with hyphens or invalid characters
- **Event handling** — Registry event validation now uses `REGISTRY_EVENTS` constants instead of hardcoded strings
- **Test updates** — Updated tests to use underscore-separated module IDs instead of hyphens (e.g., `math.add_ten` instead of `math.addTen`, `ctx_test` instead of `ctx-test`)

### Fixed

- **String literals in Registry** — Replaced hardcoded `'register'` and `'unregister'` strings with `REGISTRY_EVENTS.REGISTER` and `REGISTRY_EVENTS.UNREGISTER` constants in event triggers for consistency

## [0.1.2] - 2026-02-18

### Fixed

- **Timer leak in executor** — `_executeWithTimeout` now calls `clearTimeout` in `.finally()` to prevent timer leak on normal completion
- **Path traversal protection** — `resolveTarget` in binding loader rejects module paths containing `..` segments before dynamic `import()`
- **Bare catch blocks** — 6 silent `catch {}` blocks in registry and middleware manager now log warnings with `[apcore:<subsystem>]` prefix
- **Python-style error messages** — Fixed `FuncMissingTypeHintError` and `FuncMissingReturnTypeError` to use TypeScript syntax (`: string`, `: Record<string, unknown>`)
- **Console.log in production** — Replaced `console.log` with `console.info` in logging middleware and `process.stdout.write` in tracing exporter

### Changed

- **Long method decomposition** — Broke up 4 oversized methods to meet ≤50 line guideline:
  - `Executor.call()` (108 → 6 private helpers)
  - `Registry.discover()` (110 → 7 private helpers)
  - `ACL.load()` (71 → extracted `parseAclRule`)
  - `jsonSchemaToTypeBox()` (80 → 5 converter helpers)
- **Deeply readonly callChain** — `Context.callChain` type narrowed from `readonly string[]` to `readonly (readonly string[])` preventing mutation via push/splice
- **Consolidated `deepCopy`** — Removed 4 duplicate `deepCopy` implementations; single shared version now lives in `src/utils/index.ts`

### Added

- **42 new tests** for previously uncovered modules:
  - `tests/schema/test-annotations.test.ts` — 16 tests for `mergeAnnotations`, `mergeExamples`, `mergeMetadata`
  - `tests/schema/test-exporter.test.ts` — 14 tests for `SchemaExporter` across all 4 export profiles
  - `tests/test-logging-middleware.test.ts` — 12 tests for `LoggingMiddleware` before/after/onError

## [0.1.1] - 2026-02-17

### Fixed

- Updated logo URL in README

### Changed

- Renamed package from `apcore` to `apcore-js`
- Updated installation instructions

## [0.1.0] - 2026-02-16

### Added

- **Core executor** — 10-step async execution pipeline with timeout support via `Promise.race`
- **Context system** — Execution context with trace IDs, call chains, identity, and redacted inputs
- **Config** — Dot-path configuration accessor
- **Registry system**
  - File-based module discovery (`scanExtensions`, `scanMultiRoot`)
  - Dynamic entry point resolution with duck-type validation
  - YAML metadata loading and merging (code values + YAML overrides)
  - Dependency parsing with topological sort (Kahn's algorithm) and cycle detection
  - ID map support for custom module IDs
  - Schema export in JSON/YAML with strict and compact modes
- **FunctionModule** — Schema-driven module wrapper with TypeBox schemas
- **Binding loader** — YAML-based module registration with three schema modes (inline, external ref, permissive fallback)
- **ACL (Access Control List)**
  - Pattern-based rules with glob matching
  - Identity type and role-based conditions
  - Call depth conditions
  - Dynamic rule management (`addRule`, `removeRule`, `reload`)
  - YAML configuration loading
- **Middleware system**
  - Onion-model execution (before forward, after reverse)
  - Error recovery via `onError` hooks
  - `BeforeMiddleware` and `AfterMiddleware` adapters
  - `LoggingMiddleware` for structured execution logging
- **Observability**
  - **Tracing** — Span creation, `InMemoryExporter`, `StdoutExporter`, `TracingMiddleware` with sampling strategies (full, off, proportional, error_first)
  - **Metrics** — `MetricsCollector` with counters, histograms, Prometheus text format export, `MetricsMiddleware`
  - **Logging** — `ContextLogger` with JSON/text formats, level filtering, `_secret_` field redaction, `ObsLoggingMiddleware`
- **Schema system**
  - JSON Schema to TypeBox conversion
  - `$ref` resolution
  - Schema validation
  - Strict transforms (`additionalProperties: false`)
  - LLM description injection and extension stripping
- **Error hierarchy** — 20+ typed error classes with error codes, details, trace IDs, and timestamps
- **Pattern matching** — Glob-style pattern matching for ACL rules and module targeting
- **Comprehensive test suite** — 385 tests across 29 test files
