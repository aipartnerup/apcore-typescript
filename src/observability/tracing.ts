/**
 * Tracing system: Span, SpanExporter implementations, and TracingMiddleware.
 */

import { randomBytes } from 'node:crypto';
import type { Context } from '../context.js';
import { Middleware } from '../middleware/base.js';

export interface Span {
  traceId: string;
  name: string;
  startTime: number;
  spanId: string;
  parentSpanId: string | null;
  attributes: Record<string, unknown>;
  endTime: number | null;
  status: string;
  events: Array<Record<string, unknown>>;
}

export function createSpan(options: {
  traceId: string;
  name: string;
  startTime: number;
  spanId?: string;
  parentSpanId?: string | null;
  attributes?: Record<string, unknown>;
}): Span {
  return {
    traceId: options.traceId,
    name: options.name,
    startTime: options.startTime,
    spanId: options.spanId ?? randomBytes(8).toString('hex'),
    parentSpanId: options.parentSpanId ?? null,
    attributes: options.attributes ?? {},
    endTime: null,
    status: 'ok',
    events: [],
  };
}

export interface SpanExporter {
  export(span: Span): void;
}

export class StdoutExporter implements SpanExporter {
  export(span: Span): void {
    process.stdout.write(JSON.stringify(span) + '\n');
  }
}

export class InMemoryExporter implements SpanExporter {
  private _spans: Span[] = [];
  private _maxSpans: number;

  constructor(maxSpans: number = 10_000) {
    this._maxSpans = maxSpans;
  }

  export(span: Span): void {
    this._spans.push(span);
    while (this._spans.length > this._maxSpans) {
      this._spans.shift();
    }
  }

  getSpans(): Span[] {
    return [...this._spans];
  }

  clear(): void {
    this._spans = [];
  }
}

const VALID_STRATEGIES = new Set(['full', 'proportional', 'error_first', 'off']);

export class TracingMiddleware extends Middleware {
  private _exporter: SpanExporter;
  private _samplingRate: number;
  private _samplingStrategy: string;

  constructor(
    exporter: SpanExporter,
    samplingRate: number = 1.0,
    samplingStrategy: string = 'full',
  ) {
    super();
    if (samplingRate < 0.0 || samplingRate > 1.0) {
      throw new Error(`sampling_rate must be between 0.0 and 1.0, got ${samplingRate}`);
    }
    if (!VALID_STRATEGIES.has(samplingStrategy)) {
      throw new Error(`sampling_strategy must be one of ${[...VALID_STRATEGIES].join(', ')}, got '${samplingStrategy}'`);
    }
    this._exporter = exporter;
    this._samplingRate = samplingRate;
    this._samplingStrategy = samplingStrategy;
  }

  private _shouldSample(context: Context): boolean {
    const existing = context.data['_tracing_sampled'];
    if (typeof existing === 'boolean') return existing;

    let decision: boolean;
    if (this._samplingStrategy === 'full') {
      decision = true;
    } else if (this._samplingStrategy === 'off') {
      decision = false;
    } else {
      decision = Math.random() < this._samplingRate;
    }

    context.data['_tracing_sampled'] = decision;
    return decision;
  }

  override before(
    moduleId: string,
    _inputs: Record<string, unknown>,
    context: Context,
  ): null {
    this._shouldSample(context);

    const spansStack = (context.data['_tracing_spans'] as Span[]) ?? [];
    context.data['_tracing_spans'] = spansStack;
    const parentSpanId = spansStack.length > 0 ? spansStack[spansStack.length - 1].spanId : null;

    const span = createSpan({
      traceId: context.traceId,
      name: 'apcore.module.execute',
      startTime: performance.now(),
      parentSpanId,
      attributes: {
        moduleId,
        method: 'execute',
        callerId: context.callerId,
      },
    });
    spansStack.push(span);
    return null;
  }

  override after(
    moduleId: string,
    _inputs: Record<string, unknown>,
    _output: Record<string, unknown>,
    context: Context,
  ): null {
    const spansStack = (context.data['_tracing_spans'] as Span[]) ?? [];
    if (spansStack.length === 0) return null;

    const span = spansStack.pop()!;
    span.endTime = performance.now();
    span.status = 'ok';
    span.attributes['duration_ms'] = span.endTime - span.startTime;
    span.attributes['success'] = true;

    if (context.data['_tracing_sampled']) {
      this._exporter.export(span);
    }
    return null;
  }

  override onError(
    moduleId: string,
    _inputs: Record<string, unknown>,
    error: Error,
    context: Context,
  ): null {
    const spansStack = (context.data['_tracing_spans'] as Span[]) ?? [];
    if (spansStack.length === 0) return null;

    const span = spansStack.pop()!;
    span.endTime = performance.now();
    span.status = 'error';
    span.attributes['duration_ms'] = span.endTime - span.startTime;
    span.attributes['success'] = false;
    span.attributes['error_code'] = (error as unknown as Record<string, unknown>)['code'] ?? error.constructor.name;

    const shouldExport =
      this._samplingStrategy === 'error_first' || context.data['_tracing_sampled'];
    if (shouldExport) {
      this._exporter.export(span);
    }
    return null;
  }
}
