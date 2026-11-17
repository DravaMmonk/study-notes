// Both browser entry points use this public export map and topological registration source.
import { resolve } from 'node:path'
import { exportPath } from '../engine/plugin-boundaries.js'
import { packageEntries } from '../engine/plugin-node.js'
import { layerVocabulary, contentRoot } from '../engine/resolver.js'

const KIT = resolve(import.meta.dirname, '..')
const q = JSON.stringify
export function pluginSource(layers, root = contentRoot()) {
  const entries = packageEntries(layers, root)
  const schemas = layerVocabulary(layers)
  return [
    ...entries.flatMap((entry, index) => ['core', 'view'].filter(side => entry[side]).map(side => `import * as ${side}${index} from ${q(entry[side])}`)),
    `import { registerPlugins } from ${q(resolve(KIT, 'engine/plugins.js'))}`,
    `import { pluginGame } from ${q(resolve(KIT, 'app/plugin-game.jsx'))}`,
    `const kernel = await registerPlugins([${entries.map((entry, index) => `{ id: ${q(entry.id)}, ${['core', 'view'].filter(side => entry[side]).map(side => `${side}: ${side}${index}`).join(', ')} }`).join(', ')}], { view: true })`,
    `import { vocabularyFor } from ${q(resolve(KIT, 'engine/kernel.js'))}`,
    `const vocabulary = { ...vocabularyFor(${q(schemas.legacyModules)}), legacyModules: ${q(schemas.legacyModules)}, packageCode: ${q(schemas.packageCode)} }`,
  ].join('\n')
}
export function packageApp(root = contentRoot()) {
  return { name: 'package-code',
    resolveId(id, importer) {
      const index = importer?.lastIndexOf('/packages/') ?? -1
      return exportPath(id, index >= 0 ? importer.slice(0, index) : root)
    },

  }
}
