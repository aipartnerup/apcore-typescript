import { describe, it, expect } from 'vitest';
import {
  ModuleError,
  ModuleNotFoundError,
  ModuleTimeoutError,
  ModuleExecuteError,
  ModuleLoadError,
  SchemaValidationError,
  SchemaNotFoundError,
  SchemaParseError,
  SchemaCircularRefError,
  ACLDeniedError,
  ACLRuleError,
  CallDepthExceededError,
  CircularCallError,
  CallFrequencyExceededError,
  ConfigNotFoundError,
  ConfigError,
  InvalidInputError,
  InternalError,
  FuncMissingTypeHintError,
  FuncMissingReturnTypeError,
  BindingInvalidTargetError,
  BindingModuleNotFoundError,
  BindingCallableNotFoundError,
  BindingNotCallableError,
  BindingSchemaMissingError,
  BindingFileInvalidError,
  CircularDependencyError,
  ErrorCodes,
} from '../src/errors.js';

describe('ModuleError', () => {
  it('creates with code and message', () => {
    const err = new ModuleError('TEST_CODE', 'test message');
    expect(err.code).toBe('TEST_CODE');
    expect(err.message).toBe('test message');
    expect(err.name).toBe('ModuleError');
    expect(err.details).toEqual({});
    expect(err.timestamp).toBeDefined();
  });

  it('toString includes code and message', () => {
    const err = new ModuleError('ERR', 'something failed');
    expect(err.toString()).toBe('[ERR] something failed');
  });

  it('accepts details, cause, and traceId', () => {
    const cause = new Error('root cause');
    const err = new ModuleError('X', 'msg', { key: 'val' }, cause, 'trace-123');
    expect(err.details).toEqual({ key: 'val' });
    expect(err.cause).toBe(cause);
    expect(err.traceId).toBe('trace-123');
  });

  it('is an instance of Error', () => {
    const err = new ModuleError('X', 'msg');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ModuleError);
  });
});

