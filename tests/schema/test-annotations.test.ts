/**
 * Tests for schema/annotations.ts — annotation conflict resolution.
 */

import { describe, it, expect } from 'vitest';
import { mergeAnnotations, mergeExamples, mergeMetadata } from '../../src/schema/annotations.js';
import { DEFAULT_ANNOTATIONS } from '../../src/module.js';
import type { ModuleAnnotations, ModuleExample } from '../../src/module.js';

describe('mergeAnnotations', () => {
  it('returns defaults when both inputs are null', () => {
    const result = mergeAnnotations(null, null);
    expect(result).toEqual(DEFAULT_ANNOTATIONS);
  });

  it('returns defaults when both inputs are undefined', () => {
    const result = mergeAnnotations(undefined, undefined);
    expect(result).toEqual(DEFAULT_ANNOTATIONS);
  });

  it('applies code annotations over defaults', () => {
    const codeAnnotations: ModuleAnnotations = {
      readonly: true,
      destructive: false,
      idempotent: true,
      requiresApproval: false,
      openWorld: false,
      streaming: false,
    };
    const result = mergeAnnotations(null, codeAnnotations);
    expect(result.readonly).toBe(true);
    expect(result.idempotent).toBe(true);
    expect(result.openWorld).toBe(false);
  });

  it('yaml annotations override code annotations', () => {
    const codeAnnotations: ModuleAnnotations = {
      readonly: true,
      destructive: false,
      idempotent: false,
      requiresApproval: false,
      openWorld: true,
      streaming: false,
    };
    const yamlAnnotations = { readonly: false, destructive: true };
    const result = mergeAnnotations(yamlAnnotations, codeAnnotations);
    expect(result.readonly).toBe(false);
    expect(result.destructive).toBe(true);
    expect(result.idempotent).toBe(false);
  });

  it('ignores unknown yaml keys', () => {
    const yamlAnnotations = { unknownKey: 'value', readonly: true };
    const result = mergeAnnotations(yamlAnnotations, null);
    expect(result.readonly).toBe(true);
    expect((result as unknown as Record<string, unknown>)['unknownKey']).toBeUndefined();
  });
});

describe('mergeExamples', () => {
  it('returns empty array when both inputs are null', () => {
    expect(mergeExamples(null, null)).toEqual([]);
  });

  it('returns empty array when both inputs are undefined', () => {
    expect(mergeExamples(undefined, undefined)).toEqual([]);
  });

  it('returns yaml examples when present', () => {
    const yamlExamples = [
      { title: 'Test', inputs: { a: 1 }, output: { b: 2 }, description: 'desc' },
    ];
    const result = mergeExamples(yamlExamples, null);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Test');
    expect(result[0].inputs).toEqual({ a: 1 });
    expect(result[0].output).toEqual({ b: 2 });
    expect(result[0].description).toBe('desc');
  });

  it('uses code examples when yaml is null', () => {
    const codeExamples: ModuleExample[] = [
      { title: 'Code', inputs: { x: 1 }, output: { y: 2 } },
    ];
    const result = mergeExamples(null, codeExamples);
    expect(result).toEqual(codeExamples);
  });

  it('yaml examples take precedence over code examples', () => {
    const yamlExamples = [{ title: 'YAML', inputs: {}, output: {} }];
    const codeExamples: ModuleExample[] = [
      { title: 'Code', inputs: {}, output: {} },
    ];
    const result = mergeExamples(yamlExamples, codeExamples);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('YAML');
  });

  it('handles yaml examples with missing optional fields', () => {
    const yamlExamples = [{ title: 'Minimal' }];
    const result = mergeExamples(yamlExamples as Array<Record<string, unknown>>, null);
    expect(result[0].inputs).toEqual({});
    expect(result[0].output).toEqual({});
    expect(result[0].description).toBeUndefined();
  });
});

describe('mergeMetadata', () => {
  it('returns empty object when both inputs are null', () => {
    expect(mergeMetadata(null, null)).toEqual({});
  });

  it('returns code metadata when yaml is null', () => {
    const code = { key: 'value' };
    expect(mergeMetadata(null, code)).toEqual({ key: 'value' });
  });

  it('returns yaml metadata when code is null', () => {
    const yaml = { key: 'value' };
    expect(mergeMetadata(yaml, null)).toEqual({ key: 'value' });
  });

  it('yaml overrides code on conflicting keys', () => {
    const code = { a: 1, b: 2 };
    const yaml = { b: 3, c: 4 };
    const result = mergeMetadata(yaml, code);
    expect(result).toEqual({ a: 1, b: 3, c: 4 });
  });

  it('does not mutate input objects', () => {
    const code = { a: 1 };
    const yaml = { b: 2 };
    mergeMetadata(yaml, code);
    expect(code).toEqual({ a: 1 });
    expect(yaml).toEqual({ b: 2 });
  });
});
