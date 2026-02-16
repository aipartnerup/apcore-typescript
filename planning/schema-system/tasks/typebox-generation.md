# Task: TypeBox Generation

## Goal

Implement the `jsonSchemaToTypeBox()` function that recursively converts a JSON Schema dictionary to a TypeBox `TSchema` object. This is the TypeScript equivalent of the Python `create_model()` approach, leveraging the fact that TypeBox schemas ARE valid JSON Schema.

## Files Involved

- `src/schema/loader.ts` -- `jsonSchemaToTypeBox()` function (exported, co-located with SchemaLoader)
- `tests/schema/test-loader.test.ts` -- Unit tests for `jsonSchemaToTypeBox()`

## Steps

### 1. Handle object type with properties

Convert `{ type: "object", properties: {...}, required: [...] }` to `Type.Object({...})`. Recursively convert each property. Wrap non-required properties with `Type.Optional()`.

```typescript
if (schemaType === 'object') {
  const properties = schema['properties'] as Record<string, Record<string, unknown>> | undefined;
  const required = new Set((schema['required'] as string[]) ?? []);

  if (properties) {
    const typeboxProps: Record<string, TSchema> = {};
    for (const [name, propSchema] of Object.entries(properties)) {
      const propType = jsonSchemaToTypeBox(propSchema);
      typeboxProps[name] = required.has(name) ? propType : Type.Optional(propType);
    }
    return Type.Object(typeboxProps);
  }
  return Type.Record(Type.String(), Type.Unknown());
}
```

TDD: Test object with required and optional properties. Verify `Value.Check()` accepts valid data and rejects missing required fields.

### 2. Handle object type without properties

Convert `{ type: "object" }` (no properties) to `Type.Record(Type.String(), Type.Unknown())`, accepting any string-keyed object.

TDD: Test that `{ any: "value" }` passes validation.

### 3. Handle array type

Convert `{ type: "array", items: {...} }` to `Type.Array(jsonSchemaToTypeBox(items))`. Without items, use `Type.Array(Type.Unknown())`.

```typescript
if (schemaType === 'array') {
  const items = schema['items'] as Record<string, unknown> | undefined;
  return items ? Type.Array(jsonSchemaToTypeBox(items)) : Type.Array(Type.Unknown());
}
```

TDD: Test typed array (string items), untyped array, valid and invalid data.

### 4. Handle string type with constraints

Convert `{ type: "string" }` to `Type.String()`. Pass through constraint options: `minLength`, `maxLength`, `pattern`, `format`.

```typescript
if (schemaType === 'string') {
  const opts: Record<string, unknown> = {};
  if ('minLength' in schema) opts['minLength'] = schema['minLength'];
  if ('maxLength' in schema) opts['maxLength'] = schema['maxLength'];
  if ('pattern' in schema) opts['pattern'] = schema['pattern'];
  if ('format' in schema) opts['format'] = schema['format'];
  return Type.String(opts);
}
```

TDD: Test plain string, string with `minLength`/`maxLength`, verify constraint enforcement.

### 5. Handle integer and number types with constraints

Convert `{ type: "integer" }` to `Type.Integer()` and `{ type: "number" }` to `Type.Number()`. Pass through: `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum`, `multipleOf`.

TDD: Test integer rejects floats, number accepts both, constraint boundaries work.

### 6. Handle boolean and null types

Convert `{ type: "boolean" }` to `Type.Boolean()` and `{ type: "null" }` to `Type.Null()`.

TDD: Test boolean accepts `true`/`false`, rejects strings. Null accepts `null`, rejects `undefined`.

### 7. Handle enum

Convert `{ enum: ["a", "b", "c"] }` to `Type.Union(values.map(v => Type.Literal(v)))`.

TDD: Test valid enum values accepted, invalid values rejected.

### 8. Handle oneOf and anyOf

Convert `{ oneOf: [...] }` and `{ anyOf: [...] }` to `Type.Union(schemas.map(s => jsonSchemaToTypeBox(s)))`.

TDD: Test union of string and number accepts both types, rejects others.

### 9. Handle allOf

Convert `{ allOf: [...] }` to `Type.Intersect(schemas.map(s => jsonSchemaToTypeBox(s)))`.

TDD: Test intersection of two object schemas requires properties from both.

### 10. Handle unknown/unsupported schemas

Any schema that does not match a known type falls through to `Type.Unknown()`, which accepts any value.

TDD: Test empty schema `{}` accepts any value.

## Acceptance Criteria

- [x] `object` with properties converts to `Type.Object()` with correct required/optional handling
- [x] `object` without properties converts to `Type.Record(Type.String(), Type.Unknown())`
- [x] `array` with items converts to `Type.Array()` with recursive item conversion
- [x] `array` without items converts to `Type.Array(Type.Unknown())`
- [x] `string` converts to `Type.String()` with `minLength`/`maxLength`/`pattern`/`format` passthrough
- [x] `integer` converts to `Type.Integer()` with numeric constraint passthrough
- [x] `number` converts to `Type.Number()` with numeric constraint passthrough
- [x] `boolean` converts to `Type.Boolean()`
- [x] `null` converts to `Type.Null()`
- [x] `enum` converts to `Type.Union(Type.Literal(...))` for each value
- [x] `oneOf`/`anyOf` convert to `Type.Union()`
- [x] `allOf` converts to `Type.Intersect()`
- [x] Unknown schemas convert to `Type.Unknown()`
- [x] All generated TypeBox schemas pass `Value.Check()` validation correctly
- [x] All tests pass with `vitest`

## Dependencies

- types-and-annotations (for `TSchema` type from TypeBox)

## Estimated Time

3 hours
