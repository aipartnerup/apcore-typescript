/**
 * Built-in context key constants for apcore framework middleware.
 */

import { ContextKey } from './context-key.js';

// Direct keys -- used as-is by middleware
export const TRACING_SPANS = new ContextKey<unknown[]>('_apcore.mw.tracing.spans');
export const TRACING_SAMPLED = new ContextKey<boolean>('_apcore.mw.tracing.sampled');
export const METRICS_STARTS = new ContextKey<number[]>('_apcore.mw.metrics.starts');
export const LOGGING_START = new ContextKey<number>('_apcore.mw.logging.start_time');
export const REDACTED_OUTPUT = new ContextKey<Record<string, unknown>>('_apcore.executor.redacted_output');

// Base keys -- always use .scoped(moduleId) for per-module sub-keys
export const RETRY_COUNT_BASE = new ContextKey<number>('_apcore.mw.retry.count');
