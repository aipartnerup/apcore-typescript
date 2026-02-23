/**
 * Error hierarchy for the apcore framework.
 */

export class ModuleError extends Error {
  readonly code: string;
  readonly details: Record<string, unknown>;
  override readonly cause?: Error;
  readonly traceId?: string;
  readonly timestamp: string;

  constructor(
    code: string,
    message: string,
    details?: Record<string, unknown>,
    cause?: Error,
    traceId?: string,
  ) {
    super(message, cause ? { cause } : undefined);
    this.name = 'ModuleError';
    this.code = code;
    this.details = details ?? {};
    this.cause = cause;
    this.traceId = traceId;
    this.timestamp = new Date().toISOString();
  }

  override toString(): string {
    return `[${this.code}] ${this.message}`;
  }
}

export class ConfigNotFoundError extends ModuleError {
  constructor(configPath: string, options?: { cause?: Error; traceId?: string }) {
    super(
      'CONFIG_NOT_FOUND',
      `Configuration file not found: ${configPath}`,
      { configPath },
      options?.cause,
      options?.traceId,
    );
    this.name = 'ConfigNotFoundError';
  }
}

export class ConfigError extends ModuleError {
  constructor(message: string, options?: { cause?: Error; traceId?: string }) {
    super('CONFIG_INVALID', message, {}, options?.cause, options?.traceId);
    this.name = 'ConfigError';
  }
}

export class ACLRuleError extends ModuleError {
  constructor(message: string, options?: { cause?: Error; traceId?: string }) {
    super('ACL_RULE_ERROR', message, {}, options?.cause, options?.traceId);
    this.name = 'ACLRuleError';
  }
}

export class ACLDeniedError extends ModuleError {
  constructor(callerId: string | null, targetId: string, options?: { cause?: Error; traceId?: string }) {
    super(
      'ACL_DENIED',
      `Access denied: ${callerId} -> ${targetId}`,
      { callerId, targetId },
      options?.cause,
      options?.traceId,
    );
    this.name = 'ACLDeniedError';
  }

  get callerId(): string | null {
    return this.details['callerId'] as string | null;
  }

  get targetId(): string {
    return this.details['targetId'] as string;
  }
}

export class ModuleNotFoundError extends ModuleError {
  constructor(moduleId: string, options?: { cause?: Error; traceId?: string }) {
    super(
      'MODULE_NOT_FOUND',
      `Module not found: ${moduleId}`,
      { moduleId },
      options?.cause,
      options?.traceId,
    );
    this.name = 'ModuleNotFoundError';
  }
}

export class ModuleTimeoutError extends ModuleError {
  constructor(moduleId: string, timeoutMs: number, options?: { cause?: Error; traceId?: string }) {
    super(
      'MODULE_TIMEOUT',
      `Module ${moduleId} timed out after ${timeoutMs}ms`,
      { moduleId, timeoutMs },
      options?.cause,
      options?.traceId,
    );
    this.name = 'ModuleTimeoutError';
  }

  get moduleId(): string {
    return this.details['moduleId'] as string;
  }

  get timeoutMs(): number {
    return this.details['timeoutMs'] as number;
  }
}

export class SchemaValidationError extends ModuleError {
  constructor(
    message: string = 'Schema validation failed',
    errors?: Array<Record<string, unknown>>,
    options?: { cause?: Error; traceId?: string },
  ) {
    super(
      'SCHEMA_VALIDATION_ERROR',
      message,
      { errors: errors ?? [] },
      options?.cause,
      options?.traceId,
    );
    this.name = 'SchemaValidationError';
  }
}

export class SchemaNotFoundError extends ModuleError {
  constructor(schemaId: string, options?: { cause?: Error; traceId?: string }) {
    super(
      'SCHEMA_NOT_FOUND',
      `Schema not found: ${schemaId}`,
      { schemaId },
      options?.cause,
      options?.traceId,
    );
    this.name = 'SchemaNotFoundError';
  }
}

export class SchemaParseError extends ModuleError {
  constructor(message: string, options?: { cause?: Error; traceId?: string }) {
    super('SCHEMA_PARSE_ERROR', message, {}, options?.cause, options?.traceId);
    this.name = 'SchemaParseError';
  }
}

export class SchemaCircularRefError extends ModuleError {
  constructor(refPath: string, options?: { cause?: Error; traceId?: string }) {
    super(
      'SCHEMA_CIRCULAR_REF',
      `Circular reference detected: ${refPath}`,
      { refPath },
      options?.cause,
      options?.traceId,
    );
    this.name = 'SchemaCircularRefError';
  }
}

