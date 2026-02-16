# Task: ACL.load() from YAML and reload() Support

## Goal

Implement the static `ACL.load()` factory method that parses YAML configuration files into a validated `ACL` instance, and the `reload()` instance method that re-reads the original YAML file to hot-swap rules without reconstructing the ACL object.

## Files Involved

- `src/acl.ts` -- `ACL.load()` static method and `reload()` instance method
- `src/errors.ts` -- `ACLRuleError` (invalid YAML/structure), `ConfigNotFoundError` (missing file)

## Steps (TDD)

### 1. Write failing tests for ACL.load() valid YAML

```typescript
// tests/acl.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { ACL } from '../src/acl.js';
import { ACLRuleError, ConfigNotFoundError } from '../src/errors.js';

describe('ACL.load()', () => {
  const tmpDir = '/tmp/acl-test';
  const yamlPath = `${tmpDir}/acl.yaml`;

  beforeEach(() => {
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    try { unlinkSync(yamlPath); } catch {}
  });

  it('should load valid YAML with rules and default_effect', () => {
    writeFileSync(yamlPath, `
default_effect: allow
rules:
  - callers: ["moduleA"]
    targets: ["moduleB"]
    effect: allow
    description: "Allow A to B"
`);
    const acl = ACL.load(yamlPath);
    expect(acl.check('moduleA', 'moduleB')).toBe(true);
    expect(acl.check('moduleX', 'moduleY')).toBe(true); // default allow
  });

  it('should default to deny when default_effect is not specified', () => {
    writeFileSync(yamlPath, `
rules:
  - callers: ["moduleA"]
    targets: ["moduleB"]
    effect: allow
    description: "test"
`);
    const acl = ACL.load(yamlPath);
    expect(acl.check('moduleX', 'moduleY')).toBe(false);
  });

  it('should load rules with conditions', () => {
    writeFileSync(yamlPath, `
rules:
  - callers: ["*"]
    targets: ["admin.*"]
    effect: allow
    description: "Admin access with role check"
    conditions:
      roles: ["admin"]
`);
    const acl = ACL.load(yamlPath);
    // Without context, conditions fail
    expect(acl.check('moduleA', 'admin.panel')).toBe(false);
  });
});
```

### 2. Write failing tests for ACL.load() error cases

```typescript
describe('ACL.load() error handling', () => {
  it('should throw ConfigNotFoundError for missing file', () => {
    expect(() => ACL.load('/nonexistent/acl.yaml')).toThrow(ConfigNotFoundError);
  });

  it('should throw ACLRuleError for invalid YAML', () => {
    writeFileSync(yamlPath, '{ invalid yaml :::');
    expect(() => ACL.load(yamlPath)).toThrow(ACLRuleError);
  });

  it('should throw ACLRuleError when rules key is missing', () => {
    writeFileSync(yamlPath, 'default_effect: allow\n');
    expect(() => ACL.load(yamlPath)).toThrow(ACLRuleError);
  });

  it('should throw ACLRuleError for invalid effect value', () => {
    writeFileSync(yamlPath, `
rules:
  - callers: ["*"]
    targets: ["*"]
    effect: maybe
    description: "bad effect"
`);
    expect(() => ACL.load(yamlPath)).toThrow(ACLRuleError);
  });

  it('should throw ACLRuleError when rule is not a mapping', () => {
    writeFileSync(yamlPath, `
rules:
  - "not a mapping"
`);
    expect(() => ACL.load(yamlPath)).toThrow(ACLRuleError);
  });

  it('should throw ACLRuleError when rule is missing required keys', () => {
    writeFileSync(yamlPath, `
rules:
  - callers: ["*"]
    description: "missing targets and effect"
`);
    expect(() => ACL.load(yamlPath)).toThrow(ACLRuleError);
  });
});
```

### 3. Implement ACL.load() static method

