const CATALOG = [
  { id: 'node20', tool: 'node', versionSpec: '20', label: 'node20' },
  { id: 'node22', tool: 'node', versionSpec: '22', label: 'node22' },
  { id: 'node24', tool: 'node', versionSpec: '24', label: 'node24' }
]

const catalogById = new Map(CATALOG.map(entry => [entry.id, entry]))

export const DEFAULT_RUNTIME_IDS = ['node20']

export function runtimeCatalog() {
  return CATALOG
}

export function runtimeIds() {
  return Array.from(catalogById.keys())
}

export function findRuntime(id) {
  return catalogById.get(id) || null
}

export function resolveRuntimes(ids) {
  return ids.map(id => findRuntime(id)).filter(Boolean)
}
