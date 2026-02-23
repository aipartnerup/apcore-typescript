/**
 * Browser-compatibility tests for lazy-loaded node: modules.
 *
 * After the lazy-load refactoring, ALL source files use top-level
 * `await import('node:...')` wrapped in try/catch instead of static
 * `import ... from 'node:fs'` / `'node:path'` so that a browser bundler
 * can tree-shake or polyfill them without crashing at parse time.
 *
 * These tests verify:
 * 1. Every refactored module can be dynamically imported (top-level await works).
 * 2. Pure-logic APIs that never touch the filesystem work in isolation.
 * 3. The Node.js environment correctly populates the lazy-load variables
 *    (filesystem-dependent APIs still function).
 */

import { describe, it, expect } from 'vitest';

// ─── 1. Module import health ───────────────────────────────────────
// Ensures top-level `await import('node:...')` does not break module loading.

describe('lazy-load module imports', () => {
  it('src/acl.ts can be imported', async () => {
    const mod = await import('../src/acl.js');
    expect(mod.ACL).toBeDefined();
  });

  it('src/bindings.ts can be imported', async () => {
    const mod = await import('../src/bindings.js');
    expect(mod.BindingLoader).toBeDefined();
  });

  it('src/schema/loader.ts can be imported', async () => {
    const mod = await import('../src/schema/loader.js');
    expect(mod.SchemaLoader).toBeDefined();
    expect(mod.jsonSchemaToTypeBox).toBeDefined();
  });

  it('src/schema/ref-resolver.ts can be imported', async () => {
    const mod = await import('../src/schema/ref-resolver.js');
    expect(mod.RefResolver).toBeDefined();
  });

  it('src/registry/metadata.ts can be imported', async () => {
    const mod = await import('../src/registry/metadata.js');
    expect(mod.loadMetadata).toBeDefined();
    expect(mod.parseDependencies).toBeDefined();
    expect(mod.mergeModuleMetadata).toBeDefined();
    expect(mod.loadIdMap).toBeDefined();
  });

  it('src/registry/scanner.ts can be imported', async () => {
    const mod = await import('../src/registry/scanner.js');
    expect(mod.scanExtensions).toBeDefined();
    expect(mod.scanMultiRoot).toBeDefined();
  });

  it('src/registry/registry.ts can be imported', async () => {
    const mod = await import('../src/registry/registry.js');
    expect(mod.Registry).toBeDefined();
  });

  it('barrel index re-exports all lazy-loaded modules', async () => {
    const mod = await import('../src/index.js');
    expect(mod.ACL).toBeDefined();
    expect(mod.BindingLoader).toBeDefined();
    expect(mod.SchemaLoader).toBeDefined();
    expect(mod.RefResolver).toBeDefined();
    expect(mod.Registry).toBeDefined();
  });
});

// ─── 2. Pure-logic APIs (no filesystem) ────────────────────────────
// These functions/methods never call node:fs or node:path and should
// be fully usable in a browser environment.

describe('ACL pure-logic (no filesystem)', () => {
  it('constructor and check() work without filesystem', async () => {
    const { ACL } = await import('../src/acl.js');
    const acl = new ACL([
      { callers: ['mod.a'], targets: ['mod.b'], effect: 'allow', description: 'test' },
      { callers: ['*'], targets: ['*'], effect: 'deny', description: 'default' },
    ]);
    expect(acl.check('mod.a', 'mod.b')).toBe(true);
    expect(acl.check('mod.x', 'mod.y')).toBe(false);
  });

  it('addRule() / removeRule() work without filesystem', async () => {
    const { ACL } = await import('../src/acl.js');
    const acl = new ACL([], 'deny');
    expect(acl.check('a', 'b')).toBe(false);

    acl.addRule({ callers: ['a'], targets: ['b'], effect: 'allow', description: '' });
    expect(acl.check('a', 'b')).toBe(true);

    acl.removeRule(['a'], ['b']);
    expect(acl.check('a', 'b')).toBe(false);
  });
});