```typescript
static load(yamlPath: string): ACL {
  if (!existsSync(yamlPath)) {
    throw new ConfigNotFoundError(yamlPath);
  }

  let data: unknown;
  try {
    const content = readFileSync(yamlPath, 'utf-8');
    data = yaml.load(content);
  } catch (e) {
    if (e instanceof ConfigNotFoundError) throw e;
    throw new ACLRuleError(`Invalid YAML in ${yamlPath}: ${e}`);
  }

  // Validate top-level structure
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new ACLRuleError(`ACL config must be a mapping, got ${typeof data}`);
  }

  const dataObj = data as Record<string, unknown>;
  if (!('rules' in dataObj)) {
    throw new ACLRuleError("ACL config missing required 'rules' key");
  }

  const rawRules = dataObj['rules'];
  if (!Array.isArray(rawRules)) {
    throw new ACLRuleError(`'rules' must be a list, got ${typeof rawRules}`);
  }

  const defaultEffect = (dataObj['default_effect'] as string) ?? 'deny';
  const rules: ACLRule[] = [];

  for (let i = 0; i < rawRules.length; i++) {
    const rawRule = rawRules[i];
    // Validate each rule is a mapping with required keys
    if (typeof rawRule !== 'object' || rawRule === null || Array.isArray(rawRule)) {
      throw new ACLRuleError(`Rule ${i} must be a mapping, got ${typeof rawRule}`);
    }

    const ruleObj = rawRule as Record<string, unknown>;
    for (const key of ['callers', 'targets', 'effect']) {
      if (!(key in ruleObj)) {
        throw new ACLRuleError(`Rule ${i} missing required key '${key}'`);
      }
    }

    const effect = ruleObj['effect'] as string;
    if (effect !== 'allow' && effect !== 'deny') {
      throw new ACLRuleError(`Rule ${i} has invalid effect '${effect}', must be 'allow' or 'deny'`);
    }

    rules.push({
      callers: ruleObj['callers'] as string[],
      targets: ruleObj['targets'] as string[],
      effect,
      description: (ruleObj['description'] as string) ?? '',
      conditions: (ruleObj['conditions'] as Record<string, unknown>) ?? null,
    });
  }

  const acl = new ACL(rules, defaultEffect);
  acl._yamlPath = yamlPath;
  return acl;
}
```

### 4. Write failing tests for reload()

```typescript
describe('ACL.reload()', () => {
  it('should reload rules from the original YAML path', () => {
    writeFileSync(yamlPath, `
rules:
  - callers: ["moduleA"]
    targets: ["moduleB"]
    effect: deny
    description: "initial deny"
`);
    const acl = ACL.load(yamlPath);
    expect(acl.check('moduleA', 'moduleB')).toBe(false);

    // Update YAML
    writeFileSync(yamlPath, `
rules:
  - callers: ["moduleA"]
    targets: ["moduleB"]
    effect: allow
    description: "updated allow"
`);
    acl.reload();
    expect(acl.check('moduleA', 'moduleB')).toBe(true);
  });

  it('should throw ACLRuleError when not loaded from YAML', () => {
    const acl = new ACL([]);
    expect(() => acl.reload()).toThrow(ACLRuleError);
    expect(() => acl.reload()).toThrow('Cannot reload: ACL was not loaded from a YAML file');
  });
});
```

### 5. Implement reload() method

```typescript
reload(): void {
  if (this._yamlPath === null) {
    throw new ACLRuleError('Cannot reload: ACL was not loaded from a YAML file');
  }
  const reloaded = ACL.load(this._yamlPath);
  this._rules = reloaded._rules;
  this._defaultEffect = reloaded._defaultEffect;
}
```

### 6. Run full test suite and type-check

Run `tsc --noEmit` and `vitest` to confirm everything passes.

## Acceptance Criteria

- [x] `ACL.load()` reads YAML via `readFileSync` and parses with `js-yaml`
- [x] Throws `ConfigNotFoundError` when the YAML file does not exist
- [x] Throws `ACLRuleError` for invalid YAML syntax
- [x] Throws `ACLRuleError` when top-level structure is not a mapping
- [x] Throws `ACLRuleError` when `rules` key is missing
- [x] Throws `ACLRuleError` when `rules` is not an array
- [x] Validates each rule has `callers`, `targets`, and `effect` keys
- [x] Validates `effect` is either `'allow'` or `'deny'`
- [x] Validates `callers` and `targets` are arrays
- [x] Defaults `description` to empty string and `conditions` to `null`
- [x] Defaults `default_effect` to `'deny'` when not specified in YAML
- [x] Stores `_yamlPath` on the ACL instance for `reload()` support
- [x] `reload()` re-reads the YAML and replaces `_rules` and `_defaultEffect` in-place
- [x] `reload()` throws `ACLRuleError` when the ACL was not loaded from YAML
- [x] All tests pass with `vitest`; zero errors from `tsc --noEmit`

## Dependencies

- **acl-core** -- ACL class constructor and rule storage

## Estimated Time

2 hours
