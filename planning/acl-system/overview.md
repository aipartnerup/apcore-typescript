# Feature: ACL System

## Overview

The ACL (Access Control List) system provides pattern-based access control for apcore module calls. It evaluates caller-to-target permissions using a first-match-wins strategy over an ordered rule list. Each rule specifies caller patterns, target patterns, an effect (allow/deny), and optional conditions (identity types, roles, call depth). The `ACL` class supports runtime rule mutation (`addRule`, `removeRule`), YAML-based configuration loading via a static `load()` factory, and live `reload()` for configuration hot-swapping. Pattern matching uses a wildcard algorithm (Algorithm A08) that supports `*` globs in module IDs.

## Scope

### Included

- `ACLRule` interface defining the structure of access control rules (callers, targets, effect, description, conditions)
- `ACL` class with `check()` for first-match-wins evaluation, `addRule()` for prepending rules, `removeRule()` for removal by caller/target match via `JSON.stringify` comparison
- Static `ACL.load()` factory for loading rules from YAML configuration files with strict validation
- `reload()` method for hot-reloading YAML-based configuration without reconstructing the ACL instance
- `matchPattern()` wildcard utility (Algorithm A08) for glob-style module ID matching
- Special caller tokens: `@external` (null caller substitution), `@system` (identity type check)
- Conditional rule evaluation: `identity_types`, `roles`, `max_call_depth` with AND logic
- Error types: `ACLDeniedError` (thrown by executor on denial), `ACLRuleError` (invalid rules/config), `ConfigNotFoundError` (missing YAML)

### Excluded

- Executor integration (the executor consumes `ACL.check()` as a dependency)
- Thread locking or concurrency guards (Node.js single-threaded event loop eliminates the need)
- Debug logging (identified gap vs. Python implementation; not included in current scope)
- Role or identity management (consumed from `Context.identity`)

## Technology Stack

- **TypeScript 5.5+** with strict mode
- **js-yaml** for YAML configuration parsing
- **Node.js >= 18.0.0** with ES Module support (`node:fs` for file I/O)
- **vitest** for unit and integration testing

## Task Execution Order

| # | Task File | Description | Status |
|---|-----------|-------------|--------|
| 1 | [acl-rule](./tasks/acl-rule.md) | ACLRule interface definition | completed |
| 2 | [acl-core](./tasks/acl-core.md) | ACL class with check(), addRule(), removeRule(), default effect | completed |
| 3 | [pattern-matching](./tasks/pattern-matching.md) | matchPattern() wildcard matching (Algorithm A08) | completed |
| 4 | [yaml-loading](./tasks/yaml-loading.md) | ACL.load() from YAML with strict validation, reload() support | completed |
| 5 | [conditional-rules](./tasks/conditional-rules.md) | _checkConditions() with identity_types, roles, max_call_depth | completed |

## Progress

| Total | Completed | In Progress | Pending |
|-------|-----------|-------------|---------|
| 5     | 5         | 0           | 0       |

## Reference Documents

- `src/acl.ts` -- ACL class and ACLRule interface (~188 lines)
- `src/utils/pattern.ts` -- matchPattern wildcard utility (~30 lines)
- `src/errors.ts` -- ACLDeniedError, ACLRuleError, ConfigNotFoundError