describe('Error subclasses', () => {
  it('ModuleNotFoundError', () => {
    const err = new ModuleNotFoundError('mod.x');
    expect(err.name).toBe('ModuleNotFoundError');
    expect(err.code).toBe('MODULE_NOT_FOUND');
    expect(err.message).toContain('mod.x');
    expect(err.details['moduleId']).toBe('mod.x');
  });

  it('ModuleTimeoutError', () => {
    const err = new ModuleTimeoutError('mod.x', 5000);
    expect(err.name).toBe('ModuleTimeoutError');
    expect(err.code).toBe('MODULE_TIMEOUT');
    expect(err.moduleId).toBe('mod.x');
    expect(err.timeoutMs).toBe(5000);
  });

  it('SchemaValidationError', () => {
    const err = new SchemaValidationError('bad data', [{ path: '/x' }]);
    expect(err.name).toBe('SchemaValidationError');
    expect(err.code).toBe('SCHEMA_VALIDATION_ERROR');
    expect(err.details['errors']).toHaveLength(1);
  });

  it('ACLDeniedError', () => {
    const err = new ACLDeniedError('caller.a', 'target.b');
    expect(err.name).toBe('ACLDeniedError');
    expect(err.code).toBe('ACL_DENIED');
    expect(err.callerId).toBe('caller.a');
    expect(err.targetId).toBe('target.b');
  });

  it('CallDepthExceededError', () => {
    const err = new CallDepthExceededError(33, 32, ['a', 'b']);
    expect(err.name).toBe('CallDepthExceededError');
    expect(err.code).toBe('CALL_DEPTH_EXCEEDED');
    expect(err.currentDepth).toBe(33);
    expect(err.maxDepth).toBe(32);
  });

  it('CircularCallError', () => {
    const err = new CircularCallError('mod.a', ['mod.a', 'mod.b', 'mod.a']);
    expect(err.name).toBe('CircularCallError');
    expect(err.code).toBe('CIRCULAR_CALL');
    expect(err.moduleId).toBe('mod.a');
  });

  it('CallFrequencyExceededError', () => {
    const err = new CallFrequencyExceededError('mod.a', 4, 3, ['mod.a', 'mod.a', 'mod.a', 'mod.a']);
    expect(err.name).toBe('CallFrequencyExceededError');
    expect(err.code).toBe('CALL_FREQUENCY_EXCEEDED');
    expect(err.moduleId).toBe('mod.a');
    expect(err.count).toBe(4);
    expect(err.maxRepeat).toBe(3);
  });

  it('ConfigNotFoundError', () => {
    const err = new ConfigNotFoundError('/path/to/config');
    expect(err.name).toBe('ConfigNotFoundError');
    expect(err.code).toBe('CONFIG_NOT_FOUND');
  });

  it('ConfigError', () => {
    const err = new ConfigError('bad config');
    expect(err.name).toBe('ConfigError');
    expect(err.code).toBe('CONFIG_INVALID');
  });

  it('InvalidInputError', () => {
    const err = new InvalidInputError('bad input');
    expect(err.name).toBe('InvalidInputError');
    expect(err.code).toBe('GENERAL_INVALID_INPUT');
  });

  it('BindingInvalidTargetError', () => {
    const err = new BindingInvalidTargetError('bad:target:format');
    expect(err.name).toBe('BindingInvalidTargetError');
    expect(err.code).toBe('BINDING_INVALID_TARGET');
  });

  it('BindingModuleNotFoundError', () => {
    const err = new BindingModuleNotFoundError('some.module');
    expect(err.name).toBe('BindingModuleNotFoundError');
    expect(err.code).toBe('BINDING_MODULE_NOT_FOUND');
  });

  it('BindingCallableNotFoundError', () => {
    const err = new BindingCallableNotFoundError('fn', 'some.module');
    expect(err.name).toBe('BindingCallableNotFoundError');
    expect(err.code).toBe('BINDING_CALLABLE_NOT_FOUND');
  });

  it('BindingNotCallableError', () => {
    const err = new BindingNotCallableError('some:target');
    expect(err.name).toBe('BindingNotCallableError');
    expect(err.code).toBe('BINDING_NOT_CALLABLE');
  });

  it('BindingSchemaMissingError', () => {
    const err = new BindingSchemaMissingError('some:target');
    expect(err.name).toBe('BindingSchemaMissingError');
    expect(err.code).toBe('BINDING_SCHEMA_MISSING');
  });

  it('BindingFileInvalidError', () => {
    const err = new BindingFileInvalidError('/path/file.yaml', 'parse error');
    expect(err.name).toBe('BindingFileInvalidError');
    expect(err.code).toBe('BINDING_FILE_INVALID');
  });

  it('CircularDependencyError', () => {
    const err = new CircularDependencyError(['a', 'b', 'a']);
    expect(err.name).toBe('CircularDependencyError');
    expect(err.code).toBe('CIRCULAR_DEPENDENCY');
    expect(err.message).toContain('a -> b -> a');
  });

  it('ModuleLoadError', () => {
    const err = new ModuleLoadError('mod.a', 'file not found');
    expect(err.name).toBe('ModuleLoadError');
    expect(err.code).toBe('MODULE_LOAD_ERROR');
  });

  it('SchemaNotFoundError', () => {
    const err = new SchemaNotFoundError('schema.x');
    expect(err.name).toBe('SchemaNotFoundError');
    expect(err.code).toBe('SCHEMA_NOT_FOUND');
  });

  it('SchemaParseError', () => {
    const err = new SchemaParseError('invalid yaml');
    expect(err.name).toBe('SchemaParseError');
    expect(err.code).toBe('SCHEMA_PARSE_ERROR');
  });

  it('SchemaCircularRefError', () => {
    const err = new SchemaCircularRefError('#/definitions/A');
    expect(err.name).toBe('SchemaCircularRefError');
    expect(err.code).toBe('SCHEMA_CIRCULAR_REF');
  });

  it('ACLRuleError', () => {
    const err = new ACLRuleError('bad rule');
    expect(err.name).toBe('ACLRuleError');
    expect(err.code).toBe('ACL_RULE_ERROR');
  });
});

describe('ModuleError optional parameters', () => {
  it('defaults details to empty object when not provided', () => {
    const err = new ModuleError('X', 'msg');
    expect(err.details).toEqual({});
  });

  it('leaves cause and traceId undefined when not provided', () => {
    const err = new ModuleError('X', 'msg');
    expect(err.cause).toBeUndefined();
    expect(err.traceId).toBeUndefined();
  });

  it('passes cause to Error super constructor', () => {
    const cause = new Error('root');
    const err = new ModuleError('X', 'msg', {}, cause);
    expect(err.cause).toBe(cause);
  });

  it('sets traceId when provided', () => {
    const err = new ModuleError('X', 'msg', {}, undefined, 'trace-abc');
    expect(err.traceId).toBe('trace-abc');
    expect(err.cause).toBeUndefined();
  });

  it('toString returns formatted code and message', () => {
    const err = new ModuleError('MY_CODE', 'my message');
    expect(err.toString()).toBe('[MY_CODE] my message');
  });
});

