# Feature: Decorator Bindings

## Overview

The Decorator Bindings module provides the primary API for defining apcore modules from TypeScript functions. Unlike the Python implementation which uses `@module` decorators with runtime type introspection, the TypeScript version uses a `module()` factory function that accepts an options object with explicit TypeBox schemas. The `FunctionModule` class wraps any async or sync function with `inputSchema`/`outputSchema`, description, and metadata. The `normalizeResult()` utility (exported, unlike Python where it is private) standardizes return values. The `BindingLoader` class enables YAML-driven zero-code-modification module registration, resolving targets to callables via async `import()` and building schemas from JSON Schema definitions or external schema reference files.

Note: TypeScript cannot introspect types at runtime (type erasure at compile time), so there is no `auto_schema` mode and no type inference from function signatures. All schemas must be provided explicitly as TypeBox `TSchema` objects or via JSON Schema in YAML binding files.

## Scope

### Included

- `FunctionModule` class wrapping an execute function with explicit `inputSchema`/`outputSchema` (TypeBox `TSchema`), `description`, `documentation`, `tags`, `version`, `annotations`, `metadata`, `examples`
- `normalizeResult()` exported utility: `null`/`undefined` -> `{}`, `Record` -> passthrough, other -> `{ result: value }`
- `makeAutoId(name)` for ID generation from arbitrary strings (simpler than Python's `__module__`+`__qualname__`)
- `module()` factory function accepting an options object with explicit schemas and optional `registry` for auto-registration
- `BindingLoader` class with async `loadBindings(filePath, registry)` for YAML-driven module registration
- `loadBindingDir(dirPath, registry, pattern)` for directory scanning of binding YAML files
- Schema resolution modes in bindings: inline `input_schema`/`output_schema`, `schema_ref` to external YAML, permissive fallback
- `jsonSchemaToTypeBox()` integration for schema building from JSON Schema in binding files
- Dead `JSON_SCHEMA_TYPE_MAP` code in `bindings.ts` (noted as cleanup needed)

### Excluded

- Runtime type inference / `auto_schema` mode (impossible in TypeScript due to type erasure)
- Python-style `@module` decorator syntax (TypeScript uses factory function pattern)
- Schema system internals (consumed via `jsonSchemaToTypeBox()` from `schema-system`)
- Registry implementation (consumed as a dependency for module registration)
- Executor pipeline integration (FunctionModule is consumed by `core-executor`)

## Technology Stack

- **TypeScript 5.5+** with strict mode
- **@sinclair/typebox >= 0.34.0** for schema representation (`TSchema`, `Type.Object()`, `Type.Record()`, etc.)
- **js-yaml** for YAML binding file parsing
- **Node.js >= 18.0.0** with ES Module support (`node:fs`, `node:path`, dynamic `import()`)
- **vitest** for unit testing

## Task Execution Order

| # | Task File | Description | Status |
|---|-----------|-------------|--------|
| 1 | [function-module](./tasks/function-module.md) | FunctionModule class with execute, schemas, description, normalizeResult() | completed |
| 2 | [module-factory](./tasks/module-factory.md) | module() factory function with options object pattern | completed |
| 3 | [explicit-schemas](./tasks/explicit-schemas.md) | Explicit TypeBox schema passing (vs Python's auto-generation) | completed |
| 4 | [binding-loader](./tasks/binding-loader.md) | BindingLoader with async loadBindings() from YAML | completed |
| 5 | [binding-directory](./tasks/binding-directory.md) | loadBindingDir() for directory scanning of binding YAML files | completed |
| 6 | [schema-modes](./tasks/schema-modes.md) | Schema resolution modes: input_schema, output_schema, schema_ref, permissive fallback | completed |

## Progress

| Total | Completed | In Progress | Pending |
|-------|-----------|-------------|---------|
| 6     | 6         | 0           | 0       |

## Reference Documents

- `src/decorator.ts` -- FunctionModule class, module() factory, normalizeResult(), makeAutoId() (~110 lines)
- `src/bindings.ts` -- BindingLoader class with YAML loading and target resolution (~208 lines)
- `src/errors.ts` -- Binding error hierarchy (BindingInvalidTargetError, BindingFileInvalidError, etc.)
- `tests/test-decorator.test.ts` -- Unit tests for FunctionModule, module(), normalizeResult(), makeAutoId()
- `tests/test-bindings.test.ts` -- Unit tests for BindingLoader
