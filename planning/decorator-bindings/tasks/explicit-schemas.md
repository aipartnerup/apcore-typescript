# Task: Explicit TypeBox Schema Passing

## Goal

Establish and enforce the pattern of explicit TypeBox schema passing for all module definitions. In Python's apcore, `@module` can introspect function signatures and type annotations at runtime to auto-generate schemas. TypeScript erases types at compile time, making this impossible. This task documents and validates the explicit schema requirement: every `FunctionModule` and `module()` call must receive `inputSchema` and `outputSchema` as TypeBox `TSchema` objects.

## Files Involved

- `src/decorator.ts` -- `FunctionModule` constructor requiring `inputSchema`/`outputSchema` as `TSchema`
- `tests/test-decorator.test.ts` -- Tests validating schema presence and TypeBox compatibility

## Steps

### 1. Write failing tests (TDD)

Create tests for:
- **FunctionModule requires inputSchema and outputSchema**: Constructing without schemas causes TypeScript compilation error (structural test via type assertions)
- **Schemas are stored as readonly TSchema**: `fm.inputSchema` and `fm.outputSchema` are accessible and match the provided TypeBox schemas
- **Complex schemas work**: Nested `Type.Object()` with optional fields, `Type.Array()`, `Type.Union()` all accepted as valid schemas
- **Schema is not validated at construction**: FunctionModule stores schemas but does not validate inputs against them (validation is the executor's responsibility)

### 2. Validate TypeBox schema integration

```typescript
import { Type, type TSchema } from '@sinclair/typebox';

// Simple schemas
const inputSchema = Type.Object({ name: Type.String() });
const outputSchema = Type.Object({ greeting: Type.String() });

// Complex schemas
const complexInput = Type.Object({
  query: Type.String(),
  options: Type.Optional(Type.Object({
    limit: Type.Number(),
    offset: Type.Number(),
  })),
  tags: Type.Array(Type.String()),
});

const complexOutput = Type.Object({
  results: Type.Array(Type.Object({
    id: Type.String(),
    score: Type.Number(),
  })),
  total: Type.Integer(),
});

// Both simple and complex schemas are accepted by FunctionModule
const fm = new FunctionModule({
  execute: (inputs) => ({ results: [], total: 0 }),
  moduleId: 'search.query',
  inputSchema: complexInput,
  outputSchema: complexOutput,
});
```

### 3. Document the no-auto-schema rationale

The TypeScript implementation intentionally omits the Python `auto_schema` mode because:
- TypeScript types are erased at compile time; `typeof` at runtime only yields `"object"`, `"string"`, etc.
- There is no equivalent of Python's `inspect.signature()` or `typing.get_type_hints()` for TypeScript
- TypeBox provides a runtime-accessible schema representation that doubles as both a TypeScript type (via `Static<T>`) and a JSON Schema
- Explicit schemas are self-documenting and enable IDE autocompletion via `Static<typeof inputSchema>`

### 4. Verify tests pass

Run `npx vitest run tests/test-decorator.test.ts` and confirm schema-related tests pass.

## Acceptance Criteria

- [x] `FunctionModule` constructor requires `inputSchema: TSchema` and `outputSchema: TSchema`
- [x] TypeBox schemas of any complexity are accepted (`Type.Object`, `Type.Array`, `Type.Union`, `Type.Optional`, etc.)
- [x] `fm.inputSchema` and `fm.outputSchema` are accessible as `readonly TSchema`
- [x] No auto-schema mode exists (verified by absence of introspection code)
- [x] `module()` factory also requires explicit `inputSchema` and `outputSchema`
- [x] Complex nested schemas round-trip correctly through FunctionModule construction

## Dependencies

- `function-module` -- Requires `FunctionModule` class with `inputSchema`/`outputSchema` fields

## Estimated Time

1 hour
