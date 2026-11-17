import { mergeFields } from '../collections.js'
import { CHAPTER } from '../course-schema.js'
import { meaningsOf } from '../kind-meanings.js'
import { satisfies, dependencyIds } from '../semver.js'
import { tagKey, tagName } from '../tag-identity.js'
import { KIND_DECLARATION } from '../plugin-kinds.js'
// The operation set (games/DIRECTION.md decision 4): every change to a data game's content is one of these. The CLI
// (cli.js), the MCP server (mcp.js) and later the studio only ever run them, through a changeset (changeset.js).
//
// An operation is { about, params (schema.js: its arguments as data), apply(ws, args, ctx) }. apply edits the
// workspace (workspace.js) and returns { says, inverse }: what it did, in words, and the operations that undo it.
// ctx: { vocabulary, domain }. A level's tasks (../tasks.js) are added, removed, moved (in a level or to another: two
// levels made one, or one split) by stable id. No operation looks after players' saves: while the games are in
// development a save made on other puzzles is not read (../stamp.js).
import { S, shapeAt } from '../schema.js'
import { getAt, parsePath, showPath } from './edit.js'
import { assertStableIds, mergePatch, setAt, unsetAt } from './identity.js'
import { levelRefs } from './refs.js'
import { ENTRY } from '../vocabulary.js'
import { TASK_ID, findTask, newTaskId } from '../tasks.js'
import { T as t } from '../../shell/i18n.js'
import { isLanguageCode, LANGUAGE_CODE, textKey, withTextKey } from '../i18n.js'
import { contentFileFor } from '../content.js'
import { schemaForKind } from '../layers.js'
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
        ? ['optional', 'skippable'].includes(path[0])
        : /^(tags|relations|sections|chapters)\//.test(file))
      const others = references.filter((r) => !placement(r))
      if (others.length) fail(`${level} is still named at ${others.map((r) => `${r.file} ${showPath(r.path)}`).join(', ')}`)
      const inverse = [{ op: 'level.add', level, data }]
      const matches = (id) => id === level || id === `${ws.packageId}/${level}`
      if (references.some((r) => r.file === 'game.json')) {
        for (const field of ['optional', 'skippable']) if (ws.game[field]) {
          const old = ws.game[field]
          const value = old.filter((id) => !matches(id))
          ws.game = { ...ws.game, [field]: value }
          inverse.push({ op: 'game.set', path: [field], value: old })
        }
      }
      for (const [chapter, old] of ws.contentObjects.chapter ?? []) if (old.levels.some(matches)) {
        ws.contentObjects.chapter.set(chapter, { ...old, levels: old.levels.filter(id => !matches(id)), ...(old.rows && { rows: old.rows.map(row => row.map(id => matches(id) ? null : id)) }) })
        inverse.push({ op: 'chapter.put', chapter, data: old })
      }
      for (const [kind, plural] of [['entry', 'entries'], ['tag', 'tags'], ['relation', 'relations'], ['section', 'sections']]) for (const [name, old] of ws[plural]) {
        if (!references.some((r) => r.file === `${plural}/${kind === 'tag' ? `${old.kind}/${tagName(name)}` : name}.json`)) continue
        const next = { ...old }
        if (kind === 'tag') next.values = old.values.filter((id) => !matches(id))
        if (kind === 'relation') {
          if (old.edges) next.edges = old.edges.filter(({ from, to }) => !matches(from) && !matches(to))
        }
        ws[plural].set(name, next)
        inverse.push({ op: `${kind}.put`, [kind]: kind === 'tag' ? tagName(name) : name, ...(kind === 'tag' && { member: old.kind }), data: kind === 'tag' ? Object.fromEntries(Object.entries(old).filter(([key]) => key !== 'kind')) : old })
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
    params: S.obj({ package: S.str({ pattern: '^[a-z][a-z0-9-]*$' }), range: S.str(), at: S.opt(S.int({ min: 0 })) }),
    apply(ws, { package: id, range, at = ws.packageIds.length }) {
      if (ws.packageIds.includes(id)) fail(`package ${id} is already selected`)
      satisfies('1.0.0', range)
      ws.selectPackages(Object.fromEntries([...Object.entries(ws.packageRanges).slice(0, at), [id, range], ...Object.entries(ws.packageRanges).slice(at)]))
      return { says: `game.json: selected package ${id}`, inverse: [{ op: 'game.package.remove', package: id }] }
    },
  },
  'game.package.remove': {
    about: t('游戏去掉一个包；课程还有它的关或别的包依赖它时拒绝', 'Remove a package unless the course uses its levels or another selected package depends on it'),
    params: S.obj({ package: S.str({ pattern: '^[a-z][a-z0-9-]*$' }) }),
    apply(ws, { package: id }) {
      const at = ws.packageIds.indexOf(id)
      if (at < 0) fail(`package ${id} is not selected`)
      const dependents = ws.packageLayers.filter((layer) => dependencyIds(layer.config).includes(id)).map((layer) => layer.id)
      const placed = (ws.content().eras ?? []).flatMap((chapter) => chapter.levels.filter((level) => level.id.startsWith(`${id}/`)).map((level) => `${level.id} (chapter ${chapter.id})`))
      const reasons = [...(placed.length ? [`course still places ${placed.join(', ')}`] : []), ...(dependents.length ? [`selected packages depend on it: ${dependents.join(', ')}`] : [])]
      if (reasons.length) fail(`cannot remove package ${id}: ${reasons.join('; ')}`)
      const range = ws.packageRanges[id]
      ws.selectPackages(Object.fromEntries(Object.entries(ws.packageRanges).filter(([name]) => name !== id)))
      return { says: `game.json: removed package ${id}`, inverse: [{ op: 'game.package.add', package: id, range, at }] }
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
    params: S.obj({ level: S.opt(S.level()), entry: S.opt(S.str()), tag: S.opt(S.str()), member: S.opt(S.str()), section: S.opt(S.str()), in: S.opt(S.str()), path: PATH, lang: S.opt(S.str({ pattern: LANGUAGE_CODE })), value: S.text() }),
    apply(ws, args, { vocabulary }) {
      const { path, lang, value: text } = args
      const target = textTarget(ws, args, vocabulary)
      const { value, schema } = target
      const keys = parsePath(path)
      const shape = shapeAt(schema, value, keys, { vocabulary })
      if (shape?.type !== 'text') fail(`${showPath(keys)} is not a text`)
      const old = getAt(value, keys)
      if (old === undefined && !target.operation) fail(`${target.id}.json has no text at ${showPath(keys)}`)
      if (lang && !isLanguageCode(lang)) fail(`unknown language code ${lang}`)
      if (lang && typeof text !== 'string') fail('editing one language needs one string')
      if (lang && typeof old === 'string') fail('use a text field without a language to edit a shared string')
      const next = lang ? { ...old, [lang]: text } : text
      // Keep the message identity when a whole field is edited or restored by its inverse.
      const key = textKey(next) ?? textKey(old)
      const updated = key && typeof next === 'object' ? withTextKey(next, key) : next
      const inverse = [target.operation ? restore(target.operation, value, keys, target.selector) : { op: 'text.set', ...target.selector, path: keys, value: old }]
      target.set(setAt(value, keys, updated, orderOf(schema, value, vocabulary)))
      const file = target.id
      return { says: `${file}: ${showPath(keys)} reads anew`, inverse }
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
function packageText(ws, args, keys, vocabulary) {
  const { value, schema } = textTarget(ws, args, vocabulary)
  const where = args.in
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
      level: S.opt(S.level()), entry: S.opt(S.str()), tag: S.opt(S.str()), member: S.opt(S.str()), section: S.opt(S.str()), in: S.opt(S.str()), path: PATH,
      lang: S.str({ pattern: LANGUAGE_CODE }), value: S.either(S.str(), S.oneOf([null])),
    }),
    apply(ws, args, { vocabulary }) {
      const { path, lang, value } = args
      const selected = textTarget(ws, args, vocabulary)
      if (!isLanguageCode(lang)) fail(`unknown language code ${lang}`)
      const keys = parsePath(path)
      const key = textKey(packageText(ws, args, keys, vocabulary))
      const target = `overrides/${ws.packageId}/i18n/${lang}.json`
      const old = ws.overrideFiles.get(target)?.[key] ?? null
      const entries = { ...ws.overrideFiles.get(target) }
      if (value === null) delete entries[key]
      else entries[key] = value
      if (Object.keys(entries).length) ws.overrideFiles.set(target, entries)
      else ws.overrideFiles.delete(target)
      return { says: `${selected.id}: ${showPath(keys)} (${lang}) ${value === null ? 'reads as its package writes it' : 'reads the game\'s own way'}`, inverse: [{ op: 'text.override', ...selected.selector, path: keys, lang, value: old }] }
    },
  },
})

