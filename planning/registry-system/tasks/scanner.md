# Task: Scanner

## Goal

Implement `scanExtensions()` and `scanMultiRoot()` functions that recursively walk extension directories, discover `.ts`/`.js` module files, build dot-notation canonical IDs from relative paths, detect companion `_meta.yaml` files, handle case collisions, and support configurable depth limits and symlink following. `scanMultiRoot()` coordinates multiple extension roots with namespace prefixing and uniqueness enforcement.

## Files Involved

- `src/registry/scanner.ts` -- Scanner implementation
- `src/registry/types.ts` -- `DiscoveredModule` interface
- `src/errors.ts` -- `ConfigError`, `ConfigNotFoundError`
- `tests/registry/test-scanner.test.ts` -- Scanner tests with temp directory fixtures

## Steps (TDD)

### Step 1: Implement scanExtensions() basic file discovery

Write a test that creates a temp directory with `.ts` files and verifies discovery:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { scanExtensions } from '../../src/registry/scanner.js';

describe('scanExtensions', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'scan-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should discover .ts and .js files', () => {
    writeFileSync(join(tempDir, 'add.ts'), 'export default {}');
    writeFileSync(join(tempDir, 'sub.js'), 'module.exports = {}');
    const results = scanExtensions(tempDir);
    const ids = results.map((r) => r.canonicalId).sort();
    expect(ids).toEqual(['add', 'sub']);
  });
});
```

Implement the recursive directory walker with `readdirSync`/`statSync`, filtering valid extensions.

### Step 2: Skip .d.ts, test files, dot/underscore prefixed entries

```typescript
it('should skip declaration and test files', () => {
  writeFileSync(join(tempDir, 'types.d.ts'), '');
  writeFileSync(join(tempDir, 'foo.test.ts'), '');
  writeFileSync(join(tempDir, 'bar.spec.js'), '');
  writeFileSync(join(tempDir, 'valid.ts'), 'export default {}');
  const results = scanExtensions(tempDir);
  expect(results).toHaveLength(1);
  expect(results[0].canonicalId).toBe('valid');
});

it('should skip dot-prefixed and underscore-prefixed entries', () => {
  writeFileSync(join(tempDir, '.hidden.ts'), '');
  writeFileSync(join(tempDir, '_private.ts'), '');
  writeFileSync(join(tempDir, 'public.ts'), 'export default {}');
  const results = scanExtensions(tempDir);
  expect(results).toHaveLength(1);
});
```

Add `SKIP_SUFFIXES` array and entry name filters.

### Step 3: Build canonical IDs with dot notation from nested paths

```typescript
it('should build dot-notation canonical IDs from nested directories', () => {
  mkdirSync(join(tempDir, 'math'), { recursive: true });
  writeFileSync(join(tempDir, 'math', 'add.ts'), 'export default {}');
  const results = scanExtensions(tempDir);
  expect(results[0].canonicalId).toBe('math.add');
});
```

Use `relative()` and replace path separators with dots, strip extensions.

### Step 4: Detect companion _meta.yaml files

```typescript
it('should detect companion _meta.yaml metadata files', () => {
  writeFileSync(join(tempDir, 'greet.ts'), 'export default {}');
  writeFileSync(join(tempDir, 'greet_meta.yaml'), 'description: Hello');
  const results = scanExtensions(tempDir);
  expect(results[0].metaPath).toContain('greet_meta.yaml');
});
```

### Step 5: Respect maxDepth configuration

```typescript
it('should respect maxDepth limit', () => {
  const deep = join(tempDir, 'a', 'b', 'c');
  mkdirSync(deep, { recursive: true });
  writeFileSync(join(deep, 'mod.ts'), 'export default {}');
  const shallow = scanExtensions(tempDir, 2);
  expect(shallow).toHaveLength(0);
  const deeper = scanExtensions(tempDir, 4);
  expect(deeper).toHaveLength(1);
});
```

### Step 6: Throw ConfigNotFoundError for missing root directory

```typescript
it('should throw ConfigNotFoundError for non-existent directory', () => {
  expect(() => scanExtensions('/nonexistent/path')).toThrow();
});
```

### Step 7: Implement scanMultiRoot() with namespace prefixing

```typescript
import { scanMultiRoot } from '../../src/registry/scanner.js';

describe('scanMultiRoot', () => {
  it('should prepend namespace to canonical IDs', () => {
    const root1 = mkdtempSync(join(tmpdir(), 'root1-'));
    writeFileSync(join(root1, 'add.ts'), 'export default {}');
    const roots = [{ root: root1, namespace: 'math' }];
    const results = scanMultiRoot(roots);
    expect(results[0].canonicalId).toBe('math.add');
    expect(results[0].namespace).toBe('math');
    rmSync(root1, { recursive: true, force: true });
  });

  it('should throw on duplicate namespaces', () => {
    const root1 = mkdtempSync(join(tmpdir(), 'dup1-'));
    const root2 = mkdtempSync(join(tmpdir(), 'dup2-'));
    const roots = [
      { root: root1, namespace: 'ns' },
      { root: root2, namespace: 'ns' },
    ];
    expect(() => scanMultiRoot(roots)).toThrow(/Duplicate namespace/);
    rmSync(root1, { recursive: true, force: true });
    rmSync(root2, { recursive: true, force: true });
  });
});
```

## Acceptance Criteria

- [x] `scanExtensions()` discovers `.ts` and `.js` files recursively
- [x] `.d.ts`, `.test.ts`, `.test.js`, `.spec.ts`, `.spec.js` files are skipped
- [x] Dot-prefixed and underscore-prefixed entries are skipped
- [x] `node_modules` and `__pycache__` directories are skipped
- [x] Canonical IDs use dot notation derived from relative paths
- [x] Case collisions are detected (warning-level, not blocking)
- [x] Companion `_meta.yaml` files are detected and recorded in `metaPath`
- [x] `maxDepth` parameter limits recursion depth
- [x] `followSymlinks` parameter controls symlink traversal (note: `statSync` bug)
- [x] `ConfigNotFoundError` thrown for non-existent root directories
- [x] `scanMultiRoot()` prepends namespace to canonical IDs
- [x] `scanMultiRoot()` throws `ConfigError` on duplicate namespaces
- [x] All tests pass with `vitest`

## Dependencies

- `types` task (DiscoveredModule interface)

## Estimated Time

3 hours
