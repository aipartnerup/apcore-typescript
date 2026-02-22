/**
 * Execution context, identity, and context creation.
 */

export interface Identity {
  readonly id: string;
  readonly type: string;
  readonly roles: readonly string[];
  readonly attrs: Readonly<Record<string, unknown>>;
}

export function createIdentity(
  id: string,
  type: string = 'user',
  roles: string[] = [],
  attrs: Record<string, unknown> = {},
): Identity {
  return Object.freeze({ id, type, roles: Object.freeze([...roles]), attrs: Object.freeze({ ...attrs }) });
}

export class Context {
  readonly traceId: string;
  readonly callerId: string | null;
  readonly callChain: readonly string[];
  readonly executor: unknown;
  readonly identity: Identity | null;
  redactedInputs: Record<string, unknown> | null;
  readonly data: Record<string, unknown>;

  constructor(
    traceId: string,
    callerId: string | null = null,
    callChain: string[] = [],
    executor: unknown = null,
    identity: Identity | null = null,
    redactedInputs: Record<string, unknown> | null = null,
    data: Record<string, unknown> = {},
  ) {
    this.traceId = traceId;
    this.callerId = callerId;
    this.callChain = Object.freeze([...callChain]);
    this.executor = executor;
    this.identity = identity;
    this.redactedInputs = redactedInputs;
    this.data = data;
  }

  static create(
    executor: unknown = null,
    identity: Identity | null = null,
    data?: Record<string, unknown>,
  ): Context {
    return new Context(
      crypto.randomUUID(),
      null,
      [],
      executor,
      identity,
      null,
      data ?? {},
    );
  }

  child(targetModuleId: string): Context {
    return new Context(
      this.traceId,
      this.callChain.length > 0 ? this.callChain[this.callChain.length - 1] : null,
      [...this.callChain, targetModuleId],
      this.executor,
      this.identity,
      null,
      this.data, // shared reference
    );
  }
}
