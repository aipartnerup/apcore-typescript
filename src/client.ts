/**
 * High-level client for apcore to simplify interaction.
 */

import type { TSchema } from '@sinclair/typebox';
import type { Config } from './config.js';
import type { Context } from './context.js';
import { FunctionModule, module as createModule } from './decorator.js';
import { Executor } from './executor.js';
import type { Middleware } from './middleware/index.js';
import type { ModuleAnnotations, ModuleExample, PreflightResult } from './module.js';
import { Registry } from './registry/registry.js';

export interface APCoreOptions {
  registry?: Registry;
  executor?: Executor;
  config?: Config;
}

export interface ModuleOptions {
  id?: string;
  inputSchema: TSchema;
  outputSchema: TSchema;
  description?: string;
  documentation?: string | null;
  annotations?: ModuleAnnotations | null;
  tags?: string[] | null;
  version?: string;
  metadata?: Record<string, unknown> | null;
  examples?: ModuleExample[] | null;
  execute: (inputs: Record<string, unknown>, context: Context) => Promise<Record<string, unknown>> | Record<string, unknown>;
}

/**
 * A high-level client that manages Registry and Executor.
 *
 * Provides a unified entry point for apcore, making it easier
 * for beginners to get started without manually managing multiple objects.
 */
export class APCore {
  readonly registry: Registry;
  readonly executor: Executor;
  readonly config: Config | null;

  constructor(options?: APCoreOptions) {
    this.registry = options?.registry ?? new Registry();
    this.config = options?.config ?? null;
    this.executor = options?.executor ?? new Executor({
      registry: this.registry,
      config: this.config,
    });
  }

  /**
   * Create and register a FunctionModule.
   *
   * TypeScript version requires explicit schemas (no runtime type inference).
   */
  module(options: ModuleOptions): FunctionModule {
    return createModule({
      ...options,
      registry: this.registry,
    });
  }

  /**
   * Register a module object directly.
   */
  register(moduleId: string, moduleObj: unknown): void {
    this.registry.register(moduleId, moduleObj);
  }

  /**
   * Execute an async module call.
   */
  async call(
    moduleId: string,
    inputs?: Record<string, unknown> | null,
    context?: Context | null,
  ): Promise<Record<string, unknown>> {
    return this.executor.call(moduleId, inputs, context);
  }

  /**
   * Stream module output chunk by chunk.
   */
  async *stream(
    moduleId: string,
    inputs?: Record<string, unknown> | null,
    context?: Context | null,
  ): AsyncGenerator<Record<string, unknown>> {
    yield* this.executor.stream(moduleId, inputs, context);
  }

  /**
   * Non-destructive preflight check without execution.
   */
  validate(
    moduleId: string,
    inputs?: Record<string, unknown> | null,
    context?: Context | null,
  ): PreflightResult {
    return this.executor.validate(moduleId, inputs, context);
  }

  /**
   * Get module description info (for AI/LLM use).
   */
  describe(moduleId: string): string {
    return this.registry.describe(moduleId);
  }

  /**
   * Add class-based middleware. Returns self for chaining.
   */
  use(middleware: Middleware): APCore {
    this.executor.use(middleware);
    return this;
  }

  /**
   * Add before function middleware. Returns self for chaining.
   */
  useBefore(callback: (moduleId: string, inputs: Record<string, unknown>, context: Context) => Record<string, unknown> | null): APCore {
    this.executor.useBefore(callback);
    return this;
  }

  /**
   * Add after function middleware. Returns self for chaining.
   */
  useAfter(callback: (moduleId: string, inputs: Record<string, unknown>, output: Record<string, unknown>, context: Context) => Record<string, unknown> | null): APCore {
    this.executor.useAfter(callback);
    return this;
  }

  /**
   * Remove middleware by identity. Returns true if found and removed.
   */
  remove(middleware: Middleware): boolean {
    return this.executor.remove(middleware);
  }

  /**
   * Discover and register modules from configured extension directories.
   */
  async discover(): Promise<number> {
    return this.registry.discover();
  }

  /**
   * Return sorted list of registered module IDs, optionally filtered.
   */
  listModules(options?: { tags?: string[]; prefix?: string }): string[] {
    return this.registry.list(options);
  }
}
