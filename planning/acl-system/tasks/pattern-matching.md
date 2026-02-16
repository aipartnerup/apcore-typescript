# Task: matchPattern() Wildcard Matching (Algorithm A08)

## Goal

Implement the `matchPattern()` utility function that performs wildcard glob-style pattern matching against module IDs. The algorithm (designated A08) splits patterns on `*` delimiters and verifies each literal segment appears in order within the target string, supporting prefix, suffix, infix, and multi-wildcard patterns.

## Files Involved

- `src/utils/pattern.ts` -- Standalone utility function (~30 lines)

## Steps (TDD)

### 1. Write failing tests for all pattern matching cases

```typescript
// tests/utils/pattern.test.ts
import { describe, it, expect } from 'vitest';
import { matchPattern } from '../../src/utils/pattern.js';

describe('matchPattern (Algorithm A08)', () => {
  describe('exact matching', () => {
    it('should match identical strings', () => {
      expect(matchPattern('moduleA', 'moduleA')).toBe(true);
    });

    it('should reject non-matching strings', () => {
      expect(matchPattern('moduleA', 'moduleB')).toBe(false);
    });
  });

  describe('bare wildcard', () => {
    it('should match any string with bare *', () => {
      expect(matchPattern('*', 'anything')).toBe(true);
    });

    it('should match empty string with bare *', () => {
      expect(matchPattern('*', '')).toBe(true);
    });
  });

  describe('prefix wildcard', () => {
    it('should match suffix with *suffix pattern', () => {
      expect(matchPattern('*.handler', 'auth.handler')).toBe(true);
    });

    it('should reject non-matching suffix', () => {
      expect(matchPattern('*.handler', 'auth.controller')).toBe(false);
    });
  });

  describe('suffix wildcard', () => {
    it('should match prefix with prefix* pattern', () => {
      expect(matchPattern('auth.*', 'auth.login')).toBe(true);
    });

    it('should reject non-matching prefix', () => {
      expect(matchPattern('auth.*', 'user.login')).toBe(false);
    });
  });

  describe('infix wildcard', () => {
    it('should match with pattern containing middle wildcard', () => {
      expect(matchPattern('auth.*.handler', 'auth.login.handler')).toBe(true);
    });

    it('should reject when middle segment is absent', () => {
      expect(matchPattern('auth.*.handler', 'user.login.handler')).toBe(false);
    });
  });

  describe('multi-wildcard', () => {
    it('should match with multiple wildcards', () => {
      expect(matchPattern('a*b*c', 'aXXbYYc')).toBe(true);
    });

    it('should handle adjacent wildcards', () => {
      expect(matchPattern('a**b', 'aXb')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle pattern longer than moduleId', () => {
      expect(matchPattern('very.long.pattern', 'short')).toBe(false);
    });

    it('should handle empty pattern with non-empty moduleId', () => {
      expect(matchPattern('', '')).toBe(true);
      expect(matchPattern('', 'notempty')).toBe(false);
    });
  });
});
```

### 2. Implement matchPattern with segment-based algorithm

```typescript
// src/utils/pattern.ts
export function matchPattern(pattern: string, moduleId: string): boolean {
  if (pattern === '*') return true;
  if (!pattern.includes('*')) return pattern === moduleId;

  const segments = pattern.split('*');
  let pos = 0;

  // Check prefix (first segment before first *)
  if (!pattern.startsWith('*')) {
    if (!moduleId.startsWith(segments[0])) return false;
    pos = segments[0].length;
  }

  // Check each intermediate segment appears in order
  for (let i = 1; i < segments.length; i++) {
    const segment = segments[i];
    if (!segment) continue; // empty segment from adjacent ** or trailing *
    const idx = moduleId.indexOf(segment, pos);
    if (idx === -1) return false;
    pos = idx + segment.length;
  }

  // Check suffix (last segment after last *)
  if (!pattern.endsWith('*')) {
    if (!moduleId.endsWith(segments[segments.length - 1])) return false;
  }

  return true;
}
```

### 3. Run tests and verify

Run `vitest` to confirm all pattern matching tests pass. Run `tsc --noEmit` to verify type safety.

## Acceptance Criteria

- [x] `matchPattern()` is exported from `src/utils/pattern.ts`
- [x] Bare `*` matches any string (including empty)
- [x] No `*` in pattern means exact string match
- [x] Prefix wildcard (`*.suffix`) matches strings ending with the suffix
- [x] Suffix wildcard (`prefix.*`) matches strings starting with the prefix
- [x] Infix wildcard (`prefix.*.suffix`) matches strings with the prefix and suffix surrounding any middle content
- [x] Multiple wildcards (`a*b*c`) verified by sequential segment search
- [x] Adjacent wildcards (`a**b`) handled correctly (empty segments are skipped)
- [x] Algorithm runs in O(n * m) worst case where n = moduleId length, m = number of segments
- [x] All tests pass with `vitest`; zero errors from `tsc --noEmit`

## Dependencies

- None (standalone utility with no imports)

## Estimated Time

2 hours
