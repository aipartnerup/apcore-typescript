/**
 * Executor and related utilities for apcore.
 *
 * Async-only execution pipeline. Python's call() + call_async() merge into one async call().
 * Timeout uses Promise.race instead of threading.
 */

import type { TSchema } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import type { ACL } from './acl.js';
import type { Config } from './config.js';
import { Context } from './context.js';
import {
  ACLDeniedError,
  CallDepthExceededError,
  CallFrequencyExceededError,
  CircularCallError,
  InvalidInputError,
  ModuleNotFoundError,
  ModuleTimeoutError,
  SchemaValidationError,
} from './errors.js';
import { AfterMiddleware, BeforeMiddleware, Middleware } from './middleware/index.js';
import { MiddlewareChainError, MiddlewareManager } from './middleware/manager.js';
import type { ValidationResult } from './module.js';
import type { Registry } from './registry/registry.js';

export const REDACTED_VALUE: string = '***REDACTED***';

export function redactSensitive(
  data: Record<string, unknown>,
  schemaDict: Record<string, unknown>,
): Record<string, unknown> {
  const redacted = JSON.parse(JSON.stringify(data));
  redactFields(redacted, schemaDict);
  redactSecretPrefix(redacted);
  return redacted;
}

function redactFields(data: Record<string, unknown>, schemaDict: Record<string, unknown>): void {
  const properties = schemaDict['properties'] as Record<string, Record<string, unknown>> | undefined;
  if (!properties) return;

  for (const [fieldName, fieldSchema] of Object.entries(properties)) {
    if (!(fieldName in data)) continue;
    const value = data[fieldName];

    if (fieldSchema['x-sensitive'] === true) {
      if (value !== null && value !== undefined) {
        data[fieldName] = REDACTED_VALUE;
      }
      continue;
    }

    if (fieldSchema['type'] === 'object' && 'properties' in fieldSchema && typeof value === 'object' && value !== null && !Array.isArray(value)) {
      redactFields(value as Record<string, unknown>, fieldSchema);
      continue;
    }

    if (fieldSchema['type'] === 'array' && 'items' in fieldSchema && Array.isArray(value)) {
      const itemsSchema = fieldSchema['items'] as Record<string, unknown>;
      if (itemsSchema['x-sensitive'] === true) {
        for (let i = 0; i < value.length; i++) {
          if (value[i] !== null && value[i] !== undefined) {
            value[i] = REDACTED_VALUE;
          }
        }
      } else if (itemsSchema['type'] === 'object' && 'properties' in itemsSchema) {
        for (const item of value) {
          if (typeof item === 'object' && item !== null) {
            redactFields(item as Record<string, unknown>, itemsSchema);
          }
        }
      }
    }
  }
}

function redactSecretPrefix(data: Record<string, unknown>): void {
  for (const key of Object.keys(data)) {
    if (key.startsWith('_secret_') && data[key] !== null && data[key] !== undefined) {
      data[key] = REDACTED_VALUE;
    }
  }
}

export class Executor {
  private _registry: Registry;
  private _middlewareManager: MiddlewareManager;
  private _acl: ACL | null;
  private _config: Config | null;
  private _defaultTimeout: number;
  private _globalTimeout: number;
  private _maxCallDepth: number;
  private _maxModuleRepeat: number;

  constructor(options: {
    registry: Registry;
    middlewares?: Middleware[] | null;
    acl?: ACL | null;
    config?: Config | null;
  }) {
    this._registry = options.registry;
    this._middlewareManager = new MiddlewareManager();
    this._acl = options.acl ?? null;
    this._config = options.config ?? null;

    if (options.middlewares) {
      for (const mw of options.middlewares) {
        this._middlewareManager.add(mw);
      }
    }

    if (this._config !== null) {
      this._defaultTimeout = (this._config.get('executor.default_timeout') as number) ?? 30000;
      this._globalTimeout = (this._config.get('executor.global_timeout') as number) ?? 60000;
      this._maxCallDepth = (this._config.get('executor.max_call_depth') as number) ?? 32;
      this._maxModuleRepeat = (this._config.get('executor.max_module_repeat') as number) ?? 3;
    } else {
      this._defaultTimeout = 30000;
      this._globalTimeout = 60000;
      this._maxCallDepth = 32;
      this._maxModuleRepeat = 3;
    }
  }

  get registry(): Registry {
    return this._registry;
  }

  get middlewares(): Middleware[] {
    return this._middlewareManager.snapshot();
  }

  use(middleware: Middleware): Executor {
    this._middlewareManager.add(middleware);
    return this;
  }

  useBefore(callback: (moduleId: string, inputs: Record<string, unknown>, context: Context) => Record<string, unknown> | null): Executor {
    this._middlewareManager.add(new BeforeMiddleware(callback));
    return this;
  }

  useAfter(callback: (moduleId: string, inputs: Record<string, unknown>, output: Record<string, unknown>, context: Context) => Record<string, unknown> | null): Executor {
    this._middlewareManager.add(new AfterMiddleware(callback));
    return this;
  }

  remove(middleware: Middleware): boolean {
    return this._middlewareManager.remove(middleware);
  }

