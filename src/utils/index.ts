export { matchPattern } from './pattern.js';

export function deepCopy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Generate a random hex string of the given byte length.
 *
 * Uses the Web Crypto API (`crypto.getRandomValues`) which is available in
 * all modern browsers and Node.js ≥ 18, avoiding the need for `node:crypto`.
 */
export function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
