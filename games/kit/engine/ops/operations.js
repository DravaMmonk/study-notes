// The operation set (games/DIRECTION.md decision 4): every change to a data game's content is one of these. The CLI
// (cli.js), the MCP server (mcp.js) and later the studio only ever run them, through a changeset (changeset.js).
//
// An operation is { about, params (schema.js: its arguments as data), apply(ws, args, ctx) }. apply edits the
// workspace (workspace.js) and returns { says, inverse }: what it did, in words, and the operations that undo it.
// ctx: { vocabulary, domain }. A level's tasks (../tasks.js) are added, removed, moved (in a level or to another: two
// levels made one, or one split) and renamed by id. No operation looks after players' saves: while the games are in
// development a save made on other puzzles is not read (../stamp.js).
import { S, find, shapeAt } from '../schema.js'
import { parse } from '../../circuit/text.js'
import { getAt, mergePatch, parsePath, setAt, showPath, unsetAt } from './edit.js'
import { describe, dropFromRows, locate, moveLevel, putIn, takeOut } from './place.js'
import { levelRefs, partRefs, renamePartRefs, renameRefs } from './refs.js'
import { settingReferences } from '../pieces.js'
import { GLOSSARY } from '../vocabulary.js'
import { NAME as PART_NAME, PARTS_FILE, SETTING } from '../parts/schema.js'
import { renameSlot } from '../../pipeline/blueprint.js'
import { TASK_ID, findTask, newTaskId } from '../tasks.js'
import { T as t } from '../../shell/i18n.js'
import { isLanguageCode, LANGUAGE_CODE, textKey, withTextKey } from '../i18n.js'
import { contentFileFor } from '../content.js'
import { GROUP, GROUP_ID } from '../groups.js'

const PATH = S.either(S.str(), S.list(S.either(S.str(), S.int({ min: 0 }))), { about: t('字段的路径：tests[0].goal') })
const NEW_ID = S.str({ pattern: '^[A-Za-z0-9][A-Za-z0-9_-]*$', about: t('新的关卡 id（也是文件名）') })
const PLACE = S.obj({
  before: S.opt(S.level()), after: S.opt(S.level()),
  era: S.opt(S.either(S.str(), S.int())), at: S.opt(S.int({ min: 0 })),
}, { about: t('课程里的一个位置（place.js）') })

const GROUP_NAME = S.str({ pattern: GROUP_ID, about: t('关卡组的 id（也是文件名）', 'a level group\'s id (its file name too)') })
const GROUP_PLACE = S.obj({
  group: GROUP_NAME, before: S.opt(S.level()), after: S.opt(S.level()), at: S.opt(S.int({ min: 0 })),
}, { about: t('一组关卡里的一个位置', 'a place in a level group') })

const fail = (message) => { throw new Error(message) }
const levelOf = (ws, id) => ws.levels.get(id) ?? fail(`no level ${id}`)
const orderOf = (schema, value, vocabulary) => (path) => {
  const s = shapeAt(schema, value, path, { vocabulary })
  return s?.type === 'obj' ? Object.keys(s.fields) : null
}
const setLevel = (ws, id, path, value, vocabulary) => ws.levels.set(id, setAt(levelOf(ws, id), path, value, orderOf(vocabulary.level, levelOf(ws, id), vocabulary)))
/** The operation that puts back what is at `path` now (a value set over, or nothing there). */
const restore = (op, base, path, args) => {
  const keys = parsePath(path)
  const old = getAt(base, keys)
  if (old !== undefined) return { op: `${op}.set`, ...args, path: keys, value: old }
  return { op: `${op}.unset`, ...args, path: keys }
}
// Tasks by id (../tasks.js): the levels as a list, a task found, where a task goes in a level.
const TASK = S.str({ pattern: TASK_ID, about: t('任务的 id') })
const TASK_PLACE = S.obj({ level: S.level(), after: S.opt(TASK), first: S.opt(S.bool()) }, { about: t('一关里的一个位置：after 那个任务后面，first 时最前，都不给就在最后') })
const levelsOf = (ws) => [...ws.levels].map(([id, l]) => ({ id, ...l }))
const taskOf = (ws, id) => findTask(levelsOf(ws), id) ?? fail(`no task ${id}`)
/** Where in level `level`'s tasks (without task `except`) a task goes: its index. */
const indexIn = (tasks, level, { after, first }) => {
  if (first) return 0
  if (after === undefined) return tasks.length
  const k = tasks.findIndex((x) => x.id === after)
  return k < 0 ? fail(`${level} has no task ${after}`) : k + 1
}
/** The place a task is at in its level, said as task.move and task.add take it. */
const placeOf = (tasks, k) => (k === 0 ? { first: true } : { after: tasks[k - 1].id })
/** The game's pieces.json (one is written the first time it is edited): its pieces, or its built ones alone where its domain defines primitives in code. */
const partsOf = (ws) => {
  if (ws.partDefs === undefined) ws.partDefs = { parts: {} }
  return ws.partDefs
}
/** Every reference to task `from` in pieces.json (each `S.task()` field: a built piece's inside) made to name `to` (a
 *  task renamed, or a level with its task). */