export class CallDepthExceededError extends ModuleError {
  constructor(depth: number, maxDepth: number, callChain: string[], options?: { cause?: Error; traceId?: string }) {
    super(
      'CALL_DEPTH_EXCEEDED',
      `Call depth ${depth} exceeds maximum ${maxDepth}`,
      { depth, maxDepth, callChain },
      options?.cause,
      options?.traceId,
    );
    this.name = 'CallDepthExceededError';
  }

  get currentDepth(): number {
    return this.details['depth'] as number;
  }

  get maxDepth(): number {
    return this.details['maxDepth'] as number;
  }
}

export class CircularCallError extends ModuleError {
  constructor(moduleId: string, callChain: string[], options?: { cause?: Error; traceId?: string }) {
    super(
      'CIRCULAR_CALL',
      `Circular call detected for module ${moduleId}`,
      { moduleId, callChain },
      options?.cause,
      options?.traceId,
    );
    this.name = 'CircularCallError';
  }

  get moduleId(): string {
    return this.details['moduleId'] as string;
  }
}

export class CallFrequencyExceededError extends ModuleError {
  constructor(
    moduleId: string,
    count: number,
    maxRepeat: number,
    callChain: string[],
    options?: { cause?: Error; traceId?: string },
  ) {
    super(
      'CALL_FREQUENCY_EXCEEDED',
      `Module ${moduleId} called ${count} times, max is ${maxRepeat}`,
      { moduleId, count, maxRepeat, callChain },
      options?.cause,
      options?.traceId,
    );
    this.name = 'CallFrequencyExceededError';
  }

  get moduleId(): string {
    return this.details['moduleId'] as string;
  }

  get count(): number {
    return this.details['count'] as number;
  }

  get maxRepeat(): number {
    return this.details['maxRepeat'] as number;
  }
}

export class InvalidInputError extends ModuleError {
  constructor(message: string = 'Invalid input', options?: { cause?: Error; traceId?: string }) {
    super('GENERAL_INVALID_INPUT', message, {}, options?.cause, options?.traceId);
    this.name = 'InvalidInputError';
  }
}

export class FuncMissingTypeHintError extends ModuleError {
  constructor(functionName: string, parameterName: string, options?: { cause?: Error; traceId?: string }) {
    super(
      'FUNC_MISSING_TYPE_HINT',
      `Parameter '${parameterName}' in function '${functionName}' has no type annotation. Add a type annotation like '${parameterName}: string'.`,
      { functionName, parameterName },
      options?.cause,
      options?.traceId,
    );
    this.name = 'FuncMissingTypeHintError';
  }
}

export class FuncMissingReturnTypeError extends ModuleError {
  constructor(functionName: string, options?: { cause?: Error; traceId?: string }) {
    super(
      'FUNC_MISSING_RETURN_TYPE',
      `Function '${functionName}' has no return type annotation. Add a return type like ': Record<string, unknown>'.`,
      { functionName },
      options?.cause,
      options?.traceId,
    );
    this.name = 'FuncMissingReturnTypeError';
  }
}

export class BindingInvalidTargetError extends ModuleError {
  constructor(target: string, options?: { cause?: Error; traceId?: string }) {
    super(
      'BINDING_INVALID_TARGET',
      `Invalid binding target '${target}'. Expected format: 'module.path:callable_name'.`,
      { target },
      options?.cause,
      options?.traceId,
    );
    this.name = 'BindingInvalidTargetError';
  }
}

export class BindingModuleNotFoundError extends ModuleError {
  constructor(modulePath: string, options?: { cause?: Error; traceId?: string }) {
    super(
      'BINDING_MODULE_NOT_FOUND',
      `Cannot import module '${modulePath}'.`,
      { modulePath },
      options?.cause,
      options?.traceId,
    );
    this.name = 'BindingModuleNotFoundError';
  }
}

export class BindingCallableNotFoundError extends ModuleError {
  constructor(callableName: string, modulePath: string, options?: { cause?: Error; traceId?: string }) {
    super(
      'BINDING_CALLABLE_NOT_FOUND',
      `Cannot find callable '${callableName}' in module '${modulePath}'.`,
      { callableName, modulePath },
      options?.cause,
      options?.traceId,
    );
    this.name = 'BindingCallableNotFoundError';
  }
}

export class BindingNotCallableError extends ModuleError {
  constructor(target: string, options?: { cause?: Error; traceId?: string }) {
    super(
      'BINDING_NOT_CALLABLE',
      `Resolved target '${target}' is not callable.`,
      { target },
      options?.cause,
      options?.traceId,
    );
    this.name = 'BindingNotCallableError';
  }
}

export class BindingSchemaMissingError extends ModuleError {
  constructor(target: string, options?: { cause?: Error; traceId?: string }) {
    super(
      'BINDING_SCHEMA_MISSING',
      `No schema available for target '${target}'. Add type hints or provide an explicit schema.`,
      { target },
      options?.cause,
      options?.traceId,
    );
    this.name = 'BindingSchemaMissingError';
  }
}

