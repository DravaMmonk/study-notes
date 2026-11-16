// Server-side validation of the graph across the games installed in a project.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { contentVocabulary, gameDirectory, isDataGame, objectFiles, PROJECT_DIR, readContent, readGameConfig } from './content-node.js'
import { projectDependencyProblems } from './course-dependencies.js'
import { assemble, assemblySource } from './content.js'
import { referenceResolver } from './objects.js'

const external = (eras) => eras?.some((era) => era.links?.some(({ fromGame }) => fromGame))

/** Pending package edits must preserve every sibling game's level and tag references. */
function siblingCourseProblems(own, content, peers) {
  if (!own) return []
  const levels = new Set(content.levels.map(({ id }) => id))
  return peers.filter(([, peer]) => peer.packageId === own.packageId).flatMap(([id, { game: { chapters = [] } }]) => {
    const problems = []
    const expand = referenceResolver(content.registries ?? { level: {}, piece: {}, setting: {}, entry: {}, tag: content.tags ?? {} }, problems)
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
  const ids = readdirSync(folder).filter((id) => id !== content.id && isDataGame(id, root))
  const own = existsSync(resolve(gameDirectory(content.id, root), 'game.json')) ? readGameConfig(content.id, root) : null
  // Read routes before full content. Projects without cross-game links need no other content packages.
  const peers = ids.map((id) => [id, readGameConfig(id, root)])
  const siblingProblems = siblingCourseProblems(own, content, peers)
  const peerHasExternal = peers.some(([, { packageDir }]) => objectFiles(packageDir, 'relations').some(([, file]) => (JSON.parse(readFileSync(file, 'utf8')).edges ?? []).some((edge) => edge.game)))
  if (!external(content.eras) && !peerHasExternal) return siblingProblems
  const loaded = peers.map(([id]) => readContent(id, root))
  const packageId = own?.packageId
  // A game on the same package plays the package as the pending change leaves it.
  const collection = loaded.map((peer) => {
    if (peers.find(([id]) => id === peer.id)?.[1].packageId !== packageId) return peer
    const source = assemblySource(peer), pending = assemblySource(content)
    return assemble({ ...source, schemas: contentVocabularyFor(peer), levels: pending.levels, partDefs: pending.partDefs,
      tags: pending.tags, relations: pending.relations, layouts: pending.layouts,
    })
  })
  const packages = new Map(peers.map(([id, { packageId }]) => [id, packageId]))
  if (packageId) packages.set(content.id, packageId)
  return [...siblingProblems, ...projectDependencyProblems([content, ...collection], packages)]
}

const contentVocabularyFor = (content) => contentVocabulary(content.domain)
