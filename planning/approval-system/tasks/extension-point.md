# Task: approval_handler Extension Point in ExtensionManager

## Goal

Add `approval_handler` as a non-multiple built-in extension point in `src/extensions.ts` and wire it to `executor.setApprovalHandler()` in the `apply()` method.

## Files Involved

- `src/extensions.ts` -- Add extension point, type guard, and wiring
- `tests/test-extensions.test.ts` -- Update extension point count and expected names
- `tests/test-approval-integration.test.ts` -- Integration test for extension wiring

## Steps

### 1. Write failing tests (TDD)

- Update `tests/test-extensions.test.ts`: extension point count from 5 to 6, add `"approval_handler"` to expected names set
- Add integration test: register `ApprovalHandler` via `ExtensionManager`, verify wired to executor

### 2. Implement extension point

```typescript
// Type guard for duck-typing check
function isApprovalHandler(value: unknown): value is ApprovalHandler {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return typeof obj['requestApproval'] === 'function' && typeof obj['checkApproval'] === 'function';
}

// Add to builtInPoints():
['approval_handler', {
  name: 'approval_handler',
  description: 'Approval handler for Step 4.5 gate',
  multiple: false,
  typeCheck: isApprovalHandler,
  typeName: 'ApprovalHandler',
}]

// In apply():
const approvalHandler = this.get('approval_handler') as ApprovalHandler | null;
if (approvalHandler !== null) {
  executor.setApprovalHandler(approvalHandler);
}
```

### 3. Verify tests pass

Run `vitest run tests/test-extensions.test.ts tests/test-approval-integration.test.ts` and confirm all pass.

## Acceptance Criteria

- [x] `approval_handler` extension point registered as non-multiple
- [x] `isApprovalHandler()` duck-typing type guard checks for both methods
- [x] `apply()` wires handler to `executor.setApprovalHandler()`
- [x] Extension point count updated from 5 to 6 in tests
- [x] Extension wiring integration test passes

## Dependencies

- `executor-integration` -- `setApprovalHandler()` must exist on Executor

## Estimated Time

1 hour
