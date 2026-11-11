// The studio's forms (games/DESIGN.md 6.7), from the schemas alone: a value and its schema (../engine/schema.js) read
// as a tree of fields, each the kind of control that edits it; and an edit of a field as the operation that makes it
// (../engine/ops/operations.js). Nothing here knows a domain: what a field is, what it may hold and what it means
// (`about`) all come from the vocabulary; where the shape alone does not say how a value reads, the schema's hints do
// (`view`, `step`, `section`).
//
// A field: { path, kind, value, about?, optional?, … } by kind:
//   text      { zh, en } (a string reads as both sides)
//   num       min?, max?, step, int                       a slider too when both ends are known
//   bool, str (pattern?), any (JSON), board (blueprint lines)
//   expr      a part's expression (view: 'expr', ../engine/parts/expr.js)     icon   a name of the kernel's icon table
//   choice    options: [{ value, about? }], of?       oneOf; ref (the items of a vocabulary kind); level (the game's levels)
//   call      item, options (the kind's items), params: field | null       { item: params } or 'item'
//   list      items: [field], of (the items' schema), tests (the list is a level's tests: section 'tests')
//   map       entries: [{ key, field }], of
//   obj       fields: [{ key, field | null (an optional field not there), optional, about?, schema }]
//   grid      cell (the numbers' schema), cols: null (rows of numbers), or a flat list's width ('square': √length)
//   ticks     cell (one tick's schema), bits (a string of 0s and 1s)              view: 'ticks', or a list of 0 / 1
//   wave      cell: a map of tick lists, one row each                              a map with view: 'ticks'
//   numbers   cell: a list of numbers, in one row
//   chips     options, of: a list of choices (several items of a kind, several levels)
//   table     columns: [{ key, schema, optional }] | null (a map's keys, from the rows), keyed (a map of scalars: a key
//             column and a value column)
// A field of a by (one shape a field names: a level by its kind) has `tags`: [{ key, value, options, cases }], the outer
// by first when bys nest (a level by its mode, then by its world); a field of an either (several shapes) has `shapes`
// (their schemas) and `shape` (the one it has now).
import { SECTIONS, callOf, find, sectionOf, validate } from '../engine/schema.js'
import { parsePath, showPath } from '../engine/ops/edit.js'
import { PARTS_FILE } from '../engine/parts/schema.js'
import { newTaskId } from '../engine/tasks.js'

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const fits = (schema, value, vocabulary) => validate(schema, value, { vocabulary }).length === 0
const NUM = ['num', 'int']
const SCALAR = ['num', 'int', 'str', 'bool', 'oneOf', 'ref', 'level']
const isBit = (s) => s.type === 'oneOf' && s.values.length === 2 && s.values.includes(0) && s.values.includes(1)
/** A value a cell holds: a scalar, or one of an either of scalars (a number, or null for 「—」). */
const isCell = (s) => SCALAR.includes(s.type) || s.type === 'any' || (s.type === 'either' && s.of.every((x) => SCALAR.includes(x.type)))
/** A row of a table: an object of scalar fields, or a map of scalars. */
const isRecord = (s) => (s.type === 'obj' && Object.values(s.fields).every((f) => SCALAR.includes(f.type))) || (s.type === 'map' && SCALAR.includes(s.of.type))

/** The items of a vocabulary kind as choices. */
const itemsOf = (vocabulary, kind) => Object.entries(vocabulary?.kinds[kind] ?? {}).map(([value, it]) => ({ value, about: it.about, ...(it.params && { params: it.params }) }))

/** The choices a schema offers (oneOf, ref, level), or null. */
function choicesOf(schema, ctx) {
  if (schema.type === 'oneOf') return { options: schema.values.map((v) => ({ value: v })) }
  if (schema.type === 'ref') return { options: itemsOf(ctx.vocabulary, schema.kind), of: schema.kind }
  if (schema.type === 'level') return { options: (ctx.levels ?? []).map((id) => ({ value: id })), of: 'level' }
  return null
}

/**
 * The shape of `value` where `schema` allows several (either): the one it fits, else the first of its kind (an object
 * for an object, a list for a list, a string for a string). Returns { schema, at } (at: the shape's index).
 */
