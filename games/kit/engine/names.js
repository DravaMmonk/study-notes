// Content names are resolved at the file boundary. Ports, settings keys, variant ids and domain resources stay local.
import { CONTENT_KINDS } from './content-kinds.js'
import { mapBlueprintNames } from '../circuit/text.js'
import { textEntries, textKey, withTextKey } from './i18n.js'
import { shapeAt, validate } from './schema.js'

export const OBJECT_KINDS = ['level', 'piece', 'entry', 'tag', 'relation', 'section', 'tray', ...Object.keys(CONTENT_KINDS)]

export const fullName = (namespace, name) => typeof name === 'string' && !name.includes('/') && !name.includes(':') ? `${namespace}/${name}` : name

/** Duplicate declarations are checked after qualification, within a single kind. */
export function registryOf(kind, declarations) {
  const registry = Object.create(null)
  for (const [name, value] of declarations) {
    if (Object.hasOwn(registry, name)) throw new Error(`duplicate ${kind} ${name}`)
    registry[name] = value
  }
  return registry
}

/** Separate registries let a level, piece and entry share a name. */
export function createRegistries(objects = {}) {
  return Object.fromEntries(OBJECT_KINDS.map((kind) => [kind, registryOf(kind, objects[kind] ?? [])]))
}

/** Expand typed references while preserving domain syntax, local ports, variant ids and ordinary strings. */
export function expandNames(value, namespace, { pieces = new Set(), pieceRules = new Set(), resolve, textKeys = true, schema, vocabulary, context = '' } = {}) {
  const rawName = resolve ?? ((v) => fullName(namespace, v))
  const name = (v) => typeof v === 'string' && v.startsWith('#') ? `#${rawName(v.slice(1))}` : rawName(v)
  const piece = (v) => {
    if (typeof v !== 'string') return v
    if (v.includes(':')) return v
    if (v.includes('/')) return name(v)
    const base = v.split(/[.=]/)[0]
    return pieces.has(base) || !vocabulary?.kinds.part?.[base] ? name(v) : v
  }
  const text = (value) => {
    if (typeof value !== 'string') return value
    return value.replace(/<(level|part|wiki)-ref to="([^"<>]+)">/g, (_, kind, target) => {
      const colon = target.indexOf(':')
      const resolved = kind === 'part' && /^(part|lemma):/.test(target)
        ? `${target.slice(0, colon + 1)}${piece(target.slice(colon + 1))}`
        : name(target)
      return `<${kind}-ref to="${resolved}">`
    })
  }
  const rule = (v) => typeof v === 'string' && (v.includes('/') || pieceRules.has(v.split('.')[0])) ? name(v) : v
  const board = (lines) => {
    if (!Array.isArray(lines) || lines.some((line) => typeof line !== 'string')) return lines
    return mapBlueprintNames(lines, (type) => type.includes('/') || pieces.has(type) ? name(type) : type, rule)
  }
  const ref = (kind, v) => {
    if (kind === 'part') return piece(v)
    return ['entry', 'group', 'tag', 'relation', 'section', 'tray', ...Object.keys(CONTENT_KINDS)].includes(kind) ? name(v) : v
  }
  const walk = (v, s, path = []) => {
    if (v === undefined || v === null) return v
    if (s?.type === 'either') {
      const shape = s.of.find((option) => validate(option, v, { vocabulary }).length === 0)
      return walk(v, shape ?? s.of.find((option) => option.type === (Array.isArray(v) ? 'list' : typeof v === 'object' ? 'obj' : 'str')), path)
    }
    if (s?.type === 'by') return walk(v, s.cases[v[s.field]], path)
    if (s?.type === 'text') {
      if (typeof v === 'string') return v.startsWith('@') && textKeys ? `@${name(v.slice(1))}` : text(v)
      const translated = Object.fromEntries(textEntries(v).map(([lang, words]) => [lang, text(words)]))
      return textKey(v) ? withTextKey(translated, textKeys ? name(textKey(v)) : textKey(v)) : translated
    }
    if (s?.reference) return s.reference === 'piece' ? piece(v) : name(v)
    if (s?.type === 'level' || s?.type === 'task') return name(v)
    if (s?.type === 'ref' || s?.type === 'name') return ref(s.kind, v)
    if (s?.type === 'board' || s?.view === 'board') return board(v)
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
      let target = s?.key ? ref(s.key.kind, key) : key
      const parent = path.at(-1)
      if (key === 'id' && path.length === 2 && ['tasks', 'entries', 'groups', 'stages'].includes(path[0])) return [key, name(child)]
      if (['rules', 'using', 'simp'].includes(key) && Array.isArray(child)) return [key, child.map(rule)]
      if (['gives', 'opens', 'withholds', 'awards'].includes(key) && Array.isArray(child) && (path.length === 0 || path.at(-2) === 'tasks' || path.at(-1) === 'reference')) return [key, child.map(piece)]
      if (key === 'tray') return [key, Array.isArray(child) ? child.map(name) : name(child)]
      if (key === 'from' && v.fromGame) return [key, child]
      if (context === 'configuration' && parent === 'borrow') target = piece(key)
      if (key === 'open' && context === 'configuration') return [key, Object.fromEntries(Object.entries(child).map(([rule, items]) => [rule, items.map((item) => {
        const at = item.indexOf('@', item.startsWith('@') ? 1 : 0)
        return at < 0 ? item : `${piece(item.slice(0, at))}@${name(item.slice(at + 1))}`
      })]))]
      if (key === 'reference' && vocabulary?.level?.fields?.tasks) field = { type: 'obj', fields: { ...vocabulary.level.fields, ...shapeAt(vocabulary.level.fields.tasks.of, child, [], { vocabulary })?.fields, solution: { type: 'board' } } }
      return [target, walk(child, field, [...path, key])]
    }))
  }
  return walk(value, schema)
}
