/**
 * Wildcard pattern matching for module IDs (Algorithm A08).
 */

export function matchPattern(pattern: string, moduleId: string): boolean {
  if (pattern === '*') return true;
  if (!pattern.includes('*')) return pattern === moduleId;

  const segments = pattern.split('*');
  let pos = 0;

  if (!pattern.startsWith('*')) {
    if (!moduleId.startsWith(segments[0])) return false;
    pos = segments[0].length;
  }

  for (let i = 1; i < segments.length; i++) {
    const segment = segments[i];
    if (!segment) continue;
    const idx = moduleId.indexOf(segment, pos);
    if (idx === -1) return false;
    pos = idx + segment.length;
  }

  if (!pattern.endsWith('*')) {
    if (!moduleId.endsWith(segments[segments.length - 1])) return false;
  }

  return true;
}
