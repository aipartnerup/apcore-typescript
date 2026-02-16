import { describe, it, expect } from 'vitest';
import { Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { jsonSchemaToTypeBox } from '../../src/schema/loader.js';

describe('jsonSchemaToTypeBox', () => {
  it('converts string type', () => {
    const schema = jsonSchemaToTypeBox({ type: 'string' });
    expect(Value.Check(schema, 'hello')).toBe(true);
    expect(Value.Check(schema, 123)).toBe(false);
  });

  it('converts integer type', () => {
    const schema = jsonSchemaToTypeBox({ type: 'integer' });
    expect(Value.Check(schema, 42)).toBe(true);
    expect(Value.Check(schema, 3.14)).toBe(false);
  });

  it('converts number type', () => {
    const schema = jsonSchemaToTypeBox({ type: 'number' });
    expect(Value.Check(schema, 3.14)).toBe(true);
    expect(Value.Check(schema, 'abc')).toBe(false);
  });

  it('converts boolean type', () => {
    const schema = jsonSchemaToTypeBox({ type: 'boolean' });
    expect(Value.Check(schema, true)).toBe(true);
    expect(Value.Check(schema, 'true')).toBe(false);
  });

  it('converts null type', () => {
    const schema = jsonSchemaToTypeBox({ type: 'null' });
    expect(Value.Check(schema, null)).toBe(true);
    expect(Value.Check(schema, undefined)).toBe(false);
  });

  it('converts object with properties', () => {
    const schema = jsonSchemaToTypeBox({
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'integer' },
      },
      required: ['name'],
    });
    expect(Value.Check(schema, { name: 'Alice', age: 30 })).toBe(true);
    expect(Value.Check(schema, { name: 'Alice' })).toBe(true);
    expect(Value.Check(schema, { age: 30 })).toBe(false);
  });

  it('converts array type', () => {
    const schema = jsonSchemaToTypeBox({
      type: 'array',
      items: { type: 'string' },
    });
    expect(Value.Check(schema, ['a', 'b'])).toBe(true);
    expect(Value.Check(schema, [1, 2])).toBe(false);
  });

  it('converts enum', () => {
    const schema = jsonSchemaToTypeBox({ enum: ['a', 'b', 'c'] });
    expect(Value.Check(schema, 'a')).toBe(true);
    expect(Value.Check(schema, 'd')).toBe(false);
  });

  it('converts anyOf', () => {
    const schema = jsonSchemaToTypeBox({
      anyOf: [{ type: 'string' }, { type: 'number' }],
    });
    expect(Value.Check(schema, 'hello')).toBe(true);
    expect(Value.Check(schema, 42)).toBe(true);
    expect(Value.Check(schema, true)).toBe(false);
  });

  it('returns Unknown for unrecognized schema', () => {
    const schema = jsonSchemaToTypeBox({});
    expect(Value.Check(schema, 'anything')).toBe(true);
    expect(Value.Check(schema, 42)).toBe(true);
  });

  it('converts string with constraints', () => {
    const schema = jsonSchemaToTypeBox({ type: 'string', minLength: 2, maxLength: 5 });
    expect(Value.Check(schema, 'ab')).toBe(true);
    expect(Value.Check(schema, 'a')).toBe(false);
    expect(Value.Check(schema, 'abcdef')).toBe(false);
  });

  it('converts object without properties', () => {
    const schema = jsonSchemaToTypeBox({ type: 'object' });
    expect(Value.Check(schema, { any: 'value' })).toBe(true);
  });

  it('converts array without items', () => {
    const schema = jsonSchemaToTypeBox({ type: 'array' });
    expect(Value.Check(schema, [1, 'two', true])).toBe(true);
  });
});
