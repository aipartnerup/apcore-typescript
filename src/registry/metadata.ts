/**
 * Metadata and ID map loading for the registry system.
 */

import { readFileSync, existsSync } from 'node:fs';
import yaml from 'js-yaml';
import { ConfigError, ConfigNotFoundError } from '../errors.js';
import type { DependencyInfo } from './types.js';

export function loadMetadata(metaPath: string): Record<string, unknown> {
  if (!existsSync(metaPath)) return {};

  const content = readFileSync(metaPath, 'utf-8');
  let parsed: unknown;
  try {
    parsed = yaml.load(content);
  } catch (e) {
    throw new ConfigError(`Invalid YAML in metadata file: ${metaPath}`);
  }

  if (parsed === null || parsed === undefined) return {};
  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new ConfigError(`Metadata file must be a YAML mapping: ${metaPath}`);
  }

  return parsed as Record<string, unknown>;
}

export function parseDependencies(depsRaw: Array<Record<string, unknown>>): DependencyInfo[] {
  if (!depsRaw || depsRaw.length === 0) return [];

  const result: DependencyInfo[] = [];
  for (const dep of depsRaw) {
    const moduleId = dep['module_id'] as string | undefined;
    if (!moduleId) {
      console.warn(`[apcore:metadata] Dependency entry missing 'module_id', skipping`);
      continue;
    }
    result.push({
      moduleId,
      version: (dep['version'] as string) ?? null,
      optional: (dep['optional'] as boolean) ?? false,
    });
  }
  return result;
}

export function mergeModuleMetadata(
  moduleObj: Record<string, unknown>,
  meta: Record<string, unknown>,
): Record<string, unknown> {
  const codeDesc = (moduleObj['description'] as string) ?? '';
  const codeName = (moduleObj['name'] as string) ?? null;
  const codeTags = (moduleObj['tags'] as string[]) ?? [];
  const codeVersion = (moduleObj['version'] as string) ?? '1.0.0';
  const codeAnnotations = moduleObj['annotations'] ?? null;
  const codeExamples = (moduleObj['examples'] as unknown[]) ?? [];
  const codeMetadata = (moduleObj['metadata'] as Record<string, unknown>) ?? {};
  const codeDocs = (moduleObj['documentation'] as string) ?? null;

  const yamlMetadata = (meta['metadata'] as Record<string, unknown>) ?? {};
  const mergedMetadata = { ...codeMetadata, ...yamlMetadata };

  return {
    description: (meta['description'] as string) || codeDesc,
    name: (meta['name'] as string) || codeName,
    tags: meta['tags'] != null ? meta['tags'] : codeTags || [],
    version: (meta['version'] as string) || codeVersion,
    annotations: meta['annotations'] != null ? meta['annotations'] : codeAnnotations,
    examples: meta['examples'] != null ? meta['examples'] : codeExamples || [],
    metadata: mergedMetadata,
    documentation: (meta['documentation'] as string) || codeDocs,
  };
}

export function loadIdMap(idMapPath: string): Record<string, Record<string, unknown>> {
  if (!existsSync(idMapPath)) {
    throw new ConfigNotFoundError(idMapPath);
  }

  const content = readFileSync(idMapPath, 'utf-8');
  let parsed: unknown;
  try {
    parsed = yaml.load(content);
  } catch (e) {
    throw new ConfigError(`Invalid YAML in ID map file: ${idMapPath}`);
  }

  if (typeof parsed !== 'object' || parsed === null || !('mappings' in (parsed as Record<string, unknown>))) {
    throw new ConfigError("ID map must contain a 'mappings' list");
  }

  const mappings = (parsed as Record<string, unknown>)['mappings'];
  if (!Array.isArray(mappings)) {
    throw new ConfigError("ID map must contain a 'mappings' list");
  }

  const result: Record<string, Record<string, unknown>> = {};
  for (const entry of mappings) {
    const filePath = (entry as Record<string, unknown>)['file'] as string;
    if (!filePath) {
      console.warn(`[apcore:metadata] ID map entry missing 'file' field, skipping`);
      continue;
    }
    result[filePath] = {
      id: ((entry as Record<string, unknown>)['id'] as string) ?? filePath,
      class: (entry as Record<string, unknown>)['class'] ?? null,
    };
  }
  return result;
}
