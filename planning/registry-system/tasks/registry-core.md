# Task: Registry Core

## Goal

Implement the central `Registry` class that orchestrates the full 8-step async discovery pipeline and provides module query, registration, event, and cache management APIs. The constructor accepts optional configuration for extension roots and ID maps. The async `discover()` method coordinates scanning, metadata loading, entry point resolution, validation, dependency resolution, and ordered registration. Manual `register()`/`unregister()` methods support programmatic module management with lifecycle hooks (`onLoad`/`onUnload`) and event callbacks.

## Files Involved

- `src/registry/registry.ts` -- Registry class implementation
- `src/registry/scanner.ts` -- `scanExtensions()`, `scanMultiRoot()`
- `src/registry/metadata.ts` -- `loadMetadata()`, `mergeModuleMetadata()`, `loadIdMap()`, `parseDependencies()`
- `src/registry/dependencies.ts` -- `resolveDependencies()`
- `src/registry/entry-point.ts` -- `resolveEntryPoint()`
- `src/registry/validation.ts` -- `validateModule()`
- `src/registry/types.ts` -- `ModuleDescriptor`, `DependencyInfo`
- `src/config.ts` -- `Config` class
- `src/errors.ts` -- `InvalidInputError`, `ModuleNotFoundError`
- `tests/registry/test-registry.test.ts` -- Registry integration tests

## Steps (TDD)

### Step 1: Constructor with extension root options

```typescript
import { describe, it, expect } from 'vitest';
import { Registry } from '../../src/registry/registry.js';

describe('Registry constructor', () => {
  it('should default to ./extensions root', () => {
    const reg = new Registry();
    expect(reg.count).toBe(0);
  });

  it('should accept extensionsDir option', () => {
    const reg = new Registry({ extensionsDir: '/custom/path' });
    expect(reg.count).toBe(0);
  });

  it('should throw when both extensionsDir and extensionsDirs are provided', () => {
    expect(
      () => new Registry({ extensionsDir: '/a', extensionsDirs: ['/b'] }),
    ).toThrow(/Cannot specify both/);
  });
});
```

### Step 2: Manual register() and unregister()

```typescript
describe('register/unregister', () => {
  it('should register a module and make it queryable', () => {
    const reg = new Registry();
    const mod = {
      inputSchema: { type: 'object' },
      outputSchema: { type: 'object' },
      description: 'Test',
      execute: async () => ({}),
    };
    reg.register('test.mod', mod);
    expect(reg.has('test.mod')).toBe(true);
    expect(reg.get('test.mod')).toBe(mod);
    expect(reg.count).toBe(1);
  });

  it('should throw on duplicate registration', () => {
    const reg = new Registry();
    const mod = { execute: async () => ({}) };
    reg.register('dup', mod);
    expect(() => reg.register('dup', mod)).toThrow(/already exists/);
  });

  it('should throw on empty module ID', () => {
    const reg = new Registry();
    expect(() => reg.register('', {})).toThrow(/non-empty/);
  });

  it('should unregister and return true', () => {
    const reg = new Registry();
    reg.register('mod', {});
    expect(reg.unregister('mod')).toBe(true);
    expect(reg.has('mod')).toBe(false);
    expect(reg.count).toBe(0);
  });

  it('should return false for unregistering non-existent module', () => {
    const reg = new Registry();
    expect(reg.unregister('nonexistent')).toBe(false);
  });
});
```

### Step 3: Lifecycle hooks (onLoad/onUnload)

```typescript
describe('lifecycle hooks', () => {
  it('should call onLoad during register()', () => {
    const reg = new Registry();
    let loaded = false;
    const mod = { onLoad: () => { loaded = true; } };
    reg.register('hook.mod', mod);
    expect(loaded).toBe(true);
  });

  it('should rollback registration if onLoad throws', () => {
    const reg = new Registry();
    const mod = { onLoad: () => { throw new Error('init failed'); } };
    expect(() => reg.register('fail.mod', mod)).toThrow('init failed');
    expect(reg.has('fail.mod')).toBe(false);
  });

  it('should call onUnload during unregister()', () => {
    const reg = new Registry();
    let unloaded = false;
    const mod = { onUnload: () => { unloaded = true; } };
    reg.register('unload.mod', mod);
    reg.unregister('unload.mod');
    expect(unloaded).toBe(true);
  });

  it('should swallow onUnload errors', () => {
    const reg = new Registry();
    const mod = { onUnload: () => { throw new Error('cleanup failed'); } };
    reg.register('err.mod', mod);
    expect(() => reg.unregister('err.mod')).not.toThrow();
  });
});
```

### Step 4: Query methods (get, has, list, iter, count, moduleIds)

```typescript
describe('query methods', () => {
  it('should return null for non-existent module via get()', () => {
    const reg = new Registry();
    expect(reg.get('nope')).toBeNull();
  });

  it('should throw ModuleNotFoundError for empty string via get()', () => {
    const reg = new Registry();
    expect(() => reg.get('')).toThrow();
  });

  it('should list module IDs in sorted order', () => {
    const reg = new Registry();
    reg.register('z.mod', {});
    reg.register('a.mod', {});
    reg.register('m.mod', {});
    expect(reg.list()).toEqual(['a.mod', 'm.mod', 'z.mod']);
  });

  it('should filter list by prefix', () => {
    const reg = new Registry();
    reg.register('math.add', {});
    reg.register('math.sub', {});
    reg.register('text.upper', {});
    expect(reg.list({ prefix: 'math.' })).toEqual(['math.add', 'math.sub']);
  });

  it('should filter list by tags', () => {
    const reg = new Registry();
    reg.register('tagged', { tags: ['math', 'core'] });
    reg.register('untagged', {});
    expect(reg.list({ tags: ['math'] })).toEqual(['tagged']);
  });

  it('should iterate over modules via iter()', () => {
    const reg = new Registry();
    reg.register('a', { value: 1 });
    reg.register('b', { value: 2 });
    const entries = [...reg.iter()];
    expect(entries).toHaveLength(2);
  });

  it('should return sorted moduleIds', () => {
    const reg = new Registry();
    reg.register('z', {});
    reg.register('a', {});
    expect(reg.moduleIds).toEqual(['a', 'z']);
  });
});
```

