import { tagKey, tagName } from './tag-identity.js'
import { meaningsOf, kindMatches } from './kind-meanings.js'
export const registryVocabularies = new WeakMap()
// Typed collections, presentation objects and directed relations share one reference resolver.
import { S, shapeAt } from './schema.js'
import { fullName } from './names.js'
import { dependencyCycle } from '../course.js'

export const OBJECT_NAME = '^(?:@?[a-z][a-z0-9-]*/)?[A-Za-z0-9][A-Za-z0-9_-]*$'
export const REFERENCE = S.str({ pattern: '^#?(?:(?:@?[a-z][a-z0-9-]*/)|(?:[a-z][a-z0-9-]*:))?[A-Za-z0-9][A-Za-z0-9_-]*$' })
export const TAG = S.obj({ kind: S.str(), title: S.opt(S.text()), desc: S.opt(S.text()), values: S.set({ ...REFERENCE, reference: '$kind' }) })
export const RELATION = S.obj({ kind: S.str(), edges: S.edges({ ...REFERENCE, reference: '$endpoint' }) })
export const SECTION = S.obj({ title: S.text(), desc: S.opt(S.text()), values: S.list({ ...REFERENCE, reference: 'entry' }) })
export const OBJECT_SCHEMAS = { tags: TAG, relations: RELATION, sections: SECTION }
export const referenceName = (namespace, value) => typeof value === 'string' && value.startsWith('#') ? `#${fullName(namespace, value.slice(1))}` : fullName(namespace, value)

/** Qualify each object at its declaring layer, including relation patches. */
export function qualifyObject(kind, value, namespace, text = (v) => v, resolve = referenceName) {
  const refs = value => Array.isArray(value) ? value.map(v => typeof v === 'string' ? resolve(namespace, v) : { ...v, from: resolve(namespace, v.from), to: resolve(namespace, v.to) }) : value
  const field = kind === 'relations' ? 'edges' : 'values'
  const collection = value[field]
  return { ...value, ...(value.title !== undefined && { title: text(value.title) }), ...(value.desc !== undefined && { desc: text(value.desc) }), ...(collection !== undefined && { [field]: Array.isArray(collection) ? refs(collection) : Object.fromEntries(Object.entries(collection).map(([key, values]) => [key, key === 'insert' ? values.map(item => ({ ...item, ...(item.before && { before: resolve(namespace, item.before) }), ...(item.after && { after: resolve(namespace, item.after) }), values: refs(item.values) })) : refs(values)])) }) }
}

/** One resolver for every typed reference field and relation endpoint. Tags are unordered sets. */
export function referenceResolver(registries, problems = [], vocabulary = registryVocabularies.get(registries)) {
  const report = (at, says) => problems.push({ at, says })
  const entries = [...Object.entries(registries).flatMap(([kind, values]) => Object.keys(values).map(name => ({ kind, name }))), ...meaningsOf(vocabulary).flatMap(meaning => meaning.indexes?.({ registries }) ?? []), ...Object.entries(registries).flatMap(([kind, values]) => Object.values(values).flatMap(value => meaningsOf(vocabulary).flatMap(meaning => meaning.identities?.({ kind, value }) ?? [])))]
  const has = (kind, id) => entries.some(entry => entry.name === id && entry.kind !== 'tag' && kindMatches(vocabulary, kind, entry.kind))
  const findTag = (name, kind, at) => {
    const matches = Object.entries(registries.tag ?? {}).filter(([key, tag]) => tagName(key) === name && (kindMatches(vocabulary, kind, tag.kind)))
    if (matches.length !== 1) {
      if (matches.length) report(at, `ambiguous tag ${name}: ${matches.map(([, tag]) => tag.kind).join(', ')}`)
      return null
    }
    return matches[0]
  }
  const expand = (value, kind, at = 'reference', active = [], member) => {
    const values = Array.isArray(value) ? value : [value]
    const out = values.flatMap((id) => {
      if (typeof id !== 'string') return []
      if (kind === 'tag') {
        if (!id.startsWith('#')) { report(at, `expected a tag reference, got ${id}`); return [] }
        return findTag(id.slice(1), member ?? 'any', at) ? [id] : []
      }
      if (!id.startsWith('#')) {
        if (kind === 'any') {
          const matches = Object.keys(registries).filter(type => type !== 'tag' && has(type, id))
          if (matches.length > 1) report(at, `ambiguous object ${id}: ${matches.join(', ')}`)
        }
        return [id]
      }
      const found = findTag(id.slice(1), kind, at)
      if (!found) return []
      const [key, tag] = found
      if (active.includes(key)) { report(at, `circular tags: ${[...active, key].join(' → ')}`); return [] }
      return expand(tag.values, tag.kind, at, [...active, key])
    })
    return [...new Set(out)].sort()
  }
  expand.vocabulary = vocabulary
  expand.entries = entries
  expand.registries = registries
  expand.kindOf = (id) => {
    if (id.startsWith('#')) return findTag(id.slice(1), 'any', 'reference')?.[1].kind
    const matches = Object.keys(registries).filter(kind => kind !== 'tag' && has(kind, id))
    if (matches.length > 1) report('reference', `ambiguous object ${id}: ${matches.join(', ')}`)
    return matches.length === 1 ? matches[0] : undefined
  }
  return expand
}

