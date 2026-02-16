# Task: Conditional Rule Evaluation (_checkConditions)

## Goal

Implement the `_checkConditions()` private method on the `ACL` class that evaluates optional conditions attached to ACL rules. Conditions use AND logic: all present condition keys must pass for the rule to match. Supported conditions are `identity_types`, `roles`, and `max_call_depth`.

## Files Involved

- `src/acl.ts` -- `_checkConditions()` private method on the ACL class
- `src/context.ts` -- `Context` class (provides `identity` and `callChain`) and `Identity` interface (provides `type` and `roles`)

## Steps (TDD)

### 1. Write failing tests for identity_types condition

```typescript
// tests/acl.test.ts
import { describe, it, expect } from 'vitest';
import { ACL } from '../src/acl.js';
import type { ACLRule } from '../src/acl.js';
import type { Context } from '../src/context.js';

// Helper to create a minimal mock context
function mockContext(overrides: {
  identityType?: string;
  identityRoles?: string[];
  callChainLength?: number;
} = {}): Context {
  return {
    identity: overrides.identityType !== undefined ? {
      id: 'test-user',
      type: overrides.identityType,
      roles: overrides.identityRoles ?? [],
      attrs: {},
    } : null,
    callChain: Array(overrides.callChainLength ?? 0).fill('module'),
  } as unknown as Context;
}

describe('_checkConditions via check()', () => {
  describe('identity_types condition', () => {
    const rules: ACLRule[] = [
      {
        callers: ['*'],
        targets: ['admin.*'],
        effect: 'allow',
        description: 'Allow system callers',
        conditions: { identity_types: ['system', 'service'] },
      },
    ];

    it('should allow when identity type matches', () => {
      const acl = new ACL(rules);
      const ctx = mockContext({ identityType: 'system' });
      expect(acl.check('moduleA', 'admin.panel', ctx)).toBe(true);
    });

    it('should deny when identity type does not match', () => {
      const acl = new ACL(rules);
      const ctx = mockContext({ identityType: 'user' });
      expect(acl.check('moduleA', 'admin.panel', ctx)).toBe(false);
    });

    it('should deny when identity is null', () => {
      const acl = new ACL(rules);
      const ctx = { identity: null, callChain: [] } as unknown as Context;
      expect(acl.check('moduleA', 'admin.panel', ctx)).toBe(false);
    });
  });
});
```

### 2. Write failing tests for roles condition

```typescript
  describe('roles condition', () => {
    const rules: ACLRule[] = [
      {
        callers: ['*'],
        targets: ['admin.*'],
        effect: 'allow',
        description: 'Allow admin role',
        conditions: { roles: ['admin', 'superadmin'] },
      },
    ];

    it('should allow when identity has at least one matching role', () => {
      const acl = new ACL(rules);
      const ctx = mockContext({ identityType: 'user', identityRoles: ['admin'] });
      expect(acl.check('moduleA', 'admin.panel', ctx)).toBe(true);
    });

    it('should deny when identity has no matching roles', () => {
      const acl = new ACL(rules);
      const ctx = mockContext({ identityType: 'user', identityRoles: ['viewer'] });
      expect(acl.check('moduleA', 'admin.panel', ctx)).toBe(false);
    });

    it('should deny when identity is null', () => {
      const acl = new ACL(rules);
      const ctx = { identity: null, callChain: [] } as unknown as Context;
      expect(acl.check('moduleA', 'admin.panel', ctx)).toBe(false);
    });
  });
```

### 3. Write failing tests for max_call_depth condition

```typescript
  describe('max_call_depth condition', () => {
    const rules: ACLRule[] = [
      {
        callers: ['*'],
        targets: ['recursive.*'],
        effect: 'allow',
        description: 'Allow with depth limit',
        conditions: { max_call_depth: 3 },
      },
    ];

    it('should allow when call chain is within limit', () => {
      const acl = new ACL(rules);
      const ctx = mockContext({ identityType: 'user', callChainLength: 2 });
      expect(acl.check('moduleA', 'recursive.handler', ctx)).toBe(true);
    });

    it('should allow when call chain is exactly at limit', () => {
      const acl = new ACL(rules);
      const ctx = mockContext({ identityType: 'user', callChainLength: 3 });
      expect(acl.check('moduleA', 'recursive.handler', ctx)).toBe(true);
    });

    it('should deny when call chain exceeds limit', () => {
      const acl = new ACL(rules);
      const ctx = mockContext({ identityType: 'user', callChainLength: 4 });
      expect(acl.check('moduleA', 'recursive.handler', ctx)).toBe(false);
    });
  });
```

