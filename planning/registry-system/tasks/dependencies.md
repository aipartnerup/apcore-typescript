# Task: Dependencies

## Goal

Implement `resolveDependencies()` using Kahn's topological sort algorithm to determine a valid module load order. The function builds a directed acyclic graph from module dependency lists, processes nodes in zero-in-degree order (sorted for determinism), detects cycles with path extraction, and throws descriptive errors for missing required dependencies.

## Files Involved

- `src/registry/dependencies.ts` -- Dependency resolution implementation
- `src/registry/types.ts` -- `DependencyInfo` interface
- `src/errors.ts` -- `CircularDependencyError`, `ModuleLoadError`
- `tests/registry/test-dependencies.test.ts` -- Dependency resolution tests

## Steps (TDD)

### Step 1: Basic topological sort with no dependencies

```typescript
import { describe, it, expect } from 'vitest';
import { resolveDependencies } from '../../src/registry/dependencies.js';

describe('resolveDependencies', () => {
  it('should return all modules in sorted order when no dependencies exist', () => {
    const modules: Array<[string, []]> = [
      ['mod.c', []],
      ['mod.a', []],
      ['mod.b', []],
    ];
    const order = resolveDependencies(modules);
    expect(order).toEqual(['mod.a', 'mod.b', 'mod.c']);
  });

  it('should return empty array for empty input', () => {
    expect(resolveDependencies([])).toEqual([]);
  });
});
```

### Step 2: Linear dependency chain

```typescript
it('should resolve linear dependency chain', () => {
  const modules: Array<[string, Array<{ moduleId: string; version: string | null; optional: boolean }>]> = [
    ['mod.c', [{ moduleId: 'mod.b', version: null, optional: false }]],
    ['mod.b', [{ moduleId: 'mod.a', version: null, optional: false }]],
    ['mod.a', []],
  ];
  const order = resolveDependencies(modules);
  expect(order).toEqual(['mod.a', 'mod.b', 'mod.c']);
});
```

### Step 3: Diamond dependency pattern

```typescript
it('should handle diamond dependency pattern', () => {
  const modules: Array<[string, Array<{ moduleId: string; version: string | null; optional: boolean }>]> = [
    ['mod.d', [
      { moduleId: 'mod.b', version: null, optional: false },
      { moduleId: 'mod.c', version: null, optional: false },
    ]],
    ['mod.b', [{ moduleId: 'mod.a', version: null, optional: false }]],
    ['mod.c', [{ moduleId: 'mod.a', version: null, optional: false }]],
    ['mod.a', []],
  ];
  const order = resolveDependencies(modules);
  expect(order.indexOf('mod.a')).toBeLessThan(order.indexOf('mod.b'));
  expect(order.indexOf('mod.a')).toBeLessThan(order.indexOf('mod.c'));
  expect(order.indexOf('mod.b')).toBeLessThan(order.indexOf('mod.d'));
  expect(order.indexOf('mod.c')).toBeLessThan(order.indexOf('mod.d'));
});
```

### Step 4: Circular dependency detection

```typescript
it('should throw CircularDependencyError for circular dependencies', () => {
  const modules: Array<[string, Array<{ moduleId: string; version: string | null; optional: boolean }>]> = [
    ['mod.a', [{ moduleId: 'mod.b', version: null, optional: false }]],
    ['mod.b', [{ moduleId: 'mod.a', version: null, optional: false }]],
  ];
  expect(() => resolveDependencies(modules)).toThrow(/[Cc]ircular/);
});

it('should detect three-node cycle', () => {
  const modules: Array<[string, Array<{ moduleId: string; version: string | null; optional: boolean }>]> = [
    ['mod.a', [{ moduleId: 'mod.b', version: null, optional: false }]],
    ['mod.b', [{ moduleId: 'mod.c', version: null, optional: false }]],
    ['mod.c', [{ moduleId: 'mod.a', version: null, optional: false }]],
  ];
  expect(() => resolveDependencies(modules)).toThrow(/[Cc]ircular/);
});
```

### Step 5: Missing required dependency

```typescript
it('should throw ModuleLoadError for missing required dependency', () => {
  const modules: Array<[string, Array<{ moduleId: string; version: string | null; optional: boolean }>]> = [
    ['mod.a', [{ moduleId: 'mod.missing', version: null, optional: false }]],
  ];
  expect(() => resolveDependencies(modules)).toThrow(/not found/);
});
```

### Step 6: Optional missing dependency is silently ignored

```typescript
it('should skip optional dependencies that are not in known IDs', () => {
  const modules: Array<[string, Array<{ moduleId: string; version: string | null; optional: boolean }>]> = [
    ['mod.a', [{ moduleId: 'mod.optional', version: null, optional: true }]],
  ];
  const order = resolveDependencies(modules);
  expect(order).toEqual(['mod.a']);
});
```

### Step 7: Implement extractCycle() for cycle path reporting

The `extractCycle()` helper traces from a remaining node through its dependency edges to find and return the cycle path. This cycle path is included in the `CircularDependencyError` for debugging.

```typescript
it('should include cycle path in error message', () => {
  const modules: Array<[string, Array<{ moduleId: string; version: string | null; optional: boolean }>]> = [
    ['a', [{ moduleId: 'b', version: null, optional: false }]],
    ['b', [{ moduleId: 'a', version: null, optional: false }]],
    ['c', []],
  ];
  try {
    resolveDependencies(modules);
  } catch (e) {
    const msg = (e as Error).message;
    expect(msg).toMatch(/a.*b|b.*a/);
  }
});
```

## Acceptance Criteria

- [x] Independent modules are returned in alphabetically sorted order
- [x] Linear dependency chains are resolved in correct order
- [x] Diamond dependency patterns are resolved with all constraints satisfied
- [x] `CircularDependencyError` is thrown for two-node, three-node, and larger cycles
- [x] `CircularDependencyError` includes the extracted cycle path
- [x] `ModuleLoadError` is thrown for missing required dependencies
- [x] Optional missing dependencies are silently skipped
- [x] Zero-in-degree nodes and dependents are processed in sorted order for determinism
- [x] Empty input returns empty array
- [x] All tests pass with `vitest`

## Dependencies

- `types` task (DependencyInfo interface)

## Estimated Time

3 hours