export const referenceKind = (schema) => schema?.type === 'either' ? schema.of.map(referenceKind).find(Boolean) : schema?.reference ?? (schema?.type === 'level' ? 'level' : ['ref', 'name'].includes(schema?.type) ? (schema.kind?.includes('/') ? schema.kind : { entry: 'entry' }[schema.kind]) : null)

/** Expand tags structurally, using schema types rather than a list of field names. */
export function expandReferences(value, schema, expand, vocabulary, at = 'content') {
  if (value === undefined || value === null) return value
  if (schema?.type === 'either') {
    const selected = (typeof value === 'string' && value.startsWith('#') && schema.of.find((s) => referenceKind(s))) || shapeAt(schema, value, [], { vocabulary })
    return expandReferences(value, selected, expand, vocabulary, at)
  }
  if (schema?.members && typeof value === 'string') {
    expand(value.startsWith('#') ? value : `#${value}`, schema.members, at)
    return value
  }
  if (schema?.type === 'by') return expandReferences(value, schema.cases[value[schema.field]], expand, vocabulary, at)
  if (schema?.type === 'edges' && Array.isArray(value)) return value.flatMap(edge => {
    const from = edge.game ? [edge.from] : expand(edge.from, referenceKind(schema.of.fields.from), at)
    const to = expand(edge.to, referenceKind(schema.of.fields.to), at)
    return from.flatMap(from => to.map(to => ({ ...edge, from, to })))
  })

  if (Array.isArray(value)) {
    const kind = referenceKind(schema?.of)
    const tagged = kind && value.some((child) => typeof child === 'string' && child.startsWith('#'))
    const list = value.flatMap((child, i) => typeof child === 'string' && child.startsWith('#') && kind
      ? expand(child, kind, `${at}[${i}]`)
      : [expandReferences(child, schema?.of, expand, vocabulary, `${at}[${i}]`)])
    return tagged ? [...new Set(list)] : list
  }
  if (typeof value === 'string' && (schema?.reference || schema?.kind?.includes('/')) && !value.startsWith('#')) expand(value, schema.reference ?? schema.kind, at)
  if (typeof value === 'string' && value.startsWith('#') && referenceKind(schema)) {
    const ids = expand(value, referenceKind(schema), at)
    if (ids.length === 0) return value
    if (ids.length !== 1) throw new Error(`${at}: a scalar reference needs exactly one member, got ${ids.length}`)
    return ids[0]
  }
  if (typeof value !== 'object' || schema?.type === 'text') return value
  return Object.fromEntries(Object.entries(value).flatMap(([key, child]) => {
    const keys = key.startsWith('#') && referenceKind(schema?.key) ? expand(key, referenceKind(schema.key), at) : [key]
    const resolved = expandReferences(child, schema?.type === 'map' ? schema.of : schema?.fields?.[key], expand, vocabulary, `${at}.${key}`)
    return keys.map((name) => [name, resolved])
  }))
}

const edgesOf = relation => relation.edges ?? []

