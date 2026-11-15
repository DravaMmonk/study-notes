// Studio metadata lives beside the course and is never assembled into game content.
import { randomUUID } from 'node:crypto'
import { readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { eraLevels } from '../course.js'
import { gameDirectory, readGameConfig } from '../engine/content-node.js'
import { S, validate } from '../engine/schema.js'
import { withLock } from '../engine/ops/log.js'

const GROUPS = S.list(S.obj({
  id: S.str({ pattern: '^[a-z0-9-]+$' }),
  title: S.text(),
  code: S.opt(S.str({ pattern: '^[A-Za-z][A-Za-z0-9_-]*$' })),
  levels: S.list(S.level()),
}))

function readGroups(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    return []
  }
}

export const studioGroups = (root, known) => ({
  about: 'Read or save the Studio-only course groups.',
  params: { game: 'string', groups: 'array?', base: 'array?' },
  run({ game, groups, base }) {
    const id = known(game)
    const dir = gameDirectory(id, root)
    const file = resolve(dir, 'studio-groups.json')
    if (groups === undefined) return readGroups(file)

    return withLock({ id, packageDir: dir }, () => {
      if (JSON.stringify(readGroups(file)) !== JSON.stringify(base)) throw new Error('Groups changed on disk. Reload Studio before saving.')

      const { game: config } = readGameConfig(id, root)
      const levels = new Set(config.eras.flatMap(eraLevels))
      const problems = validate(GROUPS, groups, { levels })
      if (problems.length) throw new Error(problems.map(({ at, says }) => `${at}: ${says}`).join('\n'))
      const ids = new Set(), members = new Set()
      for (const group of groups) {
        const titles = typeof group.title === 'string' ? [group.title] : Object.values(group.title)
        if (ids.has(group.id)) throw new Error(`Duplicate group ID: ${group.id}`)
        if (!titles.some((name) => name.trim())) {
          throw new Error('Each group needs a name.')
        }
        ids.add(group.id)
        for (const level of group.levels) {
          if (members.has(level)) throw new Error(`Level ${level} already belongs to another group.`)
          members.add(level)
        }
      }
      const temp = `${file}.${randomUUID()}.tmp`
      try {
        writeFileSync(temp, JSON.stringify(groups, null, 2) + '\n')
        renameSync(temp, file)
      } finally {
        rmSync(temp, { force: true })
      }
      return groups
    })
  },
})
