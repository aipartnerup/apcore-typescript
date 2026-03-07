/**
 * Unit tests for APCore client class.
 */

import { describe, it, expect } from 'vitest';
import { Type } from '@sinclair/typebox';
import { APCore } from '../src/client.js';
import { Config } from '../src/config.js';
import { FunctionModule } from '../src/decorator.js';
import { Executor } from '../src/executor.js';
import { ModuleNotFoundError } from '../src/errors.js';
import { Middleware } from '../src/middleware/index.js';
import { Registry } from '../src/registry/registry.js';
import type { Context } from '../src/context.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const AddInputSchema = Type.Object({ a: Type.Number(), b: Type.Number() });
const AddOutputSchema = Type.Object({ result: Type.Number() });

function registerAdd(client: APCore, id = 'math.add'): FunctionModule {
  return client.module({
    id,
    inputSchema: AddInputSchema,
    outputSchema: AddOutputSchema,
    description: 'Add two numbers',
    execute: (inputs) => ({ result: (inputs.a as number) + (inputs.b as number) }),
  });
}

class TrackingMiddleware extends Middleware {
  beforeCalled = false;
  afterCalled = false;

  override before(
    _moduleId: string,
    _inputs: Record<string, unknown>,
    _context: Context,
  ): null {
    this.beforeCalled = true;
    return null;
  }

  override after(
    _moduleId: string,
    _inputs: Record<string, unknown>,
    _output: Record<string, unknown>,
    _context: Context,
  ): null {
    this.afterCalled = true;
    return null;
  }
}

// ---------------------------------------------------------------------------
// Construction tests
// ---------------------------------------------------------------------------

describe('APCore construction', () => {
  it('creates default Registry and Executor', () => {
    const client = new APCore();
    expect(client.registry).toBeInstanceOf(Registry);
    expect(client.executor).toBeInstanceOf(Executor);
    expect(client.config).toBeNull();
  });

  it('accepts a custom Registry', () => {
    const registry = new Registry();
    const client = new APCore({ registry });
    expect(client.registry).toBe(registry);
  });

  it('accepts a custom Executor', () => {
    const registry = new Registry();
    const executor = new Executor({ registry });
    const client = new APCore({ registry, executor });
    expect(client.executor).toBe(executor);
  });

  it('passes config through to auto-created Executor', () => {
    const config = new Config({ extensions: { root: '/tmp' } });
    const client = new APCore({ config });
    expect(client.config).toBe(config);
  });
});

// ---------------------------------------------------------------------------
// Module registration tests
// ---------------------------------------------------------------------------

describe('APCore.module()', () => {
  it('returns a FunctionModule', () => {
    const client = new APCore();
    const fm = registerAdd(client);
    expect(fm).toBeInstanceOf(FunctionModule);
  });

  it('registers the module in the registry', () => {
    const client = new APCore();
    registerAdd(client);
    expect(client.registry.has('math.add')).toBe(true);
  });

  it('sets description and metadata', () => {
    const client = new APCore();
    const fm = client.module({
      id: 'math.add',
      inputSchema: AddInputSchema,
      outputSchema: AddOutputSchema,
      description: 'Add two numbers',
      tags: ['math'],
      version: '2.0.0',
      execute: (inputs) => ({ result: (inputs.a as number) + (inputs.b as number) }),
    });
    expect(fm.description).toBe('Add two numbers');
    expect(fm.tags).toEqual(['math']);
    expect(fm.version).toBe('2.0.0');
  });
});

describe('APCore.register()', () => {
  it('registers a class-based module', async () => {
    const client = new APCore();

    const addModule = {
      inputSchema: AddInputSchema,
      outputSchema: AddOutputSchema,
      description: 'Add two numbers',
      async execute(inputs: Record<string, unknown>) {
        return { result: (inputs.a as number) + (inputs.b as number) };
      },
    };

    client.register('math.add', addModule);
    expect(client.registry.has('math.add')).toBe(true);

    const result = await client.call('math.add', { a: 10, b: 5 });
    expect(result).toEqual({ result: 15 });
  });
});

