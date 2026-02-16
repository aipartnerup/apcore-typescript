# Task: ACLRule Interface Definition

## Goal

Define the `ACLRule` TypeScript interface that represents a single access control rule, specifying caller patterns, target patterns, an effect (allow/deny), a human-readable description, and optional conditions for conditional evaluation.

## Files Involved

- `src/acl.ts` -- Interface definition exported alongside the ACL class

## Steps (TDD)

### 1. Write failing tests for ACLRule shape

```typescript
// tests/acl.test.ts
import { describe, it, expect } from 'vitest';
import type { ACLRule } from '../src/acl.js';

describe('ACLRule interface', () => {
  it('should accept a fully-specified rule', () => {
    const rule: ACLRule = {
      callers: ['moduleA', 'moduleB'],
      targets: ['moduleC'],
      effect: 'allow',
      description: 'Allow A and B to call C',
      conditions: { roles: ['admin'] },
    };
    expect(rule.callers).toEqual(['moduleA', 'moduleB']);
    expect(rule.targets).toEqual(['moduleC']);
    expect(rule.effect).toBe('allow');
    expect(rule.description).toBe('Allow A and B to call C');
    expect(rule.conditions).toEqual({ roles: ['admin'] });
  });

  it('should accept a rule with no conditions', () => {
    const rule: ACLRule = {
      callers: ['*'],
      targets: ['*'],
      effect: 'deny',
      description: 'Deny all by default',
    };
    expect(rule.conditions).toBeUndefined();
  });

  it('should accept null conditions', () => {
    const rule: ACLRule = {
      callers: ['@external'],
      targets: ['auth.*'],
      effect: 'allow',
      description: 'Allow external to auth modules',
      conditions: null,
    };
    expect(rule.conditions).toBeNull();
  });
});
```

### 2. Define the ACLRule interface

```typescript
// src/acl.ts
export interface ACLRule {
  callers: string[];
  targets: string[];
  effect: string;
  description: string;
  conditions?: Record<string, unknown> | null;
}
```

### 3. Verify type-check and tests pass

Run `tsc --noEmit` to confirm no type errors, then run `vitest` to confirm all tests pass.

## Acceptance Criteria

- [x] `ACLRule` interface is exported from `src/acl.ts`
- [x] `callers` is `string[]` representing caller module ID patterns
- [x] `targets` is `string[]` representing target module ID patterns
- [x] `effect` is `string` (validated as `'allow'` | `'deny'` at runtime during YAML loading)
- [x] `description` is `string` for human-readable rule documentation
- [x] `conditions` is optional `Record<string, unknown> | null` for conditional evaluation
- [x] All tests pass with `vitest`; zero errors from `tsc --noEmit`

## Dependencies

- None (this is a standalone type definition)

## Estimated Time

1 hour
