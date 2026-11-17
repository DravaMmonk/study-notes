// Where a game's content names a level: every field its domain's schema types as a level (schema.js S.level, the
// chapters and typed object members included), every <level-ref> link inside a text, and the audit findings game.json leaves open
// ('part@level').
import { PARTS_FILE } from '../parts/schema.js'
import { S, find } from '../schema.js'
import { ENTRY } from '../vocabulary.js'
import { OBJECT_SCHEMAS } from '../objects.js'
import { textEntries } from '../i18n.js'

// game.json's own fields, outside its domain's schema (vocabulary.js checkContent).
const META = ['domain', 'vocabulary', 'open']
const own = (game) => Object.fromEntries(Object.entries(game).filter(([k]) => !META.includes(k)))
const link = (id, namespace) => new RegExp(`(<level-ref to="(?:${namespace}/)?)${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}("></level-ref>)`, 'g')

/** The files of a workspace with the schema each is read by: [[name, value, schema]]. */
const files = (ws, vocabulary) => [
  ['game.json', own(ws.game), vocabulary.game],
  ...[...ws.entries].map(([id, entry]) => [`entries/${id}.json`, entry, ENTRY]),
  ...Object.entries(ws.partDefs?.parts ?? {}).map(([id, part]) => [`parts/${id}.json`, part, PARTS_FILE.fields.parts.of]),
  ...[...ws.levels].map(([id, level]) => [`levels/${id}.json`, level, vocabulary.level]),
  ...Object.entries(OBJECT_SCHEMAS).flatMap(([kind, schema]) => [...(ws[kind] ?? [])].map(([id, value]) => [`${kind}/${id}.json`, value, objectReferenceSchema(ws, kind, value, schema)])),
]

// Object registries are separate: level references never name a same-named part or text.
function objectReferenceSchema(ws, kind, value, schema) {
  const local = (id) => id?.replace(`#${ws.packageId}/`, '').replace(`${ws.packageId}/`, '').replace(/^#/, '')
  const endpoints = [...(value.edges ?? []).flatMap(({ from, to }) => [from, to]), ...(value.sequence ?? [])]
  const first = endpoints.find((id) => id.startsWith('#')) ?? endpoints[0]
  const of = value.of ?? (first?.startsWith('#') ? ws.tags.get(local(first))?.kind : ws.levels.has(local(first)) ? 'level' : 'part')
  const reference = (type) => type === 'level' ? S.level() : type === 'part' ? S.ref('part') : S.str()
  if (kind === 'tags') return { ...schema, fields: { ...schema.fields, values: S.list(reference(value.kind)) } }
  if (kind === 'relations') {
    const ref = reference(value.kind === 'requires' ? 'level' : value.kind === 'replaces' ? 'part' : of)
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

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const partLink = (type, namespace) => new RegExp(`(<part-ref to="(?:${namespace}/)?)${escape(type)}("></part-ref>)`, 'g')
// A board line placing the part: `x = type(…)` or `x = type[settings](…)`.
const placing = (type) => new RegExp(`(=\\s*)${escape(type)}(?=\\s*[[(])`, 'g')

/** Typed item fields include references to a part's settings and individual values. */
const itemHits = (schema, value, vocabulary) => [
  ...find(schema, value, 'ref', { vocabulary }), ...find(schema, value, 'name', { vocabulary }),
  ...find(schema, value, 'str', { vocabulary }).filter((hit) => hit.schema.reference === 'part'),
].filter((hit) => hit.schema.kind === 'part' || hit.schema.reference === 'part')

const namesItem = (value, name, namespace) => [name, `${namespace}/${name}`].some((base) => value === base)

/**
 * Every place naming part `type` (parts/<name>.json, ../parts/): [{ file, path, how: 'field' | 'link' | 'board' | 'open' }] —
 * a field (or a map's key) its domain's schema types as a part (S.ref('part')), a <part-ref> link in a text, a board
 * placing it, an audit finding game.json leaves open ('part@level').
 */
export function partRefs(ws, vocabulary, type) {
  const out = []
  const names = [type, ...(ws.partDefs?.parts[type]?.stages ?? []).map(stage => stage.id)]
  for (const [file, value, schema] of files(ws, vocabulary)) {
    for (const hit of itemHits(schema, value, vocabulary)) if (names.some(name => namesItem(hit.value, name, ws.packageId))) out.push({ file, path: hit.path, how: 'field' })
    for (const t of find(schema, value, 'text', { vocabulary })) for (const s of texts(t.value)) if (partLink(type, ws.packageId).test(s.value)) out.push({ file, path: [...t.path, ...s.path], how: 'link' })
    for (const b of find(schema, value, 'board', { vocabulary })) b.value.forEach((line, k) => { if (placing(type).test(line)) out.push({ file, path: [...b.path, k], how: 'board' }) })
  }
  for (const [rule, list] of Object.entries(ws.game.open ?? {})) list.forEach((f, k) => { if (f.startsWith(`${type}@`)) out.push({ file: 'game.json', path: ['open', rule, k], how: 'open' }) })
  return out
}
