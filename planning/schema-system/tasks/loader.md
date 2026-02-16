# Task: SchemaLoader

## Goal

Implement the `SchemaLoader` class as the primary entry point for the schema system. It loads YAML schema files from disk, resolves `$ref` references via `RefResolver`, converts JSON Schema dictionaries to TypeBox `TSchema` objects via `jsonSchemaToTypeBox()`, and supports three schema resolution strategies with two-level caching.

## Files Involved

- `src/schema/loader.ts` -- `SchemaLoader` class and `jsonSchemaToTypeBox()` function
- `src/schema/ref-resolver.ts` -- Consumed for `$ref` resolution
- `src/schema/types.ts` -- Consumed for `SchemaDefinition`, `ResolvedSchema`, `SchemaStrategy`
- `tests/schema/test-loader.test.ts` -- Unit tests for `jsonSchemaToTypeBox()` and SchemaLoader

## Steps

### 1. Implement SchemaLoader constructor

Accept `Config` and optional `schemasDir`. Resolve the schemas directory from config (`schema.root`, default `./schemas`). Create a `RefResolver` with `schema.max_ref_depth` (default 32). Initialize empty caches.

```typescript
export class SchemaLoader {
  private _config: Config;
  private _schemasDir: string;
  private _resolver: RefResolver;
  private _schemaCache: Map<string, SchemaDefinition> = new Map();
  private _modelCache: Map<string, [ResolvedSchema, ResolvedSchema]> = new Map();

  constructor(config: Config, schemasDir?: string | null) {
    this._config = config;
    this._schemasDir = schemasDir
      ? resolve(schemasDir)
      : resolve(config.get('schema.root', './schemas') as string);
    const maxDepth = config.get('schema.max_ref_depth', 32) as number;
    this._resolver = new RefResolver(this._schemasDir, maxDepth);
  }
}
```

TDD: Verify constructor sets `_schemasDir` from explicit param and from config fallback.

### 2. Implement load() method

Read YAML file at `{schemasDir}/{moduleId.replace('.','/')}.schema.yaml`. Parse with `js-yaml`. Validate required fields (`input_schema`, `output_schema`, `description`). Merge `definitions` and `$defs`. Cache and return `SchemaDefinition`.

TDD: Test successful load, missing file (`SchemaNotFoundError`), invalid YAML (`SchemaParseError`), missing required fields (`SchemaParseError`), and cache hit on second call.

### 3. Implement resolve() method

Delegate to `RefResolver.resolve()` for both input and output schemas. Convert resolved JSON Schema to TypeBox via `jsonSchemaToTypeBox()`. Return `[ResolvedSchema, ResolvedSchema]` tuple.

TDD: Test resolution of a schema with `$ref` pointers produces valid TypeBox schemas.

### 4. Implement getSchema() with strategy selection

Parse the strategy from config string (`schema.strategy`, default `yaml_first`). Convert snake_case to PascalCase for enum lookup. Apply strategy logic:
- `YamlFirst`: Try YAML, fall back to native if `SchemaNotFoundError` and native schemas provided
- `NativeFirst`: Use native if provided, else fall back to YAML
- `YamlOnly`: YAML only, no fallback

Cache and return result.

```typescript
getSchema(
  moduleId: string,
  nativeInputSchema?: TSchema | null,
  nativeOutputSchema?: TSchema | null,
): [ResolvedSchema, ResolvedSchema]
```

TDD: Test each strategy path, including fallback behavior and `SchemaNotFoundError` propagation.

### 5. Implement _wrapNative() helper

Wrap native TypeBox schemas into `ResolvedSchema` objects with `jsonSchema` set to the TypeBox schema cast as `Record<string, unknown>`.

TDD: Verify wrapped native schemas have correct `direction` and `moduleId`.

### 6. Implement clearCache()

Clear all three caches: `_schemaCache`, `_modelCache`, and `_resolver.clearCache()`.

TDD: Verify cache is cleared and subsequent loads re-read from disk.

## Acceptance Criteria

- [x] `SchemaLoader.load()` reads and parses YAML schema files correctly
- [x] `SchemaLoader.load()` throws `SchemaNotFoundError` for missing files
- [x] `SchemaLoader.load()` throws `SchemaParseError` for invalid YAML or missing required fields
- [x] `SchemaLoader.load()` caches `SchemaDefinition` on first load
- [x] `SchemaLoader.resolve()` produces `[ResolvedSchema, ResolvedSchema]` with TypeBox schemas
- [x] `SchemaLoader.getSchema()` applies `YamlFirst` strategy with native fallback
- [x] `SchemaLoader.getSchema()` applies `NativeFirst` strategy with YAML fallback
- [x] `SchemaLoader.getSchema()` applies `YamlOnly` strategy without fallback
- [x] `SchemaLoader.getSchema()` caches resolved schema pairs
- [x] `SchemaLoader.clearCache()` invalidates all caches
- [x] All tests pass with `vitest`

## Dependencies

- types-and-annotations (for `SchemaDefinition`, `ResolvedSchema`, `SchemaStrategy`)
- ref-resolver (for `RefResolver`)
- typebox-generation (for `jsonSchemaToTypeBox()`)

## Estimated Time

4 hours
