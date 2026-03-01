# Task: Export New Public Types from index.ts

## Goal

Add all new approval-related types to `src/index.ts` exports, making them importable from the `apcore-js` package.

## Files Involved

- `src/index.ts` -- Add imports and exports
- `tests/test-approval-integration.test.ts` -- Import verification test

## Steps

### 1. Write failing test (TDD)

Add test verifying all 9 types are importable from `../src/index.js`:
- From `approval.ts`: `createApprovalRequest`, `createApprovalResult`, `AlwaysDenyHandler`, `AutoApproveHandler`, `CallbackApprovalHandler`
- Type exports: `ApprovalRequest`, `ApprovalResult`, `ApprovalHandler`
- From `errors.ts`: `ApprovalError`, `ApprovalDeniedError`, `ApprovalTimeoutError`, `ApprovalPendingError`

### 2. Add exports

Add to `index.ts`:
```typescript
// Approval
export {
  createApprovalRequest,
  createApprovalResult,
  AlwaysDenyHandler,
  AutoApproveHandler,
  CallbackApprovalHandler,
} from './approval.js';
export type { ApprovalRequest, ApprovalResult, ApprovalHandler } from './approval.js';

// Add to Errors section:
export { ApprovalError, ApprovalDeniedError, ApprovalTimeoutError, ApprovalPendingError } from './errors.js';
```

### 3. Verify tests pass

Run `vitest run tests/test-approval-integration.test.ts` and confirm import test passes.

## Acceptance Criteria

- [x] All approval types importable via `import { ... } from 'apcore-js'`
- [x] Type-only exports use `export type` for interfaces
- [x] Import verification test passes

## Dependencies

- `executor-integration` -- All types must be implemented first

## Estimated Time

0.5 hours
