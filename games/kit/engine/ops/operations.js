import { contentKindSchemas } from '../content-kinds.js'
// The operation set (games/DIRECTION.md decision 4): every change to a data game's content is one of these. The CLI
// (cli.js), the MCP server (mcp.js) and later the studio only ever run them, through a changeset (changeset.js).
//
// An operation is { about, params (schema.js: its arguments as data), apply(ws, args, ctx) }. apply edits the
// workspace (workspace.js) and returns { says, inverse }: what it did, in words, and the operations that undo it.
// ctx: { vocabulary, domain }. A level's tasks (../tasks.js) are added, removed, moved (in a level or to another: two
// levels made one, or one split) by stable id. No operation looks after players' saves: while the games are in
// development a save made on other puzzles is not read (../stamp.js).
import { S, shapeAt } from '../schema.js'
import { parse } from '../../circuit/text.js'
import { getAt, parsePath, showPath } from './edit.js'
import { assertStableIds, mergePatch, setAt, unsetAt } from './identity.js'
import { levelRefs, partRefs } from './refs.js'
import { ENTRY } from '../vocabulary.js'
import { NAME as PART_NAME, PARTS_FILE } from '../parts/schema.js'
import { ITEM_REFERENCE, TASK_ID, findTask, newTaskId } from '../tasks.js'
import { T as t } from '../../shell/i18n.js'
import { isLanguageCode, LANGUAGE_CODE, textKey, withTextKey } from '../i18n.js'
import { contentFileFor } from '../content.js'
import { folders, schemaForKind } from '../layers.js'
import { expandNames } from '../names.js'
import { sourceValue } from '../catalogs.js'
import { OBJECT_NAME, OBJECT_SCHEMAS } from '../objects.js'

