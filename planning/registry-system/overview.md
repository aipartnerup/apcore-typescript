# Feature: Registry System

## Overview

The Registry System is the module discovery, loading, and querying backbone of apcore. It scans extension directories for `.ts`/`.js` files, loads companion YAML metadata, resolves module entry points via async `import()`, validates structural requirements (inputSchema, outputSchema, description, execute), resolves inter-module dependencies through Kahn's topological sort, and registers modules in dependency order. The `Registry` class exposes query methods (`get`, `has`, `list`, `iter`, `count`, `moduleIds`, `getDefinition`) and event callbacks for register/unregister lifecycle hooks. Schema export functions provide JSON and YAML serialization with optional strict-mode and LLM export profiles.

## Scope

### Included

- `ModuleDescriptor`, `DiscoveredModule`, and `DependencyInfo` interfaces for type-safe module representation
- `EventCallback` type for register/unregister event subscriptions
- `scanExtensions()` and `scanMultiRoot()` for recursive directory scanning with `.ts`/`.js` filtering, `.d.ts`/test file exclusion, case-collision detection, and configurable symlink following
- `loadMetadata()`, `mergeModuleMetadata()`, `loadIdMap()`, `parseDependencies()` for YAML metadata loading and code/YAML conflict resolution
- `resolveDependencies()` implementing Kahn's topological sort with cycle detection and extraction
- `resolveEntryPoint()` using async `import()` with default-export preference, named-export auto-inference, and metadata-driven entry point override
- `validateModule()` for duck-type structural validation of inputSchema, outputSchema, description, and execute
- `Registry` class with 8-step async `discover()` pipeline, manual `register()`/`unregister()`, query accessors, event system, and schema cache management
- `getSchema()`, `exportSchema()`, `getAllSchemas()`, `exportAllSchemas()` with strict-mode, compact-mode, and LLM export profile support

### Excluded

- Schema system internals (consumed via TypeBox `TSchema` and `SchemaExporter`)
- ACL enforcement (consumed by `core-executor`)
- Middleware chains (consumed by `core-executor`)
- YAML schema file authoring and schema directory management

## Technology Stack

- **TypeScript 5.5+** with strict mode
- **@sinclair/typebox >= 0.34.0** for schema representation (`TSchema`)
- **js-yaml** for YAML metadata and ID map parsing
- **Node.js >= 18.0.0** with ES Module support (`node:fs`, `node:path`, dynamic `import()`)
- **vitest** for unit and integration testing

## Task Execution Order

| # | Task File | Description | Status |
|---|-----------|-------------|--------|
| 1 | [types](./tasks/types.md) | ModuleDescriptor, DiscoveredModule, DependencyInfo interfaces | completed |
| 2 | [scanner](./tasks/scanner.md) | scanExtensions(), scanMultiRoot() directory scanning | completed |
| 3 | [metadata](./tasks/metadata.md) | loadMetadata(), mergeModuleMetadata(), loadIdMap(), parseDependencies() | completed |
| 4 | [dependencies](./tasks/dependencies.md) | resolveDependencies() Kahn's topological sort with cycle detection | completed |
| 5 | [entry-point](./tasks/entry-point.md) | resolveEntryPoint() with async import() and auto-inference | completed |
| 6 | [validation](./tasks/validation.md) | validateModule() structural duck-type checks | completed |
| 7 | [registry-core](./tasks/registry-core.md) | Registry class with 8-step discover() and query methods | completed |
| 8 | [schema-export](./tasks/schema-export.md) | getSchema(), exportSchema(), getAllSchemas(), exportAllSchemas() | completed |

## Progress

| Total | Completed | In Progress | Pending |
|-------|-----------|-------------|---------|
| 8     | 8         | 0           | 0       |

## Reference Documents

- [Registry System Feature Specification](../../features/registry-system.md)
