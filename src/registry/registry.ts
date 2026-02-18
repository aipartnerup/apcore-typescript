/**
 * Central module registry for discovering, registering, and querying modules.
 */

import { resolve } from 'node:path';
import type { Config } from '../config.js';
import { InvalidInputError, ModuleNotFoundError } from '../errors.js';
import type { ModuleAnnotations, ModuleExample } from '../module.js';
import { resolveDependencies } from './dependencies.js';
import { resolveEntryPoint } from './entry-point.js';
import { loadIdMap, loadMetadata, mergeModuleMetadata, parseDependencies } from './metadata.js';
import { scanExtensions, scanMultiRoot } from './scanner.js';
import type { DependencyInfo, ModuleDescriptor } from './types.js';
import { validateModule } from './validation.js';

type EventCallback = (moduleId: string, module: unknown) => void;

export class Registry {
  private _extensionRoots: Array<Record<string, unknown>>;
  private _modules: Map<string, unknown> = new Map();
  private _moduleMeta: Map<string, Record<string, unknown>> = new Map();
  private _callbacks: Map<string, EventCallback[]> = new Map([
    ['register', []],
    ['unregister', []],
  ]);
  private _idMap: Record<string, Record<string, unknown>> = {};
  private _schemaCache: Map<string, Record<string, unknown>> = new Map();
  private _config: Config | null;

  constructor(options?: {
    config?: Config | null;
    extensionsDir?: string | null;
    extensionsDirs?: Array<string | Record<string, unknown>> | null;
    idMapPath?: string | null;
  }) {
    const config = options?.config ?? null;
    const extensionsDir = options?.extensionsDir ?? null;
    const extensionsDirs = options?.extensionsDirs ?? null;
    const idMapPath = options?.idMapPath ?? null;

    if (extensionsDir !== null && extensionsDirs !== null) {
      throw new InvalidInputError('Cannot specify both extensionsDir and extensionsDirs');
    }

    if (extensionsDir !== null) {
      this._extensionRoots = [{ root: extensionsDir }];
    } else if (extensionsDirs !== null) {
      this._extensionRoots = extensionsDirs.map((item) =>
        typeof item === 'string' ? { root: item } : item,
      );
    } else if (config !== null) {
      const extRoot = config.get('extensions.root') as string | undefined;
      this._extensionRoots = [{ root: extRoot ?? './extensions' }];
    } else {
      this._extensionRoots = [{ root: './extensions' }];
    }

    this._config = config;

    if (idMapPath !== null) {
      this._idMap = loadIdMap(idMapPath);
    }
  }

  async discover(): Promise<number> {
    const discovered = this._scanRoots();
    this._applyIdMapOverrides(discovered);

    const rawMetadata = this._loadAllMetadata(discovered);
    const resolvedModules = await this._resolveAllEntryPoints(discovered, rawMetadata);
    const validModules = this._validateAll(resolvedModules);
    const loadOrder = this._resolveLoadOrder(validModules, rawMetadata);

    return this._registerInOrder(loadOrder, validModules, rawMetadata);
  }

  private _scanRoots(): import('./types.js').DiscoveredModule[] {
    let maxDepth = 8;
    let followSymlinks = false;
    if (this._config !== null) {
      maxDepth = (this._config.get('extensions.max_depth', 8) as number);
      followSymlinks = (this._config.get('extensions.follow_symlinks', false) as boolean);
    }

    const hasNamespace = this._extensionRoots.some((r) => 'namespace' in r);
    if (this._extensionRoots.length > 1 || hasNamespace) {
      return scanMultiRoot(this._extensionRoots, maxDepth, followSymlinks);
    }
    return scanExtensions(this._extensionRoots[0]['root'] as string, maxDepth, followSymlinks);
  }

