import { describe, it, expect } from 'vitest';
import { toStrictSchema, applyLlmDescriptions, stripExtensions } from '../../src/schema/strict.js';

describe('toStrictSchema', () => {
  it('adds additionalProperties: false', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      required: ['name'],
    };
    const strict = toStrictSchema(schema);
    expect(strict['additionalProperties']).toBe(false);
  });

  it('makes all properties required', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'integer' },
      },
      required: ['name'],
    };
    const strict = toStrictSchema(schema);
    expect(strict['required']).toEqual(['age', 'name']);
  });

  it('makes optional properties nullable', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'integer' },
      },
      required: ['name'],
    };
    const strict = toStrictSchema(schema);
    const props = strict['properties'] as Record<string, Record<string, unknown>>;
    expect(props['age']['type']).toEqual(['integer', 'null']);
    expect(props['name']['type']).toBe('string');
  });

  it('does not modify original schema', () => {
    const schema: Record<string, unknown> = {
      type: 'object',
      properties: { name: { type: 'string' } },
    };
    toStrictSchema(schema);
    expect(schema['additionalProperties']).toBeUndefined();
  });

  it('strips x- extensions', () => {
    const schema = {
      type: 'object',
      'x-sensitive': true,
      properties: {
        name: { type: 'string', 'x-llm-description': 'Name field' },
      },
    };
    const strict = toStrictSchema(schema);
    expect(strict['x-sensitive']).toBeUndefined();
    const props = strict['properties'] as Record<string, Record<string, unknown>>;
    expect(props['name']['x-llm-description']).toBeUndefined();
  });

  it('strips default values', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string', default: 'world' },
      },
    };
    const strict = toStrictSchema(schema);
    const props = strict['properties'] as Record<string, Record<string, unknown>>;
    expect(props['name']['default']).toBeUndefined();
  });
});

describe('applyLlmDescriptions', () => {
  it('replaces description with x-llm-description', () => {
    const schema = {
      description: 'Original',
      'x-llm-description': 'LLM version',
      properties: {
        name: {
          type: 'string',
          description: 'Name',
          'x-llm-description': 'User name for LLM',
        },
      },
    };
    applyLlmDescriptions(schema);
    expect(schema['description']).toBe('LLM version');
    expect((schema['properties'] as Record<string, Record<string, unknown>>)['name']['description']).toBe('User name for LLM');
  });

  it('does not modify without x-llm-description', () => {
    const schema = { description: 'Original' };
    applyLlmDescriptions(schema);
    expect(schema['description']).toBe('Original');
  });
});

describe('stripExtensions', () => {
  it('removes x- prefixed keys', () => {
    const schema: Record<string, unknown> = {
      type: 'string',
      'x-custom': 'value',
      'x-another': 123,
    };
    stripExtensions(schema);
    expect(schema['x-custom']).toBeUndefined();
    expect(schema['x-another']).toBeUndefined();
    expect(schema['type']).toBe('string');
  });

  it('removes default key', () => {
    const schema: Record<string, unknown> = {
      type: 'string',
      default: 'hello',
    };
    stripExtensions(schema);
    expect(schema['default']).toBeUndefined();
  });

  it('handles nested structures', () => {
    const schema: Record<string, unknown> = {
      type: 'object',
      properties: {
        name: { type: 'string', 'x-sensitive': true },
      },
    };
    stripExtensions(schema);
    const props = schema['properties'] as Record<string, Record<string, unknown>>;
    expect(props['name']['x-sensitive']).toBeUndefined();
  });
});
