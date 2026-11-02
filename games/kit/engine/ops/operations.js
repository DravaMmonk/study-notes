// The operation set (games/DIRECTION.md decision 4): every change to a data game's content is one of these. The CLI
// (cli.js), the MCP server (mcp.js) and later the studio only ever run them, through a changeset (changeset.js).
//
// An operation is { about, params (schema.js: its arguments as data), apply(ws, args, ctx) }. apply edits the
// workspace (workspace.js) and returns { says, inverse, saves?, placed?, own? }: what it did, in words; the operations
// that undo it; the save migration ops (../../shell/saves.js) it alone knows it needs (a level renamed or removed, a
// task removed or renamed); the levels it put somewhere in the course (added or moved there); and the levels whose kept
// state its own save ops carry, which no other migration touches. ctx: { vocabulary, domain }. In a domain whose
// levels are lists of tasks with ids (../tasks.js), tasks are added, removed, moved (in a level or to another: two
// levels made one, or one split) and renamed by id; the saves keep a task by its id, so a move needs no step. What a change
// means for the saves beyond that (a new prerequisite, a puzzle whose kept boards no longer apply) is read off the
// content before and after the whole changeset (migrate.js).
import { S, shapeAt } from '../schema.js'
import { parse } from '../../circuit/text.js'
import { getAt, mergePatch, parsePath, setAt, showPath, unsetAt } from './edit.js'
import { PATHS, describe, locate, putIn, takeOut } from './place.js'
import { levelRefs, renameRefs } from './refs.js'
import { renameSlot } from '../../pipeline/blueprint.js'
import { TASK_ID, findTask, hasTaskIds, newTaskId } from '../tasks.js'

const t = (zh, en) => ({ zh, en })
const PATH = S.either(S.str(), S.list(S.either(S.str(), S.int({ min: 0 }))), { about: t('字段的路径：tests[0].goal', 'a field’s path: tests[0].goal') })
const NEW_ID = S.str({ pattern: '^[A-Za-z0-9][A-Za-z0-9_-]*$', about: t('新的关卡 id（也是文件名）', 'a new level id (its file name too)') })
const PLACE = S.obj({
  before: S.opt(S.level()), after: S.opt(S.level()), on: S.opt(S.oneOf(['path'])),
  era: S.opt(S.either(S.str(), S.int())), path: S.opt(S.oneOf(PATHS)), branch: S.opt(S.str()), topic: S.opt(S.str()),
  challenge: S.opt(S.bool()), hang: S.opt(S.either(S.level(), S.list(S.level()))), at: S.opt(S.int({ min: 0 })),
}, { about: t('课程里的一个位置（place.js）', 'a place in the course (place.js)') })

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
// game.json's saves are history: written by the migration generator (migrate.js), never edited.
const notSaves = (path) => (parsePath(path)[0] === 'saves' ? fail('game.json saves are written by the migration generator, not edited') : path)
// Tasks by id (../tasks.js): the levels as a list, a task found, where a task goes in a level.
const TASK = S.str({ pattern: TASK_ID, about: t('任务的 id', 'a task’s id') })
const TASK_PLACE = S.obj({ level: S.level(), after: S.opt(TASK), first: S.opt(S.bool()) }, { about: t('一关里的一个位置：after 那个任务后面，first 时最前，都不给就在最后', 'a place in a level: after that task, first, or else last') })
const tasked = (vocabulary) => hasTaskIds(vocabulary) || fail(`the ${vocabulary.domain} domain’s levels are no lists of tasks with ids`)
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
const blueprintLines = (text) => {
  const lines = text.replace(/\n$/, '').split('\n')
  return /^#\s*blueprint\b/.test(lines[0]) ? lines.slice(1) : lines
}

