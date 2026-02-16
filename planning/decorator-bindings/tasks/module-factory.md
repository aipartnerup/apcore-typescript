# Task: module() Factory Function with Options Object Pattern

## Goal

Implement the `module()` factory function that creates a `FunctionModule` from an options object. This is the primary ergonomic API for defining apcore modules in TypeScript. Unlike Python's `@module` decorator, this is a plain factory function that returns a `FunctionModule` instance. It supports optional auto-registration with a `Registry` and auto-generates a module ID via `makeAutoId('anonymous')` when no `id` is provided.

## Files Involved

- `src/decorator.ts` -- `module()` factory function
- `tests/test-decorator.test.ts` -- Unit tests for module() factory

## Steps

### 1. Write failing tests (TDD)

Create tests for:
- **Creates FunctionModule with correct properties**: `module({ id: 'factory.test', inputSchema, outputSchema, execute })` returns `FunctionModule` with correct moduleId and description
- **Generates auto ID when not provided**: `module({ inputSchema, outputSchema, execute })` creates module with moduleId `'anonymous'`
- **Passes through optional fields**: documentation, tags, version, metadata are forwarded to FunctionModule
- **Auto-registers with registry**: When `registry` option is provided, the module is registered via `registry.register()`

### 2. Implement module() factory

```typescript
export function module(options: {
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
  execute: (inputs: Record<string, unknown>, context: Context) =>
    Promise<Record<string, unknown>> | Record<string, unknown>;
  registry?: { register(moduleId: string, module: unknown): void } | null;
}): FunctionModule {
  const moduleId = options.id ?? makeAutoId('anonymous');

  const fm = new FunctionModule({
    execute: options.execute,
    moduleId,
    inputSchema: options.inputSchema,
    outputSchema: options.outputSchema,
    description: options.description,
    documentation: options.documentation,
    tags: options.tags,
    version: options.version,
    annotations: options.annotations,
    metadata: options.metadata,
    examples: options.examples,
  });

  if (options.registry) {
    options.registry.register(fm.moduleId, fm);
  }

  return fm;
}
```

Key design decisions:
- The `registry` option uses a structural type `{ register(moduleId: string, module: unknown): void }` rather than importing the `Registry` class, enabling loose coupling and easier testing
- When `id` is omitted, `makeAutoId('anonymous')` produces `'anonymous'` (a valid ID)
- All optional metadata fields are forwarded to `FunctionModule` without transformation

### 3. Verify tests pass

Run `npx vitest run tests/test-decorator.test.ts` and confirm all module() factory tests pass.

## Acceptance Criteria

- [x] `module()` returns a `FunctionModule` instance
- [x] `module()` forwards all options to `FunctionModule` constructor
- [x] `module({ id: 'x', ... })` creates module with `moduleId === 'x'`
- [x] `module({ ... })` without `id` creates module with `moduleId === 'anonymous'`
- [x] `module({ registry, ... })` auto-registers the module with the provided registry
- [x] `module({ registry: null, ... })` does not attempt registration
- [x] `registry` option uses structural typing for loose coupling

## Dependencies

- `function-module` -- Requires `FunctionModule` class and `makeAutoId()`

## Estimated Time

2 hours