export function shapeOf(schema, value, vocabulary) {
  const at = schema.of.findIndex((s) => fits(s, value, vocabulary))
  if (at >= 0) return { schema: schema.of[at], at }
  const kind = (s) => (['obj', 'by', 'map'].includes(s.type) ? 'object' : s.type === 'list' || s.type === 'board' ? 'list' : ['str', 'syntax', 'name', 'text', 'ref', 'level', 'oneOf', 'call'].includes(s.type) ? 'string' : s.type)
  const mine = isObj(value) ? 'object' : Array.isArray(value) ? 'list' : typeof value === 'string' ? 'string' : null
  const k = Math.max(0, schema.of.findIndex((s) => kind(s) === mine || (mine === 'object' && s.type === 'text')))
  return { schema: schema.of[k], at: k }
}

/** The control a list (or a map, a string) takes, from its shape and hints: { kind, …what it needs } or null. */
function listControl(schema, ctx) {
  const of = schema.of
  if (schema.type === 'str') return schema.view === 'ticks' ? { kind: 'ticks', cell: { type: 'oneOf', values: [0, 1] }, bits: true } : null
  if (schema.type === 'map') {
    if (schema.view === 'ticks' && of.type === 'list') return { kind: 'wave', cell: of.of }
    // A map of expressions or icons keeps each value's own control.
    if (SCALAR.includes(of.type) && !of.view) return { kind: 'table', keyed: true, columns: [{ key: 'value', schema: of }] }
    return null
  }
  if (schema.view === 'grid' && of.type === 'list' && NUM.includes(of.of.type)) return { kind: 'grid', cell: of.of, cols: null }
  if (schema.view === 'grid' && NUM.includes(of.type)) return { kind: 'grid', cell: of, cols: schema.cols ?? 'square' }
  if ((schema.view === 'ticks' && isCell(of)) || isBit(of)) return { kind: 'ticks', cell: of, bits: false }
  if (NUM.includes(of.type)) return { kind: 'numbers', cell: of }
  if (['oneOf', 'ref', 'level'].includes(of.type)) return { kind: 'chips', ...choicesOf(of, ctx) }
  if (isRecord(of)) return { kind: 'table', keyed: false, columns: of.type === 'obj' ? Object.entries(of.fields).map(([key, s]) => ({ key, schema: s, optional: Boolean(s.optional) })) : null, cell: of.type === 'map' ? of.of : null }
  return null
}

/** The field tree of `value` under `schema`. ctx: { vocabulary, levels (the game's level ids) }; path: where it is. */
export function formOf(schema, value, ctx, path = []) {
  const { vocabulary } = ctx
  const base = { path, value, ...(schema.about && { about: schema.about }), ...(schema.optional && { optional: true }) }
  switch (schema.type) {
    case 'text':
      return { ...base, kind: 'text' }
    case 'num':
    case 'int':
      return { ...base, kind: 'num', int: schema.type === 'int', step: schema.step ?? 1, ...(schema.min !== undefined && { min: schema.min }), ...(schema.max !== undefined && { max: schema.max }) }
    case 'bool':
    case 'any':
    case 'board':
      return { ...base, kind: schema.type }
    case 'syntax':
    case 'name':
      return { ...base, kind: 'str' }
    case 'str':
      if (schema.view === 'expr' || schema.view === 'icon') return { ...base, kind: schema.view }
      return listControl(schema, ctx) ? { ...base, ...listControl(schema, ctx) } : { ...base, kind: 'str', ...(schema.pattern && { pattern: schema.pattern }) }
    case 'oneOf':
    case 'ref':
    case 'level':
      return { ...base, kind: 'choice', ...choicesOf(schema, ctx) }
    case 'call': {
      const [item, params] = value === undefined ? [null, {}] : callOf(value)
      const spec = vocabulary?.kinds[schema.kind]?.[item]?.params
      return { ...base, kind: 'call', of: schema.kind, item, options: itemsOf(vocabulary, schema.kind), params: spec ? formOf(spec, params, ctx, [...path, item]) : null }
    }
    case 'list': {
      const control = listControl(schema, ctx)
      if (control) return { ...base, ...control }
      return { ...base, kind: 'list', of: schema.of, ...(schema.section === 'tests' && { tests: true }), items: (Array.isArray(value) ? value : []).map((x, k) => formOf(schema.of, x, ctx, [...path, k])) }
    }
    case 'map': {
      const control = listControl(schema, ctx)
      if (control) return { ...base, ...control }
      return { ...base, kind: 'map', of: schema.of, entries: Object.entries(isObj(value) ? value : {}).map(([key, x]) => ({ key, field: formOf(schema.of, x, ctx, [...path, key]) })) }
    }
    case 'obj':
      return {
        ...base,
        kind: 'obj',
        fields: Object.entries(schema.fields).map(([key, s]) => ({
          key, optional: Boolean(s.optional), ...(s.about && { about: s.about }), schema: s,
          field: isObj(value) && value[key] !== undefined ? formOf(s, value[key], ctx, [...path, key]) : null,
        })),
      }
    case 'by': {
      const tag = isObj(value) ? value[schema.field] : undefined
      const shape = schema.cases[tag]
      const field = shape ? formOf(shape, value, ctx, path) : { ...base, kind: 'obj', fields: [] }
      return { ...field, ...base, tags: [{ key: schema.field, value: tag, options: Object.keys(schema.cases).map((v) => ({ value: v })), cases: schema.cases }, ...(field.tags ?? [])] }
    }
    case 'either': {
      const { schema: shape, at } = shapeOf(schema, value, vocabulary)
      return { ...formOf({ ...shape, ...(schema.about && { about: schema.about }), ...(schema.optional && { optional: true }) }, value, ctx, path), shapes: schema.of, shape: at }
    }
    default:
      return { ...base, kind: 'any' }
  }
}

