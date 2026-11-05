// The shape of content (games/DESIGN.md 6.2). A schema is plain data, { type, … }, so a domain's whole vocabulary
// prints as JSON for whoever writes content (an agent, a studio) without reading any code. validate() reports every
// place a value does not fit, by its path.
//
//   any, bool, num, int, str        a value of that kind (num and int may carry min / max)
//   text                            words a player reads: { zh, en }, or one string for both (a symbol, 'a + b'),
//                                   carrying only the kernel's markup (markup.js)
//   oneOf(values)                   one of these values
//   list(of), map(of)               a list, or an object with keys of the author's choosing, every value of `of`
//   obj(fields)                     an object with these fields and no others; opt(schema) marks a field optional
//   either(...schemas)              any one of them
//   by(field, cases)                an object whose `field` names its shape: cases[value] (a level by its mode)
//   ref(kind)                       the name of an item of that kind in the vocabulary (a world, a part)
//   call(kind)                      an item of that kind with its parameters: { item: params }, or just 'item' for an
//                                   item whose parameters may all be left out
//   level                           the id of a level of this game (renaming or removing a level follows these)
//   name(kind)                      the name of something the content itself defines (an encyclopedia entry or group;
//                                   what a domain's `names(content)` gives, such as the logic domain's lemmas)
//   board                           a board as blueprint text (../circuit/text.js), one string a line
//   syntax(lang)                    a string in one of the domain's small languages (a formula, a proof term),
//                                   named in its vocabulary's `languages`; given the domain's readers (`languages`),
//                                   what one cannot read is reported here
//
// A schema may carry `about` ({ zh, en } or a string): what the field means, for whoever writes it. It may also carry
// hints for whoever edits the value (the studio picks a control by them, games/DESIGN.md 6.7); they change nothing a
// value may be, and validate() ignores them:
//   view: 'grid'    a list of lists of numbers is a matrix; so is a list of numbers, read row by row, `cols` to a row
//                   (without cols, a square: a 3 × 3 kernel as nine numbers)
//   view: 'ticks'   a list of values one a tick, or a string of 0s and 1s, is a waveform; a map of them, one row each
//   view: 'expr'    a part's expression (parts/expr.js); view: 'icon' a name in the kernel's icon table
//   step            how far a number goes up or down at a time
//   section         where a field of a level goes in its form (SECTIONS); without it the studio reads it off the shape
import { markupOf } from './markup.js'

export const SECTIONS = ['read', 'puzzle', 'tests', 'answers', 'course', 'tasks']
export const HINTS = { view: ['grid', 'ticks', 'expr', 'icon'], section: SECTIONS }

const make = (type) => (extra = {}) => ({ type, ...extra })

export const S = {
  any: make('any'),
  bool: make('bool'),
  num: make('num'),
  int: make('int'),
  str: make('str'),
  text: make('text'),
  oneOf: (values, extra = {}) => ({ type: 'oneOf', values, ...extra }),
  list: (of, extra = {}) => ({ type: 'list', of, ...extra }),
  map: (of, extra = {}) => ({ type: 'map', of, ...extra }),
  obj: (fields, extra = {}) => ({ type: 'obj', fields, ...extra }),
  opt: (schema) => ({ ...schema, optional: true }),
  either: (...of) => ({ type: 'either', of }),
  by: (field, cases, extra = {}) => ({ type: 'by', field, cases, ...extra }),
  ref: (kind, extra = {}) => ({ type: 'ref', kind, ...extra }),
  call: (kind, extra = {}) => ({ type: 'call', kind, ...extra }),
  level: make('level'),
  board: make('board'),
  syntax: (lang, extra = {}) => ({ type: 'syntax', lang, ...extra }),
  name: (kind, extra = {}) => ({ type: 'name', kind, ...extra }),
}

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const show = (v) => (typeof v === 'string' ? JSON.stringify(v) : JSON.stringify(v)?.slice(0, 40) ?? String(v))

