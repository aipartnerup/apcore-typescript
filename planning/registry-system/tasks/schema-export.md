# Task: Schema Export

## Goal

Implement schema query and export functions that extract module schema information from the registry and serialize it in JSON or YAML formats. Supports strict mode (via `toStrictSchema()` for OpenAI function calling compatibility), compact mode (truncated descriptions, stripped extensions), and LLM export profiles (MCP, OpenAI, Anthropic, Generic) through the `SchemaExporter` class. Functions operate on individual modules or across all registered modules.

## Files Involved

- `src/registry/schema-export.ts` -- Schema export function implementations
- `src/registry/registry.ts` -- `Registry` class (consumed as dependency)
- `src/schema/exporter.ts` -- `SchemaExporter` class
- `src/schema/strict.ts` -- `toStrictSchema()`, `stripExtensions()`
- `src/schema/types.ts` -- `ExportProfile`, `SchemaDefinition`
- `src/module.ts` -- `ModuleAnnotations`, `ModuleExample`
- `src/errors.ts` -- `ModuleNotFoundError`
- `tests/registry/test-schema-export.test.ts` -- Schema export tests

## Steps (TDD)

### Step 1: Implement getSchema() for single module

```typescript
import { describe, it, expect } from 'vitest';
import { Registry } from '../../src/registry/registry.js';
import { getSchema } from '../../src/registry/schema-export.js';

describe('getSchema', () => {
  it('should extract schema record from registered module', () => {
    const reg = new Registry();
    const mod = {
      name: 'Adder',
      description: 'Adds two numbers',
      version: '1.0.0',
      tags: ['math'],
      inputSchema: { type: 'object', properties: { a: { type: 'number' } } },
      outputSchema: { type: 'object', properties: { result: { type: 'number' } } },
      annotations: null,
      examples: [],
    };
    reg.register('math.add', mod);
    const schema = getSchema(reg, 'math.add');

    expect(schema).not.toBeNull();
    expect(schema!['module_id']).toBe('math.add');
    expect(schema!['name']).toBe('Adder');
    expect(schema!['description']).toBe('Adds two numbers');
    expect(schema!['version']).toBe('1.0.0');
    expect(schema!['tags']).toEqual(['math']);
    expect(schema!['input_schema']).toEqual(mod.inputSchema);
    expect(schema!['output_schema']).toEqual(mod.outputSchema);
  });

  it('should return null for non-existent module', () => {
    const reg = new Registry();
    expect(getSchema(reg, 'nonexistent')).toBeNull();
  });
});
```

### Step 2: Implement exportSchema() with JSON serialization

```typescript
import { exportSchema } from '../../src/registry/schema-export.js';

describe('exportSchema', () => {
  it('should export schema as formatted JSON string', () => {
    const reg = new Registry();
    reg.register('test.mod', {
      description: 'Test',
      inputSchema: { type: 'object' },
      outputSchema: { type: 'object' },
      execute: async () => ({}),
    });
    const json = exportSchema(reg, 'test.mod', 'json');
    const parsed = JSON.parse(json);
    expect(parsed['module_id']).toBe('test.mod');
    expect(parsed['description']).toBe('Test');
  });

  it('should throw ModuleNotFoundError for missing module', () => {
    const reg = new Registry();
    expect(() => exportSchema(reg, 'missing')).toThrow();
  });
});
```

### Step 3: YAML format serialization

```typescript
it('should export schema as YAML string', () => {
  const reg = new Registry();
  reg.register('yaml.mod', {
    description: 'YAML test',
    inputSchema: { type: 'object' },
    outputSchema: { type: 'object' },
    execute: async () => ({}),
  });
  const yamlStr = exportSchema(reg, 'yaml.mod', 'yaml');
  expect(yamlStr).toContain('module_id');
  expect(yamlStr).toContain('yaml.mod');
});
```

### Step 4: Strict mode with toStrictSchema()

```typescript
it('should apply strict mode transformations', () => {
  const reg = new Registry();
  reg.register('strict.mod', {
    description: 'Strict test',
    inputSchema: {
      type: 'object',
      properties: { a: { type: 'number' } },
    },
    outputSchema: { type: 'object' },
    execute: async () => ({}),
  });
  const json = exportSchema(reg, 'strict.mod', 'json', true);
  const parsed = JSON.parse(json);
  // Strict mode adds additionalProperties: false, required arrays
  expect(parsed['input_schema']).toBeDefined();
});
```

### Step 5: Compact mode with truncated descriptions

