import { runtimeIds } from './runtime.js'
// Server-side validation of the graph across the games installed in a project.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { contentVocabulary, gameDirectory, isDataGame, objectFiles, PROJECT_DIR, readContent, readGameConfig, readPackageLayers } from './content-node.js'
import { projectDependencyProblems } from './course-dependencies.js'
import { assemble, assemblySource } from './content.js'
import { applyOverride } from './layers.js'
import { referenceResolver, qualifyObject } from './objects.js'

const external = (eras) => eras?.some((era) => era.links?.some(({ fromGame }) => fromGame))

/** Pending package edits must preserve every sibling game's level and tag references. */
function siblingCourseProblems(own, content, peers, root) {
  if (!own) return []
  return peers.filter(([, peer]) => peer.packageIds.some((id) => own.packageIds.includes(id))).flatMap(([id, peer]) => {
    const { game: { chapters = [] } } = peer
    const shared = new Set(peer.packageIds.filter((id) => own.packageIds.includes(id)))
    const belongs = (name) => shared.has(name.split('/')[0])
    const extra = peer.packageIds.filter((packageId) => !own.packageIds.includes(packageId))
    const installedLevels = extra.flatMap((packageId) => objectFiles(resolve(root, 'packages', packageId), 'levels').map(([name]) => ({ id: `${packageId}/${name}` })))
    const installedTags = Object.fromEntries(extra.flatMap((packageId) => objectFiles(resolve(root, 'packages', packageId), 'tags').map(([name, file]) => [`${packageId}/${name.split('/')[1]}`, qualifyObject('tags', { ...JSON.parse(readFileSync(file, 'utf8')), kind: name.split('/')[0] }, packageId)])))
    const levels = new Set([...installedLevels, ...content.levels.filter((l) => belongs(l.id))].map((l) => l.id))
    const registries = { level: Object.fromEntries([...levels].map((name) => [name, {}])), tag: {
      ...Object.fromEntries(Object.entries(installedTags).filter(([name]) => !belongs(name))),
      ...Object.fromEntries(Object.entries(content.tags ?? {}).filter(([name]) => belongs(name))),
    } }
    for (const layer of readPackageLayers(peer.packageIds, root).filter((layer) => extra.includes(layer.id))) for (const patch of layer.overrides.filter((o) => o.kind === 'tag')) {
      if (registries.tag[patch.name]) registries.tag[patch.name] = applyOverride('tag', registries.tag[patch.name], qualifyObject('tags', patch.value, layer.id))
    }
    const problems = []
    const expand = referenceResolver(registries, problems)
    const names = new Set(chapters.flatMap((chapter) => expand(chapter.levels, 'level')))
    return [
      ...problems.filter((p) => !p.says.startsWith('unknown level ')).map(({ says }) => ({ at: `games/${id}/course.json`, says })),
      ...[...names].filter((name) => !levels.has(name)).map((value) => ({ at: `games/${id}/course.json`, says: `the course places the level ${value}, which is missing from its package` })),
    ]
  })
}

export function dependencyProblemsInProject(content, root = PROJECT_DIR) {
  const folder = resolve(root, 'games')
  if (!existsSync(folder)) return projectDependencyProblems([content])
  const ids = readdirSync(folder).filter((id) => (content.packageTarget || id !== content.id) && isDataGame(id, root))
  const own = content.packageTarget ? { packageIds: content.layerOrder } : existsSync(resolve(gameDirectory(content.id, root), 'game.json')) ? readGameConfig(content.id, root) : null
  // Read routes before full content. Projects without cross-game links need no other content packages.
  const peers = ids.map((id) => [id, readGameConfig(id, root)])
  const siblingProblems = siblingCourseProblems(own, content, peers, root)
  if (content.packageTarget) return siblingProblems
  const peerHasExternal = peers.some(([, { packageDir }]) => objectFiles(packageDir, 'relations').some(([, file]) => (JSON.parse(readFileSync(file, 'utf8')).edges ?? []).some((edge) => edge.game)))
  if (!external(content.eras) && !peerHasExternal) return siblingProblems
  const loaded = peers.map(([id]) => readContent(id, root))
  const packageId = own?.packageId
  // A game on the same package plays the package as the pending change leaves it.
  const collection = loaded.map((peer) => {
    if (peers.find(([id]) => id === peer.id)?.[1].packageId !== packageId) return peer
    const source = assemblySource(peer), pending = assemblySource(content)
    return assemble({ ...source, schemas: contentVocabularyFor(peer), levels: pending.levels, partDefs: pending.partDefs,
      tags: pending.tags, relations: pending.relations, layouts: pending.layouts, trays: pending.trays,
    })
  })
  const packages = new Map(peers.map(([id, { packageId }]) => [id, packageId]))
  if (packageId) packages.set(content.id, packageId)
  return [...siblingProblems, ...projectDependencyProblems([content, ...collection], packages)]
}

const contentVocabularyFor = (content) => contentVocabulary(runtimeIds(content))
