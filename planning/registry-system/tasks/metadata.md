# Task: Metadata

## Goal

Implement YAML metadata loading and merging functions: `loadMetadata()` for parsing `_meta.yaml` companion files, `parseDependencies()` for converting raw dependency arrays to typed `DependencyInfo[]`, `mergeModuleMetadata()` for resolving code-level vs YAML-level property conflicts, and `loadIdMap()` for loading canonical ID override mappings from a YAML file.

## Files Involved

- `src/registry/metadata.ts` -- Metadata function implementations
- `src/registry/types.ts` -- `DependencyInfo` interface
- `src/errors.ts` -- `ConfigError`, `ConfigNotFoundError`
- `tests/registry/test-metadata.test.ts` -- Metadata tests with temp YAML fixtures

## Steps (TDD)

### Step 1: Implement loadMetadata() for YAML parsing

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadMetadata } from '../../src/registry/metadata.js';

describe('loadMetadata', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'meta-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should parse valid YAML metadata file', () => {
    const metaPath = join(tempDir, 'mod_meta.yaml');
    writeFileSync(metaPath, 'description: A test module\nversion: "2.0.0"\ntags:\n  - math\n');
    const meta = loadMetadata(metaPath);
    expect(meta['description']).toBe('A test module');
    expect(meta['version']).toBe('2.0.0');
    expect(meta['tags']).toEqual(['math']);
  });

  it('should return empty record for missing file', () => {
    const meta = loadMetadata('/nonexistent/path.yaml');
    expect(meta).toEqual({});
  });

  it('should throw ConfigError for invalid YAML', () => {
    const metaPath = join(tempDir, 'bad_meta.yaml');
    writeFileSync(metaPath, '{ invalid yaml [[[');
    expect(() => loadMetadata(metaPath)).toThrow();
  });

  it('should throw ConfigError for non-mapping YAML', () => {
    const metaPath = join(tempDir, 'list_meta.yaml');
    writeFileSync(metaPath, '- item1\n- item2\n');
    expect(() => loadMetadata(metaPath)).toThrow();
  });
});
```

### Step 2: Implement parseDependencies()

```typescript
import { parseDependencies } from '../../src/registry/metadata.js';

describe('parseDependencies', () => {
  it('should convert raw dependency array to DependencyInfo[]', () => {
    const raw = [
      { module_id: 'core.auth', version: '1.0.0', optional: false },
      { module_id: 'utils.logger', optional: true },
    ];
    const deps = parseDependencies(raw);
    expect(deps).toHaveLength(2);
    expect(deps[0]).toEqual({ moduleId: 'core.auth', version: '1.0.0', optional: false });
    expect(deps[1]).toEqual({ moduleId: 'utils.logger', version: null, optional: true });
  });

  it('should skip entries without module_id', () => {
    const raw = [{ version: '1.0.0' }, { module_id: 'valid' }];
    const deps = parseDependencies(raw as Array<Record<string, unknown>>);
    expect(deps).toHaveLength(1);
    expect(deps[0].moduleId).toBe('valid');
  });

  it('should return empty array for empty input', () => {
    expect(parseDependencies([])).toEqual([]);
  });
});
```

### Step 3: Implement mergeModuleMetadata()

```typescript
import { mergeModuleMetadata } from '../../src/registry/metadata.js';

describe('mergeModuleMetadata', () => {
  it('should prefer YAML metadata over code-level properties', () => {
    const moduleObj = {
      description: 'Code description',
      name: 'CodeName',
      version: '1.0.0',
      tags: ['code-tag'],
    };
    const meta = {
      description: 'YAML description',
      name: 'YAMLName',
      version: '2.0.0',
      tags: ['yaml-tag'],
    };
    const merged = mergeModuleMetadata(moduleObj, meta);
    expect(merged['description']).toBe('YAML description');
    expect(merged['name']).toBe('YAMLName');
    expect(merged['version']).toBe('2.0.0');
    expect(merged['tags']).toEqual(['yaml-tag']);
  });

  it('should fall back to code-level properties when YAML is empty', () => {
    const moduleObj = {
      description: 'Code desc',
      name: 'CodeName',
      version: '1.5.0',
      tags: ['fallback'],
    };
    const merged = mergeModuleMetadata(moduleObj, {});
    expect(merged['description']).toBe('Code desc');
    expect(merged['name']).toBe('CodeName');
    expect(merged['version']).toBe('1.5.0');
  });

  it('should shallow-merge metadata records', () => {
    const moduleObj = { metadata: { author: 'dev', env: 'prod' } };
    const meta = { metadata: { env: 'staging', team: 'backend' } };
    const merged = mergeModuleMetadata(
      moduleObj as Record<string, unknown>,
      meta as Record<string, unknown>,
    );
    const mergedMeta = merged['metadata'] as Record<string, unknown>;
    expect(mergedMeta['author']).toBe('dev');
    expect(mergedMeta['env']).toBe('staging');
    expect(mergedMeta['team']).toBe('backend');
  });
});
```

### Step 4: Implement loadIdMap()

```typescript
import { loadIdMap } from '../../src/registry/metadata.js';

describe('loadIdMap', () => {
  it('should load YAML ID map with mappings list', () => {
    const mapPath = join(tempDir, 'id_map.yaml');
    writeFileSync(
      mapPath,
      'mappings:\n  - file: math/add.ts\n    id: custom.add\n  - file: utils/log.ts\n    id: custom.log\n',
    );
    const idMap = loadIdMap(mapPath);
    expect(idMap['math/add.ts']['id']).toBe('custom.add');
    expect(idMap['utils/log.ts']['id']).toBe('custom.log');
  });

  it('should throw ConfigNotFoundError for missing file', () => {
    expect(() => loadIdMap('/nonexistent/id_map.yaml')).toThrow();
  });

  it('should throw ConfigError for missing mappings key', () => {
    const mapPath = join(tempDir, 'bad_map.yaml');
    writeFileSync(mapPath, 'other_key: value\n');
    expect(() => loadIdMap(mapPath)).toThrow(/mappings/);
  });
});
```

## Acceptance Criteria

- [x] `loadMetadata()` parses valid YAML into a `Record<string, unknown>`
- [x] `loadMetadata()` returns `{}` for non-existent files
- [x] `loadMetadata()` throws `ConfigError` for invalid YAML or non-mapping content
- [x] `parseDependencies()` converts raw arrays to typed `DependencyInfo[]`
- [x] `parseDependencies()` skips entries without `module_id`
- [x] `parseDependencies()` defaults `version` to `null` and `optional` to `false`
- [x] `mergeModuleMetadata()` prefers YAML values over code values for description, name, tags, version, annotations, examples, documentation
- [x] `mergeModuleMetadata()` shallow-merges metadata records (code spread first, then YAML)
- [x] `loadIdMap()` parses YAML with `mappings` list into file-to-record map
- [x] `loadIdMap()` throws `ConfigNotFoundError` for missing files
- [x] `loadIdMap()` throws `ConfigError` for missing or non-array `mappings` key
- [x] All tests pass with `vitest`

## Dependencies

- `types` task (DependencyInfo interface)

## Estimated Time

2 hours
