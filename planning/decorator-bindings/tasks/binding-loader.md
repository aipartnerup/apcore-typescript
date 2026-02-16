# Task: BindingLoader with Async loadBindings() from YAML

## Goal

Implement the `BindingLoader` class that reads YAML binding configuration files, resolves target strings to callable functions via dynamic `import()`, wraps them in `FunctionModule` instances, and registers them with a `Registry`. This enables zero-code-modification module registration: existing functions can be exposed as apcore modules purely through YAML configuration.

## Files Involved

- `src/bindings.ts` -- `BindingLoader` class with `loadBindings()`, `resolveTarget()`, `_createModuleFromBinding()`
- `src/errors.ts` -- `BindingFileInvalidError`, `BindingInvalidTargetError`, `BindingModuleNotFoundError`, `BindingCallableNotFoundError`, `BindingNotCallableError`
- `tests/test-bindings.test.ts` -- Unit tests for BindingLoader

## Steps

### 1. Write failing tests (TDD)

Create tests for:
- **BindingLoader instantiation**: `new BindingLoader()` creates a valid instance
- **resolveTarget throws on missing colon**: `resolveTarget('no_colon')` throws `BindingInvalidTargetError`
- **loadBindings throws on nonexistent file**: Throws `BindingFileInvalidError` with file path
- **loadBindings throws on invalid YAML**: Malformed YAML throws `BindingFileInvalidError`
- **loadBindings throws on missing bindings key**: YAML without `bindings` key throws `BindingFileInvalidError`
- **loadBindings throws on non-array bindings**: `bindings: "not_a_list"` throws `BindingFileInvalidError`
- **loadBindings throws on missing module_id**: Binding entry without `module_id` throws `BindingFileInvalidError`
- **loadBindings throws on missing target**: Binding entry without `target` throws `BindingFileInvalidError`

### 2. Implement resolveTarget()

```typescript
async resolveTarget(targetString: string): Promise<(...args: unknown[]) => unknown> {
  if (!targetString.includes(':')) {
    throw new BindingInvalidTargetError(targetString);
  }

  const [modulePath, callableName] = targetString.split(':', 2);

  let mod: Record<string, unknown>;
  try {
    mod = await import(modulePath);
  } catch (e) {
    throw new BindingModuleNotFoundError(modulePath);
  }

  // Handle Class.method syntax
  if (callableName.includes('.')) {
    const [className, methodName] = callableName.split('.', 2);
    const cls = mod[className];
    if (cls == null) throw new BindingCallableNotFoundError(className, modulePath);
    let instance: Record<string, unknown>;
    try {
      instance = new (cls as new () => Record<string, unknown>)();
    } catch {
      throw new BindingCallableNotFoundError(callableName, modulePath);
    }
    const method = instance[methodName];
    if (method == null) throw new BindingCallableNotFoundError(callableName, modulePath);
    if (typeof method !== 'function') throw new BindingNotCallableError(targetString);
    return method.bind(instance) as (...args: unknown[]) => unknown;
  }

  // Handle plain function export
  const result = mod[callableName];
  if (result == null) throw new BindingCallableNotFoundError(callableName, modulePath);
  if (typeof result !== 'function') throw new BindingNotCallableError(targetString);
  return result as (...args: unknown[]) => unknown;
}
```

### 3. Implement loadBindings()

```typescript
async loadBindings(filePath: string, registry: Registry): Promise<FunctionModule[]> {
  const bindingFileDir = dirname(filePath);

  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch (e) {
    throw new BindingFileInvalidError(filePath, String(e));
  }

  let data: unknown;
  try {
    data = yaml.load(content);
  } catch (e) {
    throw new BindingFileInvalidError(filePath, `YAML parse error: ${e}`);
  }

  // Validate structure
  if (data === null || data === undefined) {
    throw new BindingFileInvalidError(filePath, 'File is empty');
  }
  const dataObj = data as Record<string, unknown>;
  if (!('bindings' in dataObj)) {
    throw new BindingFileInvalidError(filePath, "Missing 'bindings' key");
  }
  const bindings = dataObj['bindings'];
  if (!Array.isArray(bindings)) {
    throw new BindingFileInvalidError(filePath, "'bindings' must be a list");
  }

  const results: FunctionModule[] = [];
  for (const entry of bindings) {
    const entryObj = entry as Record<string, unknown>;
    if (!('module_id' in entryObj)) {
      throw new BindingFileInvalidError(filePath, "Binding entry missing 'module_id'");
    }
    if (!('target' in entryObj)) {
      throw new BindingFileInvalidError(filePath, "Binding entry missing 'target'");
    }
    const fm = await this._createModuleFromBinding(entryObj, bindingFileDir);
    registry.register(entryObj['module_id'] as string, fm);
    results.push(fm);
  }

  return results;
}
```

### 4. Implement _createModuleFromBinding()

Private method that resolves the target callable, builds schemas (delegated to schema-modes task), and constructs a `FunctionModule`.

### 5. Verify tests pass

Run `npx vitest run tests/test-bindings.test.ts`.

## Acceptance Criteria

- [x] `BindingLoader` class is instantiable with no constructor arguments
- [x] `resolveTarget()` resolves `modulePath:funcName` to the exported function
- [x] `resolveTarget()` resolves `modulePath:ClassName.methodName` to a bound method
- [x] `resolveTarget()` throws `BindingInvalidTargetError` when target string has no colon
- [x] `resolveTarget()` throws `BindingModuleNotFoundError` when module cannot be imported
- [x] `resolveTarget()` throws `BindingCallableNotFoundError` when export is not found
- [x] `resolveTarget()` throws `BindingNotCallableError` when export is not a function
- [x] `loadBindings()` reads YAML, creates FunctionModules, and registers them
- [x] `loadBindings()` throws `BindingFileInvalidError` for missing files, invalid YAML, missing keys
- [x] Each binding entry requires `module_id` and `target` keys

## Dependencies

- `explicit-schemas` -- Requires understanding of explicit schema passing for FunctionModule construction
- `schema-system` (external) -- Consumes `jsonSchemaToTypeBox()` for JSON Schema conversion

## Estimated Time

4 hours