### 4. Write failing tests for AND logic across multiple conditions

```typescript
  describe('AND logic across conditions', () => {
    const rules: ACLRule[] = [
      {
        callers: ['*'],
        targets: ['sensitive.*'],
        effect: 'allow',
        description: 'Require admin role AND system type AND depth <= 2',
        conditions: {
          identity_types: ['system'],
          roles: ['admin'],
          max_call_depth: 2,
        },
      },
    ];

    it('should allow when all conditions pass', () => {
      const acl = new ACL(rules);
      const ctx = mockContext({ identityType: 'system', identityRoles: ['admin'], callChainLength: 1 });
      expect(acl.check('moduleA', 'sensitive.data', ctx)).toBe(true);
    });

    it('should deny when one condition fails (wrong type)', () => {
      const acl = new ACL(rules);
      const ctx = mockContext({ identityType: 'user', identityRoles: ['admin'], callChainLength: 1 });
      expect(acl.check('moduleA', 'sensitive.data', ctx)).toBe(false);
    });

    it('should deny when one condition fails (wrong role)', () => {
      const acl = new ACL(rules);
      const ctx = mockContext({ identityType: 'system', identityRoles: ['viewer'], callChainLength: 1 });
      expect(acl.check('moduleA', 'sensitive.data', ctx)).toBe(false);
    });

    it('should deny when one condition fails (depth exceeded)', () => {
      const acl = new ACL(rules);
      const ctx = mockContext({ identityType: 'system', identityRoles: ['admin'], callChainLength: 5 });
      expect(acl.check('moduleA', 'sensitive.data', ctx)).toBe(false);
    });
  });
```

### 5. Write failing test for null context with conditions

```typescript
  describe('null context with conditions', () => {
    it('should deny when context is null and conditions are present', () => {
      const rules: ACLRule[] = [
        {
          callers: ['*'],
          targets: ['*'],
          effect: 'allow',
          description: 'conditional rule',
          conditions: { roles: ['admin'] },
        },
      ];
      const acl = new ACL(rules);
      expect(acl.check('moduleA', 'moduleB', null)).toBe(false);
    });
  });
```

### 6. Implement _checkConditions()

```typescript
private _checkConditions(conditions: Record<string, unknown>, context: Context | null): boolean {
  // Null context cannot satisfy any conditions
  if (context === null) return false;

  // identity_types: caller's identity.type must be in the list
  if ('identity_types' in conditions) {
    const types = conditions['identity_types'] as string[];
    if (context.identity === null || !types.includes(context.identity.type)) return false;
  }

  // roles: caller's identity must have at least one matching role (OR within roles, AND with other conditions)
  if ('roles' in conditions) {
    const roles = conditions['roles'] as string[];
    if (context.identity === null) return false;
    const identityRoles = new Set(context.identity.roles);
    if (!roles.some((r) => identityRoles.has(r))) return false;
  }

  // max_call_depth: call chain length must not exceed the limit
  if ('max_call_depth' in conditions) {
    const maxDepth = conditions['max_call_depth'] as number;
    if (context.callChain.length > maxDepth) return false;
  }

  return true;
}
```

### 7. Run full test suite and type-check

Run `tsc --noEmit` and `vitest` to confirm everything passes.

## Acceptance Criteria

- [x] `_checkConditions()` returns `false` when context is `null`
- [x] `identity_types` condition checks `context.identity.type` is in the allowed list
- [x] `identity_types` returns `false` when `context.identity` is `null`
- [x] `roles` condition checks that at least one role in the condition list matches a role in `context.identity.roles` (OR within roles)
- [x] `roles` returns `false` when `context.identity` is `null`
- [x] `roles` uses `Set` for efficient lookup on the identity's roles
- [x] `max_call_depth` condition checks `context.callChain.length <= maxDepth`
- [x] Multiple conditions use AND logic: all present conditions must pass
- [x] Unknown condition keys are silently ignored (forward-compatible)
- [x] All tests pass with `vitest`; zero errors from `tsc --noEmit`

## Dependencies

- **acl-rule** -- ACLRule interface (conditions field definition)

## Estimated Time

2 hours
