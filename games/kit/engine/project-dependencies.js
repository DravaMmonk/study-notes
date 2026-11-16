// Server-side validation of the graph across the games installed in a project.
import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { gameDirectory, isDataGame, PROJECT_DIR, readContent, readGameConfig } from './content-node.js'
import { projectDependencyProblems } from './course-dependencies.js'
import { expandEras } from './groups.js'

const external = (eras) => eras?.some((era) => era.links?.some(({ fromGame }) => fromGame))

/** The courses of the other games on the same package must still name only its levels and groups. */
function siblingCourseProblems(own, content, peers) {
  if (!own) return []
  const levels = new Set(content.levels.map(({ id }) => id))
  const groups = new Set(Object.keys(content.groups ?? {}))
  return peers.filter(([, peer]) => peer.packageId === own.packageId).flatMap(([id, { game: { eras = [], order = [] } }]) => {
    const named = new Set(order.map((level) => ['level', level]).map(JSON.stringify))
    const name = (kind, value) => named.add(JSON.stringify([kind, value]))
    const end = (value) => name(groups.has(value) ? 'group' : 'level', value)
    for (const { levels: entries = [], links = [], rows = [] } of eras) {
      for (const entry of entries) entry.group === undefined ? name('level', entry.id) : name('group', entry.group)
      for (const { from, to, fromGame } of links) {
        if (!fromGame) end(from)
        end(to)
      }
      for (const row of rows) for (const level of row) if (level !== null) name('level', level)
    }
    return [...named].map((entry) => JSON.parse(entry)).filter(([kind, value]) => !(kind === 'group' ? groups : levels).has(value))
      .map(([kind, value]) => ({ at: `games/${id}/course.json`, says: `the course places the ${kind} ${value}, which is missing from its package` }))
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
  if (!external(content.eras) && !peers.some(([, { game }]) => external(game.eras))) return siblingProblems
  const packageId = own?.packageId
  // A game on the same package plays the package as the pending change leaves it.
  const collection = peers.map(([id, { packageId: shared }]) => {
    const peer = readContent(id, root)
    return shared === packageId ? {
      ...peer, levels: content.levels, partDefs: content.partDefs, groups: content.groups,
      ...(peer.sourceEras && { eras: expandEras(peer.sourceEras, content.groups) }),
    } : peer
  })
  const packages = new Map(peers.map(([id, { packageId }]) => [id, packageId]))
  if (packageId) packages.set(content.id, packageId)
  return [...siblingProblems, ...projectDependencyProblems([content, ...collection], packages)]
}
