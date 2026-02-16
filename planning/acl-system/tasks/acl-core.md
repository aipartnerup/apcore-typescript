# Task: ACL Class with check(), addRule(), removeRule()

## Goal

Implement the `ACL` class that manages an ordered list of `ACLRule` objects and provides first-match-wins permission evaluation via `check()`, runtime rule mutation via `addRule()` and `removeRule()`, and a configurable default effect.

## Files Involved

- `src/acl.ts` -- ACL class implementation (~188 lines total including YAML loading)
- `src/errors.ts` -- `ACLDeniedError` (used by executor, not ACL directly)
- `src/context.ts` -- `Context` and `Identity` types consumed by `check()`

## Steps (TDD)

### 1. Write failing tests for ACL constructor and default behavior

```typescript
// tests/acl.test.ts
import { describe, it, expect } from 'vitest';
import { ACL } from '../src/acl.js';
import type { ACLRule } from '../src/acl.js';

describe('ACL constructor', () => {
  it('should default to deny when no rules match', () => {
    const acl = new ACL([]);
    expect(acl.check('moduleA', 'moduleB')).toBe(false);
  });

  it('should respect custom default effect', () => {
    const acl = new ACL([], 'allow');
    expect(acl.check('moduleA', 'moduleB')).toBe(true);
  });
});
```

### 2. Implement constructor with rules copy and default effect

```typescript
export class ACL {
  private _rules: ACLRule[];
  private _defaultEffect: string;

  constructor(rules: ACLRule[], defaultEffect: string = 'deny') {
    this._rules = [...rules];
    this._defaultEffect = defaultEffect;
  }
}
```

### 3. Write failing tests for check() first-match-wins

```typescript
describe('ACL.check()', () => {
  it('should allow when first matching rule has allow effect', () => {
    const rules: ACLRule[] = [
      { callers: ['moduleA'], targets: ['moduleB'], effect: 'allow', description: 'test' },
    ];
    const acl = new ACL(rules);
    expect(acl.check('moduleA', 'moduleB')).toBe(true);
  });

  it('should deny when first matching rule has deny effect', () => {
    const rules: ACLRule[] = [
      { callers: ['moduleA'], targets: ['moduleB'], effect: 'deny', description: 'test' },
    ];
    const acl = new ACL(rules);
    expect(acl.check('moduleA', 'moduleB')).toBe(false);
  });

  it('should normalize null caller to @external', () => {
    const rules: ACLRule[] = [
      { callers: ['@external'], targets: ['auth'], effect: 'allow', description: 'test' },
    ];
    const acl = new ACL(rules);
    expect(acl.check(null, 'auth')).toBe(true);
  });

  it('should use first matching rule and ignore later rules', () => {
    const rules: ACLRule[] = [
      { callers: ['moduleA'], targets: ['moduleB'], effect: 'deny', description: 'deny first' },
      { callers: ['moduleA'], targets: ['moduleB'], effect: 'allow', description: 'allow second' },
    ];
    const acl = new ACL(rules);
    expect(acl.check('moduleA', 'moduleB')).toBe(false);
  });

  it('should fall through to default when no rules match', () => {
    const rules: ACLRule[] = [
      { callers: ['moduleX'], targets: ['moduleY'], effect: 'allow', description: 'unrelated' },
    ];
    const acl = new ACL(rules, 'deny');
    expect(acl.check('moduleA', 'moduleB')).toBe(false);
  });
});
```

### 4. Implement check() with _matchesRule and _matchPattern