const renameInside = (ws, from, to) => {
  if (!ws.partDefs) return
  for (const { path } of find(PARTS_FILE, ws.partDefs, 'task').filter((hit) => hit.value === from)) ws.partDefs = setAt(ws.partDefs, path, to)
}
const groupOf = (ws, id) => ws.groups.get(id) ?? fail(`no group ${id}`)
// The groups as place.js reads chapters, and back.
const asChapters = (ws) => [...ws.groups].map(([id, group]) => ({ id, ...structuredClone(group) }))
const fromChapters = (ws, chapters) => { ws.groups = new Map(chapters.map(({ id, ...group }) => [id, group])) }
/** Level `level` out of whichever group holds it, with the links touching it there: where it was, or null. */
function ungroup(ws, level) {
  const chapters = asChapters(ws)
  const { eras, was, entry } = takeOut(chapters, level)
  if (!was) return null
  fromChapters(ws, eras)
  return { group: chapters[was.era].id, entry, place: was.index === 0 ? { at: 0 } : { after: chapters[was.era].levels[was.index - 1].id } }
}
/** Level `entry` into a group at `to` ({ group, before?, after?, at? }). */
function regroup(ws, entry, { group, ...to }) {
  groupOf(ws, group)
  fromChapters(ws, putIn(asChapters(ws), entry, { era: group, ...to }))
}
/** The course without group `id`: its entries, and the links to and from it. */
const withoutGroup = (eras, id) => eras.map((era) => {
  const levels = era.levels.filter((entry) => entry.group !== id)
  const links = (era.links ?? []).filter(({ fromGame, from, to }) => (fromGame || from !== id) && to !== id)
  const { links: _, ...rest } = era
  return { ...rest, levels, ...(links.length && { links }) }
})
const renameGroupIn = (eras, from, to) => eras.map((era) => ({
  ...era,
  levels: era.levels.map((entry) => (entry.group === from ? { ...entry, group: to } : entry)),
  ...(era.links && { links: era.links.map((link) => ({ ...link, ...(!link.fromGame && link.from === from && { from: to }), ...(link.to === from && { to }) })) }),
}))
const blueprintLines = (text) => {
  const lines = text.replace(/\n$/, '').split('\n')
  return /^#\s*blueprint\b/.test(lines[0]) ? lines.slice(1) : lines
}

