import { describe, it, expect } from 'vitest';
import { resolveDependencies } from '../../src/registry/dependencies.js';
import { CircularDependencyError, ModuleLoadError } from '../../src/errors.js';

describe('resolveDependencies', () => {
  it('returns empty for empty input', () => {
    expect(resolveDependencies([])).toEqual([]);
  });

  it('returns single module', () => {
    const result = resolveDependencies([['mod.a', []]]);
    expect(result).toEqual(['mod.a']);
  });

  it('resolves linear dependency chain', () => {
    const modules: Array<[string, Array<{ moduleId: string; optional: boolean; version: string | null }>]> = [
      ['mod.b', [{ moduleId: 'mod.a', optional: false, version: null }]],
      ['mod.a', []],
    ];
    const result = resolveDependencies(modules);
    expect(result.indexOf('mod.a')).toBeLessThan(result.indexOf('mod.b'));
  });

  it('resolves diamond dependency', () => {
    const modules: Array<[string, Array<{ moduleId: string; optional: boolean; version: string | null }>]> = [
      ['mod.d', [{ moduleId: 'mod.b', optional: false, version: null }, { moduleId: 'mod.c', optional: false, version: null }]],
      ['mod.b', [{ moduleId: 'mod.a', optional: false, version: null }]],
      ['mod.c', [{ moduleId: 'mod.a', optional: false, version: null }]],
      ['mod.a', []],
    ];
    const result = resolveDependencies(modules);
    expect(result.indexOf('mod.a')).toBeLessThan(result.indexOf('mod.b'));
    expect(result.indexOf('mod.a')).toBeLessThan(result.indexOf('mod.c'));
    expect(result.indexOf('mod.b')).toBeLessThan(result.indexOf('mod.d'));
    expect(result.indexOf('mod.c')).toBeLessThan(result.indexOf('mod.d'));
  });

  it('throws CircularDependencyError on cycle', () => {
    const modules: Array<[string, Array<{ moduleId: string; optional: boolean; version: string | null }>]> = [
      ['mod.a', [{ moduleId: 'mod.b', optional: false, version: null }]],
      ['mod.b', [{ moduleId: 'mod.a', optional: false, version: null }]],
    ];
    expect(() => resolveDependencies(modules)).toThrow(CircularDependencyError);
  });

  it('throws ModuleLoadError for missing required dependency', () => {
    const modules: Array<[string, Array<{ moduleId: string; optional: boolean; version: string | null }>]> = [
      ['mod.a', [{ moduleId: 'mod.missing', optional: false, version: null }]],
    ];
    expect(() => resolveDependencies(modules)).toThrow(ModuleLoadError);
  });

  it('skips optional missing dependencies', () => {
    const modules: Array<[string, Array<{ moduleId: string; optional: boolean; version: string | null }>]> = [
      ['mod.a', [{ moduleId: 'mod.missing', optional: true, version: null }]],
    ];
    const result = resolveDependencies(modules);
    expect(result).toEqual(['mod.a']);
  });

  it('independent modules in deterministic order', () => {
    const modules: Array<[string, Array<{ moduleId: string; optional: boolean; version: string | null }>]> = [
      ['mod.c', []],
      ['mod.a', []],
      ['mod.b', []],
    ];
    const result = resolveDependencies(modules);
    expect(result).toEqual(['mod.a', 'mod.b', 'mod.c']);
  });
});
