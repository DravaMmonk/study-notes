import { BUILTIN_KIND_NAMES } from './plugin-kinds.js'
// Content names are resolved at the file boundary. Ports, settings keys, variant ids and domain resources stay local.
import { CONTENT_KINDS } from './content-kinds.js'
import { meaningsOf } from './kind-meanings.js'
import { textEntries, textKey, withTextKey } from './i18n.js'
import { shapeAt } from './schema.js'

export const OBJECT_KINDS = ['level', 'entry', 'tag', 'relation', 'section', ...Object.keys(CONTENT_KINDS)]

export { fullName } from './object-name.js'
import { fullName } from './object-name.js'

/** Duplicate declarations are checked after qualification, within a single kind. */
export function registryOf(kind, declarations) {
  const registry = Object.create(null)
  for (const [name, value] of declarations) {
    if (Object.hasOwn(registry, name)) throw new Error(`duplicate ${kind} ${name}`)
    registry[name] = value
  }
  return registry
}

/** Separate registries let objects of different types share a name. */
export function createRegistries(objects = {}) {
  return Object.fromEntries([...new Set([...OBJECT_KINDS, ...Object.keys(objects)])].map((kind) => [kind, registryOf(kind, objects[kind] ?? [])]))
}

/** Expand typed references while preserving domain syntax, local ports, variant ids and ordinary strings. */
export function expandNames(value, namespace, { resolve, textKeys = true, schema, vocabulary, context = '', ...options } = {}) {
  const rawName = resolve ?? ((v) => fullName(namespace, v))
  const name = (v) => typeof v === 'string' && v.startsWith('#') ? `#${rawName(v.slice(1))}` : rawName(v)
  const readers = meaningsOf(vocabulary).map(meaning => meaning.names?.({ ...options, name, vocabulary, context })).filter(Boolean)
  const text = (value) => {
    if (typeof value !== 'string') return value
    return value.replace(/<([a-z][a-z0-9-]*)-ref to="([^"<>]+)">/g, (_, kind, target) => {
      const resolved = readers.map(reader => reader.link?.(kind, target)).find(value => value !== undefined) ?? name(target)
      return `<${kind}-ref to="${resolved}">`
    })
  }
  const ref = (kind, v) => {
    const replacement = readers.map(reader => reader.rewrite?.({ value: v, schema: { type: 'ref', kind, reference: kind }, path: [] })).find(result => result && Object.hasOwn(result, 'value'))
    if (replacement) return replacement.value
    if (kind === 'kind' && BUILTIN_KIND_NAMES.includes(v)) return v
    return ['entry', 'group', 'tag', 'relation', 'section', ...Object.keys(CONTENT_KINDS), ...Object.keys(vocabulary?.objectKinds ?? {}), 'kind'].includes(kind) ? name(v) : v
  }
  const walk = (v, s, path = []) => {
    if (v === undefined || v === null) return v
    if (s?.type === 'either') {
      return walk(v, shapeAt(s, v, [], { vocabulary }), path)
    }
    if (s?.type === 'by') return walk(v, s.cases[v[s.field]], path)
    if (s?.type === 'text') {
      if (typeof v === 'string') return v.startsWith('@') && textKeys ? `@${name(v.slice(1))}` : text(v)
      const translated = Object.fromEntries(textEntries(v).map(([lang, words]) => [lang, text(words)]))
      return textKey(v) ? withTextKey(translated, textKeys ? name(textKey(v)) : textKey(v)) : translated
    }
    const replacement = readers.map(reader => reader.rewrite?.({ value: v, schema: s, path, key: path.at(-1) })).find(result => result && Object.hasOwn(result, 'value'))
    if (replacement) return replacement.value
    if (s?.reference) return name(v)
    if (s?.type === 'level' || s?.type === 'task') return name(v)
    if (s?.type === 'ref' || s?.type === 'name') return ref(s.kind, v)
    if (s?.type === 'call') {
      if (typeof v === 'string') return v
      return Object.fromEntries(Object.entries(v).map(([key, child]) => [key, walk(child, vocabulary?.kinds[s.kind]?.[key]?.params, [...path, key])]))
    }
    if (Array.isArray(v)) return v.map((child, index) => walk(child, s?.of, [...path, index]))
    if (typeof v !== 'object') return v
    // Catalog text in schema-free metadata (e.g. a course blueprint) still gets its owning namespace.
    if (!s && textKey(v)) return walk(v, { type: 'text' }, path)
    return Object.fromEntries(Object.entries(v).map(([key, child]) => {
      let field = s?.type === 'map' ? s.of : s?.fields?.[key]
      let target = s?.key ? ref(s.key.reference ?? s.key.kind, key) : key
      if (key === 'id' && path.length === 2 && ['tasks', 'entries', 'groups'].includes(path[0])) return [key, name(child)]
      if (key === 'from' && v.fromGame) return [key, child]
      for (const reader of readers) {
        const replacement = reader.rewrite?.({ value: child, schema: field, path: [...path, key], key, object: v })
        if (replacement && Object.hasOwn(replacement, 'value')) return [target, replacement.value]
        target = replacement?.key ?? target
        field = replacement?.schema ?? field
      }
      return [target, walk(child, field, [...path, key])]
    }))
  }
  return walk(value, schema)
}
