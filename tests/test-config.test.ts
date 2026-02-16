import { describe, it, expect } from 'vitest';
import { Config } from '../src/config.js';

describe('Config', () => {
  it('creates with provided data', () => {
    const cfg = new Config({ name: 'test' });
    expect(cfg.get('name')).toBe('test');
  });

  it('creates with no arguments', () => {
    const cfg = new Config();
    expect(cfg.get('anything')).toBeUndefined();
  });

  it('returns various value types', () => {
    const cfg = new Config({
      str: 'hello',
      num: 42,
      bool: true,
      arr: [1, 2, 3],
      obj: { nested: true },
      nil: null,
    });
    expect(cfg.get('str')).toBe('hello');
    expect(cfg.get('num')).toBe(42);
    expect(cfg.get('bool')).toBe(true);
    expect(cfg.get('arr')).toEqual([1, 2, 3]);
    expect(cfg.get('obj')).toEqual({ nested: true });
    expect(cfg.get('nil')).toBeNull();
  });

  it('traverses nested objects with dot-path', () => {
    const cfg = new Config({
      database: {
        host: 'db.example.com',
        port: 5432,
        credentials: { user: 'admin', password: 'secret' },
      },
    });
    expect(cfg.get('database.host')).toBe('db.example.com');
    expect(cfg.get('database.port')).toBe(5432);
    expect(cfg.get('database.credentials.user')).toBe('admin');
  });

  it('returns nested object for partial path', () => {
    const cfg = new Config({ a: { b: { c: 'deep' } } });
    expect(cfg.get('a.b')).toEqual({ c: 'deep' });
  });

  it('returns undefined when key missing and no default', () => {
    const cfg = new Config({ x: 1 });
    expect(cfg.get('y')).toBeUndefined();
  });

  it('returns default value when key missing', () => {
    const cfg = new Config({ x: 1 });
    expect(cfg.get('y', 'fallback')).toBe('fallback');
    expect(cfg.get('y', 42)).toBe(42);
  });

  it('returns default when dot-path partially exists', () => {
    const cfg = new Config({ a: { b: 1 } });
    expect(cfg.get('a.c', 'default')).toBe('default');
    expect(cfg.get('a.b.c.d', 'deep-default')).toBe('deep-default');
  });

  it('returns default when traversal hits non-object', () => {
    const cfg = new Config({ a: 'string-value' });
    expect(cfg.get('a.b', 'default')).toBe('default');
  });

  it('returns default when traversal hits null', () => {
    const cfg = new Config({ a: null });
    expect(cfg.get('a.b', 'default')).toBe('default');
  });
});
