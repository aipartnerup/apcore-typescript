/**
 * Middleware base class for apcore.
 */

import type { Context } from '../context.js';

export class Middleware {
  before(
    _moduleId: string,
    _inputs: Record<string, unknown>,
    _context: Context,
  ): Record<string, unknown> | null {
    return null;
  }

  after(
    _moduleId: string,
    _inputs: Record<string, unknown>,
    _output: Record<string, unknown>,
    _context: Context,
  ): Record<string, unknown> | null {
    return null;
  }

  onError(
    _moduleId: string,
    _inputs: Record<string, unknown>,
    _error: Error,
    _context: Context,
  ): Record<string, unknown> | null {
    return null;
  }
}
