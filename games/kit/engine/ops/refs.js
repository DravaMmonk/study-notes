// Where a game's content names a level: every field its domain's schema types as a level (schema.js S.level, the
// chapters and typed object members included), every <level-ref> link inside a text, and the audit findings game.json leaves open
// ('part@level').
import { PARTS_FILE } from '../parts/schema.js'
import { S, find } from '../schema.js'
import { GLOSSARY } from '../vocabulary.js'
import { OBJECT_SCHEMAS } from '../objects.js'
import { textEntries } from '../i18n.js'
import { getAt, setAt } from './edit.js'

// game.json's own fields, outside its domain's schema (vocabulary.js checkContent).
const META = ['domain', 'vocabulary', 'open']
const own = (game) => Object.fromEntries(Object.entries(game).filter(([k]) => !META.includes(k)))
const link = (id, namespace) => new RegExp(`(<level-ref to="(?:${namespace}/)?)${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}("></level-ref>)`, 'g')

/** The files of a workspace with the schema each is read by: [[name, value, schema, set(value)]]. */
const files = (ws, vocabulary) => [
  ['game.json', own(ws.game), vocabulary.game, (v) => { ws.game = { ...ws.game, ...v } }],
  ['glossary.json', ws.glossary, GLOSSARY, (v) => { ws.glossary = v }],
  ...(ws.partDefs === undefined ? [] : [['pieces.json', ws.partDefs, PARTS_FILE, (v) => { ws.partDefs = v }]]),
  ...[...ws.levels].map(([id, level]) => [`levels/${id}.json`, level, vocabulary.level, (v) => { ws.levels.set(id, v) }]),
  ...Object.entries(OBJECT_SCHEMAS).flatMap(([kind, schema]) => [...(ws[kind] ?? [])].map(([id, value]) => [`${kind}/${id}.json`, value, objectReferenceSchema(ws, kind, value, schema), (v) => { ws[kind].set(id, v) }])),
]