```typescript
it('should apply compact mode transformations', () => {
  const reg = new Registry();
  reg.register('compact.mod', {
    description: 'First sentence. Second sentence with more details.',
    inputSchema: { type: 'object' },
    outputSchema: { type: 'object' },
    execute: async () => ({}),
  });
  const json = exportSchema(reg, 'compact.mod', 'json', false, true);
  const parsed = JSON.parse(json);
  expect(parsed['description']).toBe('First sentence.');
  expect(parsed['documentation']).toBeUndefined();
  expect(parsed['examples']).toBeUndefined();
});
```

### Step 6: LLM export profile support

```typescript
it('should export with LLM profile', () => {
  const reg = new Registry();
  reg.register('profile.mod', {
    description: 'Profile test',
    inputSchema: { type: 'object', properties: {} },
    outputSchema: { type: 'object' },
    execute: async () => ({}),
  });
  const json = exportSchema(reg, 'profile.mod', 'json', false, false, 'generic');
  const parsed = JSON.parse(json);
  expect(parsed).toBeDefined();
});
```

### Step 7: Implement getAllSchemas()

```typescript
import { getAllSchemas } from '../../src/registry/schema-export.js';

describe('getAllSchemas', () => {
  it('should return schema records for all registered modules', () => {
    const reg = new Registry();
    reg.register('mod.a', {
      description: 'A',
      inputSchema: { type: 'object' },
      outputSchema: { type: 'object' },
      execute: async () => ({}),
    });
    reg.register('mod.b', {
      description: 'B',
      inputSchema: { type: 'object' },
      outputSchema: { type: 'object' },
      execute: async () => ({}),
    });
    const schemas = getAllSchemas(reg);
    expect(Object.keys(schemas)).toHaveLength(2);
    expect(schemas['mod.a']['module_id']).toBe('mod.a');
    expect(schemas['mod.b']['module_id']).toBe('mod.b');
  });

  it('should return empty object for empty registry', () => {
    const reg = new Registry();
    expect(getAllSchemas(reg)).toEqual({});
  });
});
```

### Step 8: Implement exportAllSchemas()

```typescript
import { exportAllSchemas } from '../../src/registry/schema-export.js';

describe('exportAllSchemas', () => {
  it('should export all schemas as JSON string', () => {
    const reg = new Registry();
    reg.register('all.a', {
      description: 'A',
      inputSchema: { type: 'object' },
      outputSchema: { type: 'object' },
      execute: async () => ({}),
    });
    const json = exportAllSchemas(reg);
    const parsed = JSON.parse(json);
    expect(parsed['all.a']).toBeDefined();
  });

  it('should apply strict mode to all schemas', () => {
    const reg = new Registry();
    reg.register('strict.all', {
      description: 'Strict all',
      inputSchema: { type: 'object', properties: { x: { type: 'string' } } },
      outputSchema: { type: 'object' },
      execute: async () => ({}),
    });
    const json = exportAllSchemas(reg, 'json', true);
    const parsed = JSON.parse(json);
    expect(parsed['strict.all']).toBeDefined();
  });

  it('should export all schemas as YAML', () => {
    const reg = new Registry();
    reg.register('yaml.all', {
      description: 'YAML',
      inputSchema: { type: 'object' },
      outputSchema: { type: 'object' },
      execute: async () => ({}),
    });
    const yamlStr = exportAllSchemas(reg, 'yaml');
    expect(yamlStr).toContain('yaml.all');
  });
});
```

## Acceptance Criteria

- [x] `getSchema()` extracts module_id, name, description, version, tags, input_schema, output_schema, annotations, examples
- [x] `getSchema()` returns null for non-existent modules
- [x] `exportSchema()` serializes to JSON (default) and YAML formats
- [x] `exportSchema()` throws `ModuleNotFoundError` for missing modules
- [x] Strict mode applies `toStrictSchema()` to input and output schemas
- [x] Compact mode truncates description at first sentence boundary and strips extensions/documentation/examples
- [x] LLM export profiles (MCP, OpenAI, Anthropic, Generic) are delegated to `SchemaExporter`
- [x] `getAllSchemas()` returns schema records keyed by module ID for all registered modules
- [x] `exportAllSchemas()` serializes all schemas with optional strict/compact/profile modes
- [x] Strict and compact modes are mutually exclusive (strict takes precedence)
- [x] `deepCopy()` prevents mutation of source module data during transformation
- [x] All tests pass with `vitest`

## Dependencies

- `registry-core` task (Registry class)

## Estimated Time

3 hours
