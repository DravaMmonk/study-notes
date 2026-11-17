// Vite expands only browser-side display entries; node-side module manifests contain paths, never UI imports.
const entries = import.meta.glob('../modules/*/ui/{displays.js,bench.jsx,benches/displays.js}')

export async function loadDisplayBundle(entry) {
  if (entry === 'circuit/view') {
    const view = await import('../../../packages/circuit/view/index.jsx')
    return { ...view.circuitDisplays, ...view.benchDisplays }
  }
  if (!entries[entry]) throw new Error(`unknown display bundle ${entry}`)
  return (await entries[entry]()).displays
}
