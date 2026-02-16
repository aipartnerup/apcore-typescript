import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  loadMetadata,
  parseDependencies,
  mergeModuleMetadata,
  loadIdMap,
} from '../../src/registry/metadata.js';
import { ConfigError, ConfigNotFoundError } from '../../src/errors.js';

describe('loadMetadata', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'metadata-test-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns empty object for non-existent file', () => {
    const result = loadMetadata(join(tmpDir, 'does_not_exist.yaml'));
    expect(result).toEqual({});
  });

  it('parses valid YAML and returns record', () => {
    const metaPath = join(tmpDir, '_meta.yaml');
    writeFileSync(metaPath, 'description: hello\nversion: "2.0.0"\ntags:\n  - alpha\n  - beta\n');
    const result = loadMetadata(metaPath);
    expect(result).toEqual({
      description: 'hello',
      version: '2.0.0',
      tags: ['alpha', 'beta'],
    });
  });

  it('returns empty object for null YAML content', () => {
    const metaPath = join(tmpDir, '_meta.yaml');
    writeFileSync(metaPath, '');
    const result = loadMetadata(metaPath);
    expect(result).toEqual({});
  });

  it('returns empty object for YAML file containing only null', () => {
    const metaPath = join(tmpDir, '_meta.yaml');
    writeFileSync(metaPath, 'null\n');
    const result = loadMetadata(metaPath);
    expect(result).toEqual({});
  });

  it('throws ConfigError for invalid YAML syntax', () => {
    const metaPath = join(tmpDir, '_meta.yaml');
    writeFileSync(metaPath, ':\n  :\n    bad: {{{\n');
    expect(() => loadMetadata(metaPath)).toThrow(ConfigError);
  });

  it('throws ConfigError if YAML content is a list instead of mapping', () => {
    const metaPath = join(tmpDir, '_meta.yaml');
    writeFileSync(metaPath, '- item1\n- item2\n');
    expect(() => loadMetadata(metaPath)).toThrow(ConfigError);
    expect(() => loadMetadata(metaPath)).toThrow(/must be a YAML mapping/);
  });
});

describe('parseDependencies', () => {
  it('returns empty array for empty input', () => {
    expect(parseDependencies([])).toEqual([]);
  });

  it('returns empty array for null/undefined input', () => {
    expect(parseDependencies(null as unknown as Array<Record<string, unknown>>)).toEqual([]);
    expect(parseDependencies(undefined as unknown as Array<Record<string, unknown>>)).toEqual([]);
  });

  it('parses dependencies with moduleId, version, optional', () => {
    const raw = [
      { module_id: 'core.auth', version: '1.2.0', optional: true },
      { module_id: 'core.db', version: '3.0.0', optional: false },
    ];
    const result = parseDependencies(raw);
    expect(result).toEqual([
      { moduleId: 'core.auth', version: '1.2.0', optional: true },
      { moduleId: 'core.db', version: '3.0.0', optional: false },
    ]);
  });

  it('skips entries without module_id', () => {
    const raw = [
      { module_id: 'valid.module' },
      { version: '1.0.0' },
      { optional: true },
      {},
    ];
    const result = parseDependencies(raw);
    expect(result).toHaveLength(1);
    expect(result[0].moduleId).toBe('valid.module');
  });

  it('defaults version to null and optional to false', () => {
    const raw = [{ module_id: 'some.module' }];
    const result = parseDependencies(raw);
    expect(result).toEqual([
      { moduleId: 'some.module', version: null, optional: false },
    ]);
  });

  it('handles mixed entries with partial fields', () => {
    const raw = [
      { module_id: 'a', version: '1.0.0' },
      { module_id: 'b', optional: true },
      { module_id: 'c' },
    ];
    const result = parseDependencies(raw);
    expect(result).toEqual([
      { moduleId: 'a', version: '1.0.0', optional: false },
      { moduleId: 'b', version: null, optional: true },
      { moduleId: 'c', version: null, optional: false },
    ]);
  });
});

