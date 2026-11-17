import { capabilities } from './kernel.js'

/** Resolve closed display capabilities without importing any module UI into the shell. */
export function createDisplayResolver(registry, loadBundle) {
  const loaded = new Map()
  return async (names) => {
    const result = {}
    for (const name of new Set(names)) {
      const load = registry.displayLoaders[name]
      if (!registry.tables.display[name] || !load) throw new Error(`display ${name}: no registered implementation`)
      if (!loaded.has(load)) loaded.set(load, Promise.resolve().then(() => loadBundle(load)))
      const items = await loaded.get(load)
      if (!Object.hasOwn(items, name) || items[name] == null) throw new Error(`display ${name}: missing implementation`)
      result[name] = items[name]
    }
    return result
  }
}

export const loadDisplays = createDisplayResolver(capabilities, async (entry) => {
  const { loadDisplayBundle } = await import('./display-bundles.js')
  return loadDisplayBundle(entry)
})

/** Load only the display items named by a bench layout, including nested blocks. */
const benches = new WeakMap()
export function benchDisplays(layout) {
  if (benches.has(layout)) return benches.get(layout)
  const names = new Set()
  const visit = (value) => {
    if (typeof value === 'string' && capabilities.tables.display[value]?.kind === 'display') names.add(value)
    if (!value || typeof value !== 'object') return
    for (const [key, child] of Object.entries(value)) {
      if (capabilities.tables.display[key]?.kind === 'display') names.add(key)
      visit(child)
    }
  }
  visit(layout)
  const result = loadDisplays([...names])
  benches.set(layout, result)
  return result
}
