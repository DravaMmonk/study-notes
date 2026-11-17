import { registrationProblems } from './existence.js'
import { resolveLayers } from './resolver.js'
import { installPackageImports, packageCodeProblems } from './plugin-boundaries.js'
// Node loads core entries only. Bare exports resolve through the same package map as Vite.
import { pathToFileURL } from 'node:url'
import { registerPlugins } from './plugins.js'

export const packageEntries = (layers, root) => {
  const resolved = layers.every(layer => layer.entryPaths) ? layers : resolveLayers({ packages: layers.filter(layer => !layer.id.startsWith('@')).map(layer => layer.id), root }).layers
  return resolved.filter(layer => !layer.id.startsWith('@')).map(layer => ({ id: layer.id, ...layer.entryPaths }))
}

export async function loadPlugins(content, root, load = file => import(pathToFileURL(file).href), view = false) {
  const entries = packageEntries((content.layerOrder ?? []).map(id => ({ id })), root)
  installPackageImports()
  for (const { id } of entries.filter(entry => entry.core || entry.view)) {
    const problems = packageCodeProblems(id, root)
    if (problems.length) throw new Error(JSON.stringify(problems))
  }
  const loaded = []
  for (const entry of entries) loaded.push({ id: entry.id, core: entry.core && await load(entry.core), view: view && entry.view && await load(entry.view) })
  const kernel = await registerPlugins(loaded, { view, tasks: view ? content.levels.flatMap(level => level.tasks ?? []) : [] })
  if (view) {
    const problems = registrationProblems(content, kernel)
    if (problems.length) throw new Error(JSON.stringify(problems))
  }
  return kernel
}
