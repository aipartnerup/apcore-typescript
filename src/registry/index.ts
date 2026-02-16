export { Registry } from './registry.js';
export type { ModuleDescriptor, DiscoveredModule, DependencyInfo } from './types.js';
export { validateModule } from './validation.js';
export { resolveDependencies } from './dependencies.js';
export { scanExtensions, scanMultiRoot } from './scanner.js';
export { resolveEntryPoint, snakeToPascal } from './entry-point.js';
export { loadMetadata, parseDependencies, mergeModuleMetadata, loadIdMap } from './metadata.js';
export { getSchema, exportSchema, getAllSchemas, exportAllSchemas } from './schema-export.js';
