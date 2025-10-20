import type { RuntimeCatalogEntry } from '../../types/compat.js'

const CATALOG: RuntimeCatalogEntry[] = [
  { id: 'node20', tool: 'node', versionSpec: '20', label: 'node20' },
  { id: 'node22', tool: 'node', versionSpec: '22', label: 'node22' },
  { id: 'node24', tool: 'node', versionSpec: '24', label: 'node24' }
]

const catalogById = new Map<string, RuntimeCatalogEntry>(CATALOG.map(entry => [entry.id, entry]))

export const DEFAULT_RUNTIME_IDS: string[] = ['node20']

export function runtimeCatalog(): RuntimeCatalogEntry[] {
  return CATALOG
}

export function runtimeIds(): string[] {
  return Array.from(catalogById.keys())
}

export function findRuntime(id: string): RuntimeCatalogEntry | null {
  return catalogById.get(id) || null
}

export function resolveRuntimes(ids: string[]): RuntimeCatalogEntry[] {
  return ids
    .map(id => findRuntime(id))
    .filter((entry): entry is RuntimeCatalogEntry => Boolean(entry))
}
