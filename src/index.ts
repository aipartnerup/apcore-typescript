/**
 * apcore - Schema-driven module development framework.
 */

// Core
export { Context, createIdentity } from './context.js';
export type { Identity } from './context.js';
export { Registry } from './registry/registry.js';
export { Executor, redactSensitive, REDACTED_VALUE } from './executor.js';

// Module types
export { DEFAULT_ANNOTATIONS } from './module.js';
export type { ModuleAnnotations, ModuleExample, ValidationResult, Module } from './module.js';

// Config
export { Config } from './config.js';

// Errors
export {
  ModuleError,
  ConfigNotFoundError,
  ConfigError,
  ACLRuleError,
  ACLDeniedError,
  ModuleNotFoundError,
  ModuleTimeoutError,
  SchemaValidationError,
  SchemaNotFoundError,
  SchemaParseError,
  SchemaCircularRefError,
  CallDepthExceededError,
  CircularCallError,
  CallFrequencyExceededError,
  InvalidInputError,
  FuncMissingTypeHintError,
  FuncMissingReturnTypeError,
  BindingInvalidTargetError,
  BindingModuleNotFoundError,
  BindingCallableNotFoundError,
  BindingNotCallableError,
  BindingSchemaMissingError,
  BindingFileInvalidError,
  CircularDependencyError,
  ModuleLoadError,
} from './errors.js';

// ACL
export { ACL } from './acl.js';
export type { ACLRule } from './acl.js';

// Middleware
export { Middleware, MiddlewareManager, MiddlewareChainError, BeforeMiddleware, AfterMiddleware, LoggingMiddleware } from './middleware/index.js';

// Decorator
export { module, FunctionModule, normalizeResult, makeAutoId } from './decorator.js';

// Bindings
export { BindingLoader } from './bindings.js';

// Utils
export { matchPattern } from './utils/pattern.js';

// Schema
export { SchemaLoader, jsonSchemaToTypeBox } from './schema/loader.js';
export { SchemaValidator } from './schema/validator.js';
export { SchemaExporter } from './schema/exporter.js';
export { SchemaStrategy, ExportProfile } from './schema/types.js';
export type { SchemaDefinition, ResolvedSchema, SchemaValidationErrorDetail, SchemaValidationResult } from './schema/types.js';
export { RefResolver } from './schema/ref-resolver.js';
export { toStrictSchema, applyLlmDescriptions, stripExtensions } from './schema/strict.js';

// Registry types
export type { ModuleDescriptor, DiscoveredModule, DependencyInfo } from './registry/types.js';

// Observability
export { TracingMiddleware, StdoutExporter, InMemoryExporter, createSpan } from './observability/tracing.js';
export type { Span, SpanExporter } from './observability/tracing.js';
export { MetricsCollector, MetricsMiddleware } from './observability/metrics.js';
export { ContextLogger, ObsLoggingMiddleware } from './observability/context-logger.js';

export const VERSION = '0.1.2';
