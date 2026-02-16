import { describe, it, expect } from 'vitest';
import {
  ModuleError,
  ModuleNotFoundError,
  ModuleTimeoutError,
  SchemaValidationError,
  ACLDeniedError,
  CallDepthExceededError,
  CircularCallError,
  CallFrequencyExceededError,
  ConfigNotFoundError,
  ConfigError,
  InvalidInputError,
  BindingInvalidTargetError,
  BindingModuleNotFoundError,
  BindingCallableNotFoundError,
  BindingNotCallableError,
  BindingSchemaMissingError,
  BindingFileInvalidError,
  CircularDependencyError,
  ModuleLoadError,
  SchemaNotFoundError,
  SchemaParseError,
  SchemaCircularRefError,
  ACLRuleError,
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
