// Server-side validation of the graph across the games installed in a project.
import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { gameDirectory, isDataGame, PROJECT_DIR, readContent, readGameConfig, readPackageCourses } from './content-node.js'
import { projectDependencyProblems } from './course-dependencies.js'

const external = (eras) => eras?.some((era) => era.links?.some(({ fromGame }) => fromGame))

function siblingCourseProblems(own, content) {
  if (!own) return []
  const available = new Set(content.levels.map(({ id }) => id))
  return readPackageCourses(own.packageDir).flatMap(([courseId, { eras, order }]) => {
    if (courseId === own.courseId) return []
    const named = new Set(order ?? [])
    for (const { levels = [], links = [] } of eras ?? []) {
      for (const { id } of levels) named.add(id)
      for (const { from, to, fromGame } of links) {
        if (!fromGame) named.add(from)
        named.add(to)
      }
    }
    return [...named].filter((id) => !available.has(id)).map((id) => ({
      at: `packages/${own.packageId}/courses/${courseId}.json`,
      says: `the course references ${id}, which is missing from its package`,
    }))
  })
}

export function dependencyProblemsInProject(content, root = PROJECT_DIR) {
  const folder = resolve(root, 'games')
  if (!existsSync(folder)) return projectDependencyProblems([content])
  const ids = readdirSync(folder).filter((id) => id !== content.id && isDataGame(id, root))
  const own = existsSync(resolve(gameDirectory(content.id, root), 'game.json')) ? readGameConfig(content.id, root) : null
  const siblingProblems = siblingCourseProblems(own, content)
  // Read routes before full content. Projects without cross-game links need no other content packages.
  const peers = ids.map((id) => [id, readGameConfig(id, root)])
  if (!external(content.eras) && !peers.some(([, { game }]) => external(game.eras))) return siblingProblems
  const packageId = own?.packageId
  const collection = peers.map(([id, { packageId: shared, courseId }]) => {
    const peer = readContent(id, root)
    return shared === packageId ? {
      ...peer, levels: content.levels, partDefs: content.partDefs,
      ...(courseId === own.courseId && { eras: content.eras }),
    } : peer
  })
  const packages = new Map(peers.map(([id, { packageId }]) => [id, packageId]))
  if (packageId) packages.set(content.id, packageId)
  return [...siblingProblems, ...projectDependencyProblems([content, ...collection], packages)]
}