/** Whether every parameter of an item may be left out (so the item can be written by its name alone). */
const bare = (params) => !params || (params.type === 'obj' && Object.values(params.fields).every((f) => f.optional))

/**
 * Every place `value` does not fit `schema`, as [{ at, says }]. `vocabulary` (vocabulary.js) resolves ref and call;
 * `levels` (a Set of the game's level ids) the levels a level names; `languages` (a domain's readers, { lang: (text)
 * → why it cannot be read, or null }) reads syntax; `names` ({ kind: Set }) the names the content defines; `at` is
 * the path of `value`.
 */
export function validate(schema, value, { vocabulary = null, levels = null, languages = null, names = null, at = '' } = {}) {
  const out = []
  // `shape`: the value is not the shape asked for at all (a by's field names no case), not just wrong inside.
  const say = (where, says, shape = false) => out.push({ at: where || '(root)', says, ...(shape ? { shape } : {}) })
  const item = (kind, name) => vocabulary?.kinds[kind]?.[name]

  const walk = (s, v, where) => {
    switch (s.type) {
      case 'any':
        return
      case 'bool':
        if (typeof v !== 'boolean') say(where, `expected true or false, found ${show(v)}`)
        return
      case 'num':
      case 'int':
        if (typeof v !== 'number' || !Number.isFinite(v) || (s.type === 'int' && !Number.isInteger(v))) say(where, `expected ${s.type === 'int' ? 'a whole number' : 'a number'}, found ${show(v)}`)
        else if ((s.min !== undefined && v < s.min) || (s.max !== undefined && v > s.max)) say(where, `${v} is outside ${s.min ?? '…'}–${s.max ?? '…'}`)
        return
      case 'str':
        if (typeof v !== 'string') say(where, `expected a string, found ${show(v)}`)
        else if (s.pattern && !new RegExp(s.pattern).test(v)) say(where, `${show(v)} does not match ${s.pattern}`)
        return
      case 'text':
        if (typeof v === 'string') {
          for (const p of markupOf(v).problems) say(where, p)
          return
        }
        if (!isObj(v) || typeof v.zh !== 'string' || typeof v.en !== 'string' || Object.keys(v).length !== 2) return say(where, `expected text, { zh, en } or a string, found ${show(v)}`)
        for (const side of ['zh', 'en']) for (const p of markupOf(v[side]).problems) say(`${where}.${side}`, p)
        return
      case 'oneOf':
        if (!s.values.includes(v)) say(where, `expected one of ${s.values.map(show).join(', ')}, found ${show(v)}`)
        return
      case 'list':
        if (!Array.isArray(v)) return say(where, `expected a list, found ${show(v)}`)
        if (s.min !== undefined && v.length < s.min) say(where, `expected at least ${s.min} item(s), found ${v.length}`)
        v.forEach((x, k) => walk(s.of, x, `${where}[${k}]`))
        return
      case 'map':
        if (!isObj(v)) return say(where, `expected an object, found ${show(v)}`)
        for (const [k, x] of Object.entries(v)) {
          if (s.keys && !new RegExp(s.keys).test(k)) say(`${where}.${k}`, `the key ${show(k)} does not match ${s.keys}`)
          walk(s.of, x, `${where}.${k}`)
        }
        return
      case 'obj': {
        if (!isObj(v)) return say(where, `expected an object, found ${show(v)}`)
        for (const [k, f] of Object.entries(s.fields)) {
          if (v[k] === undefined) { if (!f.optional) say(`${where}.${k}`, 'is missing') }
          else walk(f, v[k], `${where}.${k}`)
        }
        for (const k of Object.keys(v)) if (!(k in s.fields)) say(`${where}.${k}`, 'is not a field here')
        return
      }
      case 'either': {
        const tries = s.of.map((x) => validate(x, v, { vocabulary, levels, languages, names, at: where }))
        if (tries.every((t) => t.length)) {
          // The closest fit says what is wrong: a shape the value has (no problem with the value itself, only inside it),
          // then the fewest problems.
          const miss = (t) => (t.some((p) => p.shape || p.at === (where || '(root)')) ? 1 : 0)
          const best = tries.reduce((a, b) => (miss(b) < miss(a) || (miss(b) === miss(a) && b.length < a.length) ? b : a))
          out.push(...best)
        }
        return
      }
      case 'by': {
        if (!isObj(v)) return say(where, `expected an object, found ${show(v)}`)
        const shape = s.cases[v[s.field]]
        if (!shape) return say(`${where}.${s.field}`, `expected one of ${Object.keys(s.cases).map(show).join(', ')}, found ${show(v[s.field])}`, true)
        walk(shape, v, where)
        return
      }
      case 'ref':
        if (typeof v !== 'string' || !item(s.kind, v)) say(where, `${show(v)} is no ${s.kind} of the vocabulary`)
        return
      case 'level':
        if (typeof v !== 'string') say(where, `expected a level id, found ${show(v)}`)
        else if (levels && !levels.has(v)) say(where, `${show(v)} is no level of this game`)
        return
      case 'name':
        if (typeof v !== 'string') say(where, `expected the name of a ${s.kind}, found ${show(v)}`)
        // Without the names of that kind (a page checking content without its domain's names) only the type is checked.
        else if (names?.[s.kind] && !names[s.kind].has(v)) say(where, `${show(v)} is no ${s.kind} of this game`)
        return
      case 'board':
        if (!Array.isArray(v) || v.some((line) => typeof line !== 'string')) say(where, `expected a board as blueprint text, a list of lines, found ${show(v)}`)
        return
      case 'syntax': {
        if (typeof v !== 'string') return say(where, `expected ${s.lang} text, found ${show(v)}`)
        // Without the domain's readers (a page checking content it read) only the type is checked.
        if (!languages?.[s.lang]) return
        const why = languages[s.lang](v)
        if (why) say(where, `${show(v)} is no ${s.lang}: ${why}`)
        return
      }
      case 'call': {
        if (typeof v === 'string') {
          const it = item(s.kind, v)
          if (!it) say(where, `${show(v)} is no ${s.kind} of the vocabulary`)
          else if (!bare(it.params)) say(where, `the ${s.kind} ${show(v)} needs parameters: { ${show(v)}: … }`)
          return
        }
        if (!isObj(v) || Object.keys(v).length !== 1) return say(where, `expected a ${s.kind}: { name: parameters } or a name, found ${show(v)}`)
        const [name, params] = Object.entries(v)[0]
        const it = item(s.kind, name)
        if (!it) return say(where, `${show(name)} is no ${s.kind} of the vocabulary`)
        if (it.params) walk(it.params, params, `${where}.${name}`)
        else if (params !== true) say(`${where}.${name}`, 'takes no parameters: write true, or the name alone')
        return
      }
      default:
        say(where, `unknown schema type ${show(s.type)}`)
    }
  }
  walk(schema, value, at)
  return out
}

