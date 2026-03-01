# Task: Approval Error Classes and Error Codes

## Goal

Add four approval-specific error classes and three error codes to `src/errors.ts`, following existing error patterns (e.g., `ACLDeniedError`).

## Files Involved

- `src/errors.ts` -- Add error classes and error codes
- `tests/test-approval.test.ts` -- Unit tests for error classes

## Steps

### 1. Write failing tests (TDD)

Create tests for:
- **`ApprovalError`**: Base class inherits from `ModuleError`, carries `result` property
- **`ApprovalDeniedError`**: Has code `APPROVAL_DENIED`, message includes moduleId, carries result
- **`ApprovalTimeoutError`**: Has code `APPROVAL_TIMEOUT`, carries result
- **`ApprovalPendingError`**: Has code `APPROVAL_PENDING`, carries result with `approvalId`
- **Error codes**: `ErrorCodes.APPROVAL_DENIED`, `APPROVAL_TIMEOUT`, `APPROVAL_PENDING` exist as string constants
- **`reason` property**: Shortcut accessor to `result.reason`

### 2. Implement error classes

```typescript
export class ApprovalError extends ModuleError {
  readonly result: unknown;
  constructor(code: string, message: string, result: unknown, moduleId?: string, options?: { cause?: Error; traceId?: string }) {
    super(code, message, { moduleId: moduleId ?? null }, options?.cause, options?.traceId);
    this.result = result;
  }
  get moduleId(): string | null { return this.details['moduleId'] as string | null; }
  get reason(): string | null { return (this.result as Record<string, unknown>)?.['reason'] as string ?? null; }
}

export class ApprovalDeniedError extends ApprovalError { /* code: APPROVAL_DENIED */ }
export class ApprovalTimeoutError extends ApprovalError { /* code: APPROVAL_TIMEOUT */ }
export class ApprovalPendingError extends ApprovalError { /* code: APPROVAL_PENDING, approvalId getter */ }
```

Add three constants to `ErrorCodes`:
```typescript
APPROVAL_DENIED: "APPROVAL_DENIED",
APPROVAL_TIMEOUT: "APPROVAL_TIMEOUT",
APPROVAL_PENDING: "APPROVAL_PENDING",
```

### 3. Verify tests pass

Run `vitest run tests/test-approval.test.ts` and confirm all error tests pass.

## Acceptance Criteria

- [x] `ApprovalError` inherits from `ModuleError` and stores `result` property (typed as `unknown` to avoid circular imports)
- [x] Three specific subclasses with correct default error codes
- [x] `ErrorCodes` has `APPROVAL_DENIED`, `APPROVAL_TIMEOUT`, `APPROVAL_PENDING` constants
- [x] `ApprovalDeniedError` includes reason in message when present
- [x] `ApprovalPendingError` has `approvalId` getter
- [x] `reason` shortcut property on base `ApprovalError`

## Dependencies

- None (standalone)

## Estimated Time

0.5 hours
