# Task: FunctionModule Class with Execute, Schemas, and normalizeResult()

## Goal

Implement the `FunctionModule` class that wraps an execute function with explicit TypeBox `inputSchema`/`outputSchema`, metadata properties (description, documentation, tags, version, annotations, metadata, examples), and a `normalizeResult()` utility for standardizing module return values. Also implement `makeAutoId()` for generating valid module IDs from arbitrary strings.

## Files Involved

- `src/decorator.ts` -- `FunctionModule` class, `normalizeResult()`, `makeAutoId()`
- `tests/test-decorator.test.ts` -- Unit tests for FunctionModule, normalizeResult(), makeAutoId()

## Steps

### 1. Write failing tests (TDD)

Create tests for:
- **FunctionModule wraps execute**: Construct with execute function, moduleId, inputSchema, outputSchema; call `execute()` and verify result
- **FunctionModule exposes properties**: Verify moduleId, description, documentation, tags, version are accessible
- **FunctionModule defaults**: Verify sensible defaults (description="Module {id}", documentation=null, tags=null, version="1.0.0", annotations=null, metadata=null, examples=null)
- **FunctionModule normalizes null return**: Execute function returning null produces `{}`
- **normalizeResult(null)**: Returns `{}`
- **normalizeResult(undefined)**: Returns `{}`
- **normalizeResult(Record)**: Passes through unchanged
- **normalizeResult(string)**: Returns `{ result: "hello" }`
- **normalizeResult(number)**: Returns `{ result: 42 }`
- **normalizeResult(boolean)**: Returns `{ result: true }`
- **normalizeResult(array)**: Returns `{ result: [1, 2, 3] }`
- **makeAutoId lowercases**: `makeAutoId('Hello World')` -> `'hello_world'`
- **makeAutoId preserves dots**: `makeAutoId('my.module.name')` -> `'my.module.name'`
- **makeAutoId prefixes digit-leading segments**: `makeAutoId('2fast.4you')` -> `'_2fast._4you'`
- **makeAutoId no-op on valid IDs**: `makeAutoId('valid_id')` -> `'valid_id'`

### 2. Implement normalizeResult()

```typescript
export function normalizeResult(result: unknown): Record<string, unknown> {
  if (result === null || result === undefined) return {};
  if (typeof result === 'object' && !Array.isArray(result)) return result as Record<string, unknown>;
  return { result };
}
```

### 3. Implement makeAutoId()

```typescript
export function makeAutoId(name: string): string {
  let raw = name.toLowerCase();
  raw = raw.replace(/[^a-z0-9_.]/g, '_');
  const segments = raw.split('.');
  return segments
    .map((s) => (s && s[0] >= '0' && s[0] <= '9' ? '_' + s : s))
    .join('.');
}
```

### 4. Implement FunctionModule class

```typescript
export class FunctionModule {
  readonly moduleId: string;
  readonly inputSchema: TSchema;
  readonly outputSchema: TSchema;
  readonly description: string;
  readonly documentation: string | null;
  readonly tags: string[] | null;
  readonly version: string;
  readonly annotations: ModuleAnnotations | null;
  readonly metadata: Record<string, unknown> | null;
  readonly examples: ModuleExample[] | null;

  private _executeFn: (inputs: Record<string, unknown>, context: Context) =>
    Promise<Record<string, unknown>> | Record<string, unknown>;

  constructor(options: {
    execute: (inputs: Record<string, unknown>, context: Context) =>
      Promise<Record<string, unknown>> | Record<string, unknown>;
    moduleId: string;
    inputSchema: TSchema;
    outputSchema: TSchema;
    description?: string;
    documentation?: string | null;
    tags?: string[] | null;
    version?: string;
    annotations?: ModuleAnnotations | null;
    metadata?: Record<string, unknown> | null;
    examples?: ModuleExample[] | null;
  }) {
    this.moduleId = options.moduleId;
    this.inputSchema = options.inputSchema;
    this.outputSchema = options.outputSchema;
    this.description = options.description ?? `Module ${options.moduleId}`;
    this.documentation = options.documentation ?? null;
    this.tags = options.tags ?? null;
    this.version = options.version ?? '1.0.0';
    this.annotations = options.annotations ?? null;
    this.metadata = options.metadata ?? null;
    this.examples = options.examples ?? null;
    this._executeFn = options.execute;
  }

  async execute(inputs: Record<string, unknown>, context: Context): Promise<Record<string, unknown>> {
    const result = await this._executeFn(inputs, context);
    return normalizeResult(result);
  }
}
```

### 5. Verify tests pass

Run `npx vitest run tests/test-decorator.test.ts` and confirm all FunctionModule, normalizeResult, and makeAutoId tests pass.

## Acceptance Criteria

- [x] `FunctionModule` constructor accepts options object with execute, moduleId, inputSchema, outputSchema, and optional metadata
- [x] `FunctionModule.execute()` calls wrapped function and passes result through `normalizeResult()`
- [x] Default description is `"Module {moduleId}"`, version is `"1.0.0"`, others default to `null`
- [x] `normalizeResult()` correctly handles null, undefined, Record, string, number, boolean, and array
- [x] `makeAutoId()` lowercases, replaces invalid characters, preserves dots, prefixes digit-leading segments
- [x] All fields are typed with `readonly` where appropriate

## Dependencies

None -- this is the foundational data structure for the decorator-bindings module.

## Estimated Time

2 hours
