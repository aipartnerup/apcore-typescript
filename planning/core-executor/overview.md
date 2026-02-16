# Feature: Core Executor

## Overview

The Core Execution Engine is the central orchestration component of apcore. It processes module calls through a structured 10-step pipeline: context creation, safety checks (call depth, circular detection, frequency throttling), module lookup from the registry, ACL enforcement, input validation with sensitive field redaction, middleware before chain, module execution with timeout enforcement, output validation, middleware after chain, and result return. The TypeScript implementation uses a single async `call()` method with `Promise.race` for timeout enforcement.

## Scope

### Included

- `Context` class and `Identity` interface for call metadata propagation and caller identity
- `Config` accessor with dot-path key support for executor settings
- `Executor` class implementing the full 10-step async pipeline
- Safety checks: call depth limits, circular call detection (cycles of length >= 2), frequency throttling
- Timeout enforcement via `Promise.race` with `setTimeout`
- `redactSensitive` utility for masking `x-sensitive` fields and `_secret_`-prefixed keys
- Structured error hierarchy (`ModuleError` base with specialized subclasses for every failure mode)
- Standalone `validate()` method for pre-flight schema checks without execution
- Middleware management via `MiddlewareManager` with before/after/onError chains

### Excluded

- Registry implementation (consumed as a dependency)
- Schema system internals (consumed via TypeBox validation)
- ACL rule definition and management (consumed via `ACL.check()` interface)
- Middleware implementation details (managed by `MiddlewareManager`)

## Technology Stack

- **TypeScript 5.5+** with strict mode
- **@sinclair/typebox >= 0.34.0** for input/output schema validation
- **Node.js >= 18.0.0** with ES Module support
- **vitest** for unit and integration testing

## Task Execution Order

| # | Task File | Description | Status |
|---|-----------|-------------|--------|
| 1 | [setup](./tasks/setup.md) | Context, Identity, and Config classes | completed |
| 2 | [safety-checks](./tasks/safety-checks.md) | Call depth limits, circular detection, frequency throttling | completed |
| 3 | [execution-pipeline](./tasks/execution-pipeline.md) | 10-step async execution pipeline with middleware and timeout | completed |
| 4 | [async-support](./tasks/async-support.md) | Unified async execution (single async call()) | completed |
| 5 | [redaction](./tasks/redaction.md) | Sensitive field redaction utility (`redactSensitive`) | completed |

## Progress

| Total | Completed | In Progress | Pending |
|-------|-----------|-------------|---------|
| 5     | 5         | 0           | 0       |

## Reference Documents

- [Core Executor Feature Specification](../../features/core-executor.md)
