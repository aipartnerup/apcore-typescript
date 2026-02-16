# Task: Safety Checks -- Call Depth, Circular Detection, Frequency Throttling

## Goal

Implement the three safety mechanisms evaluated at step 2 of the execution pipeline: call depth limiting, circular call detection, and per-module frequency throttling. These prevent unbounded recursion, circular invocation chains, and tight-loop abuse.

## Files Involved

- `src/executor.ts` -- `_checkSafety()` method
- `src/errors.ts` -- `CallDepthExceededError`, `CircularCallError`, `CallFrequencyExceededError`
- `tests/test-executor.test.ts` -- Safety check unit tests

## Steps

### 1. Implement error types (TDD)

Write tests for each error's code, message, and details, then implement:

- `CallDepthExceededError(depth, maxDepth, callChain)` with code `CALL_DEPTH_EXCEEDED`
- `CircularCallError(moduleId, callChain)` with code `CIRCULAR_CALL`
- `CallFrequencyExceededError(moduleId, count, maxRepeat, callChain)` with code `CALL_FREQUENCY_EXCEEDED`

All extend `ModuleError` with `timestamp`, `code`, `message`, `details` record, and optional `cause`.

### 2. Implement call depth check (TDD)

- Compare `callChain.length` against `_maxCallDepth` (default 32)
- Throw `CallDepthExceededError` when exceeded
- Test: depth at limit (pass), below limit (pass), above limit (throw)

### 3. Implement circular call detection (TDD)

- Examine `callChain.slice(0, -1)` (prior chain, since `child()` already appended moduleId)
- If `moduleId` is found in prior chain, extract subsequence between last occurrence and end
- Only throw `CircularCallError` if subsequence length > 0 (true cycle of length >= 2)
- Test: A->B->A cycle (throw), A->B->C->B cycle (throw), non-cycle repetition (pass)

### 4. Implement frequency throttling (TDD)

- Count occurrences of `moduleId` in `callChain` using `filter().length`
- Throw `CallFrequencyExceededError` when count exceeds `_maxModuleRepeat` (default 3)
- Test: count at limit (pass), below limit (pass), above limit (throw)

### 5. Verify tests pass

```bash
npx vitest run tests/test-executor.test.ts
```

## Acceptance Criteria

- [x] Call depth check rejects chains exceeding maxCallDepth
- [x] Circular detection identifies A->B->A patterns but allows simple repetition (A->A)
- [x] Frequency throttle fires when a module appears more than maxModuleRepeat times in the chain
- [x] All errors carry full callChain in details for debugging
- [x] Configurable limits via Config (`executor.max_call_depth`, `executor.max_module_repeat`)
- [x] All error types extend ModuleError with timestamp and structured details

## Dependencies

- Task: setup (Context with callChain, Config with dot-path access)

## Estimated Time

2 hours
