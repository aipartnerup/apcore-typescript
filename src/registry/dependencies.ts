/**
 * Dependency resolution via Kahn's topological sort.
 */

import { CircularDependencyError, ModuleLoadError } from '../errors.js';
import type { DependencyInfo } from './types.js';

export function resolveDependencies(
  modules: Array<[string, DependencyInfo[]]>,
  knownIds?: Set<string> | null,
): string[] {
  if (modules.length === 0) return [];

  const ids = knownIds ?? new Set(modules.map(([id]) => id));

  // Build graph and in-degree
  const graph = new Map<string, Set<string>>();
  const inDegree = new Map<string, number>();

  for (const [modId] of modules) {
    inDegree.set(modId, 0);
  }

  for (const [moduleId, deps] of modules) {
    for (const dep of deps) {
      if (!ids.has(dep.moduleId)) {
        if (dep.optional) continue;
        throw new ModuleLoadError(moduleId, `Required dependency '${dep.moduleId}' not found`);
      }
      if (!graph.has(dep.moduleId)) graph.set(dep.moduleId, new Set());
      graph.get(dep.moduleId)!.add(moduleId);
      inDegree.set(moduleId, (inDegree.get(moduleId) ?? 0) + 1);
    }
  }

  // Initialize queue with zero-in-degree nodes (sorted for determinism)
  const queue: string[] = [...inDegree.entries()]
    .filter(([, deg]) => deg === 0)
    .map(([id]) => id)
    .sort();

  const loadOrder: string[] = [];
  while (queue.length > 0) {
    const modId = queue.shift()!;
    loadOrder.push(modId);
    const dependents = graph.get(modId);
    if (dependents) {
      for (const dependent of [...dependents].sort()) {
        const newDeg = (inDegree.get(dependent) ?? 1) - 1;
        inDegree.set(dependent, newDeg);
        if (newDeg === 0) {
          queue.push(dependent);
        }
      }
    }
  }

  // Check for cycles
  if (loadOrder.length < modules.length) {
    const ordered = new Set(loadOrder);
    const remaining = new Set(modules.filter(([id]) => !ordered.has(id)).map(([id]) => id));
    const cyclePath = extractCycle(modules, remaining);
    throw new CircularDependencyError(cyclePath);
  }

  return loadOrder;
}

function extractCycle(
  modules: Array<[string, DependencyInfo[]]>,
  remaining: Set<string>,
): string[] {
  const depMap = new Map<string, string[]>();
  for (const [modId, deps] of modules) {
    if (remaining.has(modId)) {
      depMap.set(modId, deps.filter((d) => remaining.has(d.moduleId)).map((d) => d.moduleId));
    }
  }

  const start = remaining.values().next().value as string;
  const visited: string[] = [start];
  const visitedSet = new Set([start]);
  let current = start;

  while (true) {
    const nexts = depMap.get(current) ?? [];
    if (nexts.length === 0) break;
    const nxt = nexts[0];
    if (visitedSet.has(nxt)) {
      const idx = visited.indexOf(nxt);
      return [...visited.slice(idx), nxt];
    }
    visited.push(nxt);
    visitedSet.add(nxt);
    current = nxt;
  }

  return [...remaining, remaining.values().next().value as string];
}
