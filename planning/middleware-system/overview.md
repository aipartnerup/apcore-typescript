# Feature: Middleware System

## Overview

The Middleware System provides a composable onion-model pipeline for intercepting module calls in apcore. Each middleware can hook into three lifecycle phases -- `before()` (pre-execution input transformation), `after()` (post-execution output transformation), and `onError()` (error recovery). The `MiddlewareManager` orchestrates execution in forward order for `before`, reverse order for `after` and `onError`, and wraps middleware failures in `MiddlewareChainError`. Function adapter classes (`BeforeMiddleware`, `AfterMiddleware`) allow lightweight callback-based middleware without subclassing, and a built-in `LoggingMiddleware` provides structured call tracing with `performance.now()` timing.

## Scope

### Included

- `Middleware` base class with no-op `before()`, `after()`, `onError()` lifecycle hooks
- `MiddlewareManager` with `add()`, `remove()`, `snapshot()`, and onion-model `executeBefore()` / `executeAfter()` / `executeOnError()` methods
- `MiddlewareChainError` extending `ModuleError` for wrapping middleware-phase failures with executed-middleware tracking
- `BeforeMiddleware` and `AfterMiddleware` adapter classes with `BeforeCallback` and `AfterCallback` type aliases
- `LoggingMiddleware` with pluggable `Logger` interface, configurable input/output/error logging, and `performance.now()` duration measurement
- Barrel export via `middleware/index.ts`

### Excluded

- Executor integration (consumed by `core-executor` module)
- Observability middleware (tracing, metrics -- implemented in `observability` module)
- Async middleware support (all hooks are synchronous by design)

## Technology Stack

- **TypeScript 5.5+** with strict mode
- **Node.js >= 18.0.0** with ES Module support
- **vitest** for unit testing

## Task Execution Order

| # | Task File | Description | Status |
|---|-----------|-------------|--------|
| 1 | [base](./tasks/base.md) | Middleware base class with no-op lifecycle hooks | completed |
| 2 | [manager](./tasks/manager.md) | MiddlewareManager with onion-model execution and MiddlewareChainError | completed |
| 3 | [adapters](./tasks/adapters.md) | BeforeMiddleware and AfterMiddleware adapter classes with callback types | completed |
| 4 | [logging-middleware](./tasks/logging-middleware.md) | LoggingMiddleware with Logger interface and performance.now() timing | completed |

## Progress

| Total | Completed | In Progress | Pending |
|-------|-----------|-------------|---------|
| 4     | 4         | 0           | 0       |

## Reference Documents

- [Implementation Plan](./plan.md)
- [Project Overview](../overview.md)
