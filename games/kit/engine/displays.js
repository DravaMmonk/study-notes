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
