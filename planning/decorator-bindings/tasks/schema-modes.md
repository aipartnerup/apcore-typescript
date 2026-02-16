# Task: Schema Resolution Modes: Inline, schema_ref, Permissive Fallback

## Goal

Implement the three schema resolution modes used by `BindingLoader._createModuleFromBinding()` when constructing `FunctionModule` instances from YAML binding entries. Each binding entry can specify schemas in one of three ways: inline `input_schema`/`output_schema` JSON Schema objects, an external `schema_ref` file path, or no schema at all (permissive fallback). This task also covers the `jsonSchemaToTypeBox()` integration and notes the dead `JSON_SCHEMA_TYPE_MAP` code that should be cleaned up.

## Files Involved

- `src/bindings.ts` -- `_createModuleFromBinding()` schema resolution logic, `buildSchemaFromJsonSchema()` wrapper, dead `JSON_SCHEMA_TYPE_MAP`
- `src/schema/loader.ts` -- `jsonSchemaToTypeBox()` consumed for JSON Schema to TypeBox conversion
- `tests/test-bindings.test.ts` -- Tests for each schema resolution mode

## Steps

### 1. Write failing tests (TDD)

Create tests for:
- **Inline input_schema/output_schema**: Binding with inline JSON Schema objects produces FunctionModule with correct TypeBox schemas
- **Only input_schema present**: Missing `output_schema` defaults to empty object schema `{}`
- **Only output_schema present**: Missing `input_schema` defaults to empty object schema `{}`
- **schema_ref mode**: Binding with `schema_ref: ./schemas/my-module.yaml` loads schemas from the referenced file
- **schema_ref file not found**: Throws `BindingFileInvalidError` when referenced file does not exist
- **schema_ref invalid YAML**: Throws `BindingFileInvalidError` on malformed YAML in referenced file
- **Permissive fallback**: Binding with no schema keys produces permissive `Type.Record(Type.String(), Type.Unknown())` for both input and output
- **Schema priority**: `input_schema`/`output_schema` takes precedence over `schema_ref` when both present

### 2. Implement schema resolution in _createModuleFromBinding()

```typescript
private async _createModuleFromBinding(
  binding: Record<string, unknown>,
  bindingFileDir: string,
): Promise<FunctionModule> {
  const func = await this.resolveTarget(binding['target'] as string);
  const moduleId = binding['module_id'] as string;

  let inputSchema: TSchema;
  let outputSchema: TSchema;

  if ('input_schema' in binding || 'output_schema' in binding) {
    // Mode 1: Inline JSON Schema
    const inputSchemaDict = (binding['input_schema'] as Record<string, unknown>) ?? {};
    const outputSchemaDict = (binding['output_schema'] as Record<string, unknown>) ?? {};
    inputSchema = buildSchemaFromJsonSchema(inputSchemaDict);
    outputSchema = buildSchemaFromJsonSchema(outputSchemaDict);
  } else if ('schema_ref' in binding) {
    // Mode 2: External schema reference file
    const refPath = resolve(bindingFileDir, binding['schema_ref'] as string);
    if (!existsSync(refPath)) {
      throw new BindingFileInvalidError(refPath, 'Schema reference file not found');
    }
    let refData: Record<string, unknown>;
    try {
      refData = (yaml.load(readFileSync(refPath, 'utf-8')) as Record<string, unknown>) ?? {};
    } catch (e) {
      throw new BindingFileInvalidError(refPath, `YAML parse error: ${e}`);
    }
    inputSchema = buildSchemaFromJsonSchema(
      (refData['input_schema'] as Record<string, unknown>) ?? {},
    );
    outputSchema = buildSchemaFromJsonSchema(
      (refData['output_schema'] as Record<string, unknown>) ?? {},
    );
  } else {
    // Mode 3: Permissive fallback -- no schema specified
    inputSchema = Type.Record(Type.String(), Type.Unknown());
    outputSchema = Type.Record(Type.String(), Type.Unknown());
  }

  return new FunctionModule({
    execute: async (inputs, context) => {
      const result = await func(inputs, context);
      if (result === null || result === undefined) return {};
      if (typeof result === 'object' && !Array.isArray(result))
        return result as Record<string, unknown>;
      return { result };
    },
    moduleId,
    inputSchema,
    outputSchema,
    description: (binding['description'] as string) ?? undefined,
    tags: (binding['tags'] as string[]) ?? null,
    version: (binding['version'] as string) ?? '1.0.0',
  });
}
```

### 3. Note buildSchemaFromJsonSchema() wrapper and dead code

The `buildSchemaFromJsonSchema()` function is a thin wrapper around `jsonSchemaToTypeBox()`:

```typescript
function buildSchemaFromJsonSchema(schema: Record<string, unknown>): TSchema {
  return jsonSchemaToTypeBox(schema);
}
```

The `JSON_SCHEMA_TYPE_MAP` constant defined at the top of `bindings.ts` is dead code. It was part of an earlier implementation before `jsonSchemaToTypeBox()` was extracted to the schema system. It maps JSON Schema type strings to TypeBox constructors but is never referenced. This should be removed in a cleanup pass.

```typescript
// DEAD CODE -- cleanup needed
const JSON_SCHEMA_TYPE_MAP: Record<string, () => TSchema> = {
  string: () => Type.String(),
  integer: () => Type.Integer(),
  number: () => Type.Number(),
  boolean: () => Type.Boolean(),
  array: () => Type.Array(Type.Unknown()),
  object: () => Type.Record(Type.String(), Type.Unknown()),
};
```

### 4. Document the three modes

| Mode | Trigger | Behavior |
|------|---------|----------|
| Inline | `input_schema` or `output_schema` key present | Parse inline JSON Schema objects via `jsonSchemaToTypeBox()`. Missing schema defaults to `{}` (empty object). |
| schema_ref | `schema_ref` key present (no inline schemas) | Load external YAML file relative to binding file directory. Parse `input_schema` and `output_schema` from it. |
| Permissive | No schema keys present | Use `Type.Record(Type.String(), Type.Unknown())` for both input and output. Accepts any key-value pairs. |

### 5. Verify tests pass

Run `npx vitest run tests/test-bindings.test.ts`.

## Acceptance Criteria

- [x] Inline mode: `input_schema`/`output_schema` JSON Schema objects are converted to TypeBox via `jsonSchemaToTypeBox()`
- [x] Inline mode: Missing input or output schema defaults to empty `{}` (produces `Type.Object({})` equivalent)
- [x] schema_ref mode: External YAML file is loaded relative to the binding file's directory
- [x] schema_ref mode: `BindingFileInvalidError` thrown when reference file is missing or unparseable
- [x] Permissive mode: No schema keys produces `Type.Record(Type.String(), Type.Unknown())` for both schemas
- [x] Inline mode takes precedence over schema_ref when both are present
- [x] `buildSchemaFromJsonSchema()` delegates to `jsonSchemaToTypeBox()` from schema system
- [x] Dead `JSON_SCHEMA_TYPE_MAP` code is identified and documented for cleanup

## Dependencies

- `binding-loader` -- Requires `BindingLoader` class with `resolveTarget()` and `loadBindings()` structure
- `schema-system` (external) -- Consumes `jsonSchemaToTypeBox()` for JSON Schema to TypeBox conversion

## Estimated Time

3 hours