const PATH = S.either(S.str(), S.list(S.either(S.str(), S.int({ min: 0 }))), { about: t('字段的路径：tests[0].goal') })
const NEW_ID = S.str({ pattern: '^[A-Za-z0-9][A-Za-z0-9_-]*$', about: t('新的关卡 id（也是文件名）') })
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
/** The game's pieces/<name>.json (one is written the first time it is edited): its pieces, or its built ones alone where its domain defines primitives in code. */
const partsOf = (ws) => {
  if (ws.partDefs === undefined) ws.partDefs = { parts: {} }
  return ws.partDefs
}
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
      assertStableIds(base, data)
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
    params: S.obj({ level: S.level(), add: S.opt(S.list(ITEM_REFERENCE)), remove: S.opt(S.list(ITEM_REFERENCE)) }),
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
    params: S.obj({ level: NEW_ID, data: S.map(S.any()) }),
    apply(ws, { level, data }) {
      if (ws.levels.has(level)) fail(`there is a level ${level} already`)
      ws.levels.set(level, data)
      return { says: `${level}: added`, inverse: [{ op: 'level.remove', level }] }
    },
  },
  'level.remove': {
    about: t('删掉一关：它的文件和它在课程里的位置；别处还提到它时拒绝'),
    params: S.obj({ level: S.level() }),
    apply(ws, { level }, { vocabulary }) {
      const data = levelOf(ws, level)
      const references = levelRefs(ws, vocabulary, level).filter((r) => r.file !== `levels/${level}.json`)
      const placement = ({ file, path, how }) => how === 'field' && (file === 'game.json'
        ? ['chapters', 'optional', 'skippable'].includes(path[0])
        : /^(tags|relations|layouts)\//.test(file))
      const others = references.filter((r) => !placement(r))
      if (others.length) fail(`${level} is still named at ${others.map((r) => `${r.file} ${showPath(r.path)}`).join(', ')}`)
      const inverse = [{ op: 'level.add', level, data }]
      const matches = (id) => id === level || id === `${ws.packageId}/${level}`
      if (references.some((r) => r.file === 'game.json')) {
        for (const field of ['chapters', 'optional', 'skippable']) if (ws.game[field]) {
          const old = ws.game[field]
          const value = field === 'chapters' ? old.map((chapter) => ({ ...chapter, levels: chapter.levels.filter((id) => !matches(id)) })) : old.filter((id) => !matches(id))
          ws.game = { ...ws.game, [field]: value }
          inverse.push({ op: 'game.set', path: [field], value: old })
        }
      }
      for (const [kind, plural] of [['entry', 'entries'], ['tag', 'tags'], ['relation', 'relations'], ['layout', 'layouts']]) for (const [name, old] of ws[plural]) {
        if (!references.some((r) => r.file === `${plural}/${name}.json`)) continue
        const next = { ...old }
        if (kind === 'tag') next.values = old.values.filter((id) => !matches(id))
        if (kind === 'relation') {
          if (old.edges) next.edges = old.edges.filter(({ from, to }) => !matches(from) && !matches(to))
          if (old.sequence) next.sequence = old.sequence.filter((id) => !matches(id))
        }
        if (kind === 'layout') next.rows = old.rows.map((row) => row.map((id) => matches(id) ? null : id)).filter((row) => row.some((id) => id !== null))
        ws[plural].set(name, next)
        inverse.push({ op: `${kind}.put`, [kind]: name, data: old })
      }
      ws.levels.delete(level)
      return { says: `${level}: removed`, inverse }
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
  'game.package.add': {
    about: t('游戏选用一个包（须先选全它的依赖）', 'Select a package for the game; select its dependencies first'),
    params: S.obj({ package: S.str({ pattern: '^[a-z][a-z0-9-]*$' }), at: S.opt(S.int({ min: 0 })) }),
    apply(ws, { package: id, at = ws.packageIds.length }) {
      if (ws.packageIds.includes(id)) fail(`package ${id} is already selected`)
      ws.selectPackages([...ws.packageIds.slice(0, at), id, ...ws.packageIds.slice(at)])
      return { says: `game.json: selected package ${id}`, inverse: [{ op: 'game.package.remove', package: id }] }
    },
  },
  'game.package.remove': {
    about: t('游戏去掉一个包；课程还有它的关或别的包依赖它时拒绝', 'Remove a package unless the course uses its levels or another selected package depends on it'),
    params: S.obj({ package: S.str({ pattern: '^[a-z][a-z0-9-]*$' }) }),
    apply(ws, { package: id }) {
      const at = ws.packageIds.indexOf(id)
      if (at < 0) fail(`package ${id} is not selected`)
      const dependents = ws.packageLayers.filter((layer) => layer.config.uses?.includes(id)).map((layer) => layer.id)
      const placed = (ws.content().eras ?? []).flatMap((chapter) => chapter.levels.filter((level) => level.id.startsWith(`${id}/`)).map((level) => `${level.id} (chapter ${chapter.id})`))
      const reasons = [...(placed.length ? [`course still places ${placed.join(', ')}`] : []), ...(dependents.length ? [`selected packages depend on it: ${dependents.join(', ')}`] : [])]
      if (reasons.length) fail(`cannot remove package ${id}: ${reasons.join('; ')}`)
      ws.selectPackages(ws.packageIds.filter((name) => name !== id))
      return { says: `game.json: removed package ${id}`, inverse: [{ op: 'game.package.add', package: id, at }] }
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
    params: S.obj({ level: S.opt(S.level()), entry: S.opt(S.str()), tag: S.opt(S.str()), in: S.opt(S.oneOf(['game', 'pieces'])), path: PATH, lang: S.opt(S.str({ pattern: LANGUAGE_CODE })), value: S.text() }),
    apply(ws, { level, entry, tag, in: where, path, lang, value: text }, { vocabulary }) {
      if ([level, entry, tag, where].filter((x) => x !== undefined).length !== 1) fail('name the text target: level, entry, tag, or in: game or pieces')
      if (where === 'pieces' && ws.partDefs === undefined) fail('the content has no pieces')
      const [value, schema] = level !== undefined ? [levelOf(ws, level), vocabulary.level] : entry !== undefined ? [ws.entries.get(entry) ?? fail(`no entry ${entry}`), ENTRY] : tag !== undefined ? [ws.tags.get(tag) ?? fail(`no tag ${tag}`), OBJECT_SCHEMAS.tags] : where === 'pieces' ? [ws.partDefs, PARTS_FILE] : [ws.game, vocabulary.game]
      const keys = parsePath(path)
      const shape = shapeAt(schema, value, keys, { vocabulary })
      if (shape?.type !== 'text') fail(`${showPath(keys)} is not a text`)
      const old = getAt(value, keys)
      if (old === undefined && (entry !== undefined || tag !== undefined || where === 'pieces')) fail(`${where}.json has no text at ${showPath(keys)}`)
      if (lang && !isLanguageCode(lang)) fail(`unknown language code ${lang}`)
      if (lang && typeof text !== 'string') fail('editing one language needs one string')
      if (lang && typeof old === 'string') fail('use a text field without a language to edit a shared string')
      const next = lang ? { ...old, [lang]: text } : text
      // Keep the message identity when a whole field is edited or restored by its inverse.
      const key = textKey(next) ?? textKey(old)
      const updated = key && typeof next === 'object' ? withTextKey(next, key) : next
      const target = { ...(level !== undefined && { level }), ...(entry !== undefined && { entry }), ...(tag !== undefined && { tag }), ...(where !== undefined && { in: where }) }
      const file = level ?? entry ?? tag ?? where
      // Restoring the complete message also removes a locale that this edit added.
      const inverse = [entry !== undefined || tag !== undefined || where === 'pieces' ? { op: 'text.set', ...target, path: keys, value: old } : restore(level !== undefined ? 'level' : 'game', value, keys, level !== undefined ? { level } : {})]
      if (level !== undefined) setLevel(ws, level, keys, updated, vocabulary)
      else if (where === 'game') ws.game = setAt(ws.game, keys, updated)
      else if (where === 'pieces') ws.partDefs = setAt(ws.partDefs, keys, updated, orderOf(PARTS_FILE, ws.partDefs, vocabulary))
      else if (entry !== undefined) ws.entries.set(entry, setAt(value, keys, updated))
      else if (tag !== undefined) ws.tags.set(tag, setAt(value, keys, updated))
      return { says: `${file}: ${showPath(keys)} reads anew`, inverse }
    },
  },
  'piece.add': {
    about: t('加一个件，写入 pieces/<件>.json', 'Add a piece in pieces/<piece>.json'),
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
    about: t('删除没有被课程、关卡、板或文字引用的件', 'Delete a piece with no course, level, board or text references'),
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
  'pieces.set': {
    about: t('修改件的字段，路径为 parts.<件>.<字段>', 'Edit a piece field at parts.<piece>.<field>'),
    params: S.obj({ path: PATH, value: S.any() }),
    apply(ws, { path, value }, { vocabulary }) {
      partsOf(ws)
      const keys = parsePath(path)
      if (!keys.length || keys[0] !== 'parts') fail('use piece.add/remove to manage objects; settings belong to a piece')
      if (keys.length < 3 && keys[0] === 'parts') fail('a whole piece is added with piece.add; id cannot change: create a new object, then delete the old one')
      // A first face can be written independently even before the part has a views object.
      const parent = keys.slice(0, -1)
      if (keys.length === 4 && keys[0] === 'parts' && keys[2] === 'views' && getAt(ws.partDefs, parent) === undefined) {
        const inverse = [restore('pieces', ws.partDefs, parent, {})]
        ws.partDefs = setAt(ws.partDefs, parent, { [keys[3]]: value }, orderOf(PARTS_FILE, ws.partDefs, vocabulary))
        return { says: `pieces: set ${showPath(keys)}`, inverse }
      }
      const inverse = [restore('pieces', ws.partDefs, keys, {})]
      ws.partDefs = setAt(ws.partDefs, keys, value, orderOf(PARTS_FILE, ws.partDefs, vocabulary))
      return { says: `pieces: set ${showPath(keys)}`, inverse }
    },
  },
  'pieces.unset': {
    about: t('去掉件的一个字段或列表项', 'Remove a piece field or list item'),
    params: S.obj({ path: PATH }),
    apply(ws, { path }, { vocabulary }) {
      partsOf(ws)
      const keys = parsePath(path)
      if (!keys.length || keys[0] !== 'parts') fail('settings belong to a piece')
      if (keys.length < 3) fail('a whole piece is removed with piece.remove')
      const back = typeof keys.at(-1) === 'number' ? { op: 'pieces.set', path: keys.slice(0, -1), value: getAt(ws.partDefs, keys.slice(0, -1)) } : { op: 'pieces.set', path: keys, value: getAt(ws.partDefs, keys) }
      ws.partDefs = unsetAt(ws.partDefs, keys)
      return { says: `pieces: removed ${showPath(keys)}`, inverse: [back] }
    },
  },
  'blueprint.put': {
    about: t('写下整份课程蓝图（blueprint.json，第 7.2 节）'),
    params: S.obj({ data: S.map(S.any()) }),
    apply(ws, { data }) {
      const old = ws.blueprint
      assertStableIds(old, data)
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

/** The text at `path` of a package file, as the package writes it (the game's own texts left out). */
function packageText(ws, { level, entry, tag, in: where }, keys, vocabulary) {
  const [value, schema] = level !== undefined ? [levelOf(ws, level), vocabulary.level] : entry !== undefined ? [ws.entries.get(entry) ?? fail(`no entry ${entry}`), ENTRY] : tag !== undefined ? [ws.tags.get(tag) ?? fail(`no tag ${tag}`), OBJECT_SCHEMAS.tags] : where === 'pieces' ? [ws.partDefs, PARTS_FILE] : [ws.game, vocabulary.game]
  if (where === 'game' && ['game.json', 'course.json'].includes(contentFileFor(keys))) fail(`${showPath(keys)} is the game's own text: edit it with text.set`)
  if (shapeAt(schema, value, keys, { vocabulary })?.type !== 'text') fail(`${showPath(keys)} is not a text`)
  const text = getAt(value, keys)
  if (!textKey(text)) fail(`${showPath(keys)} is a text in no language: the game has nothing to put over it`)
  return text
}

Object.assign(OPERATIONS, {
  'text.override': {
    about: t('这款游戏在包的一处文案上写它自己的（不改包里的原文）；value 为 null 时恢复原文', 'The game\'s own wording over a text of its package (the package is left as it is); value null: back to the package\'s'),
    params: S.obj({
      level: S.opt(S.level()), entry: S.opt(S.str()), tag: S.opt(S.str()), in: S.opt(S.oneOf(['game', 'pieces'])), path: PATH,
      lang: S.str({ pattern: LANGUAGE_CODE }), value: S.either(S.str(), S.oneOf([null])),
    }),
    apply(ws, { level, entry, tag, in: where, path, lang, value }, { vocabulary }) {
      if ([level, entry, tag, where].filter((x) => x !== undefined).length !== 1) fail('name the text target: level, entry, tag, or in: game or pieces')
      if (!isLanguageCode(lang)) fail(`unknown language code ${lang}`)
      const keys = parsePath(path)
      const key = textKey(packageText(ws, { level, entry, tag, in: where }, keys, vocabulary))
      const target = `overrides/${ws.packageId}/i18n/${lang}.json`
      const old = ws.overrideFiles.get(target)?.[key] ?? null
      const entries = { ...ws.overrideFiles.get(target) }
      if (value === null) delete entries[key]
      else entries[key] = value
      if (Object.keys(entries).length) ws.overrideFiles.set(target, entries)
      else ws.overrideFiles.delete(target)
      const file = { ...(level !== undefined && { level }), ...(entry !== undefined && { entry }), ...(tag !== undefined && { tag }), ...(where !== undefined && { in: where }) }
      return { says: `${level ?? where}: ${showPath(keys)} (${lang}) ${value === null ? 'reads as its package writes it' : 'reads the game\'s own way'}`, inverse: [{ op: 'text.override', ...file, path: keys, lang, value: old }] }
    },
  },
})

/** Which workspace an operation belongs to (games/DESIGN.md 6.7): 'package' (the levels, their groups, pieces and encyclopedia) or 'game' (the course and the game's own texts). */
export function opScope({ op, path, in: where, layer }) {
  if (op.startsWith('game.package.')) return 'game'
  if (op.startsWith('override.')) return layer?.startsWith('@') ? 'game' : 'package'
  if (/^(tag|relation|layout)\./.test(op)) return 'package'
  if ( op === 'text.override' || op.startsWith('blueprint.')) return 'game'
  if (op === 'game.set' || op === 'game.unset' || (op === 'text.set' && where === 'game')) {
    return ['game.json', 'course.json'].includes(contentFileFor(parsePath(path))) ? 'game' : 'package'
  }
  return 'package'
}

// The same operations edit entries, tags, relations and layouts. Reads use ws.content().registries[kind][fullName].
for (const [kind, plural] of [['entry', 'entries'], ['tag', 'tags'], ['relation', 'relations'], ['layout', 'layouts'], ...Object.keys(contentKindSchemas).map(kind => [kind, kind])]) {
  const objects = (ws) => contentKindSchemas[kind] ? ws.contentObjects[kind] : ws[plural]
  const selector = { [kind]: S.str({ pattern: OBJECT_NAME }) }
  const target = (ws, name) => {
    if (name.includes('/') || name.startsWith('@')) fail('declare objects in this package using its local name')
    return name
  }
  const get = (ws, name) => objects(ws).get(target(ws, name)) ?? fail(`no ${kind} ${name}`)
  Object.assign(OPERATIONS, {
    [`${kind}.put`]: {
      about: t('写入对象', 'Write an object'),
      params: S.obj({ ...selector, data: kind === 'entry' ? ENTRY : contentKindSchemas[kind] ?? OBJECT_SCHEMAS[plural] }),
      apply(ws, args) {
        const name = target(ws, args[kind]), old = objects(ws).get(name)
        assertStableIds(old ?? {}, args.data)
        objects(ws).set(name, args.data)
        return { says: `${kind} ${name}: written`, inverse: [old ? { op: `${kind}.put`, [kind]: name, data: old } : { op: `${kind}.remove`, [kind]: name }] }
      },
    },
    [`${kind}.set`]: {
      about: t('修改对象字段', 'Set an object field'),
      params: S.obj({ ...selector, path: PATH, value: S.any() }),
      apply(ws, args) {
        const name = args[kind], old = get(ws, name)
        objects(ws).set(name, setAt(old, args.path, args.value))
        return { says: `${kind} ${name}: patched`, inverse: [{ op: `${kind}.put`, [kind]: name, data: old }] }
      },
    },
    [`${kind}.remove`]: {
      about: t('删除对象', 'Remove an object'),
      params: S.obj(selector),
      apply(ws, args) {
        const name = args[kind], old = get(ws, name)
        objects(ws).delete(name)
        return { says: `${kind} ${name}: removed`, inverse: [{ op: `${kind}.put`, [kind]: name, data: old }] }
      },
    },
  })
}


OPERATIONS['entry.patch'] = {
  about: t('修改对象字段', 'Set an object field'),
  params: S.obj({ entry: S.str({ pattern: OBJECT_NAME }), fields: S.map(S.any()) }),
  apply(ws, { entry, fields }) {
    const old = ws.entries.get(entry) ?? fail(`no entry ${entry}`)
    ws.entries.set(entry, mergePatch(old, fields))
    return { says: `entry ${entry}: patched`, inverse: [{ op: 'entry.put', entry, data: old }] }
  },
}

/** Overrides always write to the named authoring layer, never to the declaration. */
const overrideParams = { layer: S.str(), kind: S.oneOf([...Object.keys(folders), 'i18n']), name: S.str({ pattern: '^(?:@?[a-z][a-z0-9-]*)/[A-Za-z0-9][A-Za-z0-9_.-]*$' }) }
const overrideFile = (ws, { layer, kind, name }) => {
  if (layer !== ws.layer) fail(`open the package workspace with layer ${layer} before editing it`)
  const [namespace, id] = name.split('/')
  return `${layer.startsWith('@') ? '' : 'package/'}overrides/${namespace}/${kind === 'i18n' ? 'i18n' : kind === 'tag' ? `tag/${ws.content().registries.tag[name]?.kind ?? fail(`no tag ${name}`)}` : kind === 'piece' ? 'piece' : folders[kind]}/${id}.json`
}
Object.assign(OPERATIONS, {
  'override.put': {
    about: t('在本层覆盖对象或文案', 'Override an object or catalog in this layer'),
    params: S.obj({ ...overrideParams, data: S.opt(S.map(S.any())), merge: S.opt(S.bool()) }),
    apply(ws, args, { vocabulary }) {
      const file = overrideFile(ws, args)
      const old = ws.overrideFiles.get(file)
      if (args.kind === 'tag' && Object.hasOwn(args.data ?? {}, 'kind')) fail('tag kind belongs in the override path')
      let data = args.data
      if (data === undefined) {
        if (args.kind === 'i18n') data = {}
        else {
          const object = ws.content().registries[args.kind]?.[args.name]
          if (!object) fail(`no ${args.kind} ${args.name}`)
          const { id: _id, ...value } = sourceValue(object)
          data = args.merge ? {} : args.kind === 'tag' ? Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'kind')) : value
        }
      }
      if (args.kind !== 'i18n') {
        const object = ws.content().registries[args.kind]?.[args.name]
        const { id: _id, ...base } = sourceValue(object ?? {})
        const qualified = expandNames(data, ws.layer, { schema: schemaForKind(args.kind, vocabulary), vocabulary })
        assertStableIds(base, args.merge || data?.$merge ? mergePatch(base, qualified) : qualified)
      }
      ws.overrideFiles.set(file, { ...(args.merge && { $merge: true }), ...data })
      return { says: `${args.layer}: override ${args.kind} ${args.name}`, inverse: [old === undefined ? { op: 'override.remove', layer: args.layer, kind: args.kind, name: args.name } : { op: 'override.put', layer: args.layer, kind: args.kind, name: args.name, data: old }] }
    },
  },
  'override.remove': {
    about: t('删除本层的覆盖文件', 'Remove this layer’s override file'),
    params: S.obj(overrideParams),
    apply(ws, args) {
      const file = overrideFile(ws, args), old = ws.overrideFiles.get(file)
      if (old === undefined) fail(`no override ${args.name} in ${args.layer}`)
      ws.overrideFiles.delete(file)
      return { says: `${args.layer}: remove override ${args.name}`, inverse: [{ op: 'override.put', ...args, data: old }] }
    },
  },
})
