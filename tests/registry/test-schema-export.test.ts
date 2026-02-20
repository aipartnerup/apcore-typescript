import { describe, it, expect } from 'vitest';
import { Type } from '@sinclair/typebox';
import { Registry } from '../../src/registry/registry.js';
import { FunctionModule } from '../../src/decorator.js';
import { ModuleNotFoundError } from '../../src/errors.js';
import {
  getSchema,
  exportSchema,
  getAllSchemas,
  exportAllSchemas,
} from '../../src/registry/schema-export.js';

const inputSchema = Type.Object({
  prompt: Type.String({ description: 'The input prompt' }),
  temperature: Type.Optional(Type.Number({ description: 'Sampling temperature' })),
});

const outputSchema = Type.Object({
  text: Type.String(),
});

function createModule(
  id: string,
  overrides?: Partial<ConstructorParameters<typeof FunctionModule>[0]>,
): FunctionModule {
  return new FunctionModule({
    execute: () => ({ text: 'hello' }),
    moduleId: id,
    inputSchema,
    outputSchema,
    description: 'A test module. It does many things.\nSecond paragraph.',
    tags: ['ai', 'test'],
    version: '2.0.0',
    annotations: {
      readonly: true,
      destructive: false,
      idempotent: true,
      requiresApproval: false,
      openWorld: false,
      streaming: false,
    },
    examples: [
      {
        title: 'Basic example',
        inputs: { prompt: 'hi' },
        output: { text: 'hello' },
        description: 'Simple greeting',
      },
    ],
    ...overrides,
  });
}

function makeRegistry(...modules: Array<[string, FunctionModule]>): Registry {
  const registry = new Registry();
  for (const [id, mod] of modules) {
    registry.register(id, mod);
  }
  return registry;
}

describe('getSchema', () => {
  it('returns null for unregistered module', () => {
    const registry = new Registry();
    expect(getSchema(registry, 'no.such.module')).toBeNull();
  });

  it('returns schema record with all expected fields', () => {
    const mod = createModule('test.gen');
    const registry = makeRegistry(['test.gen', mod]);

    const schema = getSchema(registry, 'test.gen');
    expect(schema).not.toBeNull();
    expect(schema!['module_id']).toBe('test.gen');
    expect(schema!['description']).toBe('A test module. It does many things.\nSecond paragraph.');
    expect(schema!['version']).toBe('2.0.0');
    expect(schema!['tags']).toEqual(['ai', 'test']);
    expect(schema!['input_schema']).toBeDefined();
    expect(schema!['output_schema']).toBeDefined();
    expect(schema!['examples']).toHaveLength(1);
  });

  it('copies tags array to prevent mutation', () => {
    const mod = createModule('test.tags');
    const registry = makeRegistry(['test.tags', mod]);

    const schema = getSchema(registry, 'test.tags');
    const tags = schema!['tags'] as string[];
    tags.push('injected');

    expect(mod.tags).toEqual(['ai', 'test']);
  });

  it('returns empty array for tags when module has null tags', () => {
    const mod = createModule('test.notags', { tags: null });
    const registry = makeRegistry(['test.notags', mod]);
    const schema = getSchema(registry, 'test.notags');
    expect(schema!['tags']).toEqual([]);
  });

  it('returns null annotations when module has no annotations', () => {
    const mod = createModule('test.noanno', { annotations: null });
    const registry = makeRegistry(['test.noanno', mod]);
    const schema = getSchema(registry, 'test.noanno');
    expect(schema!['annotations']).toBeNull();
  });
});

