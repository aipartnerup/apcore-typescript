import { describe, it, expect } from 'vitest';
import { RefResolver } from '../../src/schema/ref-resolver.js';
import { SchemaCircularRefError, SchemaNotFoundError } from '../../src/errors.js';

describe('RefResolver', () => {
  it('resolves local $ref', () => {
    const resolver = new RefResolver('/tmp/schemas');
    const schema = {
      type: 'object',
      properties: {
        name: { $ref: '#/definitions/NameType' },
      },
      definitions: {
        NameType: { type: 'string' },
      },
    };
    const resolved = resolver.resolve(schema);
    expect((resolved['properties'] as Record<string, unknown>)['name']).toEqual({ type: 'string' });
  });

  it('detects circular references', () => {
    const resolver = new RefResolver('/tmp/schemas');
    const schema = {
      definitions: {
        A: { $ref: '#/definitions/B' },
        B: { $ref: '#/definitions/A' },
      },
      type: 'object',
      properties: {
        x: { $ref: '#/definitions/A' },
      },
    };
    expect(() => resolver.resolve(schema)).toThrow(SchemaCircularRefError);
  });

  it('resolves nested $ref', () => {
    const resolver = new RefResolver('/tmp/schemas');
    const schema = {
      type: 'object',
      properties: {
        user: { $ref: '#/definitions/User' },
      },
      definitions: {
        User: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
        },
      },
    };
    const resolved = resolver.resolve(schema);
    const user = (resolved['properties'] as Record<string, unknown>)['user'] as Record<string, unknown>;
    expect(user['type']).toBe('object');
    expect(user['properties']).toBeDefined();
  });

  it('throws SchemaNotFoundError for missing pointer segment', () => {
    const resolver = new RefResolver('/tmp/schemas');
    const schema = {
      type: 'object',
      properties: {
        x: { $ref: '#/definitions/Missing' },
      },
      definitions: {},
    };
    expect(() => resolver.resolve(schema)).toThrow(SchemaNotFoundError);
  });

  it('clearCache works', () => {
    const resolver = new RefResolver('/tmp/schemas');
    resolver.clearCache();
    // Should not throw
  });

  it('respects max depth', () => {
    const resolver = new RefResolver('/tmp/schemas', 2);
    // Properties must come before definitions so the $ref chain isn't
    // collapsed by in-place resolution of definitions first.
    const schema = {
      type: 'object',
      properties: {
        x: { $ref: '#/definitions/A' },
      },
      definitions: {
        A: { $ref: '#/definitions/B' },
        B: { $ref: '#/definitions/C' },
        C: { type: 'string' },
      },
    };
    expect(() => resolver.resolve(schema)).toThrow(SchemaCircularRefError);
  });

  it('resolves schema without $ref unchanged', () => {
    const resolver = new RefResolver('/tmp/schemas');
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    };
    const resolved = resolver.resolve(schema);
    expect(resolved).toEqual(schema);
  });
});