/** Which workspace an operation belongs to (games/DESIGN.md 6.7): 'package' (the levels, their groups and encyclopedia) or 'game' (the course and the game's own texts). */
export function opScope({ op, path, in: where, layer, chapter }) {
  if (op.startsWith('game.package.')) return 'game'
  if (op.startsWith('chapter.') || chapter !== undefined) return 'game'
  if (op.startsWith('override.')) return layer?.startsWith('@') ? 'game' : 'package'
  if (/^(tag|relation|section)\./.test(op)) return 'package'
  if ( op === 'text.override' || op.startsWith('blueprint.')) return 'game'
  if (op === 'game.set' || op === 'game.unset' || (op === 'text.set' && where === 'game')) {
    return ['game.json', 'course.json'].includes(contentFileFor(parsePath(path))) ? 'game' : 'package'
  }
  return 'package'
}

// The same operations edit entries, tags, relations and sections. Reads use ws.content().registries[kind][fullName].
function objectOperations(kind, plural, objectKind, vocabulary) {
  const operations = {}
  const objects = (ws) => kind === 'chapter' ? ws.contentObjects.chapter : objectKind ? ws.contentObjects[objectKind] : (kind === 'kind') ? ws.contentObjects[kind] : ws[plural]
  const selector = { [kind]: S.str({ pattern: OBJECT_NAME }), ...(kind === 'tag' && { member: S.str() }) }
  const target = (ws, name, member) => {
    if (name.includes('/') || name.startsWith('@')) fail('declare objects in this package using its local name')
    if (kind === 'tag' && !member) fail('tag needs a member type')
    return kind === 'tag' ? tagKey(member, name) : name
  }
  const get = (ws, name, member) => objects(ws).get(target(ws, name, member)) ?? fail(`no ${kind} ${name}`)
  Object.assign(operations, {
    [`${kind}.put`]: {
      about: t('写入对象', 'Write an object'),
      params: S.obj({ ...selector, data: kind === 'chapter' ? CHAPTER : objectKind ? vocabulary.objectKinds[objectKind].schema : kind === 'entry' ? ENTRY : (kind === 'kind' ? KIND_DECLARATION : null) ?? (kind === 'tag' ? S.obj({ title: S.opt(S.text()), desc: S.opt(S.text()), values: OBJECT_SCHEMAS.tags.fields.values }) : OBJECT_SCHEMAS[plural] ?? S.any()) }),
      apply(ws, args) {
        const name = target(ws, args[kind], args.member), old = objects(ws).get(name)
        if (kind === 'tag' && args.data.kind !== undefined) fail('tag member belongs in the member selector')
        assertStableIds(old ?? {}, args.data)
        objects(ws).set(name, kind === 'tag' ? { ...args.data, kind: args.member } : args.data)
        return { says: `${kind} ${name}: written`, inverse: [old ? { op: `${kind}.put`, [kind]: args[kind], ...(kind === 'tag' && { member: args.member }), data: kind === 'tag' ? Object.fromEntries(Object.entries(old).filter(([key]) => key !== 'kind')) : old } : { op: `${kind}.remove`, [kind]: args[kind], ...(kind === 'tag' && { member: args.member }) }] }
      },
    },
    [`${kind}.set`]: {
      about: t('修改对象字段', 'Set an object field'),
      params: S.obj({ ...selector, path: PATH, value: S.any() }),
      apply(ws, args) {
        const name = target(ws, args[kind], args.member), old = get(ws, args[kind], args.member)
        if (kind === 'tag' && (!parsePath(args.path).length || parsePath(args.path)[0] === 'kind')) fail('tag member type is immutable')
        objects(ws).set(name, setAt(old, args.path, args.value))
        return { says: `${kind} ${name}: patched`, inverse: [{ op: `${kind}.put`, [kind]: args[kind], ...(kind === 'tag' && { member: args.member }), data: kind === 'tag' ? Object.fromEntries(Object.entries(old).filter(([key]) => key !== 'kind')) : old }] }
      },
    },
    [`${kind}.remove`]: {
      about: t('删除对象', 'Remove an object'),
      params: S.obj(selector),
      apply(ws, args) {
        const name = target(ws, args[kind], args.member), old = get(ws, args[kind], args.member)
        objects(ws).delete(name)
        return { says: `${kind} ${name}: removed`, inverse: [{ op: `${kind}.put`, [kind]: args[kind], ...(kind === 'tag' && { member: args.member }), data: kind === 'tag' ? Object.fromEntries(Object.entries(old).filter(([key]) => key !== 'kind')) : old }] }
      },
    },
  })
  return operations
}

