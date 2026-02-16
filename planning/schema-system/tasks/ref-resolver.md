# Task: RefResolver

## Goal

Implement the `RefResolver` class for resolving `$ref` pointers in JSON Schema documents. Supports local JSON pointers, relative file paths, `apcore://` canonical URIs, nested `$ref` chains, sibling key merging, circular reference detection, and configurable max depth.

## Files Involved

- `src/schema/ref-resolver.ts` -- `RefResolver` class
- `src/errors.ts` -- `SchemaCircularRefError`, `SchemaNotFoundError`, `SchemaParseError`
- `tests/schema/test-ref-resolver.test.ts` -- Unit tests

## Steps

### 1. Implement constructor and file cache

```typescript
export class RefResolver {
  private _schemasDir: string;
  private _maxDepth: number;
  private _fileCache: Map<string, Record<string, unknown>> = new Map();

  constructor(schemasDir: string, maxDepth: number = 32) {
    this._schemasDir = resolve(schemasDir);
    this._maxDepth = maxDepth;
  }
}
```

TDD: Verify constructor resolves `schemasDir` to absolute path and stores `maxDepth`.

### 2. Implement resolve() entry point

Deep-copy the input schema. Set it as the inline sentinel (`__inline__`) in the file cache. Walk all nodes via `_resolveNode()`. Clean up sentinel on completion.

```typescript
resolve(schema: Record<string, unknown>, currentFile?: string | null): Record<string, unknown> {
  const result = deepCopy(schema);
  this._fileCache.set(INLINE_SENTINEL, result);
  try {
    this._resolveNode(result, currentFile ?? null, new Set(), 0);
  } finally {
    this._fileCache.delete(INLINE_SENTINEL);
  }
  return result;
}
```

TDD: Test that schemas without `$ref` pass through unchanged (deep-copied).

### 3. Implement _parseRef() for $ref URI parsing

Handle four `$ref` formats:
- Local pointer: `#/definitions/Foo` -- resolve against current file or inline sentinel
- `apcore://` URI: `apcore://module.id/definitions/Type` -- convert dots to path separators, append `.schema.yaml`
- File with pointer: `../shared.yaml#/definitions/Bar` -- resolve file relative to current file or schemas dir
- File only: `../shared.yaml` -- resolve file with empty pointer

```typescript
private _parseRef(refString: string, currentFile: string | null): [string, string]
```

TDD: Test each format with expected `[filePath, jsonPointer]` output.

### 4. Implement _resolveJsonPointer()

Walk the JSON pointer segments (split on `/`, skip empty leading segment, unescape `~1` -> `/` and `~0` -> `~`). Throw `SchemaNotFoundError` if any segment is not found.

TDD: Test successful pointer traversal, nested paths, and missing segment error.

### 5. Implement resolveRef() for single $ref resolution

Check visited set for circular detection. Check depth against `_maxDepth`. Parse the `$ref` string. Load the target file. Resolve the JSON pointer within the document. Deep-copy the target. Merge sibling keys if present. Recursively resolve nested `$ref` in the result.

TDD: Test basic `$ref` resolution, sibling key merging, nested `$ref` chains.

### 6. Implement _resolveNode() recursive walker

Walk objects and arrays. When a `$ref` key is found, extract sibling keys, call `resolveRef()`, then replace the node contents in-place. For non-`$ref` objects and arrays, recurse into children.

TDD: Test resolution of schemas with multiple `$ref` at different nesting levels.

### 7. Implement circular reference detection

The visited set tracks resolved `$ref` strings within a single chain. A fresh `Set` copy is used for each branch of the tree to avoid false positives when the same definition is referenced from multiple independent locations.

TDD: Test that `A -> B -> A` circular chain throws `SchemaCircularRefError`. Test that the same definition referenced from two independent properties does NOT throw.

### 8. Implement max depth enforcement

When `depth >= _maxDepth`, throw `SchemaCircularRefError` with a descriptive message including the ref string and max depth value.

TDD: Test with `maxDepth = 2` and a 3-deep chain.

### 9. Implement _loadFile() with caching

Load YAML files via `readFileSync` and `yaml.load()`. Cache parsed results in `_fileCache`. Handle empty files (return `{}`), non-mapping files (`SchemaParseError`), and missing files (`SchemaNotFoundError`).

TDD: Test file loading, caching (second call returns same object), and error cases.

### 10. Implement clearCache()

```typescript
clearCache(): void {
  this._fileCache.clear();
}
```

TDD: Verify cache is cleared.

## Acceptance Criteria

- [x] Local `#/definitions/Foo` pointers resolve correctly
- [x] Relative file paths with pointers (`../shared.yaml#/definitions/Bar`) resolve correctly
- [x] `apcore://module.id/definitions/Type` canonical URIs resolve to correct file paths
- [x] Nested `$ref` chains (ref pointing to another ref) resolve fully
- [x] Sibling keys alongside `$ref` are merged into the resolved result
- [x] Circular references (`A -> B -> A`) throw `SchemaCircularRefError`
- [x] Max depth exceeded throws `SchemaCircularRefError` with descriptive message
- [x] Schemas without `$ref` pass through as deep copies
- [x] Missing files throw `SchemaNotFoundError`
- [x] Invalid YAML throws `SchemaParseError`
- [x] File cache prevents redundant disk reads
- [x] `clearCache()` invalidates all cached files
- [x] All tests pass with `vitest`

## Dependencies

- types-and-annotations (for error types from `errors.ts`)

## Estimated Time

3 hours
