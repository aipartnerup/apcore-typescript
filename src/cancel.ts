/**
 * Cooperative cancellation support for apcore module execution.
 */

export class ExecutionCancelledError extends Error {
  constructor(message: string = "Execution was cancelled") {
    super(message);
    this.name = "ExecutionCancelledError";
  }
}

export class CancelToken {
  private _cancelled: boolean = false;

  get isCancelled(): boolean {
    return this._cancelled;
  }

  cancel(): void {
    this._cancelled = true;
  }

  check(): void {
    if (this._cancelled) {
      throw new ExecutionCancelledError();
    }
  }

  reset(): void {
    this._cancelled = false;
  }
}