describe('Error subclasses with options (cause and traceId branches)', () => {
  const cause = new Error('underlying cause');
  const traceId = 'trace-999';

  it('ConfigNotFoundError with cause and traceId', () => {
    const err = new ConfigNotFoundError('/cfg', { cause, traceId });
    expect(err.cause).toBe(cause);
    expect(err.traceId).toBe(traceId);
    expect(err.details['configPath']).toBe('/cfg');
  });

  it('ConfigNotFoundError without options', () => {
    const err = new ConfigNotFoundError('/cfg');
    expect(err.cause).toBeUndefined();
    expect(err.traceId).toBeUndefined();
  });

  it('ConfigError with cause and traceId', () => {
    const err = new ConfigError('bad config', { cause, traceId });
    expect(err.cause).toBe(cause);
    expect(err.traceId).toBe(traceId);
  });

  it('ConfigError without options', () => {
    const err = new ConfigError('bad config');
    expect(err.cause).toBeUndefined();
    expect(err.traceId).toBeUndefined();
  });

  it('ACLRuleError with cause and traceId', () => {
    const err = new ACLRuleError('bad rule', { cause, traceId });
    expect(err.cause).toBe(cause);
    expect(err.traceId).toBe(traceId);
  });

  it('ACLRuleError without options', () => {
    const err = new ACLRuleError('bad rule');
    expect(err.cause).toBeUndefined();
    expect(err.traceId).toBeUndefined();
  });

  it('ACLDeniedError with cause and traceId', () => {
    const err = new ACLDeniedError('caller.a', 'target.b', { cause, traceId });
    expect(err.cause).toBe(cause);
    expect(err.traceId).toBe(traceId);
    expect(err.callerId).toBe('caller.a');
    expect(err.targetId).toBe('target.b');
  });

  it('ACLDeniedError without options', () => {
    const err = new ACLDeniedError('caller.a', 'target.b');
    expect(err.cause).toBeUndefined();
    expect(err.traceId).toBeUndefined();
  });

  it('ACLDeniedError with null callerId', () => {
    const err = new ACLDeniedError(null, 'target.b');
    expect(err.callerId).toBeNull();
    expect(err.targetId).toBe('target.b');
    expect(err.message).toContain('null -> target.b');
  });

  it('ModuleNotFoundError with cause and traceId', () => {
    const err = new ModuleNotFoundError('mod.x', { cause, traceId });
    expect(err.cause).toBe(cause);
    expect(err.traceId).toBe(traceId);
  });

  it('ModuleNotFoundError without options', () => {
    const err = new ModuleNotFoundError('mod.x');
    expect(err.cause).toBeUndefined();
    expect(err.traceId).toBeUndefined();
  });

  it('ModuleTimeoutError with cause and traceId', () => {
    const err = new ModuleTimeoutError('mod.x', 3000, { cause, traceId });
    expect(err.cause).toBe(cause);
    expect(err.traceId).toBe(traceId);
    expect(err.moduleId).toBe('mod.x');
    expect(err.timeoutMs).toBe(3000);
  });

  it('ModuleTimeoutError without options', () => {
    const err = new ModuleTimeoutError('mod.x', 3000);
    expect(err.cause).toBeUndefined();
    expect(err.traceId).toBeUndefined();
  });

  it('SchemaValidationError with cause and traceId', () => {
    const err = new SchemaValidationError('invalid', [{ path: '/a' }], { cause, traceId });
    expect(err.cause).toBe(cause);
    expect(err.traceId).toBe(traceId);
  });

  it('SchemaValidationError without options', () => {
    const err = new SchemaValidationError('invalid', []);
    expect(err.cause).toBeUndefined();
    expect(err.traceId).toBeUndefined();
  });

  it('SchemaValidationError uses default message when no arguments provided', () => {
    const err = new SchemaValidationError();
    expect(err.message).toBe('Schema validation failed');
    expect(err.details['errors']).toEqual([]);
  });

  it('SchemaValidationError defaults errors to empty array when errors not provided', () => {
    const err = new SchemaValidationError('custom message');
    expect(err.details['errors']).toEqual([]);
  });

  it('SchemaNotFoundError with cause and traceId', () => {
    const err = new SchemaNotFoundError('schema.x', { cause, traceId });
    expect(err.cause).toBe(cause);
    expect(err.traceId).toBe(traceId);
  });

  it('SchemaNotFoundError without options', () => {
    const err = new SchemaNotFoundError('schema.x');
    expect(err.cause).toBeUndefined();
    expect(err.traceId).toBeUndefined();
  });

  it('SchemaParseError with cause and traceId', () => {
    const err = new SchemaParseError('bad yaml', { cause, traceId });
    expect(err.cause).toBe(cause);
    expect(err.traceId).toBe(traceId);
  });

  it('SchemaParseError without options', () => {
    const err = new SchemaParseError('bad yaml');
    expect(err.cause).toBeUndefined();
    expect(err.traceId).toBeUndefined();
  });

  it('SchemaCircularRefError with cause and traceId', () => {
    const err = new SchemaCircularRefError('#/defs/A', { cause, traceId });
    expect(err.cause).toBe(cause);
    expect(err.traceId).toBe(traceId);
  });

  it('SchemaCircularRefError without options', () => {
    const err = new SchemaCircularRefError('#/defs/A');
    expect(err.cause).toBeUndefined();
    expect(err.traceId).toBeUndefined();
  });

  it('CallDepthExceededError with cause and traceId', () => {
    const err = new CallDepthExceededError(5, 4, ['a', 'b'], { cause, traceId });
    expect(err.cause).toBe(cause);
    expect(err.traceId).toBe(traceId);
    expect(err.currentDepth).toBe(5);
    expect(err.maxDepth).toBe(4);
  });

  it('CallDepthExceededError without options', () => {
    const err = new CallDepthExceededError(5, 4, ['a', 'b']);
    expect(err.cause).toBeUndefined();
    expect(err.traceId).toBeUndefined();
  });

  it('CircularCallError with cause and traceId', () => {
    const err = new CircularCallError('mod.a', ['mod.a', 'mod.b'], { cause, traceId });
    expect(err.cause).toBe(cause);
    expect(err.traceId).toBe(traceId);
    expect(err.moduleId).toBe('mod.a');
  });

  it('CircularCallError without options', () => {
    const err = new CircularCallError('mod.a', ['mod.a', 'mod.b']);
    expect(err.cause).toBeUndefined();
    expect(err.traceId).toBeUndefined();
  });

  it('CallFrequencyExceededError with cause and traceId', () => {
    const err = new CallFrequencyExceededError('mod.a', 4, 3, ['mod.a'], { cause, traceId });
    expect(err.cause).toBe(cause);
    expect(err.traceId).toBe(traceId);
    expect(err.moduleId).toBe('mod.a');
    expect(err.count).toBe(4);
    expect(err.maxRepeat).toBe(3);
  });

  it('CallFrequencyExceededError without options', () => {
    const err = new CallFrequencyExceededError('mod.a', 4, 3, ['mod.a']);
    expect(err.cause).toBeUndefined();
    expect(err.traceId).toBeUndefined();
  });

  it('InvalidInputError with cause and traceId', () => {
    const err = new InvalidInputError('bad data', { cause, traceId });
    expect(err.cause).toBe(cause);
    expect(err.traceId).toBe(traceId);
  });

  it('InvalidInputError without options', () => {
    const err = new InvalidInputError('bad data');
    expect(err.cause).toBeUndefined();
    expect(err.traceId).toBeUndefined();
  });

  it('InvalidInputError uses default message when no arguments provided', () => {
    const err = new InvalidInputError();
    expect(err.message).toBe('Invalid input');
  });

  it('FuncMissingTypeHintError with cause and traceId', () => {
    const err = new FuncMissingTypeHintError('myFunc', 'myParam', { cause, traceId });
    expect(err.name).toBe('FuncMissingTypeHintError');
    expect(err.code).toBe('FUNC_MISSING_TYPE_HINT');
    expect(err.cause).toBe(cause);
    expect(err.traceId).toBe(traceId);
    expect(err.message).toContain('myParam');
    expect(err.message).toContain('myFunc');
  });

  it('FuncMissingTypeHintError without options', () => {
    const err = new FuncMissingTypeHintError('myFunc', 'myParam');
    expect(err.cause).toBeUndefined();
    expect(err.traceId).toBeUndefined();
  });

  it('FuncMissingReturnTypeError with cause and traceId', () => {
    const err = new FuncMissingReturnTypeError('myFunc', { cause, traceId });
    expect(err.name).toBe('FuncMissingReturnTypeError');
    expect(err.code).toBe('FUNC_MISSING_RETURN_TYPE');
    expect(err.cause).toBe(cause);
    expect(err.traceId).toBe(traceId);
    expect(err.message).toContain('myFunc');
  });

  it('FuncMissingReturnTypeError without options', () => {
    const err = new FuncMissingReturnTypeError('myFunc');
    expect(err.cause).toBeUndefined();
    expect(err.traceId).toBeUndefined();
  });

  it('BindingInvalidTargetError with cause and traceId', () => {
    const err = new BindingInvalidTargetError('bad:target', { cause, traceId });
    expect(err.cause).toBe(cause);
    expect(err.traceId).toBe(traceId);
  });

  it('BindingInvalidTargetError without options', () => {
    const err = new BindingInvalidTargetError('bad:target');
    expect(err.cause).toBeUndefined();
    expect(err.traceId).toBeUndefined();
  });

  it('BindingModuleNotFoundError with cause and traceId', () => {
    const err = new BindingModuleNotFoundError('some.module', { cause, traceId });
    expect(err.cause).toBe(cause);
    expect(err.traceId).toBe(traceId);
  });

  it('BindingModuleNotFoundError without options', () => {
    const err = new BindingModuleNotFoundError('some.module');
    expect(err.cause).toBeUndefined();
    expect(err.traceId).toBeUndefined();
  });

  it('BindingCallableNotFoundError with cause and traceId', () => {
    const err = new BindingCallableNotFoundError('fn', 'some.module', { cause, traceId });
    expect(err.cause).toBe(cause);
    expect(err.traceId).toBe(traceId);
  });

  it('BindingCallableNotFoundError without options', () => {
    const err = new BindingCallableNotFoundError('fn', 'some.module');
    expect(err.cause).toBeUndefined();
    expect(err.traceId).toBeUndefined();
  });

  it('BindingNotCallableError with cause and traceId', () => {
    const err = new BindingNotCallableError('some:target', { cause, traceId });
    expect(err.cause).toBe(cause);
    expect(err.traceId).toBe(traceId);
  });

  it('BindingNotCallableError without options', () => {
    const err = new BindingNotCallableError('some:target');
    expect(err.cause).toBeUndefined();
    expect(err.traceId).toBeUndefined();
  });

  it('BindingSchemaMissingError with cause and traceId', () => {
    const err = new BindingSchemaMissingError('some:target', { cause, traceId });
    expect(err.cause).toBe(cause);
    expect(err.traceId).toBe(traceId);
  });

  it('BindingSchemaMissingError without options', () => {
    const err = new BindingSchemaMissingError('some:target');
    expect(err.cause).toBeUndefined();
    expect(err.traceId).toBeUndefined();
  });

  it('BindingFileInvalidError with cause and traceId', () => {
    const err = new BindingFileInvalidError('/file.yaml', 'parse error', { cause, traceId });
    expect(err.cause).toBe(cause);
    expect(err.traceId).toBe(traceId);
  });

  it('BindingFileInvalidError without options', () => {
    const err = new BindingFileInvalidError('/file.yaml', 'parse error');
    expect(err.cause).toBeUndefined();
    expect(err.traceId).toBeUndefined();
  });

  it('CircularDependencyError with cause and traceId', () => {
    const err = new CircularDependencyError(['a', 'b', 'a'], { cause, traceId });
    expect(err.cause).toBe(cause);
    expect(err.traceId).toBe(traceId);
  });

  it('CircularDependencyError without options', () => {
    const err = new CircularDependencyError(['a', 'b', 'a']);
    expect(err.cause).toBeUndefined();
    expect(err.traceId).toBeUndefined();
  });

  it('ModuleLoadError with cause and traceId', () => {
    const err = new ModuleLoadError('mod.a', 'file not found', { cause, traceId });
    expect(err.cause).toBe(cause);
    expect(err.traceId).toBe(traceId);
  });

  it('ModuleLoadError without options', () => {
    const err = new ModuleLoadError('mod.a', 'file not found');
    expect(err.cause).toBeUndefined();
    expect(err.traceId).toBeUndefined();
  });

  it('ModuleExecuteError with cause and traceId', () => {
    const err = new ModuleExecuteError('mod.a', 'runtime error', { cause, traceId });
    expect(err.name).toBe('ModuleExecuteError');
    expect(err.code).toBe('MODULE_EXECUTE_ERROR');
    expect(err.cause).toBe(cause);
    expect(err.traceId).toBe(traceId);
    expect(err.message).toContain('mod.a');
    expect(err.message).toContain('runtime error');
  });

  it('ModuleExecuteError without options', () => {
    const err = new ModuleExecuteError('mod.a', 'runtime error');
    expect(err.cause).toBeUndefined();
    expect(err.traceId).toBeUndefined();
  });

  it('InternalError with cause and traceId', () => {
    const err = new InternalError('something broke', { cause, traceId });
    expect(err.name).toBe('InternalError');
    expect(err.code).toBe('GENERAL_INTERNAL_ERROR');
    expect(err.cause).toBe(cause);
    expect(err.traceId).toBe(traceId);
  });

  it('InternalError without options', () => {
    const err = new InternalError('something broke');
    expect(err.cause).toBeUndefined();
    expect(err.traceId).toBeUndefined();
  });

  it('InternalError uses default message when no arguments provided', () => {
    const err = new InternalError();
    expect(err.message).toBe('Internal error');
  });
});

