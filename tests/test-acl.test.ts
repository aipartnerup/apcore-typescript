import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ACL } from '../src/acl.js';
import { ACLRuleError, ConfigNotFoundError } from '../src/errors.js';
import { Context, createIdentity } from '../src/context.js';

function makeContext(opts: {
  callerId?: string | null;
  callChain?: string[];
  identityType?: string;
  roles?: string[];
} = {}): Context {
  const identity = opts.identityType
    ? createIdentity('test-user', opts.identityType, opts.roles ?? [])
    : null;
  return new Context(
    'trace-test',
    opts.callerId ?? null,
    opts.callChain ?? [],
    null,
    identity,
  );
}

describe('ACL', () => {
  it('allows access when allow rule matches', () => {
    const acl = new ACL([
      { callers: ['module.a'], targets: ['module.b'], effect: 'allow', description: '' },
    ]);
    expect(acl.check('module.a', 'module.b')).toBe(true);
  });

  it('denies access when deny rule matches', () => {
    const acl = new ACL([
      { callers: ['module.a'], targets: ['module.b'], effect: 'deny', description: '' },
    ]);
    expect(acl.check('module.a', 'module.b')).toBe(false);
  });

  it('returns default deny when no rule matches', () => {
    const acl = new ACL([
      { callers: ['module.a'], targets: ['module.b'], effect: 'allow', description: '' },
    ]);
    expect(acl.check('module.x', 'module.y')).toBe(false);
  });

  it('first-match-wins: deny before allow', () => {
    const acl = new ACL([
      { callers: ['module.a'], targets: ['module.b'], effect: 'deny', description: '' },
      { callers: ['module.a'], targets: ['module.b'], effect: 'allow', description: '' },
    ]);
    expect(acl.check('module.a', 'module.b')).toBe(false);
  });

  it('first-match-wins: allow before deny', () => {
    const acl = new ACL([
      { callers: ['module.a'], targets: ['module.b'], effect: 'allow', description: '' },
      { callers: ['module.a'], targets: ['module.b'], effect: 'deny', description: '' },
    ]);
    expect(acl.check('module.a', 'module.b')).toBe(true);
  });

  it('default effect allow when no rules match', () => {
    const acl = new ACL([], 'allow');
    expect(acl.check('any', 'thing')).toBe(true);
  });

  it('maps null callerId to @external', () => {
    const acl = new ACL([
      { callers: ['@external'], targets: ['public.api'], effect: 'allow', description: '' },
    ]);
    expect(acl.check(null, 'public.api')).toBe(true);
  });

  it('does not match @external for real module caller', () => {
    const acl = new ACL([
      { callers: ['@external'], targets: ['public.api'], effect: 'allow', description: '' },
    ]);
    expect(acl.check('module.a', 'public.api')).toBe(false);
  });

  it('wildcard * matches all callers', () => {
    const acl = new ACL([
      { callers: ['*'], targets: ['public.api'], effect: 'allow', description: '' },
    ]);
    expect(acl.check('module.a', 'public.api')).toBe(true);
    expect(acl.check('module.b', 'public.api')).toBe(true);
  });

  it('wildcard * matches all targets', () => {
    const acl = new ACL([
      { callers: ['module.admin'], targets: ['*'], effect: 'allow', description: '' },
    ]);
    expect(acl.check('module.admin', 'anything')).toBe(true);
  });

  it('prefix wildcard matching', () => {
    const acl = new ACL([
      { callers: ['core.*'], targets: ['data.*'], effect: 'allow', description: '' },
    ]);
    expect(acl.check('core.auth', 'data.store')).toBe(true);
    expect(acl.check('other.x', 'data.y')).toBe(false);
  });

  it('@system matches system identity type', () => {
    const acl = new ACL([
      { callers: ['@system'], targets: ['*'], effect: 'allow', description: '' },
    ]);
    const ctx = makeContext({ identityType: 'system' });
    expect(acl.check('any.module', 'any.target', ctx)).toBe(true);
  });

  it('@system does not match non-system identity', () => {
    const acl = new ACL([
      { callers: ['@system'], targets: ['*'], effect: 'allow', description: '' },
    ]);
    const ctx = makeContext({ identityType: 'user' });
    expect(acl.check('any.module', 'any.target', ctx)).toBe(false);
  });

  it('conditions: identity_types allows matching type', () => {
    const acl = new ACL([{
      callers: ['*'], targets: ['admin'], effect: 'allow', description: '',
      conditions: { identity_types: ['admin'] },
    }]);
    const ctx = makeContext({ identityType: 'admin' });
    expect(acl.check('mod.a', 'admin', ctx)).toBe(true);
  });

  it('conditions: identity_types denies non-matching type', () => {
    const acl = new ACL([{
      callers: ['*'], targets: ['admin'], effect: 'allow', description: '',
      conditions: { identity_types: ['admin'] },
    }]);
    const ctx = makeContext({ identityType: 'user' });
    expect(acl.check('mod.a', 'admin', ctx)).toBe(false);
  });

  it('conditions: roles allows matching role', () => {
    const acl = new ACL([{
      callers: ['*'], targets: ['settings'], effect: 'allow', description: '',
      conditions: { roles: ['editor', 'admin'] },
    }]);
    const ctx = makeContext({ identityType: 'user', roles: ['editor'] });
    expect(acl.check('mod.a', 'settings', ctx)).toBe(true);
  });

  it('conditions: roles denies missing role', () => {
    const acl = new ACL([{
      callers: ['*'], targets: ['settings'], effect: 'allow', description: '',
      conditions: { roles: ['admin'] },
    }]);
    const ctx = makeContext({ identityType: 'user', roles: ['viewer'] });
    expect(acl.check('mod.a', 'settings', ctx)).toBe(false);
  });

  it('conditions: max_call_depth allows within limit', () => {
    const acl = new ACL([{
      callers: ['*'], targets: ['deep'], effect: 'allow', description: '',
      conditions: { max_call_depth: 3 },
    }]);
    const ctx = makeContext({ callChain: ['a', 'b'] });
    expect(acl.check('mod.a', 'deep', ctx)).toBe(true);
  });

  it('conditions: max_call_depth denies exceeding limit', () => {
    const acl = new ACL([{
      callers: ['*'], targets: ['deep'], effect: 'allow', description: '',
      conditions: { max_call_depth: 2 },
    }]);
    const ctx = makeContext({ callChain: ['a', 'b', 'c'] });
    expect(acl.check('mod.a', 'deep', ctx)).toBe(false);
  });

  it('conditions fail when no context provided', () => {
    const acl = new ACL([{
      callers: ['*'], targets: ['deep'], effect: 'allow', description: '',
      conditions: { max_call_depth: 5 },
    }]);
    expect(acl.check('mod.a', 'deep')).toBe(false);
  });

  it('addRule adds to highest priority', () => {
    const acl = new ACL([
      { callers: ['*'], targets: ['*'], effect: 'deny', description: '' },
    ]);
    expect(acl.check('mod.a', 'mod.b')).toBe(false);

    acl.addRule({ callers: ['mod.a'], targets: ['mod.b'], effect: 'allow', description: '' });
    expect(acl.check('mod.a', 'mod.b')).toBe(true);
  });

  it('removeRule removes matching rule', () => {
    const acl = new ACL([
      { callers: ['mod.a'], targets: ['mod.b'], effect: 'allow', description: '' },
    ]);
    expect(acl.check('mod.a', 'mod.b')).toBe(true);

    const removed = acl.removeRule(['mod.a'], ['mod.b']);
    expect(removed).toBe(true);
    expect(acl.check('mod.a', 'mod.b')).toBe(false);
  });

  it('removeRule returns false when no match', () => {
    const acl = new ACL([]);
    expect(acl.removeRule(['x'], ['y'])).toBe(false);
  });
});