// ---------------------------------------------------------------------------
// Call tests
// ---------------------------------------------------------------------------

describe('APCore.call()', () => {
  it('executes a module and returns the result', async () => {
    const client = new APCore();
    registerAdd(client);

    const result = await client.call('math.add', { a: 10, b: 5 });
    expect(result).toEqual({ result: 15 });
  });

  it('throws ModuleNotFoundError for unknown module', async () => {
    const client = new APCore();
    await expect(client.call('nonexistent.module', { a: 1 })).rejects.toThrow(ModuleNotFoundError);
  });
});

// ---------------------------------------------------------------------------
// Middleware tests
// ---------------------------------------------------------------------------

describe('APCore.use()', () => {
  it('returns self for chaining', () => {
    const client = new APCore();
    const mw = new TrackingMiddleware();
    const result = client.use(mw);
    expect(result).toBe(client);
  });

  it('supports chaining multiple middlewares', () => {
    const client = new APCore();
    const mw1 = new TrackingMiddleware();
    const mw2 = new TrackingMiddleware();
    const result = client.use(mw1).use(mw2);
    expect(result).toBe(client);
  });

  it('fires middleware during call', async () => {
    const client = new APCore();
    const mw = new TrackingMiddleware();
    client.use(mw);
    registerAdd(client);

    await client.call('math.add', { a: 1, b: 2 });
    expect(mw.beforeCalled).toBe(true);
    expect(mw.afterCalled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Discover tests
// ---------------------------------------------------------------------------

describe('APCore.discover()', () => {
  it('delegates to registry.discover()', async () => {
    const client = new APCore();
    // Without a valid extensions dir, discover() should throw
    await expect(client.discover()).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// ListModules tests
// ---------------------------------------------------------------------------

describe('APCore.listModules()', () => {
  it('returns empty array when no modules registered', () => {
    const client = new APCore();
    expect(client.listModules()).toEqual([]);
  });

  it('returns sorted module IDs', () => {
    const client = new APCore();
    registerAdd(client, 'math.add');

    client.module({
      id: 'greet.hello',
      inputSchema: Type.Object({ name: Type.String() }),
      outputSchema: Type.Object({ message: Type.String() }),
      execute: (inputs) => ({ message: `Hello, ${inputs.name}` }),
    });

    expect(client.listModules()).toEqual(['greet.hello', 'math.add']);
  });

  it('filters by prefix', () => {
    const client = new APCore();
    registerAdd(client, 'math.add');

    client.module({
      id: 'greet.hello',
      inputSchema: Type.Object({ name: Type.String() }),
      outputSchema: Type.Object({ message: Type.String() }),
      execute: (inputs) => ({ message: `Hello, ${inputs.name}` }),
    });

    expect(client.listModules({ prefix: 'math' })).toEqual(['math.add']);
  });

  it('filters by tags', () => {
    const client = new APCore();

    client.module({
      id: 'math.add',
      inputSchema: AddInputSchema,
      outputSchema: AddOutputSchema,
      tags: ['math', 'core'],
      execute: (inputs) => ({ result: (inputs.a as number) + (inputs.b as number) }),
    });

    client.module({
      id: 'greet.hello',
      inputSchema: Type.Object({ name: Type.String() }),
      outputSchema: Type.Object({ message: Type.String() }),
      tags: ['greet'],
      execute: (inputs) => ({ message: `Hello, ${inputs.name}` }),
    });

    expect(client.listModules({ tags: ['math'] })).toEqual(['math.add']);
  });
});

// ---------------------------------------------------------------------------
// Stream tests
// ---------------------------------------------------------------------------

describe('APCore.stream()', () => {
  it('yields chunks from a streaming module', async () => {
    const client = new APCore();
    registerAdd(client);

    const chunks: Record<string, unknown>[] = [];
    for await (const chunk of client.stream('math.add', { a: 3, b: 4 })) {
      chunks.push(chunk);
    }
    // FunctionModule does not implement stream(), so executor falls back to single-chunk
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toEqual({ result: 7 });
  });

  it('throws ModuleNotFoundError for unknown module', async () => {
    const client = new APCore();
    const gen = client.stream('nonexistent.module', { a: 1 });
    await expect(gen.next()).rejects.toThrow(ModuleNotFoundError);
  });
});

// ---------------------------------------------------------------------------
// Validate tests
// ---------------------------------------------------------------------------

describe('APCore.validate()', () => {
  it('returns valid PreflightResult for correct inputs', () => {
    const client = new APCore();
    registerAdd(client);

    const result = client.validate('math.add', { a: 1, b: 2 });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.requiresApproval).toBe(false);
    expect(result.checks.length).toBeGreaterThan(0);
  });

  it('returns invalid PreflightResult for bad inputs', () => {
    const client = new APCore();
    registerAdd(client);

    const result = client.validate('math.add', { a: 'not_a_number' });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns invalid PreflightResult for unknown module', () => {
    const client = new APCore();
    const result = client.validate('nonexistent.module', {});
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e['code'] === 'MODULE_NOT_FOUND')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Describe tests
// ---------------------------------------------------------------------------

describe('APCore.describe()', () => {
  it('returns description string for a registered module', () => {
    const client = new APCore();
    registerAdd(client);

    const desc = client.describe('math.add');
    expect(typeof desc).toBe('string');
    expect(desc).toContain('math.add');
  });

  it('throws ModuleNotFoundError for unknown module', () => {
    const client = new APCore();
    expect(() => client.describe('nonexistent.module')).toThrow(ModuleNotFoundError);
  });
});

// ---------------------------------------------------------------------------
// useBefore / useAfter / remove tests
// ---------------------------------------------------------------------------

describe('APCore.useBefore()', () => {
  it('returns self for chaining', () => {
    const client = new APCore();
    const result = client.useBefore(() => null);
    expect(result).toBe(client);
  });

  it('fires before callback during call', async () => {
    const client = new APCore();
    registerAdd(client);

    let called = false;
    client.useBefore((_moduleId, _inputs, _ctx) => {
      called = true;
      return null;
    });

    await client.call('math.add', { a: 1, b: 2 });
    expect(called).toBe(true);
  });
});

describe('APCore.useAfter()', () => {
  it('returns self for chaining', () => {
    const client = new APCore();
    const result = client.useAfter(() => null);
    expect(result).toBe(client);
  });

  it('fires after callback during call', async () => {
    const client = new APCore();
    registerAdd(client);

    let capturedOutput: Record<string, unknown> | null = null;
    client.useAfter((_moduleId, _inputs, output, _ctx) => {
      capturedOutput = output;
      return null;
    });

    await client.call('math.add', { a: 5, b: 3 });
    expect(capturedOutput).toEqual({ result: 8 });
  });
});

describe('APCore.remove()', () => {
  it('returns true when middleware is found and removed', () => {
    const client = new APCore();
    const mw = new TrackingMiddleware();
    client.use(mw);
    expect(client.remove(mw)).toBe(true);
  });

  it('returns false when middleware was not registered', () => {
    const client = new APCore();
    const mw = new TrackingMiddleware();
    expect(client.remove(mw)).toBe(false);
  });

  it('middleware no longer fires after removal', async () => {
    const client = new APCore();
    const mw = new TrackingMiddleware();
    client.use(mw);
    registerAdd(client);

    client.remove(mw);
    await client.call('math.add', { a: 1, b: 2 });
    expect(mw.beforeCalled).toBe(false);
    expect(mw.afterCalled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Export tests
// ---------------------------------------------------------------------------

describe('APCore exports', () => {
  it('is exported from index', async () => {
    const mod = await import('../src/index.js');
    expect(mod.APCore).toBeDefined();
    expect(typeof mod.APCore).toBe('function');
  });
});