export const OPERATIONS = {
  'level.set': {
    about: t('设一关的一个字段（路径可以深入）'),
    params: S.obj({ level: S.level(), path: PATH, value: S.any() }),
    apply(ws, { level, path, value }, { vocabulary }) {
      if (!parsePath(path).length) fail('the path is empty: use level.replace for the whole level')
      const inverse = [restore('level', levelOf(ws, level), path, { level })]
      setLevel(ws, level, path, value, vocabulary)
      return { says: `${level}: set ${showPath(path)}`, inverse }
    },
  },
  'level.unset': {
    about: t('去掉一关的一个字段，或列表里的一项'),
    params: S.obj({ level: S.level(), path: PATH }),
    apply(ws, { level, path }) {
      const keys = parsePath(path)
      const base = levelOf(ws, level)
      // Taking an item out of a list shifts the rest: putting the whole list back undoes it.
      const back = typeof keys.at(-1) === 'number' ? { op: 'level.set', level, path: keys.slice(0, -1), value: getAt(base, keys.slice(0, -1)) } : { op: 'level.set', level, path: keys, value: getAt(base, keys) }
      ws.levels.set(level, unsetAt(base, keys))
      return { says: `${level}: removed ${showPath(keys)}`, inverse: [back] }
    },
  },
  'level.patch': {
    about: t('按 JSON merge patch 改一关的几个字段（null 去掉一个字段）'),
    params: S.obj({ level: S.level(), fields: S.map(S.any()) }),
    apply(ws, { level, fields }, { vocabulary }) {
      const base = levelOf(ws, level)
      ws.levels.set(level, mergePatch(base, fields, orderOf(vocabulary.level, base, vocabulary)))
      return { says: `${level}: patched ${Object.keys(fields).join(', ')}`, inverse: [{ op: 'level.replace', level, data: base }] }
    },
  },
  'level.replace': {
    about: t('把一关整个换成新的内容（id 和位置不变）'),
    params: S.obj({ level: S.level(), data: S.map(S.any()) }),
    apply(ws, { level, data }) {
      const base = levelOf(ws, level)
      ws.levels.set(level, data)
      return { says: `${level}: replaced`, inverse: [{ op: 'level.replace', level, data: base }] }
    },
  },
  'level.blueprint': {
    about: t('把一关的一块板（参考解、naive 解……）写成蓝图文本'),
    params: S.obj({ level: S.level(), path: S.opt(PATH), text: S.str({ about: t('蓝图文本（可以带 # blueprint 那一行）') }) }),
    apply(ws, { level, path = 'tasks[0].solution', text }, { vocabulary }) {
      const base = levelOf(ws, level)
      if (shapeAt(vocabulary.level, base, parsePath(path), { vocabulary })?.type !== 'board') fail(`${level}: ${showPath(path)} is not a board`)
      const lines = blueprintLines(text)
      try {
        parse(lines.join('\n'))
      } catch (error) {
        fail(`${level}: line ${error.line}: ${error.en ?? error.message}`)
      }
      const inverse = [restore('level', base, path, { level })]
      setLevel(ws, level, path, lines, vocabulary)
      return { says: `${level}: ${showPath(path)} is a board of ${lines.length} line(s)`, inverse }
    },
  },
  'level.adds': {
    about: t('一关新带来的元件（adds）里加上或拿掉几样'),
    params: S.obj({ level: S.level(), add: S.opt(S.list(S.ref('part'))), remove: S.opt(S.list(S.ref('part'))) }),
    apply(ws, { level, add = [], remove = [] }, { vocabulary }) {
      const base = levelOf(ws, level)
      const had = base.adds ?? []
      for (const p of remove) if (!had.includes(p)) fail(`${level} does not bring in ${p}`)
      for (const p of add) if (had.includes(p)) fail(`${level} brings in ${p} already`)
      const adds = [...had.filter((p) => !remove.includes(p)), ...add]
      const inverse = [restore('level', base, ['adds'], { level })]
      if (adds.length) setLevel(ws, level, ['adds'], adds, vocabulary)
      else ws.levels.set(level, unsetAt(base, ['adds']))
      return { says: `${level}: adds ${[...add.map((p) => `+${p}`), ...remove.map((p) => `-${p}`)].join(' ')}`, inverse }
    },
  },
  'level.add': {
    about: t('加一关：它的内容，和它在哪一组里的位置', 'Add a level: its content, and its place in a level group'),
    params: S.obj({ level: NEW_ID, data: S.map(S.any()), to: S.opt(GROUP_PLACE) }),
    apply(ws, { level, data, to }) {
      if (ws.levels.has(level)) fail(`there is a level ${level} already`)
      if (ws.groups.has(level)) fail(`${level} is a group's id`)
      ws.levels.set(level, data)
      if (to) regroup(ws, { id: level }, to)
      return { says: `${level}: added${to ? ` to the group ${to.group}` : ''}`, inverse: [{ op: 'level.remove', level }] }
    },
  },
  'level.remove': {
    about: t('删掉一关：它的文件和它在课程里的位置；别处还提到它时拒绝'),
    params: S.obj({ level: S.level() }),
    apply(ws, { level }, { vocabulary }) {
      const data = levelOf(ws, level)
      const others = levelRefs(ws, vocabulary, level).filter((r) => r.file !== `levels/${level}.json` && !isOwnPlace(r))
      if (others.length) fail(`${level} is still named at ${others.map((r) => `${r.file} ${showPath(r.path)}`).join(', ')}`)
      const eras = ws.game.eras
      const { eras: left, was } = takeOut(eras, level)
      ws.game = { ...ws.game, eras: left.map((era) => { const chapter = structuredClone(era); dropFromRows(chapter, level); return chapter }) }
      const grouped = ungroup(ws, level)
      ws.levels.delete(level)
      return {
        says: `${level}: removed from ${describe(eras, was)}${grouped ? ` and the group ${grouped.group}` : ''}`,
        inverse: [{ op: 'level.add', level, data, ...(grouped && { to: { group: grouped.group, ...grouped.place } }) }, { op: 'game.set', path: ['eras'], value: eras }],
      }
    },
  },
  'level.rename': {
    about: t('给一关换 id：文件名和所有提到它的地方一起改；和关同名的任务一起换（玩家存下的东西按 id 跟着走）'),
    params: S.obj({ level: S.level(), to: NEW_ID }),
    apply(ws, { level, to }, { vocabulary }) {
      if (ws.levels.has(to)) fail(`there is a level ${to} already`)
      if (ws.groups.has(to)) fail(`${to} is a group's id`)
      if (findTask(levelsOf(ws), to)) fail(`there is a task ${to} already`)
      const old = levelOf(ws, level)
      const data = old.tasks?.some((x) => x.id === level) ? { ...old, tasks: old.tasks.map((x) => (x.id === level ? { ...x, id: to } : x)) } : old
      ws.levels = new Map([...ws.levels].map(([id, l]) => (id === level ? [to, data] : [id, l])))
      if (data !== old) renameInside(ws, level, to)
      ws.basis.set(`levels/${to}.json`, ws.original.get(`levels/${level}.json`) ?? ws.basis.get(`levels/${level}.json`))
      const n = renameRefs(ws, vocabulary, level, to)
      if (ws.blueprint !== undefined) ws.blueprint = renameSlot(ws.blueprint, level, to)
      return { says: `${level} → ${to} (${n} reference(s))`, inverse: [{ op: 'level.rename', level: to, to: level }] }
    },
  },
  'level.move': {
    about: t('调整关卡在同章或不同章节中的编号位置', 'Move a level in the course order within or between chapters'),
    params: S.obj({ level: S.level(), to: PLACE }),
    apply(ws, { level, to }) {
      const eras = ws.game.eras
      const { eras: moved, was } = moveLevel(eras, level, to)
      ws.game = { ...ws.game, eras: moved }
      return {
        says: `${level}: ${describe(eras, was)} → ${describe(ws.game.eras, locate(ws.game.eras, level))}`,
        inverse: [{ op: 'game.set', path: ['eras'], value: eras }],
      }
    },
  },
  'task.add': {
    about: t('给一关加一个任务：它的字段（id 不给就生成一个），排在 after 那个任务后面（first 时最前，都不给就在最后）'),
    params: S.obj({ level: S.level(), data: S.map(S.any()), after: S.opt(TASK), first: S.opt(S.bool()) }),
    apply(ws, { level, data, after, first }, { vocabulary }) {
      const base = levelOf(ws, level)
      const id = data.id ?? newTaskId(levelsOf(ws), level)
      if (findTask(levelsOf(ws), id)) fail(`there is a task ${id} already`)
      if (id !== level && ws.levels.has(id)) fail(`${id} is a level’s id`)
      const at = indexIn(base.tasks, level, { after, first })
      const { id: _id, ...fields } = data
      ws.levels.set(level, { ...base, tasks: [...base.tasks.slice(0, at), { id, ...fields }, ...base.tasks.slice(at)] })
      return { says: `${level}: task ${id} added (${at + 1} of ${base.tasks.length + 1})`, inverse: [{ op: 'task.remove', task: id }] }
    },
  },
  'task.remove': {
    about: t('去掉一个任务；一关至少留一个任务（整关不要了用 level.remove）'),
    params: S.obj({ task: TASK }),
    apply(ws, { task }, { vocabulary }) {
      const { level, at } = taskOf(ws, task)
      const base = levelOf(ws, level)
      if (base.tasks.length === 1) fail(`${task} is ${level}’s only task: remove the level instead`)
      ws.levels.set(level, { ...base, tasks: base.tasks.filter((x) => x.id !== task) })
      return { says: `${level}: task ${task} removed`, inverse: [{ op: 'task.add', level, data: base.tasks[at], ...placeOf(base.tasks, at) }] }
    },
  },
  'task.move': {
    about: t('把一个任务挪到一关里的另一个位置，或挪进另一关；玩家存下的板和通过与否跟着它走。挪走一关唯一的任务时，同一个变更集里删掉那一关（合成两关）'),
    params: S.obj({ task: TASK, to: TASK_PLACE }),
    apply(ws, { task, to }, { vocabulary }) {
      const { level: from, at } = taskOf(ws, task)
      const source = levelOf(ws, from)
      levelOf(ws, to.level)
      if (to.after === task) fail(`${task} cannot go after itself`)
      const moving = source.tasks[at]
      ws.levels.set(from, { ...source, tasks: source.tasks.filter((x) => x.id !== task) })
      const target = levelOf(ws, to.level)
      const k = indexIn(target.tasks, to.level, to)
      ws.levels.set(to.level, { ...target, tasks: [...target.tasks.slice(0, k), moving, ...target.tasks.slice(k)] })
      const back = { op: 'task.move', task, to: { level: from, ...placeOf(source.tasks, at) } }
      return { says: `${task}: ${from === to.level ? `moved in ${from}` : `${from} → ${to.level}`} (${k + 1} of ${levelOf(ws, to.level).tasks.length})`, inverse: [back] }
    },
  },
  'task.rename': {
    about: t('给一个任务换 id；搭出的件对它的引用和玩家存下的东西跟着换'),
    params: S.obj({ task: TASK, to: TASK }),
    apply(ws, { task, to }, { vocabulary }) {
      const { level, at } = taskOf(ws, task)
      if (findTask(levelsOf(ws), to)) fail(`there is a task ${to} already`)
      if (to !== level && ws.levels.has(to)) fail(`${to} is a level’s id`)
      const base = levelOf(ws, level)
      ws.levels.set(level, { ...base, tasks: base.tasks.map((x, k) => (k === at ? { ...x, id: to } : x)) })
      renameInside(ws, task, to)
      return { says: `${level}: task ${task} → ${to}`, inverse: [{ op: 'task.rename', task: to, to: task }] }
    },
  },
  'game.set': {
    about: t('设 game.json 的一个字段（课程、元件、标题……）'),
    params: S.obj({ path: PATH, value: S.any() }),
    apply(ws, { path, value }, { vocabulary }) {
      const inverse = [restore('game', ws.game, path, {})]
      ws.game = setAt(ws.game, path, value, orderOf(vocabulary.game, ws.game, vocabulary))
      return { says: `game.json: set ${showPath(path)}`, inverse }
    },
  },
  'game.unset': {
    about: t('去掉 game.json 的一个字段，或列表里的一项'),
    params: S.obj({ path: PATH }),
    apply(ws, { path }) {
      const keys = parsePath(path)
      const back = typeof keys.at(-1) === 'number' ? { op: 'game.set', path: keys.slice(0, -1), value: getAt(ws.game, keys.slice(0, -1)) } : { op: 'game.set', path: keys, value: getAt(ws.game, keys) }
      ws.game = unsetAt(ws.game, keys)
      return { says: `game.json: removed ${showPath(keys)}`, inverse: [back] }
    },
  },
  'text.set': {
    about: t('修改某个语言的字段文本'),
    params: S.obj({ level: S.opt(S.level()), group: S.opt(GROUP_NAME), in: S.opt(S.oneOf(['game', 'glossary', 'pieces'])), path: PATH, lang: S.opt(S.str({ pattern: LANGUAGE_CODE })), value: S.text() }),
    apply(ws, { level, group, in: where, path, lang, value: text }, { vocabulary }) {
      if ([level, group, where].filter((x) => x !== undefined).length !== 1) fail('name the text’s file: a level, a group, or in: game, glossary or pieces')
      if (group !== undefined) return setGroupText(ws, group, path, lang, text, vocabulary)
      if (where === 'pieces' && ws.partDefs === undefined) fail('the game has no pieces.json')
      const [value, schema] = level !== undefined ? [levelOf(ws, level), vocabulary.level] : where === 'game' ? [ws.game, vocabulary.game] : where === 'pieces' ? [ws.partDefs, PARTS_FILE] : [ws.glossary, GLOSSARY]
      const keys = parsePath(path)
      const shape = shapeAt(schema, value, keys, { vocabulary })
      if (shape?.type !== 'text') fail(`${showPath(keys)} is not a text`)
      const old = getAt(value, keys)
      if (old === undefined && (where === 'glossary' || where === 'pieces')) fail(`${where}.json has no text at ${showPath(keys)}`)
      if (lang && !isLanguageCode(lang)) fail(`unknown language code ${lang}`)
      if (lang && typeof text !== 'string') fail('editing one language needs one string')
      if (lang && typeof old === 'string') fail('use a text field without a language to edit a shared string')
      const next = lang ? { ...old, [lang]: text } : text
      // Keep the message identity when a whole field is edited or restored by its inverse.
      const key = textKey(next) ?? textKey(old)
      const updated = key && typeof next === 'object' ? withTextKey(next, key) : next
      const file = level ?? where
      // Restoring the complete message also removes a locale that this edit added.
      const inverse = [where === 'glossary' || where === 'pieces' ? { op: 'text.set', in: where, path: keys, value: old } : restore(level !== undefined ? 'level' : 'game', value, keys, level !== undefined ? { level } : {})]
      if (level !== undefined) setLevel(ws, level, keys, updated, vocabulary)
      else if (where === 'game') ws.game = setAt(ws.game, keys, updated)
      else if (where === 'pieces') ws.partDefs = setAt(ws.partDefs, keys, updated, orderOf(PARTS_FILE, ws.partDefs, vocabulary))
      else ws.glossary = setAt(ws.glossary, keys, updated)
      return { says: `${file}: ${showPath(keys)} reads anew`, inverse }
    },
  },
  'glossary.presentation': {
    about: t('设置百科词条是否按解锁关卡的章节分组'),
    params: S.obj({ groupByChapter: S.either(S.bool(), S.oneOf([null])) }),
    apply(ws, { groupByChapter }) {
      const old = ws.glossary.groupByChapter ?? null
      ws.glossary = mergePatch(ws.glossary, { groupByChapter })
      return { says: 'glossary: set chapter grouping', inverse: [{ op: 'glossary.presentation', groupByChapter: old }] }
    },
  },
  'glossary.replace': {
    about: t('替换百科的 JSON 内容', 'Replace the glossary JSON'),
    params: S.obj({ data: GLOSSARY }),
    apply(ws, { data }) {
      const old = ws.glossary
      ws.glossary = data
      return { says: 'glossary: replaced', inverse: [{ op: 'glossary.replace', data: old }] }
    },
  },
  'glossary.put': {
    about: t('写一条百科（没有就加上，at 是在列表里的位置）'),
    params: S.obj({ entry: S.str(), data: S.map(S.any()), at: S.opt(S.int({ min: 0 })) }),
    apply(ws, { entry, data, at }) {
      const entries = ws.glossary.entries
      const k = entries.findIndex((e) => e.id === entry)
      const next = { id: entry, ...data }
      const list = k >= 0 ? entries.map((e, i) => (i === k ? next : e)) : [...entries.slice(0, at ?? entries.length), next, ...entries.slice(at ?? entries.length)]
      ws.glossary = { ...ws.glossary, entries: list }
      const { id: _, ...old } = entries[k] ?? {}
      return { says: `glossary: ${k >= 0 ? 'rewrote' : 'added'} ${entry}`, inverse: [k >= 0 ? { op: 'glossary.put', entry, data: old } : { op: 'glossary.remove', entry }] }
    },
  },
  'glossary.set': {
    about: t('按 JSON merge patch 改一条百科的几个字段'),
    params: S.obj({ entry: S.str(), fields: S.map(S.any()) }),
    apply(ws, { entry, fields }) {
      const entries = ws.glossary.entries
      const k = entries.findIndex((e) => e.id === entry)
      if (k < 0) fail(`no entry ${entry}: glossary.put adds one`)
      const { id: _, ...old } = entries[k]
      ws.glossary = { ...ws.glossary, entries: entries.map((e, i) => (i === k ? mergePatch(e, fields) : e)) }
      return { says: `glossary: ${entry}: patched ${Object.keys(fields).join(', ')}`, inverse: [{ op: 'glossary.put', entry, data: old }] }
    },
  },
  'glossary.remove': {
    about: t('删掉一条百科'),
    params: S.obj({ entry: S.str() }),
    apply(ws, { entry }) {
      const entries = ws.glossary.entries
      const k = entries.findIndex((e) => e.id === entry)
      if (k < 0) fail(`no entry ${entry}`)
      const { id: _, ...old } = entries[k]
      ws.glossary = { ...ws.glossary, entries: entries.filter((_, i) => i !== k) }
      return { says: `glossary: removed ${entry}`, inverse: [{ op: 'glossary.put', entry, data: old, at: k }] }
    },
  },
  'piece.add': {
    about: t('加一个件（pieces.json）：它的定义，after 那个件后面'),
    params: S.obj({ piece: PART_NAME, data: S.map(S.any()), after: S.opt(PART_NAME) }),
    apply(ws, { piece: part, data, after }, { vocabulary }) {
      partsOf(ws)
      if (ws.partDefs.parts[part]) fail(`there is a part ${part} already`)
      const entries = Object.entries(ws.partDefs.parts)
      const k = after === undefined ? entries.length : entries.findIndex(([type]) => type === after) + 1
      if (after !== undefined && k === 0) fail(`no part ${after}`)
      ws.partDefs = { ...ws.partDefs, parts: Object.fromEntries([...entries.slice(0, k), [part, data], ...entries.slice(k)]) }
      return { says: `pieces: added ${part}`, inverse: [{ op: 'piece.remove', piece: part }] }
    },
  },
  'piece.remove': {
    about: t('删掉一个件（pieces.json）；课程、关卡、板或文字还提到它时拒绝；玩家存下的放着它的板去掉'),
    params: S.obj({ piece: PART_NAME }),
    apply(ws, { piece: part }, { vocabulary }) {
      partsOf(ws)
      const entries = Object.entries(ws.partDefs.parts)
      const k = entries.findIndex(([type]) => type === part)
      if (k < 0) fail(`no part ${part}`)
      const named = partRefs(ws, vocabulary, part)
      if (named.length) fail(`${part} is still named at ${named.slice(0, 8).map((r) => `${r.file} ${showPath(r.path)}`).join(', ')}${named.length > 8 ? ` and ${named.length - 8} more` : ''}`)
      ws.partDefs = { ...ws.partDefs, parts: Object.fromEntries(entries.filter(([type]) => type !== part)) }
      return { says: `pieces: removed ${part}`, inverse: [{ op: 'piece.add', piece: part, data: entries[k][1], ...(k > 0 ? { after: entries[k - 1][0] } : {}) }] }
    },
  },
  'piece.rename': {
    about: t('给一个件换类型名：课程、关卡、板、链接里的每一处一起改，存下的板也跟着改；pieces.json 还没有、只在内容里提到的件也可以'),
    params: S.obj({ piece: S.str({ pattern: '^[A-Za-z_][A-Za-z0-9_-]*$' }), to: PART_NAME }),
    apply(ws, { piece: part, to }, { vocabulary, domain }) {
      partsOf(ws)
      if (!ws.partDefs.parts[part] && !partRefs(ws, vocabulary, part).length) fail(`no part ${part}`)
      if (Object.hasOwn(domain?.vocabulary.kinds.part ?? {}, part)) {
        fail(`the engine uses the part id ${part}; edit its name instead`)
      }
      if (ws.partDefs.parts[to]) fail(`there is a part ${to} already`)
      ws.partDefs = { ...ws.partDefs, parts: Object.fromEntries(Object.entries(ws.partDefs.parts).map(([type, def]) => [type === part ? to : type, def])) }
      const n = renamePartRefs(ws, vocabulary, part, to)
      return { says: `pieces: ${part} → ${to} (${n} reference(s))`, inverse: [{ op: 'piece.rename', piece: to, to: part }] }
    },
  },
  'setting.add': {
    about: t('新建独立的设置定义', 'Create a setting definition'),
    params: S.obj({ setting: PART_NAME, data: SETTING }),
    apply(ws, { setting, data }) {
      const file = partsOf(ws)
      if (Object.hasOwn(file.settings ?? {}, setting)) fail(`there is a setting ${setting} already`)
      const path = file.settings === undefined ? ['settings'] : ['settings', setting]
      ws.partDefs = { ...file, settings: { ...file.settings, [setting]: data } }
      return { says: `pieces: added setting ${setting}`, inverse: [restore('pieces', file, path, {})] }
    },
  },
  'setting.rename': {
    about: t('更改设置定义的 ID 并更新所有引用', 'Rename a setting definition and update its references'),
    params: S.obj({ setting: PART_NAME, to: PART_NAME }),
    apply(ws, { setting, to }) {
      const file = partsOf(ws)
      if (!Object.hasOwn(file.settings ?? {}, setting)) fail(`no setting ${setting}`)
      if (Object.hasOwn(file.settings, to)) fail(`there is a setting ${to} already`)
      const uses = settingReferences(file, setting)
      const parts = { ...file.parts }
      for (const piece of new Set(uses.map((use) => use.piece))) {
        const def = parts[piece]
        parts[piece] = { ...def, settings: def.settings.map((ref) => ref.setting === setting ? { ...ref, setting: to } : ref) }
      }
      const settings = Object.fromEntries(Object.entries(file.settings).map(([id, def]) => [id === setting ? to : id, def]))
      ws.partDefs = { ...file, parts, settings }
      return { says: `pieces: setting ${setting} → ${to}`, inverse: [{ op: 'setting.rename', setting: to, to: setting }] }
    },
  },
  'setting.remove': {
    about: t('删除没有被件引用的设置定义', 'Delete an unused setting definition'),
    params: S.obj({ setting: PART_NAME }),
    apply(ws, { setting }) {
      const file = partsOf(ws)
      if (!Object.hasOwn(file.settings ?? {}, setting)) fail(`no setting ${setting}`)
      const uses = settingReferences(file, setting)
      if (uses.length) fail(`${setting} is still used by ${uses.map(({ piece, key }) => `${piece}.${key}`).join(', ')}`)
      ws.partDefs = unsetAt(file, ['settings', setting])
      return { says: `pieces: removed setting ${setting}`, inverse: [restore('pieces', file, ['settings'], {})] }
    },
  },
  'pieces.set': {
    about: t('设 pieces.json 的一个字段：parts.<件>.settings[0].setting、settings.<设置>.options……'),
    params: S.obj({ path: PATH, value: S.any() }),
    apply(ws, { path, value }, { vocabulary }) {
      partsOf(ws)
      const keys = parsePath(path)
      if (keys.length < 3 && keys[0] === 'parts') fail('a whole piece is added with piece.add, renamed with piece.rename')
      // A first face can be written independently even before the part has a views object.
      const parent = keys.slice(0, -1)
      if (keys.length === 4 && keys[0] === 'parts' && keys[2] === 'views' && getAt(ws.partDefs, parent) === undefined) {
        const inverse = [restore('pieces', ws.partDefs, parent, {})]
        ws.partDefs = setAt(ws.partDefs, parent, { [keys[3]]: value }, orderOf(PARTS_FILE, ws.partDefs, vocabulary))
        return { says: `pieces.json: set ${showPath(keys)}`, inverse }
      }
      const inverse = [restore('pieces', ws.partDefs, keys, {})]
      ws.partDefs = setAt(ws.partDefs, keys, value, orderOf(PARTS_FILE, ws.partDefs, vocabulary))
      return { says: `pieces.json: set ${showPath(keys)}`, inverse }
    },
  },
  'pieces.unset': {
    about: t('去掉 pieces.json 的一个字段，或列表里的一项'),
    params: S.obj({ path: PATH }),
    apply(ws, { path }, { vocabulary }) {
      partsOf(ws)
      const keys = parsePath(path)
      if (keys.length < 3 && keys[0] === 'parts') fail('a whole piece is removed with piece.remove')
      const back = typeof keys.at(-1) === 'number' ? { op: 'pieces.set', path: keys.slice(0, -1), value: getAt(ws.partDefs, keys.slice(0, -1)) } : { op: 'pieces.set', path: keys, value: getAt(ws.partDefs, keys) }
      ws.partDefs = unsetAt(ws.partDefs, keys)
      return { says: `pieces.json: removed ${showPath(keys)}`, inverse: [back] }
    },
  },
  'blueprint.put': {
    about: t('写下整份课程蓝图（blueprint.json，第 7.2 节）'),
    params: S.obj({ data: S.map(S.any()) }),
    apply(ws, { data }) {
      const old = ws.blueprint
      ws.blueprint = data
      return { says: `blueprint: ${old === undefined ? 'written' : 'rewritten'}`, inverse: [old === undefined ? { op: 'blueprint.remove' } : { op: 'blueprint.put', data: old }] }
    },
  },
  'blueprint.set': {
    about: t('设课程蓝图的一个字段（路径可以深入：eras[0].series[2].slots[1].uses）'),
    params: S.obj({ path: PATH, value: S.any() }),
    apply(ws, { path, value }) {
      if (ws.blueprint === undefined) fail('the game has no blueprint yet: blueprint.put writes one')
      if (!parsePath(path).length) fail('the path is empty: use blueprint.put for the whole blueprint')
      const inverse = [restore('blueprint', ws.blueprint, path, {})]
      ws.blueprint = setAt(ws.blueprint, path, value)
      return { says: `blueprint: set ${showPath(path)}`, inverse }
    },
  },
  'blueprint.unset': {
    about: t('去掉课程蓝图的一个字段，或列表里的一项'),
    params: S.obj({ path: PATH }),
    apply(ws, { path }) {
      if (ws.blueprint === undefined) fail('the game has no blueprint')
      const keys = parsePath(path)
      const back = typeof keys.at(-1) === 'number' ? { op: 'blueprint.set', path: keys.slice(0, -1), value: getAt(ws.blueprint, keys.slice(0, -1)) } : { op: 'blueprint.set', path: keys, value: getAt(ws.blueprint, keys) }
      ws.blueprint = unsetAt(ws.blueprint, keys)
      return { says: `blueprint: removed ${showPath(keys)}`, inverse: [back] }
    },
  },
  'blueprint.remove': {
    about: t('删掉课程蓝图'),
    params: S.obj({}),
    apply(ws) {
      if (ws.blueprint === undefined) fail('the game has no blueprint')
      const old = ws.blueprint
      ws.blueprint = undefined
      return { says: 'blueprint: removed', inverse: [{ op: 'blueprint.put', data: old }] }
    },
  },
}