/** A value of `schema` to start from: what a new item, field or shape holds before it is written. */
export function blank(schema, ctx) {
  const { vocabulary, levels = [] } = ctx
  switch (schema.type) {
    case 'text': return { zh: '', en: '' }
    case 'num':
    case 'int': return schema.min ?? 0
    case 'bool': return false
    case 'str':
    case 'syntax':
    case 'name': return ''
    case 'oneOf': return schema.values[0]
    case 'ref': return Object.keys(vocabulary?.kinds[schema.kind] ?? {})[0] ?? ''
    case 'level': return levels[0] ?? ''
    case 'list': return Array.from({ length: schema.min ?? 0 }, () => blank(schema.of, ctx))
    case 'map': return {}
    case 'board': return []
    case 'obj': return Object.fromEntries(Object.entries(schema.fields).filter(([, s]) => !s.optional).map(([k, s]) => [k, blank(s, ctx)]))
    case 'by': {
      const [tag, shape] = Object.entries(schema.cases)[0]
      return { ...blank(shape, ctx), [schema.field]: tag }
    }
    case 'either': return blank(schema.of[0], ctx)
    case 'call': {
      const [item, it] = Object.entries(vocabulary?.kinds[schema.kind] ?? {})[0] ?? ['', null]
      return it?.params ? { [item]: blank(it.params, ctx) } : item
    }
    default: return null
  }
}

/** What tells one of an either's shapes from the others: a by's field, an object's first field the others lack. */
export function shapeName(shape, shapes) {
  if (shape.type === 'by') return shape.field
  if (shape.type === 'obj') {
    const keys = (s) => (s.type === 'obj' ? Object.keys(s.fields) : s.type === 'by' ? Object.values(s.cases).flatMap(keys) : [])
    const others = shapes.filter((s) => s !== shape).flatMap(keys)
    const own = Object.entries(shape.fields).find(([k, s]) => !others.includes(k) && !s.optional) ?? Object.keys(shape.fields).filter((k) => !others.includes(k)).map((k) => [k])[0]
    if (own) return own[0]
  }
  return shape.type
}

/** A by's value (`tag` of its field) recast as its shape `to`: the fields the two shapes share kept, the rest blank. */
export function recast(tag, value, to, ctx) {
  const fresh = blank(tag.cases[to], ctx)
  // A shape that is a by of its own (a task's kind, then its scene) is read as the case its blank value takes; an either
  // as its first shape, the one blank makes.
  let shape = tag.cases[to]
  while (shape.type === 'by' || shape.type === 'either') shape = shape.type === 'by' ? shape.cases[fresh[shape.field]] : shape.of[0]
  const kept = Object.fromEntries(Object.entries(value ?? {}).filter(([k]) => k in shape.fields && validate(shape.fields[k], value[k], { vocabulary: ctx.vocabulary, levels: null }).length === 0))
  return { ...fresh, ...kept, [tag.key]: to }
}

