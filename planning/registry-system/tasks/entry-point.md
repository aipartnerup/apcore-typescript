# Task: Entry Point

## Goal

Implement `resolveEntryPoint()` which uses async `import()` to dynamically load a TypeScript/JavaScript module file and resolve the appropriate module object. Supports three resolution strategies: (1) metadata-driven class name override via `entry_point` key, (2) default export auto-detection, (3) single named export auto-detection. Includes `snakeToPascal()` utility and `isModuleClass()` duck-type checker.

## Files Involved

- `src/registry/entry-point.ts` -- Entry point resolution implementation
- `src/registry/validation.ts` -- `validateModule()` (imported for reference)
- `src/errors.ts` -- `ModuleLoadError`
- `tests/registry/test-entry-point.test.ts` -- Entry point tests with dynamic module fixtures

## Steps (TDD)

### Step 1: Implement snakeToPascal() utility

```typescript
import { describe, it, expect } from 'vitest';
import { snakeToPascal } from '../../src/registry/entry-point.js';

describe('snakeToPascal', () => {
  it('should convert snake_case to PascalCase', () => {
    expect(snakeToPascal('hello_world')).toBe('HelloWorld');
    expect(snakeToPascal('my_module_name')).toBe('MyModuleName');
  });

  it('should handle single word', () => {
    expect(snakeToPascal('hello')).toBe('Hello');
  });

  it('should return empty string for empty input', () => {
    expect(snakeToPascal('')).toBe('');
  });
});
```

### Step 2: Implement isModuleClass() duck-type checker

The checker validates that an object has `inputSchema` (object), `outputSchema` (object), `description` (string), and `execute` (function):

```typescript
// isModuleClass is private, tested indirectly through resolveEntryPoint
// but its logic is:
function isModuleClass(obj: unknown): boolean {
  if (typeof obj !== 'object' || obj === null) return false;
  const record = obj as Record<string, unknown>;
  return (
    record['inputSchema'] != null &&
    typeof record['inputSchema'] === 'object' &&
    record['outputSchema'] != null &&
    typeof record['outputSchema'] === 'object' &&
    typeof record['description'] === 'string' &&
    typeof record['execute'] === 'function'
  );
}
```

### Step 3: Resolve default export

```typescript
import { resolveEntryPoint } from '../../src/registry/entry-point.js';

describe('resolveEntryPoint', () => {
  it('should resolve default export that passes isModuleClass', async () => {
    // Given a .ts file with a default export containing inputSchema,
    // outputSchema, description, and execute
    const mod = await resolveEntryPoint('/path/to/valid_default_module.ts');
    expect(mod).toBeDefined();
    const obj = mod as Record<string, unknown>;
    expect(typeof obj['execute']).toBe('function');
  });
});
```

### Step 4: Resolve single named export

```typescript
it('should resolve single named export when no valid default exists', async () => {
  // Given a .ts file with one named export that passes isModuleClass
  const mod = await resolveEntryPoint('/path/to/named_export_module.ts');
  expect(mod).toBeDefined();
});
```

### Step 5: Metadata entry_point override

```typescript
it('should use metadata entry_point to select specific export', async () => {
  const meta = { entry_point: 'module:MyModule' };
  const mod = await resolveEntryPoint('/path/to/multi_export.ts', meta);
  expect(mod).toBeDefined();
});
```

### Step 6: Throw on import failure

```typescript
it('should throw ModuleLoadError when import fails', async () => {
  await expect(
    resolveEntryPoint('/nonexistent/module.ts'),
  ).rejects.toThrow(/Failed to import/);
});
```

### Step 7: Throw on no module class found

```typescript
it('should throw ModuleLoadError when no Module subclass found', async () => {
  // Given a .ts file with no exports matching isModuleClass
  await expect(
    resolveEntryPoint('/path/to/no_module.ts'),
  ).rejects.toThrow(/No Module subclass found/);
});
```

### Step 8: Throw on ambiguous multiple candidates

```typescript
it('should throw ModuleLoadError for ambiguous multiple exports', async () => {
  // Given a .ts file with two named exports both matching isModuleClass
  await expect(
    resolveEntryPoint('/path/to/ambiguous_module.ts'),
  ).rejects.toThrow(/Ambiguous entry point/);
});
```

## Acceptance Criteria

- [x] `snakeToPascal()` correctly converts snake_case to PascalCase
- [x] `isModuleClass()` checks for inputSchema (object), outputSchema (object), description (string), execute (function)
- [x] Default export is preferred if it passes `isModuleClass()`
- [x] Single named export is resolved when default export is not a valid module
- [x] Metadata `entry_point` override selects a specific named export by class name
- [x] `ModuleLoadError` thrown when async `import()` fails
- [x] `ModuleLoadError` thrown when no module class is found in exports
- [x] `ModuleLoadError` thrown when multiple ambiguous candidates exist
- [x] Function is async, returning `Promise<unknown>`
- [x] All tests pass with `vitest`

## Dependencies

- `types` task (interfaces for context)
- `validation` task (structural validation reference)

## Estimated Time

2 hours
