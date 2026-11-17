import { installPackageImports, packageCodeProblems } from './plugin-boundaries.js'
// Node loads core entries only. Bare exports resolve through the same package map as Vite.
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { registerPlugins } from './plugins.js'

export const packageEntries = (layers, root) => layers.filter(layer => !layer.id.startsWith('@')).map(({ id }) => ({ id,
  core: resolve(root, 'packages', id, 'core/index.js'), view: resolve(root, 'packages', id, 'view/index.jsx'),
})).map(entry => Object.fromEntries(Object.entries(entry).filter(([key, path]) => key === 'id' || existsSync(path))))

export async function loadPlugins(content, root, load = file => import(pathToFileURL(file).href), view = false) {
  const entries = packageEntries((content.layerOrder ?? []).map(id => ({ id })), root)
  installPackageImports()
  for (const { id } of entries.filter(entry => entry.core || entry.view)) {
    const problems = packageCodeProblems(id, root)
    if (problems.length) throw new Error(JSON.stringify(problems))
  }
  const loaded = []
  for (const entry of entries) loaded.push({ id: entry.id, core: entry.core && await load(entry.core), view: view && entry.view && await load(entry.view) })
  const kernel = await registerPlugins(loaded, { view, tasks: content.levels.flatMap(level => level.tasks ?? []) })
  for (const type of ['kind', 'editor']) for (const [name, value] of kernel.tables[type]) if (!content.registries.kind?.[value.type]) throw new Error(`${name}: unknown object type ${value.type}`)
  return kernel
}