describe('ErrorCodes', () => {
  it('contains MIDDLEWARE_CHAIN_ERROR', () => {
    expect(ErrorCodes.MIDDLEWARE_CHAIN_ERROR).toBe('MIDDLEWARE_CHAIN_ERROR');
  });

  it('contains all expected error codes', () => {
    expect(ErrorCodes.CONFIG_NOT_FOUND).toBe('CONFIG_NOT_FOUND');
    expect(ErrorCodes.CONFIG_INVALID).toBe('CONFIG_INVALID');
    expect(ErrorCodes.ACL_RULE_ERROR).toBe('ACL_RULE_ERROR');
    expect(ErrorCodes.ACL_DENIED).toBe('ACL_DENIED');
    expect(ErrorCodes.MODULE_NOT_FOUND).toBe('MODULE_NOT_FOUND');
    expect(ErrorCodes.MODULE_TIMEOUT).toBe('MODULE_TIMEOUT');
    expect(ErrorCodes.MODULE_LOAD_ERROR).toBe('MODULE_LOAD_ERROR');
    expect(ErrorCodes.MODULE_EXECUTE_ERROR).toBe('MODULE_EXECUTE_ERROR');
    expect(ErrorCodes.SCHEMA_VALIDATION_ERROR).toBe('SCHEMA_VALIDATION_ERROR');
    expect(ErrorCodes.SCHEMA_NOT_FOUND).toBe('SCHEMA_NOT_FOUND');
    expect(ErrorCodes.SCHEMA_PARSE_ERROR).toBe('SCHEMA_PARSE_ERROR');
    expect(ErrorCodes.SCHEMA_CIRCULAR_REF).toBe('SCHEMA_CIRCULAR_REF');
    expect(ErrorCodes.CALL_DEPTH_EXCEEDED).toBe('CALL_DEPTH_EXCEEDED');
    expect(ErrorCodes.CIRCULAR_CALL).toBe('CIRCULAR_CALL');
    expect(ErrorCodes.CALL_FREQUENCY_EXCEEDED).toBe('CALL_FREQUENCY_EXCEEDED');
    expect(ErrorCodes.GENERAL_INVALID_INPUT).toBe('GENERAL_INVALID_INPUT');
    expect(ErrorCodes.GENERAL_INTERNAL_ERROR).toBe('GENERAL_INTERNAL_ERROR');
    expect(ErrorCodes.FUNC_MISSING_TYPE_HINT).toBe('FUNC_MISSING_TYPE_HINT');
    expect(ErrorCodes.FUNC_MISSING_RETURN_TYPE).toBe('FUNC_MISSING_RETURN_TYPE');
    expect(ErrorCodes.BINDING_INVALID_TARGET).toBe('BINDING_INVALID_TARGET');
    expect(ErrorCodes.BINDING_MODULE_NOT_FOUND).toBe('BINDING_MODULE_NOT_FOUND');
    expect(ErrorCodes.BINDING_CALLABLE_NOT_FOUND).toBe('BINDING_CALLABLE_NOT_FOUND');
    expect(ErrorCodes.BINDING_NOT_CALLABLE).toBe('BINDING_NOT_CALLABLE');
    expect(ErrorCodes.BINDING_SCHEMA_MISSING).toBe('BINDING_SCHEMA_MISSING');
    expect(ErrorCodes.BINDING_FILE_INVALID).toBe('BINDING_FILE_INVALID');
    expect(ErrorCodes.CIRCULAR_DEPENDENCY).toBe('CIRCULAR_DEPENDENCY');
  });

  it('is frozen and cannot be mutated', () => {
    expect(Object.isFrozen(ErrorCodes)).toBe(true);
  });
});