describe('mergeModuleMetadata', () => {
  it('YAML values win over code values for all top-level fields', () => {
    const moduleObj = {
      description: 'code desc',
      name: 'code-name',
      tags: ['code-tag'],
      version: '1.0.0',
      annotations: { codeAnnot: true },
      examples: [{ code: 'code-example' }],
      documentation: 'code docs',
      metadata: { codeKey: 'codeVal' },
    };
    const meta = {
      description: 'yaml desc',
      name: 'yaml-name',
      tags: ['yaml-tag'],
      version: '2.0.0',
      annotations: { yamlAnnot: true },
      examples: [{ code: 'yaml-example' }],
      documentation: 'yaml docs',
      metadata: { yamlKey: 'yamlVal' },
    };
    const result = mergeModuleMetadata(moduleObj, meta);
    expect(result['description']).toBe('yaml desc');
    expect(result['name']).toBe('yaml-name');
    expect(result['tags']).toEqual(['yaml-tag']);
    expect(result['version']).toBe('2.0.0');
    expect(result['annotations']).toEqual({ yamlAnnot: true });
    expect(result['examples']).toEqual([{ code: 'yaml-example' }]);
    expect(result['documentation']).toBe('yaml docs');
  });

  it('code values used as fallback when YAML is empty', () => {
    const moduleObj = {
      description: 'code desc',
      name: 'code-name',
      tags: ['code-tag'],
      version: '1.0.0',
      metadata: { codeKey: 'codeVal' },
    };
    const meta: Record<string, unknown> = {};
    const result = mergeModuleMetadata(moduleObj, meta);
    expect(result['description']).toBe('code desc');
    expect(result['name']).toBe('code-name');
    expect(result['tags']).toEqual(['code-tag']);
    expect(result['version']).toBe('1.0.0');
    expect(result['metadata']).toEqual({ codeKey: 'codeVal' });
  });

  it('metadata records are shallow-merged with YAML spread over code', () => {
    const moduleObj = { metadata: { shared: 'from-code', codeOnly: 'value' } };
    const meta = { metadata: { shared: 'from-yaml', yamlOnly: 'value' } };
    const result = mergeModuleMetadata(moduleObj, meta);
    expect(result['metadata']).toEqual({
      shared: 'from-yaml',
      codeOnly: 'value',
      yamlOnly: 'value',
    });
  });

  it('default values used when both code and YAML are absent', () => {
    const result = mergeModuleMetadata({}, {});
    expect(result['description']).toBe('');
    expect(result['name']).toBeNull();
    expect(result['tags']).toEqual([]);
    expect(result['version']).toBe('1.0.0');
    expect(result['annotations']).toBeNull();
    expect(result['examples']).toEqual([]);
    expect(result['metadata']).toEqual({});
    expect(result['documentation']).toBeNull();
  });

  it('YAML empty array for tags overrides code tags', () => {
    const moduleObj = { tags: ['code-tag'] };
    const meta = { tags: [] };
    const result = mergeModuleMetadata(moduleObj, meta);
    expect(result['tags']).toEqual([]);
  });
});

describe('loadIdMap', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'idmap-test-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('throws ConfigNotFoundError for non-existent file', () => {
    expect(() => loadIdMap(join(tmpDir, 'nonexistent.yaml'))).toThrow(ConfigNotFoundError);
  });

  it('throws ConfigError for invalid YAML syntax', () => {
    const idMapPath = join(tmpDir, 'id_map.yaml');
    writeFileSync(idMapPath, ':\n  bad: {{{\n');
    expect(() => loadIdMap(idMapPath)).toThrow(ConfigError);
  });

  it('throws ConfigError when mappings key is missing', () => {
    const idMapPath = join(tmpDir, 'id_map.yaml');
    writeFileSync(idMapPath, 'some_key: value\n');
    expect(() => loadIdMap(idMapPath)).toThrow(ConfigError);
  });

  it('throws ConfigError when mappings is not an array', () => {
    const idMapPath = join(tmpDir, 'id_map.yaml');
    writeFileSync(idMapPath, 'mappings:\n  key: value\n');
    expect(() => loadIdMap(idMapPath)).toThrow(ConfigError);
  });

  it('parses valid mappings with file, id, and class fields', () => {
    const idMapPath = join(tmpDir, 'id_map.yaml');
    writeFileSync(
      idMapPath,
      ['mappings:', '  - file: module_a.ts', '    id: custom.module.a', '    class: ModuleA', '  - file: module_b.ts', '    id: custom.module.b', ''].join('\n'),
    );
    const result = loadIdMap(idMapPath);
    expect(result['module_a.ts']).toEqual({ id: 'custom.module.a', class: 'ModuleA' });
    expect(result['module_b.ts']).toEqual({ id: 'custom.module.b', class: null });
  });

  it('skips entries without file field', () => {
    const idMapPath = join(tmpDir, 'id_map.yaml');
    writeFileSync(
      idMapPath,
      ['mappings:', '  - file: valid.ts', '    id: valid.id', '  - id: orphan.id', ''].join('\n'),
    );
    const result = loadIdMap(idMapPath);
    expect(Object.keys(result)).toEqual(['valid.ts']);
  });

  it('handles empty mappings array', () => {
    const idMapPath = join(tmpDir, 'id_map.yaml');
    writeFileSync(idMapPath, 'mappings: []\n');
    const result = loadIdMap(idMapPath);
    expect(result).toEqual({});
  });
});
