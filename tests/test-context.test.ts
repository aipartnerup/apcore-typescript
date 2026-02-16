import { describe, it, expect } from 'vitest';
import { Context, createIdentity } from '../src/context.js';
import type { Identity } from '../src/context.js';

describe('createIdentity', () => {
  it('creates identity with defaults', () => {
    const id = createIdentity('user1');
    expect(id.id).toBe('user1');
    expect(id.type).toBe('user');
    expect(id.roles).toEqual([]);
    expect(id.attrs).toEqual({});
  });

  it('creates identity with all fields', () => {
    const id = createIdentity('admin1', 'admin', ['superuser'], { org: 'acme' });
    expect(id.id).toBe('admin1');
    expect(id.type).toBe('admin');
    expect(id.roles).toEqual(['superuser']);
    expect(id.attrs).toEqual({ org: 'acme' });
  });

  it('returns frozen object', () => {
    const id = createIdentity('u1');
    expect(Object.isFrozen(id)).toBe(true);
    expect(Object.isFrozen(id.roles)).toBe(true);
    expect(Object.isFrozen(id.attrs)).toBe(true);
  });
});

describe('Context.create()', () => {
  it('creates context with unique traceId', () => {
    const ctx1 = Context.create();
    const ctx2 = Context.create();
    expect(ctx1.traceId).toBeDefined();
    expect(ctx2.traceId).toBeDefined();
    expect(ctx1.traceId).not.toBe(ctx2.traceId);
  });

  it('has null callerId by default', () => {
    const ctx = Context.create();
    expect(ctx.callerId).toBeNull();
  });

  it('has empty callChain by default', () => {
    const ctx = Context.create();
    expect(ctx.callChain).toEqual([]);
  });

  it('accepts executor and identity', () => {
    const identity = createIdentity('u1', 'admin');
    const executor = { name: 'test-executor' };
    const ctx = Context.create(executor, identity);
    expect(ctx.executor).toBe(executor);
    expect(ctx.identity).toBe(identity);
  });

  it('defaults identity to null', () => {
    const ctx = Context.create();
    expect(ctx.identity).toBeNull();
  });

  it('defaults executor to null', () => {
    const ctx = Context.create();
    expect(ctx.executor).toBeNull();
  });

  it('defaults data to empty object', () => {
    const ctx = Context.create();
    expect(ctx.data).toEqual({});
  });

  it('accepts custom data', () => {
    const ctx = Context.create(null, null, { key: 'value' });
    expect(ctx.data).toEqual({ key: 'value' });
  });

  it('has null redactedInputs by default', () => {
    const ctx = Context.create();
    expect(ctx.redactedInputs).toBeNull();
  });
});

describe('Context.child()', () => {
  it('preserves traceId from parent', () => {
    const parent = Context.create();
    const child = parent.child('module.a');
    expect(child.traceId).toBe(parent.traceId);
  });

  it('sets callerId to null when parent callChain is empty', () => {
    const parent = Context.create();
    const child = parent.child('module.a');
    expect(child.callerId).toBeNull();
  });

  it('sets callerId to last element of parent callChain', () => {
    const parent = Context.create();
    const child1 = parent.child('module.a');
    expect(child1.callChain).toEqual(['module.a']);

    const child2 = child1.child('module.b');
    expect(child2.callerId).toBe('module.a');
    expect(child2.callChain).toEqual(['module.a', 'module.b']);
  });

  it('builds up callChain through multiple levels', () => {
    const root = Context.create();
    const c1 = root.child('a');
    const c2 = c1.child('b');
    const c3 = c2.child('c');
    expect(c3.callChain).toEqual(['a', 'b', 'c']);
    expect(c3.callerId).toBe('b');
  });

  it('shares data reference with parent', () => {
    const parent = Context.create(null, null, { shared: true });
    const child = parent.child('mod');
    expect(child.data).toBe(parent.data);

    child.data['newKey'] = 'newValue';
    expect(parent.data['newKey']).toBe('newValue');
  });

  it('preserves executor from parent', () => {
    const executor = { id: 'exec' };
    const parent = Context.create(executor);
    const child = parent.child('mod');
    expect(child.executor).toBe(executor);
  });

  it('preserves identity from parent', () => {
    const identity = createIdentity('u1', 'admin', ['role1']);
    const parent = Context.create(null, identity);
    const child = parent.child('mod');
    expect(child.identity).toBe(identity);
  });

  it('resets redactedInputs to null', () => {
    const parent = Context.create();
    parent.redactedInputs = { field: '***' };
    const child = parent.child('mod');
    expect(child.redactedInputs).toBeNull();
  });

  it('does not modify parent callChain', () => {
    const parent = Context.create();
    const chainBefore = [...parent.callChain];
    parent.child('mod.a');
    expect(parent.callChain).toEqual(chainBefore);
  });
});
