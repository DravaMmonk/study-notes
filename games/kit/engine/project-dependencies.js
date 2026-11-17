import { existenceProblems, publicSurfaces } from './existence.js'
import { tagKey, tagName } from './tag-identity.js'
import { runtimeIds } from './runtime.js'
// Server-side validation of the graph across the games installed in a project.
import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { contentVocabulary, contentLayers, gameDirectory, isDataGame, contentRoot, readContent, readGameConfig, readPackageLayers } from './resolver.js'
import { projectDependencyProblems } from './course-dependencies.js'
import { contentSchemas, assemble, assemblySource } from './content.js'
import { applyOverride } from './layers.js'
import { qualifyObject } from './objects.js'

const external = (eras) => eras?.some((era) => era.links?.some(({ fromGame }) => fromGame))

/** Pending package edits must preserve every sibling game's level and tag references. */
function siblingCourseProblems(own, content, peers, root) {
  if (!own) return []
  return peers.filter(([, peer]) => peer.packageIds.some((id) => own.packageIds.includes(id))).flatMap(([id, peer]) => {
    const chapterObjects = readContent(id, root).registries.chapter ?? {}
    const shared = new Set(peer.packageIds.filter((id) => own.packageIds.includes(id)))
    const belongs = (name) => shared.has(name.split('/')[0])
    const extra = peer.packageIds.filter((packageId) => !own.packageIds.includes(packageId))
    const installed = readContent(id, root)
    const installedLevels = installed.levels.filter(level => extra.includes(level.id.split('/')[0]))
    const installedTags = installed.tags
    const levels = new Set([...installedLevels, ...content.levels.filter((l) => belongs(l.id))].map((l) => l.id))
    const registries = { level: Object.fromEntries([...levels].map((name) => [name, {}])), tag: {
      ...Object.fromEntries(Object.entries(installedTags).filter(([name]) => !belongs(tagName(name)))),
      ...Object.fromEntries(Object.entries(content.tags ?? {}).filter(([name]) => belongs(tagName(name)))),
    } }
    for (const layer of readPackageLayers(peer.packageIds, root).filter((layer) => extra.includes(layer.id))) for (const patch of layer.overrides.filter((o) => o.kind === 'tag')) {
      if (registries.tag[tagKey(patch.value.kind, patch.name)]) registries.tag[tagKey(patch.value.kind, patch.name)] = applyOverride('tag', registries.tag[tagKey(patch.value.kind, patch.name)], qualifyObject('tags', patch.value, layer.id), contentVocabularyFor(installed))
    }
    const schemas = contentVocabularyFor(installed)
    const surfaces = contentLayers(installed).map(layer => ({ ...layer, manifest: undefined, objects: [...layer.objects.filter(object => !['level', 'tag'].includes(object.kind)), ...Object.entries(registries).flatMap(([kind, values]) => Object.entries(values).filter(([key]) => (kind === 'tag' ? tagName(key) : key).startsWith(`${layer.id}/`)).map(([key, value]) => ({ kind, name: kind === 'tag' ? tagName(key) : key, value })))] }))
    return existenceProblems([{ id: `@${id}`, config: { packages: peer.packageRanges }, objects: Object.entries(chapterObjects).map(([name, value]) => ({ kind: 'chapter', name, value })) }], schemas, publicSurfaces(surfaces, schemas))
  })
}

export function dependencyProblemsInProject(content, root = contentRoot()) {
  const folder = gameDirectory('', root)
  if (!existsSync(folder)) return projectDependencyProblems([content])
  const ids = readdirSync(folder).filter((id) => (content.packageTarget || id !== content.id) && isDataGame(id, root))
  const own = content.packageTarget ? { packageIds: content.layerOrder } : existsSync(resolve(gameDirectory(content.id, root), 'game.json')) ? readGameConfig(content.id, root) : null
  // Read routes before full content. Projects without cross-game links need no other content packages.
  const peers = ids.map((id) => [id, readGameConfig(id, root)])
  const siblingProblems = siblingCourseProblems(own, content, peers, root)
  if (content.packageTarget) return siblingProblems
  const peerHasExternal = peers.some(([id]) => external(readContent(id, root).eras))
  if (!external(content.eras) && !peerHasExternal) return siblingProblems
  const loaded = peers.map(([id]) => readContent(id, root))
  const packageId = own?.packageId
  // A game on the same package plays the package as the pending change leaves it.
  const collection = loaded.map((peer) => {
    if (peers.find(([id]) => id === peer.id)?.[1].packageId !== packageId) return peer
    const source = assemblySource(peer), pending = assemblySource(content)
    return assemble({ ...source, schemas: contentVocabularyFor(peer), levels: pending.levels, contentObjects: pending.contentObjects,
      tags: pending.tags, relations: pending.relations, sections: pending.sections,
    })
  })
  const packages = new Map(peers.map(([id, { packageId }]) => [id, packageId]))
  if (packageId) packages.set(content.id, packageId)
  return [...siblingProblems, ...projectDependencyProblems([content, ...collection], packages)]
}

const contentVocabularyFor = content => contentSchemas.get(content) ?? contentVocabulary(runtimeIds(content))
