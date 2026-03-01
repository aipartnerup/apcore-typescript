# Feature: Approval System

## Overview

Runtime approval gate at Executor Step 4.5 (after ACL, before Input Validation) that enforces the `requiresApproval` annotation. When a module declares `requiresApproval: true` and an `ApprovalHandler` is configured, the handler is invoked for human or automated sign-off before execution proceeds. Supports both synchronous (Phase A: block until decision) and asynchronous (Phase B: pending status with `_approval_token` resume) approval flows. Fully backward compatible -- when no handler is configured, the gate is skipped entirely.

## Scope

### Included

- `ApprovalRequest` frozen interface with moduleId, arguments, context, annotations, description, tags; `createApprovalRequest()` factory
- `ApprovalResult` frozen interface with status, approvedBy, reason, approvalId, metadata; `createApprovalResult()` factory
- `ApprovalHandler` interface with `requestApproval()` and `checkApproval()` async methods
- Built-in handlers: `AlwaysDenyHandler`, `AutoApproveHandler`, `CallbackApprovalHandler`
- Error hierarchy: `ApprovalError(ModuleError)` base with `ApprovalDeniedError`, `ApprovalTimeoutError`, `ApprovalPendingError`
- Executor integration at Step 4.5 in `call()`, `callAsync()`, and `stream()`
- Dual annotation form handling (both `ModuleAnnotations` interface and `Record<string, unknown>`)
- Phase B `_approval_token` pop-and-resume mechanism
- `approval_handler` extension point in `ExtensionManager`
- Audit events: `console.info` logging + span event emission when tracing active

### Excluded

- Approval history / audit log persistence
- UI components for approval workflows
- Multi-approver consensus or quorum logic

## Technology Stack

- **Language**: TypeScript 5.5+ with strict mode
- **Dependencies**: None (stdlib only)
- **Internal**: `Context`, `ModuleAnnotations`, `ModuleError`, `Executor`, `ExtensionManager`
- **Testing**: vitest

## Task Execution Order

| # | Task File | Description | Status |
|---|-----------|-------------|--------|
| 1 | [error-types](./tasks/error-types.md) | Approval error classes and error codes in `errors.ts` | completed |
| 2 | [approval-core](./tasks/approval-core.md) | `ApprovalHandler` interface, data types, and built-in handlers in `approval.ts` | completed |
| 3 | [executor-integration](./tasks/executor-integration.md) | Approval gate at Step 4.5 in `Executor.call()`, `callAsync()`, `stream()` | completed |
| 4 | [public-exports](./tasks/public-exports.md) | Export all new public types from `index.ts` | completed |
| 5 | [extension-point](./tasks/extension-point.md) | `approval_handler` extension point in `ExtensionManager` | completed |
| 6 | [integration-tests](./tasks/integration-tests.md) | End-to-end tests through full executor pipeline | completed |

## Progress

| Total | Completed | In Progress | Pending |
|-------|-----------|-------------|---------|
| 6     | 6         | 0           | 0       |

## Reference Documents

- [Approval System Feature Specification](../../docs/features/approval-system.md)
- Reference implementation: [apcore-python](../../apcore-python/src/apcore/approval.py)