/** Expand each relation's tag boundaries against its own edges, restricted to scheduled levels. */
export function expandRelations(relations, expand, scheduled, problems = [], optional = new Set(), definitions = {}) {
  const result = Object.fromEntries(['requires', ...Object.keys(definitions)].map(kind => [kind, []]))
  for (const [name, relation] of Object.entries(relations)) {
    const declaration = definitions[relation.kind]
    const kind = relation.kind === 'requires' ? 'level' : declaration?.from ?? 'any'
    const ends = (id, external = false, side = 'from') => (external && !id.startsWith('#') ? [id] : expand(id, declaration?.[side] ?? kind, `relations/${name}`)).filter((v) => external || kind !== 'level' || scheduled.has(v))
    const raw = edgesOf(relation)
    for (const meaning of meaningsOf(expand.vocabulary)) problems.push(...(meaning.relationProblems?.({ name, relation, edges: raw, expand }) ?? []))
    if (raw.some(e => e.from === e.to)) problems.push({ at: `relations/${name}`, says: `circular ${relation.kind}: a relation cannot link an endpoint to itself` })
    const candidates = raw.map((edge) => ({ edge, from: ends(edge.from, Boolean(edge.game)), to: ends(edge.to, false, 'to') }))
    const direct = candidates.flatMap(({ edge, from, to }) => from.flatMap((f) => to.map((t) => ({ ...edge, from: f, to: t }))))
    if (relation.kind === 'requires') {
      const ids = [...new Set(direct.filter((edge) => !edge.game).flatMap((edge) => [edge.from, edge.to]))]
      const graph = new Map(ids.map((id) => [id, direct.filter((edge) => !edge.game && edge.to === id).map((edge) => edge.from)]))
      const cycle = dependencyCycle(graph)
      if (cycle) problems.push({ at: `relations/${name}`, says: `circular ${relation.kind}: ${cycle.join(' → ')}` })
    }
    const boundary = (id, ids, side) => {
      if (!id.startsWith('#')) return ids
      const ends = ids.filter((v) => !direct.some((e) => !e.game && (side === 'from' ? e.from === v && ids.includes(e.to) : e.to === v && ids.includes(e.from))))
      const required = ends.filter((v) => !optional.has(v))
      return side === 'from' && kind === 'level' && required.length ? required : ends
    }
    for (const { edge, from, to } of candidates) for (const f of boundary(edge.from, from, 'from')) for (const t of boundary(edge.to, to, 'to')) (result[relation.kind] ??= []).push({ ...edge, from: f, to: t })
  }
  for (const kind of Object.keys(result)) {
    const edges = result[kind].filter(edge => !edge.game)
    const graph = new Map([...new Set(edges.flatMap(edge => [edge.from, edge.to]))].map(id => [id, edges.filter(edge => edge.to === id).map(edge => edge.from)]))
    const cycle = dependencyCycle(graph)
    if (cycle) problems.push({ at: 'relations', says: `circular ${kind}: ${cycle.join(' → ')}` })
  }
  for (const kind of Object.keys(result)) result[kind] = [...new Map(result[kind].map((e) => [JSON.stringify(e), e])).values()]
  return result
}

/** Stable topological order: satisfy edges first, then compare full names by code point. */
export function relationOrder(ids, edges) {
  // Kahn's order, always taking the ready id that sorts first; a cycle leaves the rest, sorted after what came out.
  const pending = new Set(ids), after = new Map(), waiting = new Map([...pending].map((id) => [id, 0]))
  for (const { from, to } of edges) {
    if (!pending.has(from) || !pending.has(to)) continue
    after.set(from, [...(after.get(from) ?? []), to])
    waiting.set(to, waiting.get(to) + 1)
  }
  const ready = [...pending].filter((id) => waiting.get(id) === 0).sort()
  const insert = (id) => {
    let lo = 0, hi = ready.length
    while (lo < hi) { const mid = (lo + hi) >> 1; if (ready[mid] < id) lo = mid + 1; else hi = mid }
    ready.splice(lo, 0, id)
  }
  const out = []
  while (ready.length) {
    const id = ready.shift()
    pending.delete(id); out.push(id)
    for (const to of after.get(id) ?? []) {
      waiting.set(to, waiting.get(to) - 1)
      if (waiting.get(to) === 0) insert(to)
    }
  }
  return pending.size ? [...out, ...pending].sort() : out
}

