# Task: Approval Gate at Step 4.5 in Executor

## Goal

Integrate the approval gate into `src/executor.ts` at Step 4.5 (between ACL and Input Validation) in all three execution paths: `call()`, `callAsync()`, and `stream()`.

## Files Involved

- `src/executor.ts` -- Add approval handler support and Step 4.5 gate
- `src/approval.ts` -- Imported for `ApprovalHandler`, `ApprovalRequest`, `ApprovalResult`, `createApprovalRequest`
- `src/errors.ts` -- Imported for approval error classes
- `src/module.ts` -- `ModuleAnnotations` and `DEFAULT_ANNOTATIONS` for annotation type checking
- `tests/test-approval-executor.test.ts` -- Unit tests for executor approval gate

## Steps

### 1. Write failing tests (TDD)

Create tests for:
- **Gate skipping**: No handler configured, no `requiresApproval`, `requiresApproval: false`, no annotations
- **`call()`**: Handler rejects -> `ApprovalDeniedError`, handler approves -> execution proceeds
- **`callAsync()`**: Same behavior as `call()` (alias)
- **`stream()`**: Same gate behavior before streaming begins
- **Timeout**: Handler returns `status="timeout"` -> `ApprovalTimeoutError`
- **Pending (Phase B)**: Handler returns `status="pending"` -> `ApprovalPendingError` with `approvalId`
- **Phase B resume**: `_approval_token` in arguments -> deleted from inputs, `checkApproval` called instead of `requestApproval`
- **Dict annotations**: `{ requiresApproval: true }` triggers gate correctly
- **Unknown status**: `console.warn` logged, falls through to `ApprovalDeniedError`
- **Handler exception**: Propagated without wrapping
- **`setApprovalHandler()`**: Works correctly
- **Audit events**: `console.info` emitted on all decisions, span events appended when tracing active

### 2. Implement executor changes

- **Constructor**: Add `approvalHandler?: ApprovalHandler | null` option, store as `this._approvalHandler`
- **`setApprovalHandler(handler)`**: Public setter method
- **Private helpers**:
  - `_needsApproval(mod) -> boolean`: Check annotations (both `ModuleAnnotations` interface and `Record<string, unknown>` forms)
  - `_buildApprovalRequest(mod, moduleId, inputs, ctx) -> ApprovalRequest`: Build request, normalize dict annotations to `ModuleAnnotations`
  - `_handleApprovalResult(result, moduleId)`: Map status to continue/error with unknown status warning
  - `_emitApprovalEvent(result, moduleId, ctx)`: Emit audit event (`console.info` + span event if `_tracing_spans` in context data)
  - `_checkApproval(mod, moduleId, inputs, ctx)`: Single async method (no sync/async split needed in TypeScript)
- **`call()`**: Insert `await this._checkApproval()` between Step 4 (ACL) and Step 5 (Input Validation)
- **`stream()`**: Insert `await this._checkApproval()` between Step 4 and Step 5

### 3. Verify tests pass

Run `vitest run tests/test-approval-executor.test.ts` and confirm all 31 executor gate tests pass.

## Acceptance Criteria

- [x] `approvalHandler: null` default preserves all existing behavior
- [x] Gate skipped when: no handler, no annotations, `requiresApproval` not true
- [x] Gate fires in all three paths: `call()`, `callAsync()`, `stream()`
- [x] Correct error mapping: approved -> continue, rejected/timeout/pending -> specific errors
- [x] Phase B `_approval_token` pop-and-resume via `checkApproval`
- [x] Both `ModuleAnnotations` interface and `Record<string, unknown>` annotation forms handled
- [x] Unknown status logs `console.warn` and throws `ApprovalDeniedError` (fail-closed)
- [x] Audit events: `console.info` for all decisions + span event when `_tracing_spans` active

## Dependencies

- `error-types` -- Approval error classes must exist
- `approval-core` -- `ApprovalHandler`, `ApprovalRequest`, `ApprovalResult` must exist

## Estimated Time

2 hours