  private _applyIdMapOverrides(discovered: import('./types.js').DiscoveredModule[]): void {
    if (Object.keys(this._idMap).length === 0) return;

    const resolvedRoots = this._extensionRoots.map((r) => resolve(r['root'] as string));
    for (const dm of discovered) {
      for (const root of resolvedRoots) {
        try {
          const relPath = dm.filePath.startsWith(root)
            ? dm.filePath.slice(root.length + 1)
            : null;
          if (relPath && relPath in this._idMap) {
            dm.canonicalId = this._idMap[relPath]['id'] as string;
            break;
          }
        } catch (e) {
          console.warn(`[apcore:registry] Failed to apply ID map for ${dm.canonicalId}:`, e);
          continue;
        }
      }
    }
  }

  private _loadAllMetadata(
    discovered: import('./types.js').DiscoveredModule[],
  ): Map<string, Record<string, unknown>> {
    const rawMetadata = new Map<string, Record<string, unknown>>();
    for (const dm of discovered) {
      rawMetadata.set(dm.canonicalId, dm.metaPath ? loadMetadata(dm.metaPath) : {});
    }
    return rawMetadata;
  }

  private async _resolveAllEntryPoints(
    discovered: import('./types.js').DiscoveredModule[],
    rawMetadata: Map<string, Record<string, unknown>>,
  ): Promise<Map<string, unknown>> {
    const resolvedModules = new Map<string, unknown>();
    for (const dm of discovered) {
      const meta = rawMetadata.get(dm.canonicalId) ?? {};
      try {
        const mod = await resolveEntryPoint(dm.filePath, meta);
        resolvedModules.set(dm.canonicalId, mod);
      } catch (e) {
        console.warn(`[apcore:registry] Failed to resolve entry point for ${dm.canonicalId}:`, e);
      }
    }
    return resolvedModules;
  }

  private _validateAll(resolvedModules: Map<string, unknown>): Map<string, unknown> {
    const validModules = new Map<string, unknown>();
    for (const [modId, mod] of resolvedModules) {
      if (validateModule(mod).length === 0) {
        validModules.set(modId, mod);
      }
    }
    return validModules;
  }

  private _resolveLoadOrder(
    validModules: Map<string, unknown>,
    rawMetadata: Map<string, Record<string, unknown>>,
  ): string[] {
    const modulesWithDeps: Array<[string, DependencyInfo[]]> = [];
    for (const modId of validModules.keys()) {
      const meta = rawMetadata.get(modId) ?? {};
      const depsRaw = (meta['dependencies'] as Array<Record<string, unknown>>) ?? [];
      modulesWithDeps.push([modId, depsRaw.length > 0 ? parseDependencies(depsRaw) : []]);
    }
    const knownIds = new Set(modulesWithDeps.map(([id]) => id));
    return resolveDependencies(modulesWithDeps, knownIds);
  }

  private _registerInOrder(
    loadOrder: string[],
    validModules: Map<string, unknown>,
    rawMetadata: Map<string, Record<string, unknown>>,
  ): number {
    let count = 0;
    for (const modId of loadOrder) {
      const mod = validModules.get(modId)!;
      const modObj = mod as Record<string, unknown>;
      const mergedMeta = mergeModuleMetadata(modObj, rawMetadata.get(modId) ?? {});

      this._modules.set(modId, mod);
      this._moduleMeta.set(modId, mergedMeta);

      if (typeof modObj['onLoad'] === 'function') {
        try {
          (modObj['onLoad'] as () => void)();
        } catch (e) {
          console.warn(`[apcore:registry] onLoad failed for ${modId}, skipping:`, e);
          this._modules.delete(modId);
          this._moduleMeta.delete(modId);
          continue;
        }
      }

      this._triggerEvent('register', modId, mod);
      count++;
    }
    return count;
  }

  register(moduleId: string, module: unknown): void {
    if (!moduleId) {
      throw new InvalidInputError('module_id must be a non-empty string');
    }

    if (this._modules.has(moduleId)) {
      throw new InvalidInputError(`Module already exists: ${moduleId}`);
    }

    this._modules.set(moduleId, module);

    // Call onLoad if available
    const modObj = module as Record<string, unknown>;
    if (typeof modObj['onLoad'] === 'function') {
      try {
        (modObj['onLoad'] as () => void)();
      } catch (e) {
        this._modules.delete(moduleId);
        throw e;
      }
    }

    this._triggerEvent('register', moduleId, module);
  }