// A level's places go with it: in the course (its entry, its links, its place on the map) and in its group.
const isOwnPlace = ({ file, path }) => (file === 'game.json' && path[0] === 'eras' && ['levels', 'links', 'rows'].includes(path[2]))
  || (file.startsWith('groups/') && ['levels', 'links'].includes(path[0]))

/** Edit a text of group `group`'s file, as text.set edits a level's. */
function setGroupText(ws, group, path, lang, text) {
  const base = groupOf(ws, group)
  const keys = parsePath(path)
  if (shapeAt(GROUP, base, keys)?.type !== 'text') fail(`${showPath(keys)} is not a text`)
  const old = getAt(base, keys)
  if (lang && !isLanguageCode(lang)) fail(`unknown language code ${lang}`)
  if (lang && typeof text !== 'string') fail('editing one language needs one string')
  const next = lang ? { ...old, [lang]: text } : text
  const key = textKey(next) ?? textKey(old)
  ws.groups.set(group, setAt(base, keys, key && typeof next === 'object' ? withTextKey(next, key) : next))
  return { says: `group ${group}: ${showPath(keys)} reads anew`, inverse: [restore('group', base, keys, { group })] }
}

/** The text at `path` of a package file, as the package writes it (the game's own texts left out). */
function packageText(ws, { level, group, in: where }, keys, vocabulary) {
  const [value, schema] = level !== undefined ? [levelOf(ws, level), vocabulary.level] : group !== undefined ? [groupOf(ws, group), GROUP]
    : where === 'pieces' ? [ws.partDefs, PARTS_FILE] : where === 'glossary' ? [ws.glossary, GLOSSARY] : [ws.game, vocabulary.game]
  if (where === 'game' && ['game.json', 'course.json'].includes(contentFileFor(keys))) fail(`${showPath(keys)} is the game's own text: edit it with text.set`)
  if (shapeAt(schema, value, keys, { vocabulary })?.type !== 'text') fail(`${showPath(keys)} is not a text`)
  const text = getAt(value, keys)
  if (!textKey(text)) fail(`${showPath(keys)} is a text in no language: the game has nothing to put over it`)
  return text
}