```typescript
check(callerId: string | null, targetId: string, context?: Context | null): boolean {
  const effectiveCaller = callerId === null ? '@external' : callerId;
  const rules = [...this._rules];

  for (const rule of rules) {
    if (this._matchesRule(rule, effectiveCaller, targetId, context ?? null)) {
      return rule.effect === 'allow';
    }
  }

  return this._defaultEffect === 'allow';
}

private _matchPattern(pattern: string, value: string, context: Context | null): boolean {
  if (pattern === '@external') return value === '@external';
  if (pattern === '@system') {
    return context !== null && context.identity !== null && context.identity.type === 'system';
  }
  return matchPattern(pattern, value);
}

private _matchesRule(rule: ACLRule, caller: string, target: string, context: Context | null): boolean {
  const callerMatch = rule.callers.some((p) => this._matchPattern(p, caller, context));
  if (!callerMatch) return false;

  const targetMatch = rule.targets.some((p) => this._matchPattern(p, target, context));
  if (!targetMatch) return false;

  if (rule.conditions != null) {
    if (!this._checkConditions(rule.conditions, context)) return false;
  }

  return true;
}
```

### 5. Write failing tests for addRule() and removeRule()

```typescript
describe('ACL.addRule()', () => {
  it('should prepend rule to beginning of list', () => {
    const acl = new ACL([
      { callers: ['*'], targets: ['*'], effect: 'deny', description: 'deny all' },
    ]);
    acl.addRule({ callers: ['moduleA'], targets: ['moduleB'], effect: 'allow', description: 'allow A->B' });
    // New rule is first, so it should match before the deny-all
    expect(acl.check('moduleA', 'moduleB')).toBe(true);
  });
});

describe('ACL.removeRule()', () => {
  it('should remove rule matching callers and targets', () => {
    const acl = new ACL([
      { callers: ['moduleA'], targets: ['moduleB'], effect: 'allow', description: 'test' },
    ]);
    const removed = acl.removeRule(['moduleA'], ['moduleB']);
    expect(removed).toBe(true);
    expect(acl.check('moduleA', 'moduleB')).toBe(false); // falls to default deny
  });

  it('should return false when no matching rule found', () => {
    const acl = new ACL([]);
    expect(acl.removeRule(['moduleA'], ['moduleB'])).toBe(false);
  });

  it('should use JSON.stringify for array comparison', () => {
    const acl = new ACL([
      { callers: ['a', 'b'], targets: ['c'], effect: 'allow', description: 'test' },
    ]);
    // Different order should not match
    expect(acl.removeRule(['b', 'a'], ['c'])).toBe(false);
    // Same order should match
    expect(acl.removeRule(['a', 'b'], ['c'])).toBe(true);
  });
});
```

### 6. Implement addRule() and removeRule()

```typescript
addRule(rule: ACLRule): void {
  this._rules.unshift(rule);
}

removeRule(callers: string[], targets: string[]): boolean {
  for (let i = 0; i < this._rules.length; i++) {
    const rule = this._rules[i];
    if (
      JSON.stringify(rule.callers) === JSON.stringify(callers) &&
      JSON.stringify(rule.targets) === JSON.stringify(targets)
    ) {
      this._rules.splice(i, 1);
      return true;
    }
  }
  return false;
}
```

### 7. Run full test suite and type-check

Run `tsc --noEmit` and `vitest` to confirm everything passes.

## Acceptance Criteria

- [x] `ACL` constructor accepts `rules` array and optional `defaultEffect` (default `'deny'`)
- [x] Constructor shallow-copies the rules array to prevent external mutation
- [x] `check()` returns `boolean` using first-match-wins evaluation
- [x] Null `callerId` is normalized to `'@external'`
- [x] `@external` pattern matches only the `@external` sentinel value
- [x] `@system` pattern checks `context.identity.type === 'system'`
- [x] Non-special patterns delegate to `matchPattern()` from `utils/pattern.ts`
- [x] Falls through to `_defaultEffect` when no rule matches
- [x] `addRule()` prepends the rule to the beginning of the list
- [x] `removeRule()` uses `JSON.stringify` for caller/target array comparison and returns `boolean`
- [x] `removeRule()` only removes the first matching rule
- [x] All tests pass with `vitest`; zero errors from `tsc --noEmit`

## Dependencies

- **acl-rule** -- ACLRule interface definition
- **pattern-matching** -- matchPattern() utility
- **conditional-rules** -- _checkConditions() method

## Estimated Time

3 hours