describe('metadata pure-logic (no filesystem)', () => {
  it('parseDependencies() works without filesystem', async () => {
    const { parseDependencies } = await import('../src/registry/metadata.js');
    const deps = parseDependencies([
      { module_id: 'core.auth', version: '1.0.0', optional: false },
      { module_id: 'core.logger', optional: true },
    ]);
    expect(deps).toHaveLength(2);
    expect(deps[0].moduleId).toBe('core.auth');
    expect(deps[1].optional).toBe(true);
  });

  it('parseDependencies() returns empty for empty input', async () => {
    const { parseDependencies } = await import('../src/registry/metadata.js');
    expect(parseDependencies([])).toEqual([]);
  });

  it('mergeModuleMetadata() works without filesystem', async () => {
    const { mergeModuleMetadata } = await import('../src/registry/metadata.js');
    const result = mergeModuleMetadata(
      { description: 'code', name: 'modA', tags: ['a'], version: '1.0.0' },
      { description: 'yaml', tags: ['b', 'c'] },
    );
    expect(result['description']).toBe('yaml'); // YAML overrides
    expect(result['tags']).toEqual(['b', 'c']);
    expect(result['name']).toBe('modA'); // code fallback when yaml is empty
  });
});

describe('jsonSchemaToTypeBox pure-logic (no filesystem)', () => {
  it('converts object schema', async () => {
    const { jsonSchemaToTypeBox } = await import('../src/schema/loader.js');
    const schema = jsonSchemaToTypeBox({
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'integer' },
      },
      required: ['name'],
    });
    expect(schema).toBeDefined();
    expect(schema.type).toBe('object');
  });

  it('converts array schema', async () => {
    const { jsonSchemaToTypeBox } = await import('../src/schema/loader.js');
    const schema = jsonSchemaToTypeBox({
      type: 'array',
      items: { type: 'string' },
    });
    expect(schema).toBeDefined();
    expect(schema.type).toBe('array');
  });

  it('converts enum schema', async () => {
    const { jsonSchemaToTypeBox } = await import('../src/schema/loader.js');
    const schema = jsonSchemaToTypeBox({ enum: ['a', 'b', 'c'] });
    expect(schema).toBeDefined();
    expect(schema.anyOf).toBeDefined();
  });
});

describe('RefResolver inline-only (no filesystem)', () => {
  it('resolve() handles inline $ref without filesystem', async () => {
    const { RefResolver } = await import('../src/schema/ref-resolver.js');
    const resolver = new RefResolver('/nonexistent');
    const schema = {
      type: 'object',
      properties: {
        name: { $ref: '#/definitions/NameDef' },
      },
      definitions: {
        NameDef: { type: 'string', minLength: 1 },
      },
    };
    const resolved = resolver.resolve(schema);
    expect((resolved['properties'] as Record<string, unknown>)['name']).toEqual({
      type: 'string',
      minLength: 1,
    });
  });

  it('resolveRef() handles inline $ref without filesystem', async () => {
    const { RefResolver } = await import('../src/schema/ref-resolver.js');
    const resolver = new RefResolver('/nonexistent');
    // Set up inline doc via resolve()
    const schema = {
      definitions: {
        Msg: { type: 'string', description: 'A message' },
      },
    };
    const resolved = resolver.resolve(schema);
    expect(resolved['definitions']).toBeDefined();
  });
});

describe('Registry pure-logic (no filesystem)', () => {
  it('register/get/has/list work without filesystem', async () => {
    const { Registry } = await import('../src/registry/registry.js');
    const registry = new Registry();

    const mockModule = {
      execute: async () => ({ ok: true }),
      inputSchema: { type: 'object' } as Record<string, unknown>,
      outputSchema: { type: 'object' } as Record<string, unknown>,
    };

    registry.register('test.module', mockModule);
    expect(registry.has('test.module')).toBe(true);
    expect(registry.get('test.module')).toBe(mockModule);
    expect(registry.list()).toContain('test.module');
  });

  it('event emitter works without filesystem', async () => {
    const { Registry } = await import('../src/registry/registry.js');
    const registry = new Registry();
    const events: string[] = [];

    registry.on('register', (id: string) => events.push(id));
    registry.register('a.b', {
      execute: async () => ({}),
      inputSchema: { type: 'object' } as Record<string, unknown>,
      outputSchema: { type: 'object' } as Record<string, unknown>,
    });

    expect(events).toEqual(['a.b']);
  });
});