/**
 * Every place in `value` that `schema` gives the type `type` (a 'level', a 'board', a 'text'…), as [{ path, value,
 * schema }]: `path` the keys from `value` down to it, `schema` the one there (its hints too). Where the schema allows several shapes (either), the value is read as the
 * one it fits; a value fitting none is not looked into.
 */
export function find(schema, value, type, { vocabulary = null } = {}) {
  const out = []
  const fits = (s, v) => validate(s, v, { vocabulary }).length === 0
  const walk = (s, v, path) => {
    if (v === undefined) return
    if (s.type === type) out.push({ path, value: v, schema: s })
    switch (s.type) {
      case 'list':
        if (Array.isArray(v)) v.forEach((x, k) => walk(s.of, x, [...path, k]))
        return
      case 'map':
        if (isObj(v)) for (const [k, x] of Object.entries(v)) walk(s.of, x, [...path, k])
        return
      case 'obj':
        if (isObj(v)) for (const [k, f] of Object.entries(s.fields)) walk(f, v[k], [...path, k])
        return
      case 'either': {
        const shape = s.of.find((x) => fits(x, v))
        if (shape) walk(shape, v, path)
        return
      }
      case 'by':
        if (isObj(v) && s.cases[v[s.field]]) walk(s.cases[v[s.field]], v, path)
        return
      case 'call': {
        if (!isObj(v)) return
        const [name, params] = Object.entries(v)[0] ?? []
        const it = vocabulary?.kinds[s.kind]?.[name]
        if (it?.params) walk(it.params, params, [...path, name])
        return
      }
      default:
    }
  }
  walk(schema, value, [])
  return out
}