/** Studio groups derive member order from prerequisites, then full names. */
export function orderedMembers(content, ids, kind = 'level') {
  const edges = kind === 'level' ? (content.relationEdges?.requires ?? []).filter(edge => !edge.game) : []
  const selected = new Set(ids)
  const nodes = [...new Set([...ids, ...edges.flatMap(edge => [edge.from, edge.to])])]
  return relationOrder(nodes, edges, kind).filter(id => selected.has(id))
}
export function orderedTags(content, kind) {
  return Object.entries(content.registries?.tag ?? {}).filter(([, tag]) => tag.kind === kind).map(([key]) => tagName(key)).sort()
}

/** The runtime route consumed by courseLayout, maps and domains; chapter rows belong to the game. */
export function assembleChapters(chapters, { expand, relations, optional = [], skippable = [], problems = [] }) {
  const opt = new Set(expand(optional, 'level')), skip = new Set(expand(skippable, 'level'))
  const seen = new Set()
  return chapters.map((chapter) => {
    const ids = (chapter.levels ?? []).filter((id) => {
      if (typeof id !== 'string' || id.startsWith('#') || !id.includes('/')) {
        problems.push({ at: `chapters/${chapter.id}.levels`, says: 'chapter levels must be an ordered list of level full names, without tags' })
        return false
      }
      expand(id, 'level', `chapters/${chapter.id}`)
      return true
    })
    for (const id of ids) { if (seen.has(id)) problems.push({ at: 'chapters', says: `${id} is placed twice` }); seen.add(id) }
    const positions = new Map(ids.map((id, i) => [id, i]))
    for (const edge of relations.requires) if (!edge.game && positions.has(edge.from) && positions.has(edge.to) && positions.get(edge.from) >= positions.get(edge.to)) {
      problems.push({ at: `chapters/${chapter.id}.levels`, says: `${edge.from} must precede ${edge.to} in chapter order` })
    }
    return { ...chapter, levels: ids.map((id) => ({ id, ...(opt.has(id) && { optional: true }), ...(skip.has(id) && { skippable: true }) })), links: relations.requires.filter((e) => ids.includes(e.to)).map(({ game, ...e }) => ({ ...e, ...(game && { fromGame: game }) })) }
  })
}

/** Read one registered object by full name. */
export function objectOf(content, kind, name, member) {
  if (kind === 'tag' && !member) throw new Error('tag lookup needs a member type')
  const value = content.registries?.[kind]?.[kind === 'tag' ? tagKey(member, name) : name]
  if (!value) throw new Error(`unknown ${kind} ${name}`)
  return value
}

/** Expanded chapter order and prerequisite edges for route maps and relation boards. */
export const courseRoute = (content) => ({ chapters: content.eras ?? [], edges: content.relationEdges?.requires ?? [] })

/** Import from assembled package content, including local prerequisite closure before game scheduling. */
export function importLevelOrder(content, references) {
  const problems = []
  const expand = referenceResolver(content.registries, problems)
  const ids = new Set(Object.keys(content.registries.level))
  const edges = expandRelations(content.registries.relation, expand, ids, problems)
  const selected = new Set(expand(references, 'level'))
  const visit = (id) => {
    for (const edge of edges.requires) if (!edge.game && edge.to === id && !selected.has(edge.from)) {
      selected.add(edge.from)
      visit(edge.from)
    }
  }
  for (const id of selected) visit(id)
  if (problems.length) throw new Error(problems.map(({ at, says }) => `${at}: ${says}`).join('\n'))
  const display = relationOrder([...ids], edges.requires).filter(id => selected.has(id))
  const pending = new Set(display), out = []
  while (pending.size) {
    const next = display.find(id => pending.has(id) && !edges.requires.some(edge => !edge.game && edge.to === id && pending.has(edge.from)))
    if (!next) throw new Error('circular level prerequisites')
    pending.delete(next)
    out.push(next)
  }
  return out
}
