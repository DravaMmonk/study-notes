import { loadPackageDisplays } from 'virtual:package-displays'
// Vite expands only browser-side display entries; node-side module manifests contain paths, never UI imports.
const entries = import.meta.glob('../modules/*/ui/{displays.js,bench.jsx,benches/displays.js}')

export async function loadDisplayBundle(entry) {
  if (!entries[entry]) return loadPackageDisplays(entry)
  return (await entries[entry]()).displays
}
