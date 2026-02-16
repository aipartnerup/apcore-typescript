import { describe, it, expect } from 'vitest';
import { Type } from '@sinclair/typebox';
import { Registry } from '../../src/registry/registry.js';
import { FunctionModule } from '../../src/decorator.js';
import { InvalidInputError, ModuleNotFoundError } from '../../src/errors.js';

function createMod(id: string): FunctionModule {
  return new FunctionModule({
    execute: () => ({ ok: true }),
    moduleId: id,
    inputSchema: Type.Object({}),
    outputSchema: Type.Object({ ok: Type.Boolean() }),
    description: `Module ${id}`,
  });
}

describe('Registry', () => {
  it('creates empty registry', () => {
    const registry = new Registry();
    expect(registry.count).toBe(0);
    expect(registry.list()).toEqual([]);
  });

  it('register and get module', () => {
    const registry = new Registry();
    const mod = createMod('test.a');
    registry.register('test.a', mod);
    expect(registry.get('test.a')).toBe(mod);
    expect(registry.has('test.a')).toBe(true);
    expect(registry.count).toBe(1);
  });

  it('get returns null for unknown module', () => {
    const registry = new Registry();
    expect(registry.get('unknown')).toBeNull();
  });

  it('get throws for empty string', () => {
    const registry = new Registry();
    expect(() => registry.get('')).toThrow(ModuleNotFoundError);
  });

  it('register throws for empty moduleId', () => {
    const registry = new Registry();
    expect(() => registry.register('', createMod('x'))).toThrow(InvalidInputError);
  });

  it('register throws for duplicate moduleId', () => {
    const registry = new Registry();
    registry.register('test.a', createMod('test.a'));
    expect(() => registry.register('test.a', createMod('test.a'))).toThrow(InvalidInputError);
  });

  it('unregister removes module', () => {
    const registry = new Registry();
    registry.register('test.a', createMod('test.a'));
    const removed = registry.unregister('test.a');
    expect(removed).toBe(true);
    expect(registry.has('test.a')).toBe(false);
    expect(registry.count).toBe(0);
  });

  it('unregister returns false for unknown module', () => {
    const registry = new Registry();
    expect(registry.unregister('nonexistent')).toBe(false);
  });

  it('list returns sorted module IDs', () => {
    const registry = new Registry();
    registry.register('b.mod', createMod('b.mod'));
    registry.register('a.mod', createMod('a.mod'));
    registry.register('c.mod', createMod('c.mod'));
    expect(registry.list()).toEqual(['a.mod', 'b.mod', 'c.mod']);
  });

  it('list filters by prefix', () => {
    const registry = new Registry();
    registry.register('foo.a', createMod('foo.a'));
    registry.register('foo.b', createMod('foo.b'));
    registry.register('bar.a', createMod('bar.a'));
    expect(registry.list({ prefix: 'foo.' })).toEqual(['foo.a', 'foo.b']);
  });

  it('moduleIds returns sorted IDs', () => {
    const registry = new Registry();
    registry.register('z.mod', createMod('z.mod'));
    registry.register('a.mod', createMod('a.mod'));
    expect(registry.moduleIds).toEqual(['a.mod', 'z.mod']);
  });

  it('iter returns entries', () => {
    const registry = new Registry();
    registry.register('test.a', createMod('test.a'));
    const entries = [...registry.iter()];
    expect(entries).toHaveLength(1);
    expect(entries[0][0]).toBe('test.a');
  });

  it('on register event fires', () => {
    const registry = new Registry();
    const events: string[] = [];
    registry.on('register', (id) => events.push(id));
    registry.register('test.a', createMod('test.a'));
    expect(events).toEqual(['test.a']);
  });

  it('on unregister event fires', () => {
    const registry = new Registry();
    const events: string[] = [];
    registry.on('unregister', (id) => events.push(id));
    registry.register('test.a', createMod('test.a'));
    registry.unregister('test.a');
    expect(events).toEqual(['test.a']);
  });

  it('on throws for invalid event', () => {
    const registry = new Registry();
    expect(() => registry.on('invalid', () => {})).toThrow(InvalidInputError);
  });

  it('getDefinition returns descriptor', () => {
    const registry = new Registry();
    const mod = createMod('test.a');
    registry.register('test.a', mod);
    const def = registry.getDefinition('test.a');
    expect(def).not.toBeNull();
    expect(def!.moduleId).toBe('test.a');
    expect(def!.description).toBe('Module test.a');
  });

  it('getDefinition returns null for unknown module', () => {
    const registry = new Registry();
    expect(registry.getDefinition('nonexistent')).toBeNull();
  });

  it('clearCache does not throw', () => {
    const registry = new Registry();
    registry.clearCache();
  });
});
