import { tagName } from '../tag-identity.js'
// Where a game's content names a level: every field its domain's schema types as a level (schema.js S.level, the
// chapters and typed object members included), every <level-ref> link inside a text, and the audit findings game.json leaves open
// ('object@level').
import { kindSchemas } from '../plugin-kinds.js'
import { S, find } from '../schema.js'
import { ENTRY } from '../vocabulary.js'
import { OBJECT_SCHEMAS } from '../objects.js'
import { textEntries } from '../i18n.js'

// game.json's own fields, outside its domain's schema (vocabulary.js checkContent).
const META = ['domain', 'vocabulary', 'open']
const own = (game) => Object.fromEntries(Object.entries(game).filter(([k]) => !META.includes(k)))
const link = (id, namespace) => new RegExp(`(<level-ref to="(?:${namespace}/)?)${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}("></level-ref>)`, 'g')

/** The files of a workspace with the schema each is read by: [[name, value, schema]]. */
export const workspaceFiles = (ws, vocabulary) => [
  ['game.json', own(ws.game), vocabulary.game],
  ...[...ws.entries].map(([id, entry]) => [`entries/${id}.json`, entry, ENTRY]),
  ...Object.entries(ws.contentObjects ?? {}).flatMap(([kind, values]) => [...values].map(([id, value]) => [`${ws.kindFolders?.[kind] ?? kind}/${id}.json`, value, kindSchemas(vocabulary)[kind]])),
  ...[...ws.levels].map(([id, level]) => [`levels/${id}.json`, level, vocabulary.level]),
  ...Object.entries(OBJECT_SCHEMAS).flatMap(([kind, schema]) => [...(ws[kind] ?? [])].map(([id, value]) => [`${kind}/${kind === 'tags' ? `${value.kind}/${tagName(id)}` : id}.json`, value, objectReferenceSchema(ws, kind, value, schema, vocabulary)])),
]

// Object registries are separate: level references never name a same-named object of another type.
function objectReferenceSchema(ws, kind, value, schema, vocabulary) {
  const local = (id) => id?.replace(`#${ws.packageId}/`, '').replace(`${ws.packageId}/`, '').replace(/^#/, '')
  const endpoints = [...(value.edges ?? []).flatMap(({ from, to }) => [from, to]), ...(value.sequence ?? [])]
  const first = endpoints.find((id) => id.startsWith('#')) ?? endpoints[0]
  const of = value.of ?? (first?.startsWith('#') ? [...ws.tags].filter(([key]) => tagName(key) === local(first)).map(([, tag]) => tag.kind).filter(type => !value.member || type === value.member)[0] : ws.levels.has(local(first)) ? 'level' : Object.keys(ws.contentObjects ?? {}).find(kind => ws.contentObjects[kind].has(local(first))) ?? 'any')
  const reference = (type) => type === 'level' ? S.level() : S.str({ reference: type })
  if (kind === 'tags') return { ...schema, fields: { ...schema.fields, values: S.list(reference(value.kind)) } }
  if (kind === 'relations') {
    const ref = reference(value.kind === 'requires' ? 'level' : Object.values(vocabulary.objectKinds ?? {}).map(definition => definition.relations?.[value.kind]?.from).find(Boolean) ?? of)
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
  for (const [file, value, schema] of workspaceFiles(ws, vocabulary)) {
    for (const hit of find(schema, value, 'level', { vocabulary })) if (hit.value === id || hit.value === `${ws.packageId}/${id}`) out.push({ file, path: hit.path, how: 'field' })
    for (const t of find(schema, value, 'text', { vocabulary })) for (const s of texts(t.value)) if (link(id, ws.packageId).test(s.value)) out.push({ file, path: [...t.path, ...s.path], how: 'link' })
  }
  for (const [rule, list] of Object.entries(ws.game.open ?? {})) list.forEach((f, k) => { if (f.endsWith(`@${id}`)) out.push({ file: 'game.json', path: ['open', rule, k], how: 'open' }) })
  return out
}