export const OPERATIONS = {
  'level.set': {
    about: t('设一关的一个字段（路径可以深入）', 'set a field of a level (the path may go deep)'),
    params: S.obj({ level: S.level(), path: PATH, value: S.any() }),
    apply(ws, { level, path, value }, { vocabulary }) {
      if (!parsePath(path).length) fail('the path is empty: use level.replace for the whole level')
      const inverse = [restore('level', levelOf(ws, level), path, { level })]
      setLevel(ws, level, path, value, vocabulary)
      return { says: `${level}: set ${showPath(path)}`, inverse }
    },
  },
  'level.unset': {
    about: t('去掉一关的一个字段，或列表里的一项', 'remove a field of a level, or an item from a list'),
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
    about: t('按 JSON merge patch 改一关的几个字段（null 去掉一个字段）', 'change several fields of a level by a JSON merge patch (null removes a field)'),
    params: S.obj({ level: S.level(), fields: S.map(S.any()) }),
    apply(ws, { level, fields }, { vocabulary }) {
      const base = levelOf(ws, level)
      ws.levels.set(level, mergePatch(base, fields, orderOf(vocabulary.level, base, vocabulary)))
      return { says: `${level}: patched ${Object.keys(fields).join(', ')}`, inverse: [{ op: 'level.replace', level, data: base }] }
    },
  },
  'level.replace': {
    about: t('把一关整个换成新的内容（id 和位置不变）', 'replace a level’s whole content (its id and place stay)'),
    params: S.obj({ level: S.level(), data: S.map(S.any()) }),
    apply(ws, { level, data }) {
      const base = levelOf(ws, level)
      ws.levels.set(level, data)
      return { says: `${level}: replaced`, inverse: [{ op: 'level.replace', level, data: base }] }
    },
  },
  'level.blueprint': {
    about: t('把一关的一块板（参考解、naive 解……）写成蓝图文本', 'write one of a level’s boards (its reference answer, its naive one…) as blueprint text'),
    params: S.obj({ level: S.level(), path: S.opt(PATH), text: S.str({ about: t('蓝图文本（可以带 # blueprint 那一行）', 'the blueprint text (its # blueprint line may stay)') }) }),
    apply(ws, { level, path = 'solution', text }, { vocabulary }) {
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
    about: t('一关新带来的元件（adds）里加上或拿掉几样', 'add parts to or take them from what a level brings in (adds)'),
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
    about: t('加一关：它的内容，和它在课程里的位置', 'add a level: its content, and its place in the course'),
    params: S.obj({ level: NEW_ID, data: S.map(S.any()), to: S.opt(PLACE) }),
    apply(ws, { level, data, to }) {
      if (ws.levels.has(level)) fail(`there is a level ${level} already`)
      ws.levels.set(level, data)
      if (to) ws.game = { ...ws.game, eras: putIn(ws.game.eras, level, to) }
      return { says: `${level}: added${to ? ` at ${describe(ws.game.eras, locate(ws.game.eras, level))}` : ''}`, inverse: [{ op: 'level.remove', level }], placed: to ? [level] : [] }
    },
  },
  'level.remove': {
    about: t('删掉一关：它的文件和它在课程里的位置；别处还提到它时拒绝', 'remove a level: its file and its place in the course; refused while anything else names it'),
    params: S.obj({ level: S.level() }),
    apply(ws, { level }, { vocabulary }) {
      const data = levelOf(ws, level)
      const others = levelRefs(ws, vocabulary, level).filter((r) => r.file !== `levels/${level}.json` && !(r.file === 'game.json' && isOwnPlace(ws.game.eras, r.path, level)))
      if (others.length) fail(`${level} is still named at ${others.map((r) => `${r.file} ${showPath(r.path)}`).join(', ')}`)
      const eras = ws.game.eras
      const { eras: left, was, pruned } = takeOut(eras, level)
      ws.game = { ...ws.game, eras: left }
      ws.levels.delete(level)
      return {
        says: `${level}: removed from ${describe(eras, was)}${pruned.length ? ` (with the ${pruned.join(', ')} it emptied)` : ''}`,
        inverse: [{ op: 'level.add', level, data }, { op: 'game.set', path: ['eras'], value: eras }],
        saves: [{ rename: { [level]: null } }],
      }
    },
  },
  'level.rename': {
    about: t('给一关换 id：文件名和所有提到它的地方一起改', 'give a level a new id: its file and every place naming it'),
    params: S.obj({ level: S.level(), to: NEW_ID }),
    apply(ws, { level, to }, { vocabulary }) {
      if (ws.levels.has(to)) fail(`there is a level ${to} already`)
      const data = levelOf(ws, level)
      ws.levels = new Map([...ws.levels].map(([id, l]) => (id === level ? [to, data] : [id, l])))
      ws.basis.set(`levels/${to}.json`, ws.original.get(`levels/${level}.json`) ?? ws.basis.get(`levels/${level}.json`))
      const n = renameRefs(ws, vocabulary, level, to)
      if (ws.blueprint !== undefined) ws.blueprint = renameSlot(ws.blueprint, level, to)
      return { says: `${level} → ${to} (${n} reference(s))`, inverse: [{ op: 'level.rename', level: to, to: level }], saves: [{ rename: { [level]: to } }] }
    },
  },
  'level.move': {
    about: t('把一关挪到课程里的另一个位置（同一章里、跨章、进出分支和专题）', 'move a level to another place in the course (within an era or across, into or out of branches and topics)'),
    params: S.obj({ level: S.level(), to: PLACE }),
    apply(ws, { level, to }) {
      const eras = ws.game.eras
      const { eras: left, was, pruned } = takeOut(eras, level)
      if (!was) fail(`${level} is in no era`)
      ws.game = { ...ws.game, eras: putIn(left, level, to) }
      return {
        says: `${level}: ${describe(eras, was)} → ${describe(ws.game.eras, locate(ws.game.eras, level))}${pruned.length ? ` (the ${pruned.join(', ')} it emptied went with it)` : ''}`,
        inverse: [{ op: 'game.set', path: ['eras'], value: eras }],
        placed: [level],
      }
    },
  },
  'task.add': {
    about: t('给一关加一个任务：它的字段（id 不给就生成一个），排在 after 那个任务后面（first 时最前，都不给就在最后）', 'add a task to a level: its fields (an id made up when none is given), after the task `after` (first, or else last)'),
    params: S.obj({ level: S.level(), data: S.map(S.any()), after: S.opt(TASK), first: S.opt(S.bool()) }),
    apply(ws, { level, data, after, first }, { vocabulary }) {
      tasked(vocabulary)
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
    about: t('去掉一个任务；一关至少留一个任务（整关不要了用 level.remove）', 'remove a task; a level keeps at least one (level.remove removes the whole level)'),
    params: S.obj({ task: TASK }),
    apply(ws, { task }, { vocabulary }) {
      tasked(vocabulary)
      const { level, at } = taskOf(ws, task)
      const base = levelOf(ws, level)
      if (base.tasks.length === 1) fail(`${task} is ${level}’s only task: remove the level instead`)
      ws.levels.set(level, { ...base, tasks: base.tasks.filter((x) => x.id !== task) })
      return { says: `${level}: task ${task} removed`, inverse: [{ op: 'task.add', level, data: base.tasks[at], ...placeOf(base.tasks, at) }], saves: [{ drop: [task] }], own: [level] }
    },
  },
  'task.move': {
    about: t('把一个任务挪到一关里的另一个位置，或挪进另一关；玩家存下的板和通过与否跟着它走。挪走一关唯一的任务时，同一个变更集里删掉那一关（合成两关）', 'move a task within its level or into another; what players kept of it goes with it. Moving a level’s only task out, remove that level in the same changeset (two levels made one)'),
    params: S.obj({ task: TASK, to: TASK_PLACE }),
    apply(ws, { task, to }, { vocabulary }) {
      tasked(vocabulary)
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
      return { says: `${task}: ${from === to.level ? `moved in ${from}` : `${from} → ${to.level}`} (${k + 1} of ${levelOf(ws, to.level).tasks.length})`, inverse: [back], own: [from, to.level] }
    },
  },
  'task.rename': {
    about: t('给一个任务换 id；玩家存下的东西跟着换', 'give a task a new id; what players kept of it follows'),
    params: S.obj({ task: TASK, to: TASK }),
    apply(ws, { task, to }, { vocabulary }) {
      tasked(vocabulary)
      const { level, at } = taskOf(ws, task)
      if (findTask(levelsOf(ws), to)) fail(`there is a task ${to} already`)
      if (to !== level && ws.levels.has(to)) fail(`${to} is a level’s id`)
      const base = levelOf(ws, level)
      ws.levels.set(level, { ...base, tasks: base.tasks.map((x, k) => (k === at ? { ...x, id: to } : x)) })
      return { says: `${level}: task ${task} → ${to}`, inverse: [{ op: 'task.rename', task: to, to: task }], saves: [{ retask: { [task]: to } }], own: [level] }
    },
  },
  'game.set': {
    about: t('设 game.json 的一个字段（课程、元件、标题……；存档迁移除外）', 'set a field of game.json (the course, parts, titles…; not the save migrations)'),
    params: S.obj({ path: PATH, value: S.any() }),
    apply(ws, { path, value }, { vocabulary }) {
      notSaves(path)
      const inverse = [restore('game', ws.game, path, {})]
      ws.game = setAt(ws.game, path, value, orderOf(vocabulary.game, ws.game, vocabulary))
      return { says: `game.json: set ${showPath(path)}`, inverse }
    },
  },
  'game.unset': {
    about: t('去掉 game.json 的一个字段，或列表里的一项', 'remove a field of game.json, or an item from a list'),
    params: S.obj({ path: PATH }),
    apply(ws, { path }) {
      const keys = parsePath(notSaves(path))
      const back = typeof keys.at(-1) === 'number' ? { op: 'game.set', path: keys.slice(0, -1), value: getAt(ws.game, keys.slice(0, -1)) } : { op: 'game.set', path: keys, value: getAt(ws.game, keys) }
      ws.game = unsetAt(ws.game, keys)
      return { says: `game.json: removed ${showPath(keys)}`, inverse: [back] }
    },
  },
  'text.set': {
    about: t('改一段文字的一面或两面（一关、game.json 或百科里的）', 'change one side or both of a text (in a level, game.json or the encyclopedia)'),
    params: S.obj({ level: S.opt(S.level()), in: S.opt(S.oneOf(['game', 'glossary'])), path: PATH, zh: S.opt(S.str()), en: S.opt(S.str()) }),
    apply(ws, { level, in: where, path, zh, en }, { vocabulary }) {
      if ((level === undefined) === (where === undefined)) fail('name the text’s file: a level, or in: game or glossary')
      if (zh === undefined && en === undefined) fail('give zh, en or both')
      const [value, schema] = level !== undefined ? [levelOf(ws, level), vocabulary.level] : where === 'game' ? [ws.game, vocabulary.game] : [ws.glossary, null]
      const keys = parsePath(path)
      const shape = schema && shapeAt(schema, value, keys, { vocabulary })
      if (schema && shape?.type !== 'text') fail(`${showPath(keys)} is not a text`)
      const old = getAt(value, keys)
      if (old === undefined && where === 'glossary') fail(`glossary.json has no text at ${showPath(keys)}`)
      const pair = typeof old === 'string' ? { zh: old, en: old } : { ...old }
      const next = { zh: zh ?? pair.zh, en: en ?? pair.en }
      const file = level ?? where
      // The glossary has no field operations: its text goes back as a pair (a string reads the same as a pair of it).
      const inverse = [where === 'glossary' ? { op: 'text.set', in: where, path: keys, ...(typeof old === 'string' ? { zh: old, en: old } : old) } : restore(level !== undefined ? 'level' : 'game', value, keys, level !== undefined ? { level } : {})]
      if (level !== undefined) setLevel(ws, level, keys, next, vocabulary)
      else if (where === 'game') ws.game = setAt(ws.game, notSaves(keys), next)
      else ws.glossary = setAt(ws.glossary, keys, next)
      return { says: `${file}: ${showPath(keys)} reads ${[zh !== undefined && 'zh', en !== undefined && 'en'].filter(Boolean).join(' and ')} anew`, inverse }
    },
  },
  'glossary.put': {
    about: t('写一条百科（没有就加上，at 是在列表里的位置）', 'write an encyclopedia entry (added when it is new, at its index in the list)'),
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
    about: t('按 JSON merge patch 改一条百科的几个字段', 'change fields of an encyclopedia entry by a JSON merge patch'),
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
    about: t('删掉一条百科', 'remove an encyclopedia entry'),
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
  'blueprint.put': {
    about: t('写下整份课程蓝图（blueprint.json，第 7.2 节）', 'write the whole course blueprint (blueprint.json, DESIGN 7.2)'),
    params: S.obj({ data: S.map(S.any()) }),
    apply(ws, { data }) {
      const old = ws.blueprint
      ws.blueprint = data
      return { says: `blueprint: ${old === undefined ? 'written' : 'rewritten'}`, inverse: [old === undefined ? { op: 'blueprint.remove' } : { op: 'blueprint.put', data: old }] }
    },
  },
  'blueprint.set': {
    about: t('设课程蓝图的一个字段（路径可以深入：eras[0].series[2].slots[1].uses）', 'set a field of the course blueprint (the path may go deep: eras[0].series[2].slots[1].uses)'),
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
    about: t('去掉课程蓝图的一个字段，或列表里的一项', 'remove a field of the course blueprint, or an item from a list'),
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
    about: t('删掉课程蓝图', 'remove the course blueprint'),
    params: S.obj({}),
    apply(ws) {
      if (ws.blueprint === undefined) fail('the game has no blueprint')
      const old = ws.blueprint
      ws.blueprint = undefined
      return { says: 'blueprint: removed', inverse: [{ op: 'blueprint.put', data: old }] }
    },
  },
}

/** Whether `path` in game.json is the place in the eras that holds `level` (an item, a branch's or topic's entry, a challenge). */
function isOwnPlace(eras, path, level) {
  if (path[0] !== 'eras') return false
  const tail = path.slice(2)
  const at = locate(eras, level)
  if (!at || at.era !== path[1]) return false
  if (at.kind === 'path') return tail.length === 2 && tail[0] === at.path && tail[1] === at.item
  if (at.kind === 'branch') return tail.join('.') === [at.path, at.item, 'parallel', at.branch, 'levels', at.k].join('.')
  if (at.kind === 'topic') return tail.join('.') === ['topics', at.topic, 'levels', at.k].join('.')
  return tail.join('.') === ['challenges', at.k, 'level'].join('.')
}