/* ---------- cells: what a grid, a table or a tick strip holds, typed and read back ---------- */

/** Whether a cell of `schema` may be empty (null, shown 「—」). */
export const nullable = (schema) => schema.type === 'any' || (schema.type === 'either' && schema.of.some((s) => s.type === 'oneOf' && s.values.includes(null)))

/**
 * What a cell of `schema` holds when `text` is typed into it, or undefined when the text is no value of it. Empty (or
 * 「—」) is null where the cell may be empty.
 */
export function cellValue(schema, text) {
  const t = String(text).trim()
  if ((t === '' || t === '—' || t === '-') && nullable(schema)) return null
  switch (schema.type) {
    case 'num':
    case 'int': {
      const n = Number(t)
      return t !== '' && Number.isFinite(n) && (schema.type === 'num' || Number.isInteger(n)) ? n : undefined
    }
    case 'bool': return t === 'true' ? true : t === 'false' ? false : undefined
    case 'oneOf': return schema.values.find((v) => String(v) === t)
    case 'str':
    case 'syntax':
    case 'name':
    case 'ref':
    case 'level': return t === '' ? undefined : t
    case 'either': {
      for (const s of schema.of) {
        const v = cellValue(s, t)
        if (v !== undefined && validate(s, v).length === 0) return v
      }
      return undefined
    }
    default:
      try {
        return JSON.parse(t)
      } catch {
        return t
      }
  }
}

/** A cell's value as typed. */
export const cellText = (v) => (v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v))

/** A pasted block of cells (a spreadsheet's tab-separated rows, or numbers by spaces or commas): rows of texts. */
export function pastedCells(text) {
  const rows = String(text).replace(/\r/g, '').replace(/\n+$/, '').split('\n')
  const tabbed = rows.some((r) => r.includes('\t'))
  return rows.map((r) => (tabbed ? r.split('\t') : r.trim().split(/\s*,\s*|\s+/)))
}

/** A tick clicked: 1 becomes 0, anything else 1. */
export const toggled = (v) => (v === 1 ? 0 : 1)

// What a cell control shows of its field's value, and the value its rows make: rows(field) → the cells, and
// valueOf(field, rows) → the value, so that valueOf(field, rows(field)) is the value itself.

/** A grid's rows: a matrix as it is; a flat list cut `cols` to a row (a square: √length). */
export function gridRows(field) {
  const value = Array.isArray(field.value) ? field.value : []
  if (field.cols === null || field.cols === undefined) return value.map((r) => (Array.isArray(r) ? r : []))
  const cols = field.cols === 'square' ? Math.max(1, Math.round(Math.sqrt(value.length))) : field.cols
  return Array.from({ length: Math.ceil(value.length / cols) }, (_, r) => value.slice(r * cols, (r + 1) * cols))
}
export const gridValue = (field, rows) => (field.cols === null || field.cols === undefined ? rows : rows.flat())

/** A tick strip's values: a list as it is, a string of bits as numbers. */
export const tickValues = (field) => (field.bits ? [...String(field.value ?? '')].map(Number) : Array.isArray(field.value) ? field.value : [])
export const tickValue = (field, values) => (field.bits ? values.map((v) => (v ? 1 : 0)).join('') : values)

/**
 * A table's columns ([{ key, schema, optional }]), the head of each row (a map's keys) and its rows of cells; and the
 * value rows make. A list of maps has a column for every key its rows use.
 */
export function tableOf(field) {
  if (field.keyed) {
    const entries = Object.entries(isObj(field.value) ? field.value : {})
    return { columns: field.columns, heads: entries.map(([k]) => k), rows: entries.map(([, v]) => [v]) }
  }
  const items = Array.isArray(field.value) ? field.value : []
  const columns = field.columns ?? [...new Set(items.flatMap((x) => Object.keys(x ?? {})))].map((key) => ({ key, schema: field.cell, optional: true }))
  return { columns, heads: null, rows: items.map((x) => columns.map((c) => x?.[c.key])) }
}
export function tableValue(field, { columns, heads }, rows) {
  if (field.keyed) return Object.fromEntries(heads.map((k, i) => [k, rows[i]?.[0]]))
  return rows.map((row) => Object.fromEntries(columns.map((c, j) => [c.key, row[j]]).filter(([, v]) => v !== undefined)))
}

