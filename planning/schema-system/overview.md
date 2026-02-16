# Feature: Schema System

## Overview

The Schema System is the foundational type infrastructure for apcore. It handles schema loading from YAML files, `$ref` resolution across documents, conversion to TypeBox `TSchema` objects, runtime validation via TypeBox `Value.Check()`/`Value.Decode()`, and export to LLM provider formats (MCP, OpenAI, Anthropic, Generic). The system supports three schema resolution strategies (`yaml_first`, `native_first`, `yaml_only`), annotation merging between YAML and code-defined metadata, and strict-mode transformations for OpenAI function calling compatibility.

## Scope

### Included

- `SchemaDefinition`, `ResolvedSchema`, `SchemaValidationResult`, and `LLMExtensions` interfaces
- `SchemaStrategy` and `ExportProfile` enums for runtime configuration
- `SchemaLoader` class with YAML file loading, `jsonSchemaToTypeBox()` conversion, two-level caching (definition + resolved), and strategy-based schema selection
- `RefResolver` class with `$ref` resolution supporting local pointers, relative file paths, `apcore://` canonical URIs, circular reference detection, and configurable max depth
- `jsonSchemaToTypeBox()` recursive converter from JSON Schema dictionaries to TypeBox `TSchema` objects
- `SchemaValidator` class with coercion toggle, `validate()`, `validateInput()`, and `validateOutput()` methods backed by TypeBox `Value.Check()`/`Value.Decode()`/`Value.Errors()`
- `SchemaExporter` class with four export profiles: MCP (with annotations), OpenAI (strict mode), Anthropic (with examples), Generic (passthrough)
- `toStrictSchema()`, `stripExtensions()`, `applyLlmDescriptions()` strict-mode utilities
- `mergeAnnotations()`, `mergeExamples()`, `mergeMetadata()` for YAML/code conflict resolution

### Excluded

- Executor pipeline integration (consumed by `core-executor`)
- Registry module discovery (consumed by `registry-system`)
- Decorator-based schema generation (consumed by `decorator-bindings`)
- YAML schema file authoring and schema directory management

## Technology Stack

- **TypeScript 5.5+** with strict mode
- **@sinclair/typebox >= 0.34.0** for schema representation and runtime validation
- **js-yaml** for YAML file parsing
- **Node.js >= 18.0.0** with ES Module support (`node:fs`, `node:path`)
- **vitest** for unit testing

## Task Execution Order

| # | Task File | Description | Status |
|---|-----------|-------------|--------|
| 1 | [types-and-annotations](./tasks/types-and-annotations.md) | Core interfaces, enums, validation result types, annotation merging | completed |
| 2 | [loader](./tasks/loader.md) | SchemaLoader with YAML loading, caching, strategy selection | completed |
| 3 | [ref-resolver](./tasks/ref-resolver.md) | RefResolver with $ref resolution, apcore:// URIs, circular detection | completed |
| 4 | [typebox-generation](./tasks/typebox-generation.md) | jsonSchemaToTypeBox() recursive JSON Schema to TypeBox conversion | completed |
| 5 | [validator](./tasks/validator.md) | SchemaValidator with TypeBox validation, coercion toggle, error mapping | completed |
| 6 | [exporter](./tasks/exporter.md) | SchemaExporter with MCP, OpenAI, Anthropic, Generic export profiles | completed |
| 7 | [strict-mode](./tasks/strict-mode.md) | toStrictSchema(), stripExtensions(), applyLlmDescriptions() utilities | completed |

## Progress

| Total | Completed | In Progress | Pending |
|-------|-----------|-------------|---------|
| 7     | 7         | 0           | 0       |

## Reference Documents

- [Schema System Feature Specification](../../features/schema-system.md)
