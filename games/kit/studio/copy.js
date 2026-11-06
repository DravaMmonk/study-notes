// The copy table's rows (CopyTable.jsx): every text of a scope — an era (its own texts, then its levels'), the whole game
// (game.json's, then every level's) or the encyclopedia — in play order, each with the file it is in, its path and
// the copy rule it is held to (the field it is).
import { find } from '../engine/schema.js'
import { GLOSSARY } from '../engine/vocabulary.js'
import { showPath } from '../engine/ops/edit.js'
import { eraLevels } from '../course.js'

const NOT_GAME = ['id', 'levels', 'glossary', 'domain', 'vocabulary', 'open', 'blueprint']
/** The copy rule a text is held to: the field it is (a task's own field for a task's text). */
export const textField = (path) => String(path[0] === 'tasks' ? path[2] ?? '' : path[0] === 'eras' ? path[2] ?? '' : path[0] ?? '')
const pairOf = (v) => (typeof v === 'string' ? { zh: v, en: v } : v)

/**
 * The rows of `scope` (an era's index, 'all' or 'glossary'), `order` the levels in play order:
 * [{ key, file: { level } | { game } | { glossary }, name, path, value, field }].
 */
export function copyRows(content, vocabulary, scope, order) {
  const rows = []
  const add = (file, name, at) => ({ path, value }) => rows.push({ key: `${name}|${showPath(path)}`, file, name, path, value: pairOf(value), field: at === 'glossary' ? String(path.at(-2) === 'body' ? 'body' : path.at(-1)) : textField(path) })
  if (scope === 'glossary') {
    for (const t of find(GLOSSARY, content.glossary, 'text')) {
      const entry = content.glossary[t.path[0]]?.[t.path[1]]
      add({ glossary: true }, entry?.id ?? showPath(t.path.slice(0, 2)), 'glossary')(t)
    }
    return rows
  }
  const byId = new Map(content.levels.map((l) => [l.id, l]))
  const era = typeof scope === 'number' ? content.eras?.[scope] : null
  const ids = era ? new Set(eraLevels(era)) : null
  if (era) find(vocabulary.game.fields.eras.of, era, 'text', { vocabulary }).forEach((t) => add({ game: true }, String(era.id), 'game')({ ...t, path: ['eras', scope, ...t.path] }))
  if (scope === 'all') {
    const game = Object.fromEntries(Object.entries(content).filter(([k]) => !NOT_GAME.includes(k)))
    find(vocabulary.game, game, 'text', { vocabulary }).forEach(add({ game: true }, 'game.json', 'game'))
  }
  for (const id of order) {
    if (ids && !ids.has(id)) continue
    const { id: _, ...level } = byId.get(id) ?? {}
    find(vocabulary.level, level, 'text', { vocabulary }).forEach(add({ level: id }, id, 'level'))
  }
  return rows
}