  async call(
    moduleId: string,
    inputs?: Record<string, unknown> | null,
    context?: Context | null,
  ): Promise<Record<string, unknown>> {
    let effectiveInputs = inputs ?? {};

    // Step 1 -- Context
    let ctx: Context;
    if (context == null) {
      ctx = Context.create(this);
      ctx = ctx.child(moduleId);
    } else {
      ctx = context.child(moduleId);
    }

    // Step 2 -- Safety Checks
    this._checkSafety(moduleId, ctx);

    // Step 3 -- Lookup
    const module = this._registry.get(moduleId);
    if (module === null) {
      throw new ModuleNotFoundError(moduleId);
    }

    const mod = module as Record<string, unknown>;

    // Step 4 -- ACL
    if (this._acl !== null) {
      const allowed = this._acl.check(ctx.callerId, moduleId, ctx);
      if (!allowed) {
        throw new ACLDeniedError(ctx.callerId, moduleId);
      }
    }

    // Step 5 -- Input Validation and Redaction
    const inputSchema = mod['inputSchema'] as TSchema | undefined;
    if (inputSchema != null) {
      if (!Value.Check(inputSchema, effectiveInputs)) {
        const errors: Array<Record<string, unknown>> = [];
        for (const error of Value.Errors(inputSchema, effectiveInputs)) {
          errors.push({
            field: error.path || '/',
            code: String(error.type),
            message: error.message,
          });
        }
        throw new SchemaValidationError('Input validation failed', errors);
      }

      ctx.redactedInputs = redactSensitive(
        effectiveInputs,
        inputSchema as unknown as Record<string, unknown>,
      );
    }

    let executedMiddlewares: Middleware[] = [];

    try {
      // Step 6 -- Middleware Before
      try {
        [effectiveInputs, executedMiddlewares] = this._middlewareManager.executeBefore(moduleId, effectiveInputs, ctx);
      } catch (e) {
        if (e instanceof MiddlewareChainError) {
          executedMiddlewares = e.executedMiddlewares;
          const recovery = this._middlewareManager.executeOnError(
            moduleId, effectiveInputs, e.original, ctx, executedMiddlewares,
          );
          if (recovery !== null) return recovery;
          executedMiddlewares = [];
          throw e.original;
        }
        throw e;
      }

      // Step 7 -- Execute with timeout
      let output = await this._executeWithTimeout(mod, moduleId, effectiveInputs, ctx);

      // Step 8 -- Output Validation
      const outputSchema = mod['outputSchema'] as TSchema | undefined;
      if (outputSchema != null) {
        if (!Value.Check(outputSchema, output)) {
          const errors: Array<Record<string, unknown>> = [];
          for (const error of Value.Errors(outputSchema, output)) {
            errors.push({
              field: error.path || '/',
              code: String(error.type),
              message: error.message,
            });
          }
          throw new SchemaValidationError('Output validation failed', errors);
        }
      }

      // Step 9 -- Middleware After
      output = this._middlewareManager.executeAfter(moduleId, effectiveInputs, output, ctx);

      // Step 10 -- Return
      return output;
    } catch (exc) {
      if (executedMiddlewares.length > 0) {
        const recovery = this._middlewareManager.executeOnError(
          moduleId, effectiveInputs, exc as Error, ctx, executedMiddlewares,
        );
        if (recovery !== null) return recovery;
      }
      throw exc;
    }
  }

  validate(moduleId: string, inputs: Record<string, unknown>): ValidationResult {
    const module = this._registry.get(moduleId);
    if (module === null) {
      throw new ModuleNotFoundError(moduleId);
    }

    const mod = module as Record<string, unknown>;
    const inputSchema = mod['inputSchema'] as TSchema | undefined;

    if (inputSchema == null) {
      return { valid: true, errors: [] };
    }

    if (Value.Check(inputSchema, inputs)) {
      return { valid: true, errors: [] };
    }

    const errors: Array<Record<string, string>> = [];
    for (const error of Value.Errors(inputSchema, inputs)) {
      errors.push({
        field: error.path || '/',
        code: String(error.type),
        message: error.message,
      });
    }
    return { valid: false, errors };
  }

  private _checkSafety(moduleId: string, ctx: Context): void {
    const callChain = ctx.callChain;

    // Depth check
    if (callChain.length > this._maxCallDepth) {
      throw new CallDepthExceededError(callChain.length, this._maxCallDepth, [...callChain]);
    }

    // Circular detection (strict cycles of length >= 2)
    const priorChain = callChain.slice(0, -1);
    const lastIdx = priorChain.lastIndexOf(moduleId);
    if (lastIdx !== -1) {
      const subsequence = priorChain.slice(lastIdx + 1);
      if (subsequence.length > 0) {
        throw new CircularCallError(moduleId, [...callChain]);
      }
    }

    // Frequency check
    const count = callChain.filter((id) => id === moduleId).length;
    if (count > this._maxModuleRepeat) {
      throw new CallFrequencyExceededError(moduleId, count, this._maxModuleRepeat, [...callChain]);
    }
  }

  private async _executeWithTimeout(
    mod: Record<string, unknown>,
    moduleId: string,
    inputs: Record<string, unknown>,
    ctx: Context,
  ): Promise<Record<string, unknown>> {
    const timeoutMs = this._defaultTimeout;

    if (timeoutMs < 0) {
      throw new InvalidInputError(`Negative timeout: ${timeoutMs}ms`);
    }

    const executeFn = mod['execute'] as (
      inputs: Record<string, unknown>,
      context: Context,
    ) => Promise<Record<string, unknown>> | Record<string, unknown>;

    const executionPromise = Promise.resolve(executeFn.call(mod, inputs, ctx));

    if (timeoutMs === 0) {
      return executionPromise;
    }

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new ModuleTimeoutError(moduleId, timeoutMs));
      }, timeoutMs);
    });

    return Promise.race([executionPromise, timeoutPromise]);
  }
}
