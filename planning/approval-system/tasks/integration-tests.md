# Task: End-to-End Integration Tests

## Goal

Write comprehensive integration tests that exercise the approval system through the full executor pipeline, verifying correct interaction with ACL, middleware, and extension systems.

## Files Involved

- `tests/test-approval-integration.test.ts` -- New file with integration tests

## Steps

### 1. Write integration tests

Create tests for:
- **ACL + Approval ordering**: ACL deny fires before approval gate (approval handler never called)
- **ACL allow + Approval deny**: ACL passes, approval denies -> `ApprovalDeniedError`
- **ACL allow + Approval approve**: Full success path
- **Middleware + Approval approved**: Middleware before/after still executes when approval passes
- **Middleware + Approval denied**: Middleware not invoked on denial (Step 4.5 < Step 6)
- **Safe module bypass**: Module without `requiresApproval` works normally with deny handler configured
- **Callback handler with identity**: `CallbackApprovalHandler` receives correct identity from context
- **Conditional callback**: Callback approves admins, rejects non-admins
- **Phase B pending-then-resume**: Handler returns pending, re-call with `_approval_token` invokes `checkApproval`
- **ExtensionManager wiring**: Handler registered via extension manager is wired to executor
- **ExtensionManager deny**: AlwaysDenyHandler via extension manager blocks execution
- **Public API imports**: All approval types importable from `../src/index.js`

### 2. Verify all tests pass

Run full suite `vitest run` and confirm all 860 tests pass.

## Acceptance Criteria

- [x] 12 integration tests covering all major interaction scenarios
- [x] ACL-before-approval ordering verified (approval handler not called when ACL denies)
- [x] Middleware interaction verified (runs after approval, not on denial)
- [x] Phase B resume flow verified end-to-end
- [x] Extension wiring verified with both approve and deny handlers
- [x] Public API import verification
- [x] All tests pass with zero `tsc --noEmit` errors

## Dependencies

- `public-exports` -- All types must be exported
- `extension-point` -- Extension wiring must be implemented

## Estimated Time

2 hours