### Step 5: getDefinition() returns ModuleDescriptor

```typescript
describe('getDefinition', () => {
  it('should return ModuleDescriptor for registered module', () => {
    const reg = new Registry();
    const mod = {
      name: 'Adder',
      description: 'Adds numbers',
      inputSchema: { type: 'object' },
      outputSchema: { type: 'object' },
      version: '2.0.0',
      tags: ['math'],
    };
    reg.register('math.add', mod);
    const def = reg.getDefinition('math.add');
    expect(def).not.toBeNull();
    expect(def!.moduleId).toBe('math.add');
    expect(def!.name).toBe('Adder');
    expect(def!.description).toBe('Adds numbers');
    expect(def!.version).toBe('2.0.0');
  });

  it('should return null for non-existent module', () => {
    const reg = new Registry();
    expect(reg.getDefinition('nope')).toBeNull();
  });
});
```

### Step 6: Event system via on()

```typescript
describe('event system', () => {
  it('should fire register event callback', () => {
    const reg = new Registry();
    const events: string[] = [];
    reg.on('register', (id) => events.push(id));
    reg.register('evented', {});
    expect(events).toEqual(['evented']);
  });

  it('should fire unregister event callback', () => {
    const reg = new Registry();
    const events: string[] = [];
    reg.on('unregister', (id) => events.push(id));
    reg.register('temp', {});
    reg.unregister('temp');
    expect(events).toEqual(['temp']);
  });

  it('should throw on invalid event name', () => {
    const reg = new Registry();
    expect(() => reg.on('invalid', () => {})).toThrow(/Invalid event/);
  });

  it('should swallow callback errors silently', () => {
    const reg = new Registry();
    reg.on('register', () => { throw new Error('callback failed'); });
    expect(() => reg.register('safe', {})).not.toThrow();
  });
});
```

### Step 7: clearCache()

```typescript
describe('clearCache', () => {
  it('should clear the schema cache without affecting modules', () => {
    const reg = new Registry();
    reg.register('cached', {});
    reg.clearCache();
    expect(reg.has('cached')).toBe(true);
  });
});
```

### Step 8: Async discover() pipeline (integration)

```typescript
describe('discover', () => {
  it('should execute the 8-step pipeline and return registered count', async () => {
    // Create temp directory with valid module files
    // const reg = new Registry({ extensionsDir: tempDir });
    // const count = await reg.discover();
    // expect(count).toBeGreaterThanOrEqual(0);
    // expect(reg.count).toBe(count);
  });
});
```

The 8-step `discover()` pipeline:

```typescript
async discover(): Promise<number> {
  // Step 1: Scan extension roots (scanExtensions or scanMultiRoot)
  // Step 2: Apply ID map overrides
  // Step 3: Load metadata (loadMetadata for each discovered module)
  // Step 4: Resolve entry points (await resolveEntryPoint for each)
  // Step 5: Validate modules (validateModule, drop invalid)
  // Step 6: Collect dependencies (parseDependencies from metadata)
  // Step 7: Resolve dependency order (resolveDependencies via Kahn's sort)
  // Step 8: Register in dependency order (mergeModuleMetadata, onLoad, trigger events)
  return registeredCount;
}
```

## Acceptance Criteria

- [x] Constructor accepts optional `config`, `extensionsDir`, `extensionsDirs`, `idMapPath`
- [x] `extensionsDir` and `extensionsDirs` are mutually exclusive (throws `InvalidInputError`)
- [x] `discover()` is async, returns `Promise<number>` of registered modules
- [x] `discover()` executes all 8 pipeline steps in order
- [x] `register()` adds modules with `onLoad` lifecycle hook
- [x] `register()` throws on empty ID or duplicate ID
- [x] `register()` rolls back on `onLoad` failure
- [x] `unregister()` removes module, clears metadata and schema cache, calls `onUnload`
- [x] `unregister()` swallows `onUnload` errors
- [x] `get()` returns module or null; throws `ModuleNotFoundError` for empty string
- [x] `has()` returns boolean for module existence
- [x] `list()` returns sorted IDs with optional prefix and tags filtering
- [x] `iter()` returns `IterableIterator<[string, unknown]>`
- [x] `count` getter returns module count
- [x] `moduleIds` getter returns sorted ID array
- [x] `getDefinition()` returns `ModuleDescriptor` or null
- [x] `on()` registers event callbacks for 'register' and 'unregister'
- [x] Event callbacks that throw are silently swallowed
- [x] `clearCache()` clears schema cache without affecting registered modules
- [x] All tests pass with `vitest`

## Dependencies

- `scanner` task
- `metadata` task
- `dependencies` task
- `entry-point` task
- `validation` task

## Estimated Time

5 hours
