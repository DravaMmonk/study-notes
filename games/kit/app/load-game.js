// Browser assembly shared by Studio's preview and its single-level play page.
import { projectVocabulary } from '../engine/kind-meanings.js'
import { registerPlugins } from '../engine/plugins.js'
import { withKindDeclarations } from '../engine/plugin-kinds.js'
import { vocabularyFor } from '../engine/kernel.js'
import { runtimeIds } from '../engine/runtime-model.js'
import { composeGame } from './compose-game.js'
import { pluginGame } from './plugin-game.jsx'

export async function loadGame(content, packageLoaders) {
  const entries = []
  for (const id of content.layerOrder ?? []) if (packageLoaders[id]) entries.push({ id, ...await packageLoaders[id]() })
  const kernel = await registerPlugins(entries, { view: true, tasks: content.levels.flatMap(level => level.tasks) })
  const ids = runtimeIds(content)
  const pluginIds = new Set([...kernel.tables.play.keys()].map(name => name.split(':')[0]))
  const layers = Object.entries(content.objectKinds ?? {}).map(([name, value]) => ({ id: name.split('/')[0], resolved: true, objects: [{ kind: 'kind', name: name.split('/')[1], value }] }))
  const vocabulary = withKindDeclarations(projectVocabulary({ ...vocabularyFor([]), meanings: [...kernel.tables.kind.values()] }), layers, pluginIds.size > 0)
  const modules = ids.map(id => pluginGame(id, kernel, vocabulary))
  const game = composeGame(content, modules)
  game.pluginKernel = kernel
  return game
}