// Object registries are separate: a level rename cannot rename a same-named piece or text.
function objectReferenceSchema(ws, kind, value, schema) {
  const local = (id) => id?.replace(`#${ws.packageId}/`, '').replace(`${ws.packageId}/`, '').replace(/^#/, '')
  const endpoints = [...(value.edges ?? []).flatMap(({ from, to }) => [from, to]), ...(value.sequence ?? [])]
  const first = endpoints.find((id) => id.startsWith('#')) ?? endpoints[0]
  const of = value.of ?? (first?.startsWith('#') ? ws.tags.get(local(first))?.kind : ws.levels.has(local(first)) ? 'level' : 'item')
  const reference = (type) => type === 'level' ? S.level() : type === 'item' ? S.ref('part') : S.str()
  if (kind === 'tags') return { ...schema, fields: { ...schema.fields, values: S.list(reference(value.kind)) } }
  if (kind === 'relations') {
    const ref = reference(value.kind === 'requires' ? 'level' : value.kind === 'replaces' ? 'item' : of)
    const edge = S.obj({ from: ref, to: ref })
    return { ...schema, fields: { ...schema.fields, edges: S.list(edge), sequence: S.list(ref) } }
  }
  return schema
}

const texts = (value) => typeof value === 'string'
  ? [{ path: [], value }]
  : textEntries(value).map(([lang, text]) => ({ path: [lang], value: text }))

/** Every place naming level `id`: [{ file, path, how: 'field' | 'link' | 'open' }]. */
export function levelRefs(ws, vocabulary, id) {
  const out = []
  for (const [file, value, schema] of files(ws, vocabulary)) {
    for (const hit of find(schema, value, 'level', { vocabulary })) if (hit.value === id || hit.value === `${ws.packageId}/${id}`) out.push({ file, path: hit.path, how: 'field' })
    for (const t of find(schema, value, 'text', { vocabulary })) for (const s of texts(t.value)) if (link(id, ws.packageId).test(s.value)) out.push({ file, path: [...t.path, ...s.path], how: 'link' })
  }
  for (const [rule, list] of Object.entries(ws.game.open ?? {})) list.forEach((f, k) => { if (f.endsWith(`@${id}`)) out.push({ file: 'game.json', path: ['open', rule, k], how: 'open' }) })
  return out
}

/** Every place naming level `from` made to name `to`; returns how many. */
export function renameRefs(ws, vocabulary, from, to) {
  let n = 0
  for (const [, value, schema, set] of files(ws, vocabulary)) {
    let v = value
    for (const hit of find(schema, value, 'level', { vocabulary })) if (hit.value === from || hit.value === `${ws.packageId}/${from}`) { v = setAt(v, hit.path, hit.value.includes('/') ? `${ws.packageId}/${to}` : to); n++ }
    for (const t of find(schema, v, 'text', { vocabulary })) for (const s of texts(t.value)) {
      const renamed = s.value.replace(link(from, ws.packageId), `$1${to}$2`)
      if (renamed !== s.value) { v = setAt(v, [...t.path, ...s.path], renamed); n++ }
    }
    if (v !== value) set(v)
  }
  if (ws.game.open) {
    const open = Object.fromEntries(Object.entries(ws.game.open).map(([rule, list]) => [rule, list.map((f) => (f.endsWith(`@${from}`) ? (n++, `${f.slice(0, -from.length)}${to}`) : f))]))
    ws.game = { ...ws.game, open }
  }
  return n
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const partLink = (type, namespace) => new RegExp(`(<part-ref to="(?:${namespace}/)?)${escape(type)}("></part-ref>)`, 'g')
// A board line placing the part: `x = type(…)` or `x = type[settings](…)`.
const placing = (type) => new RegExp(`(=\\s*)${escape(type)}(?=\\s*[[(])`, 'g')

// The value with the key at the end of `path` renamed `to`, in its place among the others.
const renameKey = (v, path, to) => setAt(v, path.slice(0, -1), Object.fromEntries(Object.entries(getAt(v, path.slice(0, -1))).map(([k, x]) => [k === path.at(-1) ? to : k, x])))

/** Typed item fields include references to a piece's settings and individual values. */
const itemHits = (schema, value, vocabulary) => [
  ...find(schema, value, 'ref', { vocabulary }), ...find(schema, value, 'name', { vocabulary }),
  ...find(schema, value, 'str', { vocabulary }).filter((hit) => hit.schema.reference === 'item'),
].filter((hit) => hit.schema.kind === 'part' || hit.schema.reference === 'item')

const namesItem = (value, name, namespace) => [name, `${namespace}/${name}`].some((base) => value === base || value.startsWith(`${base}.`))

function renameItem(value, from, to, namespace) {
  for (const prefix of ['', `${namespace}/`]) {
    const old = `${prefix}${from}`
    if (value === old || value.startsWith(`${old}.`)) return `${prefix}${to}${value.slice(old.length)}`
  }
  return value
}

/**
 * Every place naming part `type` (pieces.json, ../parts/): [{ file, path, how: 'field' | 'link' | 'board' | 'open' }] —
 * a field (or a map's key) its domain's schema types as a part (S.ref('part')), a <part-ref> link in a text, a board
 * placing it, an audit finding game.json leaves open ('part@level').
 */
export function partRefs(ws, vocabulary, type) {
  const out = []
  for (const [file, value, schema] of files(ws, vocabulary)) {
    for (const hit of itemHits(schema, value, vocabulary)) if (namesItem(hit.value, type, ws.packageId)) out.push({ file, path: hit.path, how: 'field' })
    for (const t of find(schema, value, 'text', { vocabulary })) for (const s of texts(t.value)) if (partLink(type, ws.packageId).test(s.value)) out.push({ file, path: [...t.path, ...s.path], how: 'link' })
    for (const b of find(schema, value, 'board', { vocabulary })) b.value.forEach((line, k) => { if (placing(type).test(line)) out.push({ file, path: [...b.path, k], how: 'board' }) })
  }
  for (const [rule, list] of Object.entries(ws.game.open ?? {})) list.forEach((f, k) => { if (f.startsWith(`${type}@`)) out.push({ file: 'game.json', path: ['open', rule, k], how: 'open' }) })
  return out
}

/** Every place naming part `from` made to name `to` (as partRefs finds them); returns how many. */
export function renamePartRefs(ws, vocabulary, from, to) {
  let n = 0
  for (const [, value, schema, set] of files(ws, vocabulary)) {
    let v = value
    const hits = itemHits(schema, value, vocabulary).filter((hit) => renameItem(hit.value, from, to, ws.packageId) !== hit.value)
    for (const hit of hits.filter((h) => !h.key)) { v = setAt(v, hit.path, renameItem(hit.value, from, to, ws.packageId)); n++ }
    // Rename deepest keys first so paths remain valid throughout the edit.
    for (const hit of hits.filter((h) => h.key).sort((a, b) => b.path.length - a.path.length)) { v = renameKey(v, hit.path, renameItem(hit.value, from, to, ws.packageId)); n++ }
    for (const t of find(schema, v, 'text', { vocabulary })) for (const s of texts(t.value)) {
      const renamed = s.value.replace(partLink(from, ws.packageId), `$1${to}$2`)
      if (renamed !== s.value) { v = setAt(v, [...t.path, ...s.path], renamed); n++ }
    }
    // A board: S.board(), or a list of blueprint lines the schema calls one (view: 'board': a naive answer, a work).
    const boards = [...find(schema, v, 'board', { vocabulary }), ...find(schema, v, 'list', { vocabulary }).filter((hit) => hit.schema.view === 'board')]
    for (const b of boards) {
      const lines = b.value.map((line) => line.replace(placing(from), `$1${to}`))
      if (lines.some((line, k) => line !== b.value[k])) { v = setAt(v, b.path, lines); n += lines.filter((line, k) => line !== b.value[k]).length }
    }
    if (v !== value) set(v)
  }
  if (ws.game.open) {
    const open = Object.fromEntries(Object.entries(ws.game.open).map(([rule, list]) => [rule, list.map((f) => (f.startsWith(`${from}@`) ? (n++, `${to}${f.slice(from.length)}`) : f))]))
    ws.game = { ...ws.game, open }
  }
  return n
}