/** `list` with the item at `from` moved to `to`. */
export function moved(list, from, to) {
  const out = [...list]
  const [x] = out.splice(from, 1)
  out.splice(to, 0, x)
  return out
}

/** One line saying what a value holds: its first text, else its first few scalars, for a folded item of a list. */
export function summaryOf(value, width = 90) {
  const plain = (s) => String(s).replace(/<(level|part|wiki)-ref to="([^"]+)"><\/\1-ref>/g, '$2').replace(/<[^>]+>/g, '')
  const words = []
  const walk = (v, key) => {
    if (words.join(' ').length > width) return
    if (v === null || v === undefined) return
    if (isObj(v) && typeof v.zh === 'string' && typeof v.en === 'string') return words.push(plain(v.zh))
    if (typeof v !== 'object') return words.push(key ? `${key} ${plain(v)}` : plain(v))
    if (Array.isArray(v)) {
      if (v.every((x) => typeof x !== 'object' || x === null)) return words.push(`${key ? `${key} ` : ''}[${v.slice(0, 12).map((x) => (x === null ? '—' : x)).join(' ')}${v.length > 12 ? ' …' : ''}]`)
      return v.forEach((x) => walk(x, key))
    }
    const entries = Object.entries(v)
    if (entries.length === 1 && !isObj(entries[0][1])) return walk(entries[0][1], entries[0][0])
    for (const [k, x] of entries) walk(x, k)
  }
  walk(value, '')
  const line = words.join(' · ')
  return line.length > width ? `${line.slice(0, width - 1)}…` : line
}

/* ---------- a level's sections ---------- */


/** A level's fields (the obj form of its top) in sections, in SECTIONS order: [{ section, fields }]. */
export function sectionsOf(form) {
  const by = new Map(SECTIONS.map((s) => [s, []]))
  const tags = new Set((form.tags ?? []).map((t) => t.key))
  for (const f of form.fields ?? []) if (!tags.has(f.key)) by.get(sectionOf(f.schema)).push(f)
  return [...by].filter(([, fields]) => fields.length).map(([section, fields]) => ({ section, fields }))
}

/* ---------- the check's findings, on the fields they are about ---------- */

const keysOf = (dotted) => dotted.split('.').filter(Boolean).flatMap((k) => k.split(/[[\]]/).filter(Boolean)).map((k) => (/^\d+$/.test(k) ? Number(k) : k))

/**
 * The failing lines of a check that point into a level's file, read as { level, path, says }: a content problem
 * (`content: levels/<id>.json.<path>: …`) and a copy problem (`text levels.<n>.<path> …`, n counting `order`, the levels in
 * play order). Lines about a level that say no place in it are { level, path: null }.
 */
