/**
 * Configuration accessor with dot-path key support.
 */

export class Config {
  private _data: Record<string, unknown>;

  constructor(data?: Record<string, unknown>) {
    this._data = data ?? {};
  }

  get(key: string, defaultValue?: unknown): unknown {
    const parts = key.split('.');
    let current: unknown = this._data;
    for (const part of parts) {
      if (current !== null && typeof current === 'object' && part in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return defaultValue;
      }
    }
    return current;
  }
}