export class BindingFileInvalidError extends ModuleError {
  constructor(filePath: string, reason: string, options?: { cause?: Error; traceId?: string }) {
    super(
      'BINDING_FILE_INVALID',
      `Invalid binding file '${filePath}': ${reason}`,
      { filePath, reason },
      options?.cause,
      options?.traceId,
    );
    this.name = 'BindingFileInvalidError';
  }
}

export class CircularDependencyError extends ModuleError {
  constructor(cyclePath: string[], options?: { cause?: Error; traceId?: string }) {
    super(
      'CIRCULAR_DEPENDENCY',
      `Circular dependency detected: ${cyclePath.join(' -> ')}`,
      { cyclePath },
      options?.cause,
      options?.traceId,
    );
    this.name = 'CircularDependencyError';
  }
}

export class ModuleLoadError extends ModuleError {
  constructor(moduleId: string, reason: string, options?: { cause?: Error; traceId?: string }) {
    super(
      'MODULE_LOAD_ERROR',
      `Failed to load module '${moduleId}': ${reason}`,
      { moduleId, reason },
      options?.cause,
      options?.traceId,
    );
    this.name = 'ModuleLoadError';
  }
}

export class ModuleExecuteError extends ModuleError {
  constructor(moduleId: string, reason: string, options?: { cause?: Error; traceId?: string }) {
    super(
      'MODULE_EXECUTE_ERROR',
      `Failed to execute module '${moduleId}': ${reason}`,
      { moduleId, reason },
      options?.cause,
      options?.traceId,
    );
    this.name = 'ModuleExecuteError';
  }
}

export class InternalError extends ModuleError {
  constructor(message: string = 'Internal error', options?: { cause?: Error; traceId?: string }) {
    super('GENERAL_INTERNAL_ERROR', message, {}, options?.cause, options?.traceId);
    this.name = 'InternalError';
  }
}

/**
 * All framework error codes as constants.
 * Use these instead of hardcoding error code strings.
 */
export const ErrorCodes = Object.freeze({
  CONFIG_NOT_FOUND: "CONFIG_NOT_FOUND",
  CONFIG_INVALID: "CONFIG_INVALID",
  ACL_RULE_ERROR: "ACL_RULE_ERROR",
  ACL_DENIED: "ACL_DENIED",
  MODULE_NOT_FOUND: "MODULE_NOT_FOUND",
  MODULE_TIMEOUT: "MODULE_TIMEOUT",
  MODULE_LOAD_ERROR: "MODULE_LOAD_ERROR",
  MODULE_EXECUTE_ERROR: "MODULE_EXECUTE_ERROR",
  SCHEMA_VALIDATION_ERROR: "SCHEMA_VALIDATION_ERROR",
  SCHEMA_NOT_FOUND: "SCHEMA_NOT_FOUND",
  SCHEMA_PARSE_ERROR: "SCHEMA_PARSE_ERROR",
  SCHEMA_CIRCULAR_REF: "SCHEMA_CIRCULAR_REF",
  CALL_DEPTH_EXCEEDED: "CALL_DEPTH_EXCEEDED",
  CIRCULAR_CALL: "CIRCULAR_CALL",
  CALL_FREQUENCY_EXCEEDED: "CALL_FREQUENCY_EXCEEDED",
  GENERAL_INVALID_INPUT: "GENERAL_INVALID_INPUT",
  GENERAL_INTERNAL_ERROR: "GENERAL_INTERNAL_ERROR",
  FUNC_MISSING_TYPE_HINT: "FUNC_MISSING_TYPE_HINT",
  FUNC_MISSING_RETURN_TYPE: "FUNC_MISSING_RETURN_TYPE",
  BINDING_INVALID_TARGET: "BINDING_INVALID_TARGET",
  BINDING_MODULE_NOT_FOUND: "BINDING_MODULE_NOT_FOUND",
  BINDING_CALLABLE_NOT_FOUND: "BINDING_CALLABLE_NOT_FOUND",
  BINDING_NOT_CALLABLE: "BINDING_NOT_CALLABLE",
  BINDING_SCHEMA_MISSING: "BINDING_SCHEMA_MISSING",
  BINDING_FILE_INVALID: "BINDING_FILE_INVALID",
  CIRCULAR_DEPENDENCY: "CIRCULAR_DEPENDENCY",
  MIDDLEWARE_CHAIN_ERROR: "MIDDLEWARE_CHAIN_ERROR",
  // Forward declarations for Level 2 Phase 2 features.
  // Exception classes will be added when the corresponding features are implemented.
  GENERAL_NOT_IMPLEMENTED: "GENERAL_NOT_IMPLEMENTED",
  DEPENDENCY_NOT_FOUND: "DEPENDENCY_NOT_FOUND",
} as const);

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
