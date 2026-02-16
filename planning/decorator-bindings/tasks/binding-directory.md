# Task: loadBindingDir() for Directory Scanning of Binding YAML Files

## Goal

Implement the `loadBindingDir()` method on `BindingLoader` that scans a directory for binding YAML files matching a glob pattern (default `*.binding.yaml`), loads each one via `loadBindings()`, and returns all created `FunctionModule` instances. This enables convention-based module registration where all binding files in a directory are automatically discovered and loaded.

## Files Involved

- `src/bindings.ts` -- `BindingLoader.loadBindingDir()` method
- `tests/test-bindings.test.ts` -- Unit tests for loadBindingDir()

## Steps

### 1. Write failing tests (TDD)

Create tests for:
- **loadBindingDir throws on nonexistent directory**: Throws `BindingFileInvalidError` with "Directory does not exist"
- **loadBindingDir throws on file path (not directory)**: A path pointing to a file throws `BindingFileInvalidError`
- **loadBindingDir returns empty array for empty directory**: Directory with no matching files returns `[]`
- **loadBindingDir loads matching files in sorted order**: Files are processed alphabetically
- **loadBindingDir respects custom pattern**: `pattern: '*.modules.yaml'` only matches files with that suffix

### 2. Implement loadBindingDir()

```typescript
async loadBindingDir(
  dirPath: string,
  registry: Registry,
  pattern: string = '*.binding.yaml',
): Promise<FunctionModule[]> {
  if (!existsSync(dirPath) || !statSync(dirPath).isDirectory()) {
    throw new BindingFileInvalidError(dirPath, 'Directory does not exist');
  }

  const files = readdirSync(dirPath)
    .filter((f) => {
      // Simple glob matching: extract suffix after the wildcard
      const suffix = pattern.replace('*', '');
      return f.endsWith(suffix);
    })
    .sort();

  const results: FunctionModule[] = [];
  for (const f of files) {
    const fms = await this.loadBindings(join(dirPath, f), registry);
    results.push(...fms);
  }
  return results;
}
```

Key design decisions:
- **Simple glob matching**: Only supports `*` prefix patterns (e.g., `*.binding.yaml`). The wildcard is stripped and the remaining suffix is used for `endsWith()` matching. This covers the primary use case without introducing a glob library dependency.
- **Sorted file order**: Files are sorted alphabetically to ensure deterministic loading order across platforms.
- **Sequential loading**: Files are loaded sequentially (not in parallel) to maintain deterministic registration order in the registry. This is acceptable since binding loading is a startup-time operation.
- **Sync directory listing**: Uses `readdirSync` and `statSync` for directory operations (same rationale as `loadBindings`'s use of `readFileSync`).

### 3. Verify tests pass

Run `npx vitest run tests/test-bindings.test.ts`.

## Acceptance Criteria

- [x] `loadBindingDir()` scans directory for files matching the pattern
- [x] Default pattern is `'*.binding.yaml'`
- [x] Custom patterns like `'*.modules.yaml'` are supported
- [x] Files are processed in sorted (alphabetical) order
- [x] Each matching file is loaded via `loadBindings()` and results are aggregated
- [x] Throws `BindingFileInvalidError` when directory does not exist
- [x] Throws `BindingFileInvalidError` when path is a file, not a directory
- [x] Returns empty array when no files match the pattern

## Dependencies

- `binding-loader` -- Requires `BindingLoader` class with `loadBindings()` method

## Estimated Time

2 hours
