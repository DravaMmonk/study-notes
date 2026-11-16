// The copy table's rows (CopyTable.jsx): every text of a scope — an era (its own texts, then its levels'), a level group
// (its name, then its levels'), the whole game or package (the configuration's texts, then every level's), the
// encyclopedia or the pieces — in play order, each with the file it is in, its path, the copy rule it is held to (the
// field it is) and whose it is (`own`: the package's, or the game's own). A workspace (`side`) sees its own: the package
// workspace the package's texts; the game workspace the game's and the package's, which it puts its own wording over.
import { languagesOf } from '../engine/i18n.js'
import { PARTS_FILE } from '../engine/parts/schema.js'
import { find } from '../engine/schema.js'
import { GLOSSARY } from '../engine/vocabulary.js'
import { showPath } from '../engine/ops/edit.js'
import { eraLevels } from '../course.js'
import { contentFileFor } from '../engine/content.js'
import { GROUP, groupLevels } from '../engine/groups.js'
import { textKey } from '../engine/i18n.js'

const NOT_GAME = ['id', 'levels', 'glossary', 'domain', 'vocabulary', 'open', 'blueprint', 'partDefs', 'groups', 'sourceEras', 'overridden']
/** The copy rule a text is held to: the field it is (a task's own field for a task's text). */
export const textField = (path) => String(path[0] === 'tasks' ? path[2] ?? '' : path[0] === 'eras' ? path[2] ?? '' : path[0] ?? '')

/**
 * The rows of `scope` (an era's index, 'group:<id>', 'all', 'glossary' or 'pieces') as workspace `side` sees them,
 * `order` the levels in play order: [{ key, file: { level } | { group } | { game } | { glossary } | { parts }, name,
 * path, value, field, own }].
 */
export function copyRows(content, vocabulary, scope, order, side = 'package') {
  const rows = []
  const ownOf = (file, path) => (file.game && ['game.json', 'course.json'].includes(contentFileFor(path)) ? 'game' : 'package')
  const add = (file, name, at) => ({ path, value }) => {
    const own = ownOf(file, path)
    if (side === 'package' && own === 'game') return
    rows.push({ key: `${name}|${showPath(path)}`, file, name, path, value, own, field: at === 'glossary' ? String(path.at(-2) === 'body' ? 'body' : path.at(-1)) : textField(path) })
  }
  if (scope === 'pieces') {
    find(PARTS_FILE, content.partDefs, 'text', { vocabulary }).forEach(add({ parts: true }, 'pieces.json', 'pieces'))
    return rows
  }
  if (scope === 'glossary') {
    for (const t of find(GLOSSARY, content.glossary, 'text')) {
      const entry = content.glossary[t.path[0]]?.[t.path[1]]
      add({ glossary: true }, entry?.id ?? showPath(t.path.slice(0, 2)), 'glossary')(t)
    }
    return rows
  }
  const byId = new Map(content.levels.map((l) => [l.id, l]))
  const era = typeof scope === 'number' ? content.eras?.[scope] : null
  const group = typeof scope === 'string' && scope.startsWith('group:') ? scope.slice('group:'.length) : null
  const ids = era ? new Set(eraLevels(era)) : group !== null ? new Set(groupLevels(content.groups?.[group])) : null
  if (era) find(vocabulary.game.fields.eras.of, era, 'text', { vocabulary }).forEach((t) => add({ game: true }, String(era.id), 'game')({ ...t, path: ['eras', scope, ...t.path] }))
  if (group !== null && content.groups?.[group]) find(GROUP, content.groups[group], 'text').forEach(add({ group }, group, 'group'))
  if (scope === 'all') {
    const game = Object.fromEntries(Object.entries(content).filter(([k]) => !NOT_GAME.includes(k)))
    find(vocabulary.game, game, 'text', { vocabulary }).forEach(add({ game: true }, side === 'game' ? 'game.json' : 'package.json', 'game'))
  }
  for (const id of order) {
    if (ids && !ids.has(id)) continue
    const { id: _, ...level } = byId.get(id) ?? {}
    find(vocabulary.level, level, 'text', { vocabulary }).forEach(add({ level: id }, id, 'level'))
  }
  return rows
}


export const allCopyRows = (content, vocabulary, order, side = 'package') => ['all', 'glossary', 'pieces']
  .flatMap((scope) => copyRows(content, vocabulary, scope, order, side))

export const copyLanguages = (rows) => [...new Set(['en', 'zh', ...languagesOf(rows.map((row) => row.value))])].sort()

const fileOf = (row) => (row.file.level !== undefined ? { level: row.file.level } : row.file.group !== undefined ? { group: row.file.group } : { in: row.file.glossary ? 'glossary' : row.file.parts ? 'pieces' : 'game' })

/** The edit of a row's text in `lang`: in the game workspace, a package text gets the game's own wording (text.override). */
export function copyEdit(row, lang, value, side = 'package') {
  if (side === 'game' && row.own === 'package') return { op: 'text.override', ...fileOf(row), path: row.path, lang, value }
  return { op: 'text.set', ...fileOf(row), path: row.path, ...(typeof row.value === 'string' ? {} : { lang }), value }
}

/** What the package writes where the game has its own wording in `lang` (undefined: the game has none there). */
export function packageWording(content, row, lang) {
  const key = textKey(row.value)
  const was = key && content.overridden?.[key]
  return was && Object.hasOwn(was, lang) ? was[lang] ?? '' : undefined
}