describe('ACL.load', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'acl-test-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('loads valid ACL from a YAML file', () => {
    const yamlContent = `
rules:
  - callers: ["module.a"]
    targets: ["module.b"]
    effect: allow
    description: "allow a to b"
`;
    const filePath = join(tmpDir, 'acl.yaml');
    writeFileSync(filePath, yamlContent, 'utf-8');

    const acl = ACL.load(filePath);
    expect(acl.check('module.a', 'module.b')).toBe(true);
    expect(acl.check('module.x', 'module.y')).toBe(false);
  });

  it('loads ACL with custom default_effect from YAML', () => {
    const yamlContent = `
default_effect: allow
rules: []
`;
    const filePath = join(tmpDir, 'acl.yaml');
    writeFileSync(filePath, yamlContent, 'utf-8');

    const acl = ACL.load(filePath);
    expect(acl.check('any.caller', 'any.target')).toBe(true);
  });

  it('throws ConfigNotFoundError for missing file', () => {
    const missingPath = join(tmpDir, 'nonexistent.yaml');
    expect(() => ACL.load(missingPath)).toThrow(ConfigNotFoundError);
  });

  it('throws ACLRuleError for invalid YAML syntax', () => {
    const filePath = join(tmpDir, 'bad.yaml');
    writeFileSync(filePath, ':\n  :\n    - [invalid', 'utf-8');

    expect(() => ACL.load(filePath)).toThrow(ACLRuleError);
  });

  it('throws ACLRuleError when YAML is not a mapping', () => {
    const filePath = join(tmpDir, 'array.yaml');
    writeFileSync(filePath, '- item1\n- item2\n', 'utf-8');

    expect(() => ACL.load(filePath)).toThrow(ACLRuleError);
    expect(() => ACL.load(filePath)).toThrow(/must be a mapping/);
  });

  it('throws ACLRuleError when YAML is a scalar', () => {
    const filePath = join(tmpDir, 'scalar.yaml');
    writeFileSync(filePath, 'just a string\n', 'utf-8');

    expect(() => ACL.load(filePath)).toThrow(ACLRuleError);
    expect(() => ACL.load(filePath)).toThrow(/must be a mapping/);
  });

  it('throws ACLRuleError when rules key is missing', () => {
    const filePath = join(tmpDir, 'norules.yaml');
    writeFileSync(filePath, 'default_effect: allow\n', 'utf-8');

    expect(() => ACL.load(filePath)).toThrow(ACLRuleError);
    expect(() => ACL.load(filePath)).toThrow(/missing required 'rules' key/);
  });

  it('throws ACLRuleError when rules is not an array', () => {
    const filePath = join(tmpDir, 'badrules.yaml');
    writeFileSync(filePath, 'rules: "not-a-list"\n', 'utf-8');

    expect(() => ACL.load(filePath)).toThrow(ACLRuleError);
    expect(() => ACL.load(filePath)).toThrow(/'rules' must be a list/);
  });

  it('loads ACL with multiple rules and conditions', () => {
    const yamlContent = `
rules:
  - callers: ["*"]
    targets: ["admin.panel"]
    effect: allow
    description: "admin access"
    conditions:
      roles: ["admin"]
  - callers: ["*"]
    targets: ["*"]
    effect: deny
    description: "deny all"
`;
    const filePath = join(tmpDir, 'multi.yaml');
    writeFileSync(filePath, yamlContent, 'utf-8');

    const acl = ACL.load(filePath);
    const adminCtx = makeContext({ identityType: 'user', roles: ['admin'] });
    const userCtx = makeContext({ identityType: 'user', roles: ['viewer'] });

    expect(acl.check('mod.a', 'admin.panel', adminCtx)).toBe(true);
    expect(acl.check('mod.a', 'admin.panel', userCtx)).toBe(false);
  });
});

