import { describe, it, expect } from 'vitest';
import { Type } from '@sinclair/typebox';
import { CancelToken, ExecutionCancelledError } from '../src/cancel.js';
import { Context } from '../src/context.js';
import { Executor } from '../src/executor.js';
import { FunctionModule } from '../src/decorator.js';
import { Registry } from '../src/registry/registry.js';

describe('CancelToken', () => {
  it('is initially not cancelled', () => {
    const token = new CancelToken();
    expect(token.isCancelled).toBe(false);
  });

  it('sets flag after cancel()', () => {
    const token = new CancelToken();
    token.cancel();
    expect(token.isCancelled).toBe(true);
  });

  it('check() does nothing when not cancelled', () => {
    const token = new CancelToken();
    expect(() => token.check()).not.toThrow();
  });

  it('check() throws ExecutionCancelledError when cancelled', () => {
    const token = new CancelToken();
    token.cancel();
    expect(() => token.check()).toThrow(ExecutionCancelledError);
  });

  it('reset() clears cancellation', () => {
    const token = new CancelToken();
    token.cancel();
    expect(token.isCancelled).toBe(true);
    token.reset();
    expect(token.isCancelled).toBe(false);
    expect(() => token.check()).not.toThrow();
  });
});

describe('Executor cancellation', () => {
  it('respects cancelled token before execution', async () => {
    const registry = new Registry();
    const mod = new FunctionModule({
      execute: () => ({ result: 'ok' }),
      moduleId: 'test.module',
      inputSchema: Type.Object({}),
      outputSchema: Type.Object({ result: Type.String() }),
      description: 'Simple module',
    });
    registry.register('test.module', mod);

    const executor = new Executor({ registry });
    const token = new CancelToken();
    token.cancel();

    const ctx = new Context(
      'trace-1',
      null,
      [],
      executor,
      null,
      null,
      {},
      token,
    );

    await expect(executor.call('test.module', {}, ctx)).rejects.toThrow(ExecutionCancelledError);
  });
});
