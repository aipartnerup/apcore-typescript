/**
 * Package integrity tests.
 *
 * Verifies that the npm package is correctly configured for publishing:
 * - Entry points (main, types, exports) reference files that exist after build
 * - The "files" field restricts what gets published
 * - The "prepublishOnly" script ensures build runs before publish
 * - The VERSION constant matches package.json version
 */

import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = resolve(import.meta.dirname, '..');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));

describe('package.json publishing config', () => {
  it('has "files" field that includes dist', () => {
    expect(pkg.files).toBeDefined();
    expect(pkg.files).toContain('dist');
  });

  it('"files" does not include source or dev directories', () => {
    const forbidden = ['src', 'tests', 'planning', 'coverage', '.claude', '.github'];
    for (const dir of forbidden) {
      expect(pkg.files, `files should not include "${dir}"`).not.toContain(dir);
    }
  });

  it('has prepublishOnly script that runs build', () => {
    expect(pkg.scripts.prepublishOnly).toBeDefined();
    expect(pkg.scripts.prepublishOnly).toContain('build');
  });
});

describe('dist entry points exist', () => {
  it('main entry (./dist/index.js) exists', () => {
    const mainPath = resolve(ROOT, pkg.main);
    expect(existsSync(mainPath), `${pkg.main} should exist`).toBe(true);
  });

  it('types entry (./dist/index.d.ts) exists', () => {
    const typesPath = resolve(ROOT, pkg.types);
    expect(existsSync(typesPath), `${pkg.types} should exist`).toBe(true);
  });

  it('exports "." import entry exists', () => {
    const importPath = resolve(ROOT, pkg.exports['.'].import);
    expect(existsSync(importPath), `exports["."].import should exist`).toBe(true);
  });

  it('exports "." types entry exists', () => {
    const typesPath = resolve(ROOT, pkg.exports['.'].types);
    expect(existsSync(typesPath), `exports["."].types should exist`).toBe(true);
  });
});

describe('dist exports are loadable', () => {
  it('can import the package entry point', async () => {
    const mod = await import('../dist/index.js');
    expect(mod).toBeDefined();
    expect(typeof mod).toBe('object');
  });

  it('exports key symbols', async () => {
    const mod = await import('../dist/index.js');
    // Core classes/functions that consumers depend on
    expect(mod.Registry).toBeDefined();
    expect(mod.Executor).toBeDefined();
    expect(mod.Context).toBeDefined();
    expect(mod.Config).toBeDefined();
    expect(mod.ACL).toBeDefined();
    expect(mod.CancelToken).toBeDefined();
    expect(mod.MiddlewareManager).toBeDefined();
    expect(mod.ExtensionManager).toBeDefined();
    expect(mod.AsyncTaskManager).toBeDefined();
    expect(mod.BindingLoader).toBeDefined();
    expect(mod.SchemaLoader).toBeDefined();
    expect(mod.SchemaValidator).toBeDefined();
    expect(mod.TracingMiddleware).toBeDefined();
    expect(mod.MetricsCollector).toBeDefined();
    expect(mod.ContextLogger).toBeDefined();
    expect(mod.TraceContext).toBeDefined();
    // Error classes
    expect(mod.ModuleError).toBeDefined();
    expect(mod.ErrorCodes).toBeDefined();
  });
});

describe('VERSION constant', () => {
  it('matches package.json version', async () => {
    const mod = await import('../dist/index.js');
    expect(mod.VERSION).toBe(pkg.version);
  });
});