describe('exportSchema', () => {
  it('returns JSON string by default', () => {
    const mod = createModule('test.json');
    const registry = makeRegistry(['test.json', mod]);

    const result = exportSchema(registry, 'test.json');
    const parsed = JSON.parse(result);
    expect(parsed['module_id']).toBe('test.json');
    expect(parsed['version']).toBe('2.0.0');
  });

  it('returns YAML string when format is yaml', () => {
    const mod = createModule('test.yaml');
    const registry = makeRegistry(['test.yaml', mod]);

    const result = exportSchema(registry, 'test.yaml', 'yaml');
    expect(result).toContain('module_id:');
    expect(result).toContain('test.yaml');
  });

  it('throws ModuleNotFoundError for unregistered module', () => {
    const registry = new Registry();
    expect(() => exportSchema(registry, 'no.such.module')).toThrow(ModuleNotFoundError);
  });

  it('applies strict mode to input and output schemas', () => {
    const mod = createModule('test.strict');
    const registry = makeRegistry(['test.strict', mod]);

    const result = exportSchema(registry, 'test.strict', 'json', true);
    const parsed = JSON.parse(result);
    expect((parsed['input_schema'] as Record<string, unknown>)['additionalProperties']).toBe(false);
    expect((parsed['output_schema'] as Record<string, unknown>)['additionalProperties']).toBe(false);
  });

  it('compact mode truncates description at first sentence boundary', () => {
    const mod = createModule('test.compact');
    const registry = makeRegistry(['test.compact', mod]);

    const result = exportSchema(registry, 'test.compact', 'json', false, true);
    const parsed = JSON.parse(result);
    expect(parsed['description']).toBe('A test module.');
  });

  it('compact mode removes examples and documentation', () => {
    const mod = createModule('test.compact.ex', { documentation: 'Full docs' });
    const registry = makeRegistry(['test.compact.ex', mod]);

    const result = exportSchema(registry, 'test.compact.ex', 'json', false, true);
    const parsed = JSON.parse(result);
    expect(parsed['examples']).toBeUndefined();
    expect(parsed['documentation']).toBeUndefined();
  });

  it('strict takes precedence over compact when both are true', () => {
    const mod = createModule('test.both');
    const registry = makeRegistry(['test.both', mod]);

    const result = exportSchema(registry, 'test.both', 'json', true, true);
    const parsed = JSON.parse(result);
    expect((parsed['input_schema'] as Record<string, unknown>)['additionalProperties']).toBe(false);
    expect(parsed['description']).toBe('A test module. It does many things.\nSecond paragraph.');
    expect(parsed['examples']).toBeDefined();
  });
});

describe('getAllSchemas', () => {
  it('returns empty object for empty registry', () => {
    const registry = new Registry();
    expect(getAllSchemas(registry)).toEqual({});
  });

  it('returns all module schemas keyed by module id', () => {
    const modA = createModule('alpha');
    const modB = createModule('beta', { version: '3.0.0' });
    const registry = makeRegistry(['alpha', modA], ['beta', modB]);

    const result = getAllSchemas(registry);
    expect(Object.keys(result).sort()).toEqual(['alpha', 'beta']);
    expect(result['alpha']['module_id']).toBe('alpha');
    expect(result['beta']['version']).toBe('3.0.0');
  });
});

describe('exportAllSchemas', () => {
  it('serializes all schemas to JSON', () => {
    const modA = createModule('a.mod');
    const modB = createModule('b.mod');
    const registry = makeRegistry(['a.mod', modA], ['b.mod', modB]);

    const result = exportAllSchemas(registry);
    const parsed = JSON.parse(result);
    expect(Object.keys(parsed).sort()).toEqual(['a.mod', 'b.mod']);
  });

  it('supports YAML format', () => {
    const mod = createModule('yaml.mod');
    const registry = makeRegistry(['yaml.mod', mod]);

    const result = exportAllSchemas(registry, 'yaml');
    expect(result).toContain('yaml.mod');
  });

  it('applies strict mode to all schemas', () => {
    const modA = createModule('strict.a');
    const registry = makeRegistry(['strict.a', modA]);

    const result = exportAllSchemas(registry, 'json', true);
    const parsed = JSON.parse(result);
    expect((parsed['strict.a']['input_schema'] as Record<string, unknown>)['additionalProperties']).toBe(false);
  });

  it('returns empty JSON object for empty registry', () => {
    const registry = new Registry();
    expect(JSON.parse(exportAllSchemas(registry))).toEqual({});
  });
});