export function placesOf(lines, order) {
  const out = []
  for (const line of lines) {
    if (!line.fail) continue
    const content = /^content: levels\/(.+?)\.json((?:\.[^\s:[]+|\[\d+\])*): (.*)$/.exec(line.text)
    if (content) { out.push({ level: content[1], path: keysOf(content[2]), says: content[3] }); continue }
    const parts = /^content: parts\.json((?:\.[^\s:[]+|\[\d+\])*): (.*)$/.exec(line.text)
    if (parts) { out.push({ file: 'parts', path: keysOf(parts[1]), says: parts[2] }); continue }
    const copy = /^text levels\.(\d+)((?:\.[^\s.]+)*) (.*)$/.exec(line.text)
    if (copy && order[Number(copy[1])]) { out.push({ level: order[Number(copy[1])], path: keysOf(copy[2]), says: copy[3] }); continue }
    for (const level of line.levels ?? []) out.push({ level, path: null, says: line.text })
  }
  return out
}

/** Every path a form shows a field at, as showPath keys. */
function pathsIn(field, out = new Set()) {
  out.add(showPath(field.path))
  for (const x of field.items ?? []) pathsIn(x, out)
  for (const e of field.entries ?? []) pathsIn(e.field, out)
  for (const x of field.fields ?? []) if (x.field) pathsIn(x.field, out)
  if (field.params) pathsIn(field.params, out)
  return out
}

/**
 * Findings ({ path, says }) on the fields of `form` that show them: each at the deepest field its path reaches. Returns
 * { at: Map(showPath → [says]), rest: [says] } (rest: findings on no field of it).
 */
export function placeFindings(form, findings) {
  const shown = pathsIn(form)
  const at = new Map()
  const rest = []
  for (const { path, says } of findings) {
    if (!path) { rest.push(says); continue }
    let keys = path
    while (keys.length && !shown.has(showPath(keys))) keys = keys.slice(0, -1)
    if (!keys.length) { rest.push(says); continue }
    const key = showPath(keys)
    at.set(key, [...(at.get(key) ?? []), says])
  }
  return { at, rest }
}

/* ---------- edits as operations ---------- */

/**
 * The operation that makes an edit, on a file of the game: `file` { level } | { game: true }. edit: { set: value } |
 * { unset: true } at `path`; `type` is the schema type there ('text' and 'board' have operations of their own).
 */
export function opFor(file, path, edit, type = null) {
  const keys = parsePath(path)
  // parts.json: a field of it (a whole part is added, removed and renamed by the part operations).
  if (file.parts) {
    if (edit.unset) return { op: 'parts.unset', path: keys }
    if (type === 'text' && edit.set !== null && typeof edit.set === 'object') return { op: 'text.set', in: 'parts', path: keys, ...Object.fromEntries(['zh', 'en'].filter((k) => edit.set[k] !== undefined).map((k) => [k, edit.set[k]])) }
    return { op: 'parts.set', path: keys, value: edit.set }
  }
  const where = file.level !== undefined ? { level: file.level } : {}
  const op = (name) => (file.level !== undefined ? `level.${name}` : `game.${name}`)
  if (edit.unset) return { op: op('unset'), ...where, path: keys }
  if (!keys.length && file.level !== undefined) return { op: 'level.replace', level: file.level, data: edit.set }
  if (type === 'text' && edit.set !== null && typeof edit.set === 'object') {
    const sides = Object.fromEntries(['zh', 'en'].filter((k) => edit.set[k] !== undefined).map((k) => [k, edit.set[k]]))
    return { op: 'text.set', ...(file.level !== undefined ? where : { in: 'game' }), path: keys, ...sides }
  }
  if (type === 'board' && file.level !== undefined) return { op: 'level.blueprint', level: file.level, path: keys, text: edit.set.join('\n') }
  return { op: op('set'), ...where, path: keys, value: edit.set }
}

/**
 * The task operations that turn level `level`'s tasks `before` into `after` (a list edited as a whole): a task is known
 * by its id, so one moved goes by task.move and its board with it; one without an id is new (task.add, its id made up
 * among `levels`, the game's); one gone is task.remove; a task kept but changed is set where it ends up.
 */
export function taskListOps(level, before, after, levels) {
  const all = [...levels]
  const ids = after.map((x) => {
    if (x.id) return x.id
    const id = newTaskId(all, level)
    all.push({ id: level, tasks: [{ id }] })
    return id
  })
  // Tasks gone are removed first, unless none is kept (a level keeps a task): then after the new ones are in.
  const removes = before.filter((x) => !ids.includes(x.id)).map((x) => ({ op: 'task.remove', task: x.id }))
  const kept = before.some((x) => ids.includes(x.id))
  const ops = kept ? [...removes] : []
  const now = before.map((x) => x.id).filter((id) => ids.includes(id))
  const put = (id, k) => now.splice(k === 0 ? 0 : now.indexOf(ids[k - 1]) + 1, 0, id)
  ids.forEach((id, k) => {
    const place = k === 0 ? { first: true } : { after: ids[k - 1] }
    const at = now.indexOf(id)
    if (at < 0) {
      ops.push({ op: 'task.add', level, data: { ...after[k], id }, ...place })
      put(id, k)
    } else if (k === 0 ? at !== 0 : now[at - 1] !== ids[k - 1]) {
      ops.push({ op: 'task.move', task: id, to: { level, ...place } })
      now.splice(at, 1)
      put(id, k)
    }
  })
  if (!kept) ops.push(...removes)
  const was = new Map(before.map((x) => [x.id, x]))
  after.forEach((x) => {
    if (x.id && was.has(x.id) && JSON.stringify(was.get(x.id)) !== JSON.stringify(x)) ops.push({ op: 'level.set', level, path: ['tasks', now.indexOf(x.id)], value: x })
  })
  return ops
}

// Two operations edit the same thing when they are the same operation on the same file and path; the later then
// stands for both.
const target = (op) => JSON.stringify([op.op, op.level ?? op.in ?? null, op.path ? parsePath(op.path) : null, op.op === 'level.move' || op.op === 'level.rename' ? op.level : null])

/**
 * A pending changeset's operations with `op` added: standing for the last one when that edits the same thing (a text
 * keeps the side the last one changed and this one does not; a task renamed again is renamed once).
 */
export function pushOp(ops, op) {
  const last = ops.at(-1)
  // A task's id typed a letter at a time is one rename, from the id it had.
  if (op.op === 'task.rename' && last?.op === 'task.rename' && last.to === op.task) return [...ops.slice(0, -1), { ...op, task: last.task }]
  // Adding, removing and renaming never stand for one another; nor do task operations, each placed against the one before.
  if (!last || target(last) !== target(op) || ['level.add', 'level.remove', 'level.rename'].includes(op.op) || op.op.startsWith('task.')) return [...ops, op]
  return [...ops.slice(0, -1), op.op === 'text.set' ? { ...last, ...op } : op]
}

/**
 * The edit that puts a field back as it was before the pending changes (`before`: its value then, undefined when it
 * was not there): { set } or { unset }.
 */
export const revertOf = (before) => (before === undefined ? { unset: true } : { set: before })

/**
 * The boards a level holds (paths of its board fields) and its reference answer: the last board in a solution or an
 * answer field (the fields the contract reads as references, ../engine/contract.js), else its first board.
 */
export function boardsOf(vocabulary, { id: _, ...level }) {
  const paths = find(vocabulary.level, level, 'board', { vocabulary }).map((b) => b.path)
  return { paths, reference: paths.filter((p) => ['solution', 'answer'].includes(p.at(-1))).at(-1) ?? paths[0] ?? null }
}

/** The reference board a list of tests at `path` is run with: the one beside it (a task's own), else the level's. */
export function referenceFor(vocabulary, level, path) {
  const { paths, reference } = boardsOf(vocabulary, level)
  const home = path.slice(0, -1)
  const near = paths.filter((p) => home.every((k, i) => p[i] === k) && p.length === home.length + 1 && ['solution', 'answer'].includes(p.at(-1)))
  return near.at(-1) ?? reference
}


/** Every text a value holds under its schema: [{ path, value }], in the schema's order. */
export const textsOf = (schema, value, vocabulary) => find(schema, value, 'text', { vocabulary })

/**
 * The field of a form at `path`: { field } where the form shows one (a field of an object also with its `key`, `about`,
 * `optional`, `schema`), { absent: { key, schema, about } } for an optional field of an object not written yet, or null.
 */
export function fieldAt(form, path) {
  const want = showPath(path)
  const walk = (field, entry = null) => {
    if (showPath(field.path) === want) return { field, ...(entry && { entry }) }
    for (const x of field.items ?? []) { const hit = walk(x); if (hit) return hit }
    for (const e of field.entries ?? []) { const hit = walk(e.field, { key: e.key }); if (hit) return hit }
    for (const f of field.fields ?? []) {
      if (!f.field) {
        if (showPath([...field.path, f.key]) === want) return { absent: { key: f.key, schema: f.schema, about: f.about, path: [...field.path, f.key] } }
        continue
      }
      const hit = walk(f.field, f)
      if (hit) return hit
    }
    if (field.params) return walk(field.params)
    return null
  }
  return walk(form)
}

/* ---------- a file as a form ---------- */

// What game.json's form leaves out: what is not its own schema.
const NOT_FORM = ['id', 'levels', 'glossary', 'partDefs', 'blueprint', 'domain', 'vocabulary', 'open']
export const gameFields = (content) => Object.fromEntries(Object.entries(content).filter(([k]) => !NOT_FORM.includes(k)))

/** The form of the file `at` holds, as the content has it now. */
export function fileForm(content, vocabulary, at, order) {
  if (at?.parts) {
    const value = content.partDefs ?? { parts: {} }
    return { value, form: formOf(PARTS_FILE, value, { vocabulary, levels: order }) }
  }
  if (at?.level) {
    const level = content.levels.find((l) => l.id === at.level)
    if (!level) return null
    const { id: _, ...value } = level
    return { value, form: formOf(vocabulary.level, value, { vocabulary, levels: order }) }
  }
  const value = gameFields(content)
  return { value, form: formOf(vocabulary.game, value, { vocabulary, levels: order }) }
}