  unregister(moduleId: string): boolean {
    if (!this._modules.has(moduleId)) return false;

    const module = this._modules.get(moduleId)!;
    this._modules.delete(moduleId);
    this._moduleMeta.delete(moduleId);
    this._schemaCache.delete(moduleId);

    // Call onUnload if available
    const modObj = module as Record<string, unknown>;
    if (typeof modObj['onUnload'] === 'function') {
      try {
        (modObj['onUnload'] as () => void)();
      } catch (e) {
        console.warn(`[apcore:registry] onUnload failed for ${moduleId}:`, e);
      }
    }

    this._triggerEvent('unregister', moduleId, module);
    return true;
  }

  get(moduleId: string): unknown | null {
    if (moduleId === '') {
      throw new ModuleNotFoundError('');
    }
    return this._modules.get(moduleId) ?? null;
  }

  has(moduleId: string): boolean {
    return this._modules.has(moduleId);
  }

  list(options?: { tags?: string[]; prefix?: string }): string[] {
    let ids = [...this._modules.keys()];

    if (options?.prefix != null) {
      ids = ids.filter((id) => id.startsWith(options.prefix!));
    }

    if (options?.tags != null) {
      const tagSet = new Set(options.tags);
      ids = ids.filter((id) => {
        const mod = this._modules.get(id) as Record<string, unknown>;
        const modTags = new Set((mod['tags'] as string[]) ?? []);
        const metaTags = (this._moduleMeta.get(id) ?? {})['tags'];
        if (Array.isArray(metaTags)) {
          for (const t of metaTags) modTags.add(t as string);
        }
        for (const t of tagSet) {
          if (!modTags.has(t)) return false;
        }
        return true;
      });
    }

    return ids.sort();
  }

  iter(): IterableIterator<[string, unknown]> {
    return this._modules.entries();
  }

  get count(): number {
    return this._modules.size;
  }

  get moduleIds(): string[] {
    return [...this._modules.keys()].sort();
  }

  getDefinition(moduleId: string): ModuleDescriptor | null {
    const module = this._modules.get(moduleId);
    if (module == null) return null;
    const meta = this._moduleMeta.get(moduleId) ?? {};
    const mod = module as Record<string, unknown>;

    return {
      moduleId,
      name: ((meta['name'] as string) ?? (mod['name'] as string)) ?? null,
      description: ((meta['description'] as string) ?? (mod['description'] as string)) ?? '',
      documentation: ((meta['documentation'] as string) ?? (mod['documentation'] as string)) ?? null,
      inputSchema: (mod['inputSchema'] as Record<string, unknown>) ?? {},
      outputSchema: (mod['outputSchema'] as Record<string, unknown>) ?? {},
      version: ((meta['version'] as string) ?? (mod['version'] as string)) ?? '1.0.0',
      tags: (meta['tags'] as string[]) ?? (mod['tags'] as string[]) ?? [],
      annotations: (mod['annotations'] as ModuleAnnotations) ?? null,
      examples: (mod['examples'] as ModuleExample[]) ?? [],
      metadata: (meta['metadata'] as Record<string, unknown>) ?? {},
    };
  }

  on(event: string, callback: EventCallback): void {
    if (!this._callbacks.has(event)) {
      throw new InvalidInputError(`Invalid event: ${event}. Must be 'register' or 'unregister'`);
    }
    this._callbacks.get(event)!.push(callback);
  }

  private _triggerEvent(event: string, moduleId: string, module: unknown): void {
    const callbacks = this._callbacks.get(event) ?? [];
    for (const cb of callbacks) {
      try {
        cb(moduleId, module);
      } catch (e) {
        console.warn(`[apcore:registry] Event callback error for '${event}' on ${moduleId}:`, e);
      }
    }
  }

  clearCache(): void {
    this._schemaCache.clear();
  }
}