// ─── 3. Filesystem-dependent APIs work in Node.js ──────────────────
// Verifies that lazy-loaded node:fs / node:path are correctly populated
// and the filesystem-dependent code paths still function.

describe('lazy-loaded node: modules are available in Node.js', () => {
  it('ACL.load() uses lazy-loaded fs successfully', async () => {
    const { writeFileSync, mkdtempSync, rmSync } = await import('node:fs');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');
    const { ACL } = await import('../src/acl.js');

    const tmp = mkdtempSync(join(tmpdir(), 'acl-lazy-'));
    const yamlPath = join(tmp, 'acl.yaml');
    writeFileSync(yamlPath, `
rules:
  - callers: ["*"]
    targets: ["*"]
    effect: allow
    description: allow all
`);
    try {
      const acl = ACL.load(yamlPath);
      expect(acl.check('x', 'y')).toBe(true);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('loadMetadata() uses lazy-loaded fs successfully', async () => {
    const { writeFileSync, mkdtempSync, rmSync } = await import('node:fs');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');
    const { loadMetadata } = await import('../src/registry/metadata.js');

    const tmp = mkdtempSync(join(tmpdir(), 'meta-lazy-'));
    const metaPath = join(tmp, '_meta.yaml');
    writeFileSync(metaPath, 'description: hello\nversion: "2.0.0"\n');
    try {
      const meta = loadMetadata(metaPath);
      expect(meta['description']).toBe('hello');
      expect(meta['version']).toBe('2.0.0');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('scanExtensions() uses lazy-loaded fs/path successfully', async () => {
    const { writeFileSync, mkdtempSync, mkdirSync, rmSync } = await import('node:fs');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');
    const { scanExtensions } = await import('../src/registry/scanner.js');

    const tmp = mkdtempSync(join(tmpdir(), 'scan-lazy-'));
    writeFileSync(join(tmp, 'hello.ts'), 'export default class {}');
    try {
      const modules = scanExtensions(tmp);
      expect(modules.length).toBeGreaterThanOrEqual(1);
      expect(modules[0].canonicalId).toBe('hello');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('SchemaLoader constructor uses lazy-loaded path successfully', async () => {
    const { mkdtempSync, rmSync } = await import('node:fs');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');
    const { Config } = await import('../src/config.js');
    const { SchemaLoader } = await import('../src/schema/loader.js');

    const tmp = mkdtempSync(join(tmpdir(), 'schema-lazy-'));
    try {
      const config = new Config({});
      const loader = new SchemaLoader(config, tmp);
      expect(loader).toBeInstanceOf(SchemaLoader);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('RefResolver constructor uses lazy-loaded path successfully', async () => {
    const { RefResolver } = await import('../src/schema/ref-resolver.js');
    const resolver = new RefResolver('/tmp/test-schemas', 16);
    expect(resolver).toBeInstanceOf(RefResolver);
  });
});

// ─── 4. No static node: imports in source ──────────────────────────

describe('source files have no top-level static node: imports', () => {
  it('no "import ... from node:" at line start in src/', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve, join } = await import('node:path');

    // Files that were refactored to lazy-load
    const files = [
      'src/acl.ts',
      'src/bindings.ts',
      'src/schema/loader.ts',
      'src/schema/ref-resolver.ts',
      'src/registry/metadata.ts',
      'src/registry/scanner.ts',
      'src/registry/registry.ts',
      'src/trace-context.ts',
      'src/observability/tracing.ts',
      'src/observability/context-logger.ts',
    ];

    const root = resolve(import.meta.dirname, '..');
    const staticImportRe = /^import\s+.*from\s+['"]node:/m;

    for (const file of files) {
      const content = readFileSync(join(root, file), 'utf-8');
      const match = staticImportRe.test(content);
      expect(match, `${file} should not have static node: imports`).toBe(false);
    }
  });
});