for (const [kind, plural] of [['entry', 'entries'], ['tag', 'tags'], ['relation', 'relations'], ['section', 'sections'], ['chapter', 'chapters'], ['kind', 'kinds']]) Object.assign(OPERATIONS, objectOperations(kind, plural))

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
const overrideParams = { layer: S.str(), kind: S.str(), member: S.opt(S.str()), name: S.str({ pattern: '^(?:@?[a-z][a-z0-9-]*)/[A-Za-z0-9][A-Za-z0-9_.-]*$' }) }
const overrideFile = (ws, { layer, kind, name, member }) => {
  if (layer !== ws.layer) fail(`open the package workspace with layer ${layer} before editing it`)
  const [namespace, id] = name.split('/')
  return `${layer.startsWith('@') ? '' : 'package/'}overrides/${namespace}/${kind === 'i18n' ? 'i18n' : kind === 'tag' ? `tags/${member ?? fail('tag override needs a member type')}` : ws.kindFolders[kind] ?? fail(`unknown kind ${kind}`)}/${id}.json`
}
Object.assign(OPERATIONS, {
  'override.put': {
    about: t('在本层覆盖对象或文案', 'Override an object or catalog in this layer'),
    params: S.obj({ ...overrideParams, data: S.opt(S.map(S.any())) }),
    apply(ws, args, { vocabulary }) {
      const file = overrideFile(ws, args)
      const old = ws.overrideFiles.get(file)
      if (args.kind === 'tag' && Object.hasOwn(args.data ?? {}, 'kind')) fail('tag kind belongs in the override path')
      let data = args.data
      if (data === undefined) {
        if (args.kind === 'i18n') data = {}
        else {
          const object = ws.content().registries[args.kind]?.[args.kind === 'tag' ? tagKey(args.member, args.name) : args.name]
          if (!object) fail(`no ${args.kind} ${args.name}`)
          const { id: _id, ...value } = sourceValue(object)
          data = args.kind === 'tag' ? Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'kind')) : value
        }
      }
      if (args.kind !== 'i18n') {
        const object = ws.content().registries[args.kind]?.[args.kind === 'tag' ? tagKey(args.member, args.name) : args.name]
        const { id: _id, ...base } = sourceValue(object ?? {})
        const qualified = expandNames(data, ws.layer, { schema: schemaForKind(args.kind, vocabulary, { ...base, ...data }), vocabulary })
        assertStableIds(base, mergeFields(base, qualified, schemaForKind(args.kind, vocabulary, { ...base, ...qualified })))
      }
      ws.overrideFiles.set(file, data)
      return { says: `${args.layer}: override ${args.kind} ${args.name}`, inverse: [old === undefined ? { op: 'override.remove', layer: args.layer, kind: args.kind, ...(args.member && { member: args.member }), name: args.name } : { op: 'override.put', layer: args.layer, kind: args.kind, ...(args.member && { member: args.member }), name: args.name, data: old }] }
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

// Declared kinds use one operation family instead of generating commands at import time.
for (const action of ['put', 'set', 'remove']) OPERATIONS[`object.${action}`] = {
  about: t('编辑声明的对象', 'Edit a declared object'),
  params: S.obj({ kind: S.str(), name: S.str({ pattern: '^[A-Za-z0-9][A-Za-z0-9_-]*$' }),
    ...(action === 'put' ? { data: S.any() } : action === 'set' ? { path: PATH, value: S.any() } : {}) }),
  apply(ws, { kind, name, data, path, value }) {
    const objects = ws.contentObjects[kind]
    if (!objects) fail(`unknown declared kind ${kind}`)
    const old = objects.get(name)
    if (action !== 'put' && old === undefined) fail(`no ${kind} ${name}`)
    if (action === 'remove') objects.delete(name)
    else { const next = action === 'put' ? data : setAt(old, path, value); assertStableIds(old ?? {}, next); objects.set(name, next) }
    return { says: `${kind} ${name}: ${action}`, inverse: [old === undefined ? { op: 'object.remove', kind, name } : { op: 'object.put', kind, name, data: old }] }
  },
}

function textTarget(ws, args, vocabulary) {
  const mapTarget = (kind, values, schema, name) => args[kind] === undefined ? [] : [{ id: args[kind], value: values.get(name ?? args[kind]) ?? fail(`no ${kind} ${args[kind]}`), schema, selector: { [kind]: args[kind], ...(kind === 'tag' && { member: args.member }) }, set: value => values.set(name ?? args[kind], value) }]
  const choices = [
    ...(args.level === undefined ? [] : [{ id: args.level, value: levelOf(ws, args.level), schema: vocabulary.level, selector: { level: args.level }, operation: 'level', set: value => ws.levels.set(args.level, value) }]),
    ...mapTarget('entry', ws.entries, ENTRY),
    ...mapTarget('chapter', ws.contentObjects.chapter, CHAPTER),
    ...mapTarget('tag', ws.tags, OBJECT_SCHEMAS.tags, tagKey(args.member, args.tag)),
    ...mapTarget('section', ws.sections, OBJECT_SCHEMAS.sections),
    ...(args.in !== 'game' ? [] : [{ id: 'game', value: ws.game, schema: vocabulary.game, selector: { in: 'game' }, operation: 'game', set: value => { ws.game = value } }]),
    ...(args.kind === undefined ? [] : (() => {
      const objects = ws.contentObjects[args.kind]
      const schema = vocabulary.objectKinds?.[args.kind]?.schema
      if (!objects || !schema || args.name === undefined) fail('name a declared kind and object')
      const own = objects.has(args.name)
      const value = own ? objects.get(args.name) : ws.content().registries?.[args.kind]?.[args.name]
      if (!value) fail(`no ${args.kind} ${args.name}`)
      return [{ id: args.name, value, schema, selector: { kind: args.kind, name: args.name }, set: value => {
        if (!own) fail('edit foreign text through an override')
        objects.set(args.name, value)
      } }]
    })()),
    ...meaningsOf(vocabulary).flatMap(meaning => meaning.textTarget?.({ workspace: ws, args, vocabulary }) ?? []),
  ]
  if (choices.length !== 1) fail('name exactly one text target')
  return choices[0]
}

/** Package kind meanings contribute their authoring commands to the active workspace. */
export function operationsFor(vocabulary) {
  const meanings = meaningsOf(vocabulary)
  const extra = Object.assign({}, ...meanings.map(meaning => meaning.operations), ...meanings.filter(meaning => meaning.selector && vocabulary.objectKinds?.[meaning.type]).map(meaning => objectOperations(meaning.selector, undefined, meaning.type, vocabulary)))
  const fields = Object.assign({ chapter: S.opt(S.str()), kind: S.opt(S.str()), name: S.opt(S.str()) }, ...meanings.map(meaning => meaning.textParameters))
  return { ...OPERATIONS, ...extra, ...Object.fromEntries(['text.set', 'text.override'].map(name => [name, { ...OPERATIONS[name], params: { ...OPERATIONS[name].params, fields: { ...OPERATIONS[name].params.fields, ...fields } } }])) }
}
