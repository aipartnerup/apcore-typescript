# Task: SchemaExporter

## Goal

Implement the `SchemaExporter` class that converts `SchemaDefinition` objects to platform-specific export formats for four LLM providers: MCP (Model Context Protocol), OpenAI (function calling with strict mode), Anthropic (tool use with examples), and Generic (passthrough for non-LLM consumers).

## Files Involved

- `src/schema/exporter.ts` -- `SchemaExporter` class
- `src/schema/strict.ts` -- Consumed for `toStrictSchema()`, `applyLlmDescriptions()`, `stripExtensions()`
- `src/schema/types.ts` -- Consumed for `ExportProfile`, `SchemaDefinition`
- `src/module.ts` -- Consumed for `ModuleAnnotations`, `ModuleExample`

## Steps

### 1. Implement export() dispatcher

Route to the correct export method based on `ExportProfile` enum value.

```typescript
export class SchemaExporter {
  export(
    schemaDef: SchemaDefinition,
    profile: ExportProfile,
    annotations?: ModuleAnnotations | null,
    examples?: ModuleExample[] | null,
    name?: string | null,
  ): Record<string, unknown> {
    if (profile === ExportProfile.MCP) return this.exportMcp(schemaDef, annotations, name);
    if (profile === ExportProfile.OpenAI) return this.exportOpenai(schemaDef);
    if (profile === ExportProfile.Anthropic) return this.exportAnthropic(schemaDef, examples);
    return this.exportGeneric(schemaDef);
  }
}
```

TDD: Test dispatch routes to correct method for each profile.

### 2. Implement exportMcp()

Produce MCP tool format with `name`, `description`, `inputSchema`, and `annotations` object mapping module annotations to MCP hint fields.

```typescript
exportMcp(
  schemaDef: SchemaDefinition,
  annotations?: ModuleAnnotations | null,
  name?: string | null,
): Record<string, unknown> {
  return {
    name: name ?? schemaDef.moduleId,
    description: schemaDef.description,
    inputSchema: schemaDef.inputSchema,
    annotations: {
      readOnlyHint: annotations?.readonly ?? false,
      destructiveHint: annotations?.destructive ?? false,
      idempotentHint: annotations?.idempotent ?? false,
      openWorldHint: annotations?.openWorld ?? true,
    },
  };
}
```

TDD: Test MCP output includes correct annotation hints. Test custom `name` override. Test default `openWorldHint` is `true`.

### 3. Implement exportOpenai()

Produce OpenAI function-calling format with strict mode. Deep-copy input schema, apply LLM descriptions, convert to strict schema, wrap in `{ type: "function", function: { name, description, parameters, strict: true } }`. Module ID dots are replaced with underscores for the function name.

```typescript
exportOpenai(schemaDef: SchemaDefinition): Record<string, unknown> {
  const schema = deepCopy(schemaDef.inputSchema);
  applyLlmDescriptions(schema);
  const strictSchema = toStrictSchema(schema);
  return {
    type: 'function',
    function: {
      name: schemaDef.moduleId.replace(/\./g, '_'),
      description: schemaDef.description,
      parameters: strictSchema,
      strict: true,
    },
  };
}
```

TDD: Test function name replaces dots with underscores. Test `strict: true` is set. Test `additionalProperties: false` is present in parameters.

### 4. Implement exportAnthropic()

Produce Anthropic tool-use format. Deep-copy input schema, apply LLM descriptions, strip extensions. Include `input_examples` from module examples if available.

```typescript
exportAnthropic(
  schemaDef: SchemaDefinition,
  examples?: ModuleExample[] | null,
): Record<string, unknown> {
  const schema = deepCopy(schemaDef.inputSchema);
  applyLlmDescriptions(schema);
  stripExtensions(schema);
  const result: Record<string, unknown> = {
    name: schemaDef.moduleId.replace(/\./g, '_'),
    description: schemaDef.description,
    input_schema: schema,
  };
  if (examples && examples.length > 0) {
    result['input_examples'] = examples.map((ex) => ex.inputs);
  }
  return result;
}
```

TDD: Test `x-` extensions are removed from output. Test examples are included when provided. Test examples are omitted when empty.

### 5. Implement exportGeneric()

Passthrough format with all schema data for non-LLM consumers.

```typescript
exportGeneric(schemaDef: SchemaDefinition): Record<string, unknown> {
  return {
    module_id: schemaDef.moduleId,
    description: schemaDef.description,
    input_schema: schemaDef.inputSchema,
    output_schema: schemaDef.outputSchema,
    definitions: schemaDef.definitions,
  };
}
```

TDD: Test all fields are present including `output_schema` and `definitions`.

## Acceptance Criteria

- [x] `export()` dispatches to the correct profile method
- [x] MCP format includes `name`, `description`, `inputSchema`, and annotation hints
- [x] MCP format supports custom `name` override via parameter
- [x] OpenAI format wraps schema in `{ type: "function", function: { ... } }` with `strict: true`
- [x] OpenAI format applies LLM descriptions and strict-mode transformations
- [x] OpenAI format replaces dots with underscores in function name
- [x] Anthropic format applies LLM descriptions and strips extensions
- [x] Anthropic format includes `input_examples` when examples are provided
- [x] Generic format passes through all schema data including `output_schema` and `definitions`
- [x] No export method mutates the original `SchemaDefinition`
- [x] All tests pass with `vitest`

## Dependencies

- types-and-annotations (for `ExportProfile`, `SchemaDefinition`)
- strict-mode (for `toStrictSchema()`, `stripExtensions()`, `applyLlmDescriptions()`)

## Estimated Time

3 hours
