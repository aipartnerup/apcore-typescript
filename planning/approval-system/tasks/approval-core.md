# Task: ApprovalHandler Interface, Data Types, and Built-in Handlers

## Goal

Create `src/approval.ts` with the `ApprovalHandler` interface, `ApprovalRequest`/`ApprovalResult` frozen interfaces with factory functions, and three built-in handler implementations.

## Files Involved

- `src/approval.ts` -- New file with all approval types and handlers
- `tests/test-approval.test.ts` -- Unit tests for types and handlers

## Steps

### 1. Write failing tests (TDD)

Create tests for:
- **`ApprovalRequest`**: Fields (moduleId, arguments, context, annotations, description, tags), frozen immutability via `Object.freeze()`, default values (description=null, tags=[])
- **`ApprovalResult`**: Fields (status, approvedBy, reason, approvalId, metadata), frozen immutability, default values (all optional fields default to null)
- **`ApprovalHandler`**: Interface with `requestApproval` and `checkApproval` async methods
- **`AlwaysDenyHandler`**: `requestApproval` returns `status="rejected"`, `checkApproval` returns `status="rejected"`
- **`AutoApproveHandler`**: `requestApproval` returns `status="approved"`, `approvedBy="auto"`
- **`CallbackApprovalHandler`**: Delegates to callback function, `checkApproval` returns `status="rejected"` by default

### 2. Implement approval module

```typescript
// Frozen interfaces with factory functions
export interface ApprovalRequest { readonly moduleId: string; /* ... */ }
export function createApprovalRequest(options: { ... }): ApprovalRequest { return Object.freeze({ ... }); }

export interface ApprovalResult { readonly status: 'approved' | 'rejected' | 'timeout' | 'pending'; /* ... */ }
export function createApprovalResult(options: { ... }): ApprovalResult { return Object.freeze({ ... }); }

// Handler interface (TypeScript equivalent of Python's Protocol)
export interface ApprovalHandler {
  requestApproval(request: ApprovalRequest): Promise<ApprovalResult>;
  checkApproval(approvalId: string): Promise<ApprovalResult>;
}

// Three built-in handler classes implementing the interface
export class AlwaysDenyHandler implements ApprovalHandler { /* ... */ }
export class AutoApproveHandler implements ApprovalHandler { /* ... */ }
export class CallbackApprovalHandler implements ApprovalHandler { /* ... */ }
```

### 3. Verify tests pass

Run `vitest run tests/test-approval.test.ts` and confirm all type and handler tests pass.

## Acceptance Criteria

- [x] `ApprovalRequest` interface with frozen factory function, all required fields and defaults
- [x] `ApprovalResult` interface with frozen factory function, all required fields and defaults
- [x] `ApprovalHandler` interface with two async methods
- [x] `AlwaysDenyHandler` always returns rejected status with reason "Always denied"
- [x] `AutoApproveHandler` always returns approved status with `approvedBy="auto"`
- [x] `CallbackApprovalHandler` delegates to provided callback, rejects on `checkApproval`

## Dependencies

- None (standalone, but logically follows error-types)

## Estimated Time

1 hour