Object.assign(OPERATIONS, {
  'group.add': {
    about: t('加一组关卡：它的名字、它的关卡和组内的连线（关卡要已在包里、不在别的组）', 'Add a level group: its name, its levels and the links between them'),
    params: S.obj({ group: GROUP_NAME, data: S.opt(S.map(S.any())) }),
    apply(ws, { group, data = { title: t('新的一组', 'New group'), levels: [] } }) {
      if (ws.groups.has(group)) fail(`there is a group ${group} already`)
      if (ws.levels.has(group)) fail(`${group} is a level's id`)
      ws.groups.set(group, data)
      return { says: `group ${group}: added`, inverse: [{ op: 'group.remove', group }] }
    },
  },
  'group.remove': {
    about: t('删掉一组：组里的关卡留在包里；课程里整组放进来的地方和连到它的线一起去掉', 'Remove a level group: its levels stay in the package; where a course places the whole group goes too'),
    params: S.obj({ group: GROUP_NAME }),
    apply(ws, { group }) {
      const data = groupOf(ws, group)
      const eras = ws.game.eras
      ws.groups.delete(group)
      ws.game = { ...ws.game, eras: withoutGroup(eras, group) }
      return { says: `group ${group}: removed`, inverse: [{ op: 'group.add', group, data }, { op: 'game.set', path: ['eras'], value: eras }] }
    },
  },
  'group.rename': {
    about: t('给一组换 id：文件名和课程里提到它的地方一起改', 'Give a level group a new id, with the places a course names it'),
    params: S.obj({ group: GROUP_NAME, to: GROUP_NAME }),
    apply(ws, { group, to }) {
      const data = groupOf(ws, group)
      if (ws.groups.has(to)) fail(`there is a group ${to} already`)
      if (ws.levels.has(to)) fail(`${to} is a level's id`)
      ws.groups = new Map([...ws.groups].map(([id, g]) => (id === group ? [to, data] : [id, g])))
      ws.basis.set(`groups/${to}.json`, ws.original.get(`groups/${group}.json`) ?? ws.basis.get(`groups/${group}.json`))
      ws.game = { ...ws.game, eras: renameGroupIn(ws.game.eras, group, to) }
      return { says: `group ${group} → ${to}`, inverse: [{ op: 'group.rename', group: to, to: group }] }
    },
  },
  'group.set': {
    about: t('设一组的一个字段（名字、关卡、组内连线……）', 'Set a field of a level group (its name, levels, links…)'),
    params: S.obj({ group: GROUP_NAME, path: PATH, value: S.any() }),
    apply(ws, { group, path, value }) {
      const base = groupOf(ws, group)
      if (!parsePath(path).length) fail('the path is empty')
      const inverse = [restore('group', base, path, { group })]
      ws.groups.set(group, setAt(base, path, value, orderOf(GROUP, base, null)))
      return { says: `group ${group}: set ${showPath(path)}`, inverse }
    },
  },
  'group.unset': {
    about: t('去掉一组的一个字段，或列表里的一项', 'Remove a field of a level group, or an item of a list'),
    params: S.obj({ group: GROUP_NAME, path: PATH }),
    apply(ws, { group, path }) {
      const keys = parsePath(path)
      const base = groupOf(ws, group)
      const at = typeof keys.at(-1) === 'number' ? keys.slice(0, -1) : keys
      ws.groups.set(group, unsetAt(base, keys))
      return { says: `group ${group}: removed ${showPath(keys)}`, inverse: [{ op: 'group.set', group, path: at, value: getAt(base, at) }] }
    },
  },
  'group.place': {
    about: t('把一关放进一组里的一个位置（挪进、挪出或在组内挪动；to 不给就不在任何组里）；它在旧组里的连线去掉', 'Put a level at a place in a group (in, out, or within one; no to: in no group); its links in the old group go'),
    params: S.obj({ level: S.level(), to: S.opt(GROUP_PLACE) }),
    apply(ws, { level, to }) {
      levelOf(ws, level)
      const before = new Map(ws.groups)
      const was = ungroup(ws, level)
      if (to) regroup(ws, was?.entry ?? { id: level }, to)
      const touched = [...new Set([was?.group, to?.group].filter(Boolean))]
      return {
        says: `${level}: ${was ? `group ${was.group}` : 'no group'} → ${to ? `group ${to.group}` : 'no group'}`,
        inverse: touched.map((group) => ({ op: 'group.replace', group, data: before.get(group) })),
      }
    },
  },
  'group.replace': {
    about: t('把一组整个换成新的内容（id 不变）', 'Replace a level group\'s whole content (its id stays)'),
    params: S.obj({ group: GROUP_NAME, data: S.map(S.any()) }),
    apply(ws, { group, data }) {
      const base = groupOf(ws, group)
      ws.groups.set(group, data)
      return { says: `group ${group}: replaced`, inverse: [{ op: 'group.replace', group, data: base }] }
    },
  },
  'text.override': {
    about: t('这款游戏在包的一处文案上写它自己的（不改包里的原文）；value 为 null 时恢复原文', 'The game\'s own wording over a text of its package (the package is left as it is); value null: back to the package\'s'),
    params: S.obj({
      level: S.opt(S.level()), group: S.opt(GROUP_NAME), in: S.opt(S.oneOf(['game', 'glossary', 'pieces'])), path: PATH,
      lang: S.str({ pattern: LANGUAGE_CODE }), value: S.either(S.str(), S.oneOf([null])),
    }),
    apply(ws, { level, group, in: where, path, lang, value }, { vocabulary }) {
      if ([level, group, where].filter((x) => x !== undefined).length !== 1) fail('name the text’s file: a level, a group, or in: game, glossary or pieces')
      if (!isLanguageCode(lang)) fail(`unknown language code ${lang}`)
      const keys = parsePath(path)
      const key = textKey(packageText(ws, { level, group, in: where }, keys, vocabulary))
      const old = ws.overrides[lang]?.[key] ?? null
      const entries = { ...ws.overrides[lang] }
      if (value === null) delete entries[key]
      else entries[key] = value
      ws.overrides = { ...ws.overrides, [lang]: entries }
      const file = { ...(level !== undefined && { level }), ...(group !== undefined && { group }), ...(where !== undefined && { in: where }) }
      return { says: `${level ?? group ?? where}: ${showPath(keys)} (${lang}) ${value === null ? 'reads as its package writes it' : 'reads the game\'s own way'}`, inverse: [{ op: 'text.override', ...file, path: keys, lang, value: old }] }
    },
  },
})

/** Which workspace an operation belongs to (games/DESIGN.md 6.7): 'package' (the levels, their groups, pieces and encyclopedia) or 'game' (the course and the game's own texts). */
export function opScope({ op, path, in: where }) {
  if (op === 'level.move' || op === 'text.override' || op.startsWith('blueprint.')) return 'game'
  if (op === 'game.set' || op === 'game.unset' || (op === 'text.set' && where === 'game')) {
    return ['game.json', 'course.json'].includes(contentFileFor(parsePath(path))) ? 'game' : 'package'
  }
  return 'package'
}
