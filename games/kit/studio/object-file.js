// An object's file in the side panel (Inspector.jsx; games/PACKAGES.md 8): a tag, a relation or a layout picked in the
// left column has its file on the right, as the schema's form and as raw JSON. The registries hold the objects with
// full names (`<namespace>/<name>`); the layer writes its own by their short names, through the object operations:
// `<kind>.set` for a field, `<kind>.put` for the whole object (and for a field taken out). Another layer's object is
// read here only: it is overridden from the middle (SourceMark.jsx). An override picked has its file here too, as the
// override operation writes it.
import { OBJECT_SCHEMAS } from '../engine/objects.js'
import { isText, textKey } from '../engine/i18n.js'
import { getAt, parsePath, unsetAt } from '../engine/ops/edit.js'
import { localName, namespaceOf } from './objects-edit.js'
import { edgesOf, relationPatch, tagPatch } from './override-edit.js'
import { textWith } from './tag-edit.js'

export const OBJECT_KINDS = { tag: 'tags', relation: 'relations', tray: 'trays', section: 'sections' }
// A tag's kind is in its file's path (tags/<kind>/<name>.json), not in the file.
const withoutKind = (schema) => ({ ...schema, fields: Object.fromEntries(Object.entries(schema.fields).filter(([key]) => key !== 'kind')) })

/** The schema of an object kind's files. */
export const objectSchema = (kind) => (kind === 'tag' ? withoutKind(OBJECT_SCHEMAS.tags) : OBJECT_SCHEMAS[OBJECT_KINDS[kind]] ?? null)

/** An object as the registry holds it, for its file: without the id the registry adds (and a tag without its kind). */
export function objectValue(content, kind, full) {
  const value = content?.registries?.[kind]?.[full]
  if (!value) return null
  const { id: _, ...rest } = value
  if (kind !== 'tag') return rest
  const { kind: __, ...file } = rest
  return file
}

/** A value as `namespace` writes it: its own full names (and message keys) short, everything else as it is. */
export function ownObjectData(namespace, value) {
  if (typeof value === 'string') return localName(namespace, value) ?? value
  if (Array.isArray(value)) return value.map((v) => ownObjectData(namespace, v))
  if (!value || typeof value !== 'object') return value
  if (isText(value)) {
    const key = textKey(value)
    return key ? { ...value, $key: localName(namespace, key) ?? key } : value
  }
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, ownObjectData(namespace, v)]))
}

/** The file an object is written in: in `namespace`'s own package by its path there, another's prefixed with it. */
export function objectFileName(kind, full, tagKind = null, namespace = null) {
  const name = full.slice(full.indexOf('/') + 1)
  const folder = kind === 'tag' ? `tags/${tagKind ?? 'level'}` : OBJECT_KINDS[kind]
  const owner = namespaceOf(full) ?? ''
  return owner === namespace ? `${folder}/${name}.json` : `${owner}/${folder}/${name}.json`
}

/**
 * The operation an edit of an object's field makes: `object` { kind, full, namespace, value, tagKind? } (`value` as its
 * file has it, objectValue; a tag's kind, from its folder, written back with it whole). edit: { set, lang? } | { unset: true } at `path`; `type` 'text' for one language of a text. Null when the
 * object is not the layer's own, or for an edit no operation makes (the whole object taken out: the list removes it).
 */
export function objectOp(object, path, edit, type = null) {
  const { kind, full, namespace, value } = object
  const name = localName(namespace, full)
  if (!name || !OBJECT_KINDS[kind]) return null
  const keys = parsePath(path)
  const set = (data) => ({ op: `${kind}.set`, [kind]: name, path: keys, value: data })
  const put = (data) => ({ op: `${kind}.put`, [kind]: name, data: ownObjectData(namespace, kind === 'tag' ? { kind: object.tagKind, ...data } : data) })
  if (type === 'text' && !edit.unset) {
    if (!keys.length) return null
    return set(edit.lang ? textWith(namespace, getAt(value, keys), edit.lang, edit.set) : edit.set)
  }
  if (!keys.length) return edit.unset ? null : put(edit.set)
  if (edit.unset) return put(unsetAt(value, keys))
  return set(ownObjectData(namespace, edit.set))
}

const without = (value, keys) => Object.fromEntries(Object.entries(value ?? {}).filter(([k]) => !keys.includes(k)))
const changed = (before, after, skip) => Object.fromEntries(Object.entries(without(after, skip)).filter(([k, v]) => JSON.stringify(before?.[k]) !== JSON.stringify(v)))

/**
 * An override's file, as the override operation writes it, from the event the loader keeps ({ kind, before, after }):
 * a tag by the members it adds and takes out (and the fields it changes), a relation by its edges added and taken
 * out, anything else whole.
 */
export function overrideFileOf(event) {
  if (event.kind === 'tag') return { ...changed(event.before, event.after, ['kind', 'values']), ...tagPatch(event.before, event.after?.values ?? []) }
  if (event.kind === 'relation') return { ...changed(event.before, event.after, ['edges', 'sequence']), ...relationPatch(event.before, edgesOf(event.after)) }
  return event.after ?? {}
}

/** Where an override's file is, in the layer that made it. */
export function overrideFileName(event) {
  const [namespace, name] = [namespaceOf(event.name) ?? '', event.name.slice(event.name.indexOf('/') + 1)]
  const folder = event.kind === 'i18n' ? 'i18n' : event.kind === 'tag' ? `tags/${event.after?.kind ?? event.before?.kind ?? 'level'}` : OBJECT_KINDS[event.kind] ?? event.kind
  return `${event.layer}/overrides/${namespace}/${folder}/${name}.json`
}

/** The operation an override's file edited as raw JSON makes, in the layer that owns it; null in another layer. */
export function overrideOp(event, layer, data) {
  if (event.layer !== layer) return null
  return { op: 'override.put', layer, kind: event.kind, name: event.name, data }
}
