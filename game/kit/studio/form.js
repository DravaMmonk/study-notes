// The studio's forms (games/DESIGN.md 6.7), from the schemas alone: a value and its schema (../engine/schema.js) read
// as a tree of fields, each the kind of control that edits it; and an edit of a field as the operation that makes it
// (../engine/ops/operations.js). Nothing here knows a domain: what a field is, what it may hold and what it means
// (`about`) all come from the vocabulary.
//
// A field: { path, kind, value, about?, optional?, … } by kind:
//   text      { zh, en } (a string reads as both sides)
//   num       min?, max?, int
//   bool, str (pattern?), any (JSON), board (blueprint lines)
//   choice    options: [{ value, about? }]          oneOf; ref (the items of a vocabulary kind); level (the game's levels)
//   call      item, options (the kind's items), params: field | null       { item: params } or 'item'
//   list      items: [field], of (the items' schema)
//   map       entries: [{ key, field }], of
//   obj       fields: [{ key, field | null (an optional field not there), optional, about?, schema }]
// A field of a by (one shape a field names: a level by its kind) has `tag`: { key, value, options, cases }; a field of
// an either (several shapes) has `shapes` (their schemas) and `shape` (the one it has now).
import { callOf, find, validate } from '../engine/schema.js'
import { parsePath } from '../engine/ops/edit.js'

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const fits = (schema, value, vocabulary) => validate(schema, value, { vocabulary }).length === 0

/** The items of a vocabulary kind as choices. */
const itemsOf = (vocabulary, kind) => Object.entries(vocabulary?.kinds[kind] ?? {}).map(([value, it]) => ({ value, about: it.about }))

/**
 * The shape of `value` where `schema` allows several (either): the one it fits, else the first of its kind (an object
 * for an object, a list for a list, a string for a string). Returns { schema, at } (at: the shape's index).
 */
export function shapeOf(schema, value, vocabulary) {
  const at = schema.of.findIndex((s) => fits(s, value, vocabulary))
  if (at >= 0) return { schema: schema.of[at], at }
  const kind = (s) => (['obj', 'by', 'map'].includes(s.type) ? 'object' : s.type === 'list' || s.type === 'board' ? 'list' : ['str', 'text', 'ref', 'level', 'oneOf', 'call'].includes(s.type) ? 'string' : s.type)
  const mine = isObj(value) ? 'object' : Array.isArray(value) ? 'list' : typeof value === 'string' ? 'string' : null
  const k = Math.max(0, schema.of.findIndex((s) => kind(s) === mine || (mine === 'object' && s.type === 'text')))
  return { schema: schema.of[k], at: k }
}

/** The field tree of `value` under `schema`. ctx: { vocabulary, levels (the game's level ids) }; path: where it is. */
export function formOf(schema, value, ctx, path = []) {
  const { vocabulary, levels = [] } = ctx
  const base = { path, value, ...(schema.about && { about: schema.about }), ...(schema.optional && { optional: true }) }
  switch (schema.type) {
    case 'text':
      return { ...base, kind: 'text' }
    case 'num':
    case 'int':
      return { ...base, kind: 'num', int: schema.type === 'int', ...(schema.min !== undefined && { min: schema.min }), ...(schema.max !== undefined && { max: schema.max }) }
    case 'bool':
    case 'any':
    case 'board':
      return { ...base, kind: schema.type }
    case 'str':
      return { ...base, kind: 'str', ...(schema.pattern && { pattern: schema.pattern }) }
    case 'oneOf':
      return { ...base, kind: 'choice', options: schema.values.map((v) => ({ value: v })) }
    case 'ref':
      return { ...base, kind: 'choice', options: itemsOf(vocabulary, schema.kind), of: schema.kind }
    case 'level':
      return { ...base, kind: 'choice', options: levels.map((id) => ({ value: id })), of: 'level' }
    case 'call': {
      const [item, params] = value === undefined ? [null, {}] : callOf(value)
      const spec = vocabulary?.kinds[schema.kind]?.[item]?.params
      return { ...base, kind: 'call', of: schema.kind, item, options: itemsOf(vocabulary, schema.kind), params: spec ? formOf(spec, params, ctx, [...path, item]) : null }
    }
    case 'list':
      return { ...base, kind: 'list', of: schema.of, items: (Array.isArray(value) ? value : []).map((x, k) => formOf(schema.of, x, ctx, [...path, k])) }
    case 'map':
      return { ...base, kind: 'map', of: schema.of, entries: Object.entries(isObj(value) ? value : {}).map(([key, x]) => ({ key, field: formOf(schema.of, x, ctx, [...path, key]) })) }
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
      return { ...field, ...base, tag: { key: schema.field, value: tag, options: Object.keys(schema.cases).map((v) => ({ value: v })), cases: schema.cases } }
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
    case 'str': return ''
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

/** A by's value (`tag` of its field) recast as its shape `to`: the fields the two shapes share kept, the rest blank. */
export function recast(tag, value, to, ctx) {
  const shape = tag.cases[to]
  const kept = Object.fromEntries(Object.entries(value ?? {}).filter(([k]) => k in shape.fields && validate(shape.fields[k], value[k], { vocabulary: ctx.vocabulary, levels: null }).length === 0))
  return { ...blank(shape, ctx), ...kept, [tag.key]: to }
}

/**
 * The operation that makes an edit, on a file of the game: `file` { level } | { game: true }. edit: { set: value } |
 * { unset: true } at `path`; `type` is the schema type there ('text' and 'board' have operations of their own).
 */
export function opFor(file, path, edit, type = null) {
  const keys = parsePath(path)
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

// Two operations edit the same thing when they are the same operation on the same file and path; the later then
// stands for both.
const target = (op) => JSON.stringify([op.op, op.level ?? op.in ?? null, op.path ? parsePath(op.path) : null, op.op === 'level.move' || op.op === 'level.rename' ? op.level : null])

/**
 * A pending changeset's operations with `op` added: standing for the last one when that edits the same thing (a text
 * keeps the side the last one changed and this one does not).
 */
export function pushOp(ops, op) {
  const last = ops.at(-1)
  if (!last || target(last) !== target(op) || ['level.add', 'level.remove', 'level.rename'].includes(op.op)) return [...ops, op]
  return [...ops.slice(0, -1), op.op === 'text.set' ? { ...last, ...op } : op]
}

/**
 * The boards a level holds (paths of its board fields) and its reference answer: the last board in a solution or an
 * answer field (the fields the contract reads as references, ../engine/contract.js), else its first board.
 */
export function boardsOf(vocabulary, { id: _, ...level }) {
  const paths = find(vocabulary.level, level, 'board', { vocabulary }).map((b) => b.path)
  return { paths, reference: paths.filter((p) => ['solution', 'answer'].includes(p.at(-1))).at(-1) ?? paths[0] ?? null }
}

/** Whether a schema holds a level anywhere inside it (a place in the course, which the tree edits). */
export function holdsLevels(schema) {
  if (!schema || typeof schema !== 'object') return false
  if (schema.type === 'level') return true
  const inner = [...(Array.isArray(schema.of) ? schema.of : [schema.of]), ...Object.values(schema.fields ?? {}), ...Object.values(schema.cases ?? {})]
  return inner.some(holdsLevels)
}

/** Every text a value holds under its schema: [{ path, value }], in the schema's order. */
export const textsOf = (schema, value, vocabulary) => find(schema, value, 'text', { vocabulary })