describe('ACL.reload', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'acl-reload-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('reloads updated rules from the same YAML file', () => {
    const filePath = join(tmpDir, 'acl.yaml');
    writeFileSync(filePath, `
rules:
  - callers: ["module.a"]
    targets: ["module.b"]
    effect: deny
    description: "initial deny"
`, 'utf-8');

    const acl = ACL.load(filePath);
    expect(acl.check('module.a', 'module.b')).toBe(false);

    writeFileSync(filePath, `
rules:
  - callers: ["module.a"]
    targets: ["module.b"]
    effect: allow
    description: "updated allow"
`, 'utf-8');

    acl.reload();
    expect(acl.check('module.a', 'module.b')).toBe(true);
  });

  it('throws ACLRuleError when ACL was not loaded from a file', () => {
    const acl = new ACL([
      { callers: ['*'], targets: ['*'], effect: 'allow', description: '' },
    ]);

    expect(() => acl.reload()).toThrow(ACLRuleError);
    expect(() => acl.reload()).toThrow(/Cannot reload/);
  });
});

describe('ACL constructor validation', () => {
  it('throws ACLRuleError for invalid defaultEffect', () => {
    expect(() => new ACL([], 'block')).toThrow(ACLRuleError);
    expect(() => new ACL([], 'block')).toThrow(/Invalid default_effect/);
  });

  it('throws ACLRuleError for empty string defaultEffect', () => {
    expect(() => new ACL([], '')).toThrow(ACLRuleError);
  });
});

describe('ACL condition validation', () => {
  it('returns false when identity_types condition is not an array', () => {
    const acl = new ACL([{
      callers: ['*'], targets: ['target'], effect: 'allow', description: '',
      conditions: { identity_types: 'admin' },
    }]);
    const ctx = makeContext({ identityType: 'admin' });
    expect(acl.check('mod.a', 'target', ctx)).toBe(false);
  });

  it('returns false when roles condition is not an array', () => {
    const acl = new ACL([{
      callers: ['*'], targets: ['target'], effect: 'allow', description: '',
      conditions: { roles: 'admin' },
    }]);
    const ctx = makeContext({ identityType: 'user', roles: ['admin'] });
    expect(acl.check('mod.a', 'target', ctx)).toBe(false);
  });

  it('returns false when max_call_depth condition is not a number', () => {
    const acl = new ACL([{
      callers: ['*'], targets: ['target'], effect: 'allow', description: '',
      conditions: { max_call_depth: '5' },
    }]);
    const ctx = makeContext({ callChain: ['a'] });
    expect(acl.check('mod.a', 'target', ctx)).toBe(false);
  });

  it('returns false for roles condition when identity is null', () => {
    const acl = new ACL([{
      callers: ['*'], targets: ['target'], effect: 'allow', description: '',
      conditions: { roles: ['admin'] },
    }]);
    const ctx = makeContext({});
    expect(acl.check('mod.a', 'target', ctx)).toBe(false);
  });

  it('returns false for identity_types condition when identity is null', () => {
    const acl = new ACL([{
      callers: ['*'], targets: ['target'], effect: 'allow', description: '',
      conditions: { identity_types: ['admin'] },
    }]);
    const ctx = makeContext({});
    expect(acl.check('mod.a', 'target', ctx)).toBe(false);
  });
});