/**
 * The schema of what is at `path` (a list of keys) in `value`, read as find reads it, or null where the schema says
 * nothing. A value that fits none of an either's shapes is read as the first shape of its kind that has all its fields.
 */
export function shapeAt(schema, value, path, { vocabulary = null } = {}) {
  let s = schema
  let v = value
  const resolve = () => {
    for (;;) {
      if (s?.type === 'either') {
        const fit = s.of.find((x) => validate(x, v, { vocabulary }).length === 0)
        const kin = s.of.find((x) => (isObj(v) ? (x.type === 'obj' && Object.keys(v).every((k) => k in x.fields)) || x.type === 'by' || x.type === 'map' : Array.isArray(v) ? x.type === 'list' : false))
        s = fit ?? kin ?? null
      } else if (s?.type === 'by') s = isObj(v) ? s.cases[v[s.field]] ?? null : null
      else return
    }
  }
  resolve()
  for (const key of path) {
    if (!s) return null
    if (s.type === 'list') s = s.of
    else if (s.type === 'map') s = s.of
    else if (s.type === 'obj') s = s.fields[key] ?? null
    else if (s.type === 'call') s = vocabulary?.kinds[s.kind]?.[key]?.params ?? null
    else return null
    v = v?.[key]
    resolve()
  }
  return s
}

const leaves = (s, out = new Set()) => {
  if (!s || typeof s !== 'object') return out
  if (['list', 'map'].includes(s.type)) return leaves(s.of, out)
  if (s.type === 'either') { s.of.forEach((x) => leaves(x, out)); return out }
  if (s.type === 'obj') { Object.values(s.fields).forEach((x) => leaves(x, out)); return out }
  if (s.type === 'by') { Object.values(s.cases).forEach((x) => leaves(x, out)); return out }
  out.add(s.type)
  return out
}

/**
 * Where a field of a level goes in its form (SECTIONS): its schema's `section`, else read off its shape — a board is an
 * answer; a field naming a level is the course's; words alone (and the figures beside them) are what the player
 * reads; anything else is the puzzle.
 */
export function sectionOf(schema) {
  if (schema.section) return schema.section
  const types = leaves(schema)
  if (types.has('board')) return 'answers'
  if (holdsLevels(schema)) return 'course'
  if (types.has('text') && [...types].every((t) => t === 'text' || t === 'call')) return 'read'
  return 'puzzle'
}

/** Whether a schema holds a level anywhere inside it (a place in the course, which the tree edits). */
export function holdsLevels(schema) {
  if (!schema || typeof schema !== 'object') return false
  if (schema.type === 'level') return true
  const inner = [...(Array.isArray(schema.of) ? schema.of : [schema.of]), ...Object.values(schema.fields ?? {}), ...Object.values(schema.cases ?? {})]
  return inner.some(holdsLevels)
}

/** A call's item and parameters: 'item' → ['item', {}], { item: params } → ['item', params] (true reads as {}). */
export const callOf = (v) => {
  if (typeof v === 'string') return [v, {}]
  const [name, params] = Object.entries(v)[0]
  return [name, params === true ? {} : params]
}
