/**
 * SchemaValidator — validates runtime data against TypeBox schemas.
 */

import { type TSchema } from '@sinclair/typebox';
import { Value, type ValueError } from '@sinclair/typebox/value';
import type { SchemaValidationErrorDetail, SchemaValidationResult } from './types.js';
import { validationResultToError } from './types.js';

export class SchemaValidator {
  private _coerceTypes: boolean;

  constructor(coerceTypes: boolean = true) {
    this._coerceTypes = coerceTypes;
  }

  validate(data: Record<string, unknown>, schema: TSchema): SchemaValidationResult {
    if (this._coerceTypes) {
      try {
        Value.Decode(schema, data);
        return { valid: true, errors: [] };
      } catch {
        return { valid: false, errors: this._collectErrors(schema, data) };
      }
    }

    if (Value.Check(schema, data)) {
      return { valid: true, errors: [] };
    }
    return { valid: false, errors: this._collectErrors(schema, data) };
  }

  validateInput(data: Record<string, unknown>, schema: TSchema): Record<string, unknown> {
    return this._validateAndReturn(data, schema);
  }

  validateOutput(data: Record<string, unknown>, schema: TSchema): Record<string, unknown> {
    return this._validateAndReturn(data, schema);
  }

  private _validateAndReturn(data: Record<string, unknown>, schema: TSchema): Record<string, unknown> {
    if (this._coerceTypes) {
      try {
        return Value.Decode(schema, data) as Record<string, unknown>;
      } catch {
        const result: SchemaValidationResult = {
          valid: false,
          errors: this._collectErrors(schema, data),
        };
        throw validationResultToError(result);
      }
    }

    if (Value.Check(schema, data)) {
      return data;
    }

    const result: SchemaValidationResult = {
      valid: false,
      errors: this._collectErrors(schema, data),
    };
    throw validationResultToError(result);
  }

  private _collectErrors(schema: TSchema, data: unknown): SchemaValidationErrorDetail[] {
    const errors: SchemaValidationErrorDetail[] = [];
    for (const error of Value.Errors(schema, data)) {
      errors.push(this._typeboxErrorToDetail(error));
    }
    return errors;
  }

  private _typeboxErrorToDetail(error: ValueError): SchemaValidationErrorDetail {
    return {
      path: error.path || '/',
      message: error.message,
      constraint: String(error.type),
      expected: error.schema,
      actual: error.value,
    };
  }
}
