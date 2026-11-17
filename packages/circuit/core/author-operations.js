import { S, shapeAt, T as t, getAt, parsePath, showPath, setAt, unsetAt } from 'kernel'
import { NAME as PART_NAME, PARTS_FILE } from './parts/schema.js'
import { ITEM_REFERENCE } from './task-fields.js'
import { parse } from './board/text.js'
import { partRefs } from './author-references.js'
const PATH = S.either(S.str(), S.list(S.either(S.str(), S.int({ min: 0 }))))
const fail = message => { throw new Error(message) }
const levelOf = (ws, id) => ws.levels.get(id) ?? fail(`no level ${id}`)
const orderOf = (schema, value, vocabulary) => path => {
  const shape = shapeAt(schema, value, path, { vocabulary })
  return shape?.type === 'obj' ? Object.keys(shape.fields) : null
}
const setLevel = (ws, id, path, value, vocabulary) => ws.levels.set(id, setAt(levelOf(ws, id), path, value, orderOf(vocabulary.level, levelOf(ws, id), vocabulary)))
const restore = (op, base, path, args) => {
  const keys = parsePath(path), value = getAt(base, keys)
  return value === undefined ? { op: `${op}.unset`, ...args, path: keys } : { op: `${op}.set`, ...args, path: keys, value }
}
const partsOf = ws => (ws.partDefs ??= { parts: {} })
const blueprintLines = text => {
  const lines = text.replace(/\n$/, '').split('\n')
  return /^#\s*blueprint\b/.test(lines[0]) ? lines.slice(1) : lines
}
export const circuitOperations = {
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
'part.add': {
    about: t('加一个件，写入 parts/<件>.json', 'Add a part in parts/<part>.json'),
    params: S.obj({ part: PART_NAME, data: S.map(S.any()), after: S.opt(PART_NAME) }),
    apply(ws, { part: part, data, after }, { vocabulary }) {
      partsOf(ws)
      if (ws.partDefs.parts[part]) fail(`there is a part ${part} already`)
      const entries = Object.entries(ws.partDefs.parts)
      const k = after === undefined ? entries.length : entries.findIndex(([type]) => type === after) + 1
      if (after !== undefined && k === 0) fail(`no part ${after}`)
      ws.partDefs = { ...ws.partDefs, parts: Object.fromEntries([...entries.slice(0, k), [part, data], ...entries.slice(k)]) }
      return { says: `parts: added ${part}`, inverse: [{ op: 'part.remove', part: part }] }
    },
  },
'part.remove': {
    about: t('删除没有被课程、关卡、板或文字引用的件', 'Delete a part with no course, level, board or text references'),
    params: S.obj({ part: PART_NAME }),
    apply(ws, { part: part }, { vocabulary }) {
      partsOf(ws)
      const entries = Object.entries(ws.partDefs.parts)
      const k = entries.findIndex(([type]) => type === part)
      if (k < 0) fail(`no part ${part}`)
      const named = partRefs(ws, vocabulary, part)
      if (named.length) fail(`${part} is still named at ${named.slice(0, 8).map((r) => `${r.file} ${showPath(r.path)}`).join(', ')}${named.length > 8 ? ` and ${named.length - 8} more` : ''}`)
      ws.partDefs = { ...ws.partDefs, parts: Object.fromEntries(entries.filter(([type]) => type !== part)) }
      return { says: `parts: removed ${part}`, inverse: [{ op: 'part.add', part: part, data: entries[k][1], ...(k > 0 ? { after: entries[k - 1][0] } : {}) }] }
    },
  },
'parts.set': {
    about: t('修改件的字段，路径为 parts.<件>.<字段>', 'Edit a part field at parts.<part>.<field>'),
    params: S.obj({ path: PATH, value: S.any() }),
    apply(ws, { path, value }, { vocabulary }) {
      partsOf(ws)
      const keys = parsePath(path)
      if (!keys.length || keys[0] !== 'parts') fail('use part.add/remove to manage objects; settings belong to a part')
      if (keys.length < 3 && keys[0] === 'parts') fail('a whole part is added with part.add; id cannot change: create a new object, then delete the old one')
      // A first face can be written independently even before the part has a views object.
      const parent = keys.slice(0, -1)
      if (keys.length === 4 && keys[0] === 'parts' && keys[2] === 'views' && getAt(ws.partDefs, parent) === undefined) {
        const inverse = [restore('parts', ws.partDefs, parent, {})]
        ws.partDefs = setAt(ws.partDefs, parent, { [keys[3]]: value }, orderOf(PARTS_FILE, ws.partDefs, vocabulary))
        return { says: `parts: set ${showPath(keys)}`, inverse }
      }
      const inverse = [restore('parts', ws.partDefs, keys, {})]
      ws.partDefs = setAt(ws.partDefs, keys, value, orderOf(PARTS_FILE, ws.partDefs, vocabulary))
      return { says: `parts: set ${showPath(keys)}`, inverse }
    },
  },
'parts.unset': {
    about: t('去掉件的一个字段或列表项', 'Remove a part field or list item'),
    params: S.obj({ path: PATH }),
    apply(ws, { path }, { vocabulary }) {
      partsOf(ws)
      const keys = parsePath(path)
      if (!keys.length || keys[0] !== 'parts') fail('settings belong to a part')
      if (keys.length < 3) fail('a whole part is removed with part.remove')
      const back = typeof keys.at(-1) === 'number' ? { op: 'parts.set', path: keys.slice(0, -1), value: getAt(ws.partDefs, keys.slice(0, -1)) } : { op: 'parts.set', path: keys, value: getAt(ws.partDefs, keys) }
      ws.partDefs = unsetAt(ws.partDefs, keys)
      return { says: `parts: removed ${showPath(keys)}`, inverse: [back] }
    },
  }
}
