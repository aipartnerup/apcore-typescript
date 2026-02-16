# Task: Types

## Goal

Define the core TypeScript interfaces for the registry system: `ModuleDescriptor` (complete module definition record), `DiscoveredModule` (scanner output representing a found file), and `DependencyInfo` (parsed dependency entry). These interfaces are consumed by every other registry component and provide the type-safe foundation for the entire module lifecycle.

## Files Involved

- `src/registry/types.ts` -- Interface definitions
- `src/module.ts` -- Imports `ModuleAnnotations` and `ModuleExample` types
- `tests/registry/test-types.test.ts` -- Type-level and runtime tests

## Steps (TDD)

### Step 1: Define DiscoveredModule interface

Write a test that creates a `DiscoveredModule` object and asserts all fields are accessible:

```typescript
import { describe, it, expect } from 'vitest';
import type { DiscoveredModule } from '../../src/registry/types.js';

describe('DiscoveredModule', () => {
  it('should represent a discovered file with canonical ID', () => {
    const dm: DiscoveredModule = {
      filePath: '/extensions/math/add.ts',
      canonicalId: 'math.add',
      metaPath: '/extensions/math/add_meta.yaml',
      namespace: null,
    };
    expect(dm.filePath).toBe('/extensions/math/add.ts');
    expect(dm.canonicalId).toBe('math.add');
    expect(dm.metaPath).toBe('/extensions/math/add_meta.yaml');
    expect(dm.namespace).toBeNull();
  });

  it('should support namespace for multi-root scanning', () => {
    const dm: DiscoveredModule = {
      filePath: '/plugins/greet.ts',
      canonicalId: 'plugins.greet',
      metaPath: null,
      namespace: 'plugins',
    };
    expect(dm.namespace).toBe('plugins');
  });
});
```

Implement the interface with `filePath: string`, `canonicalId: string`, `metaPath: string | null`, `namespace: string | null`.

### Step 2: Define DependencyInfo interface

Write a test for `DependencyInfo`:

```typescript
describe('DependencyInfo', () => {
  it('should represent a module dependency', () => {
    const dep: DependencyInfo = {
      moduleId: 'core.auth',
      version: '2.0.0',
      optional: false,
    };
    expect(dep.moduleId).toBe('core.auth');
    expect(dep.version).toBe('2.0.0');
    expect(dep.optional).toBe(false);
  });

  it('should allow null version for unversioned dependencies', () => {
    const dep: DependencyInfo = {
      moduleId: 'utils.logger',
      version: null,
      optional: true,
    };
    expect(dep.version).toBeNull();
    expect(dep.optional).toBe(true);
  });
});
```

Implement with `moduleId: string`, `version: string | null`, `optional: boolean`.

### Step 3: Define ModuleDescriptor interface

Write a test for `ModuleDescriptor`:

```typescript
describe('ModuleDescriptor', () => {
  it('should represent a complete module definition', () => {
    const desc: ModuleDescriptor = {
      moduleId: 'math.add',
      name: 'Add Numbers',
      description: 'Adds two numbers together',
      documentation: 'Detailed usage guide...',
      inputSchema: { type: 'object', properties: { a: { type: 'number' } } },
      outputSchema: { type: 'object', properties: { result: { type: 'number' } } },
      version: '1.0.0',
      tags: ['math', 'arithmetic'],
      annotations: null,
      examples: [],
      metadata: {},
    };
    expect(desc.moduleId).toBe('math.add');
    expect(desc.tags).toContain('math');
  });
});
```

Implement with all fields including `annotations: ModuleAnnotations | null` and `examples: ModuleExample[]` imported from `../module.js`.

## Acceptance Criteria

- [x] `ModuleDescriptor` interface has all 11 fields: moduleId, name, description, documentation, inputSchema, outputSchema, version, tags, annotations, examples, metadata
- [x] `DiscoveredModule` interface has 4 fields: filePath, canonicalId, metaPath, namespace
- [x] `DependencyInfo` interface has 3 fields: moduleId, version, optional
- [x] All interfaces compile under `tsc --noEmit` with strict mode
- [x] Types are re-exported from `src/registry/index.ts`

## Dependencies

- `src/module.ts` must define `ModuleAnnotations` and `ModuleExample` types

## Estimated Time

1 hour
