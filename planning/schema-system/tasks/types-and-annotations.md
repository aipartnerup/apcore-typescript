# Task: Types and Annotations

## Goal

Define the core type interfaces, enums, and annotation merging utilities that form the foundation of the schema system. All other schema tasks depend on these types.

## Files Involved

- `src/schema/types.ts` -- `SchemaDefinition`, `ResolvedSchema`, `SchemaStrategy`, `ExportProfile`, `SchemaValidationErrorDetail`, `SchemaValidationResult`, `LLMExtensions`, `validationResultToError()`
- `src/schema/annotations.ts` -- `mergeAnnotations()`, `mergeExamples()`, `mergeMetadata()`

## Steps

### 1. Define SchemaStrategy enum

```typescript
export enum SchemaStrategy {
  YamlFirst = 'yaml_first',
  NativeFirst = 'native_first',
  YamlOnly = 'yaml_only',
}
```

TDD: Write tests asserting enum values match the expected string representations.

### 2. Define ExportProfile enum

```typescript
export enum ExportProfile {
  MCP = 'mcp',
  OpenAI = 'openai',
  Anthropic = 'anthropic',
  Generic = 'generic',
}
```

TDD: Write tests asserting all four profiles are available and have correct string values.

### 3. Define SchemaDefinition interface

```typescript
export interface SchemaDefinition {
  moduleId: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  errorSchema?: Record<string, unknown> | null;
  definitions: Record<string, unknown>;
  version: string;
  documentation?: string | null;
  schemaUrl?: string | null;
}
```

TDD: Create a conforming object and verify all fields are accessible with correct types.

### 4. Define ResolvedSchema interface

```typescript
import type { TSchema } from '@sinclair/typebox';

export interface ResolvedSchema {
  jsonSchema: Record<string, unknown>;
  schema: TSchema;
  moduleId: string;
  direction: string;
}
```

TDD: Create a `ResolvedSchema` with `Type.Object({})` and verify `schema` field is a valid `TSchema`.

### 5. Define validation result types

```typescript
export interface SchemaValidationErrorDetail {
  path: string;
  message: string;
  constraint?: string | null;
  expected?: unknown;
  actual?: unknown;
}

export interface SchemaValidationResult {
  valid: boolean;
  errors: SchemaValidationErrorDetail[];
}
```

TDD: Create valid and invalid results, verify field access.

### 6. Implement validationResultToError()

```typescript
export function validationResultToError(result: SchemaValidationResult): SchemaValidationError {
  if (result.valid) {
    throw new Error('Cannot convert valid result to error');
  }
  const errorDicts = result.errors.map((e) => ({
    path: e.path,
    message: e.message,
    constraint: e.constraint ?? null,
    expected: e.expected ?? null,
    actual: e.actual ?? null,
  }));
  return new SchemaValidationError('Schema validation failed', errorDicts);
}
```

TDD: Verify conversion from `SchemaValidationResult` to `SchemaValidationError`, and verify throwing on valid result.

### 7. Define LLMExtensions interface

```typescript
export interface LLMExtensions {
  llmDescription?: string | null;
  examples?: unknown[] | null;
  sensitive: boolean;
  constraints?: string | null;
  deprecated?: Record<string, unknown> | null;
}
```

### 8. Implement mergeAnnotations()

Merges YAML-defined and code-defined module annotations with YAML-wins precedence over code, and code-wins precedence over defaults. Operates on the `ANNOTATION_FIELDS` list: `readonly`, `destructive`, `idempotent`, `requiresApproval`, `openWorld`.

TDD: Test default-only, code-only, YAML-only, and YAML-overrides-code scenarios.

### 9. Implement mergeExamples()

YAML examples override code examples entirely. If no YAML examples, fall back to code examples. If neither, return empty array. YAML examples are mapped from raw records to `ModuleExample` objects.

TDD: Test YAML-wins, code-fallback, and empty scenarios.

### 10. Implement mergeMetadata()

Shallow merge with YAML overrides. Start from code metadata (or empty), then `Object.assign()` YAML metadata on top.

TDD: Test merge behavior with overlapping keys.

## Acceptance Criteria

- [x] `SchemaStrategy` enum has `YamlFirst`, `NativeFirst`, `YamlOnly` members
- [x] `ExportProfile` enum has `MCP`, `OpenAI`, `Anthropic`, `Generic` members
- [x] `SchemaDefinition` interface includes all required and optional fields
- [x] `ResolvedSchema` interface includes `jsonSchema`, `schema` (TSchema), `moduleId`, `direction`
- [x] `SchemaValidationErrorDetail` includes `path`, `message`, optional `constraint`/`expected`/`actual`
- [x] `validationResultToError()` converts invalid results and throws on valid results
- [x] `mergeAnnotations()` respects YAML > code > defaults precedence
- [x] `mergeExamples()` respects YAML-wins-all precedence
- [x] `mergeMetadata()` performs shallow merge with YAML overrides
- [x] All types compile with `tsc --noEmit` under strict mode

## Dependencies

- None (foundation task)

## Estimated Time

2 hours
