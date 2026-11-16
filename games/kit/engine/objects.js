import { contentKindSchemas } from './content-kinds.js'
import { pieceStages } from './piece-stages.js'
// Typed collections, directed relations and selected map sections share one reference resolver.
import { S, validate } from './schema.js'
import { fullName } from './names.js'
import { dependencyCycle, dependencyOrder } from '../course.js'

export const OBJECT_NAME = '^(?:@?[a-z][a-z0-9-]*/)?[A-Za-z0-9][A-Za-z0-9_-]*$'
export const REFERENCE = S.str({ pattern: '^#?(?:(?:@?[a-z][a-z0-9-]*/)|(?:[a-z][a-z0-9-]*:))?[A-Za-z0-9][A-Za-z0-9_-]*$' })
export const TAG = S.obj({ kind: S.oneOf(['level', 'piece', 'entry']), title: S.opt(S.text()), desc: S.opt(S.text()), values: S.list(REFERENCE) })
const EDGE = S.obj({ from: REFERENCE, to: REFERENCE, required: S.opt(S.bool()), game: S.opt(S.str()) })
export const RELATION = S.obj({ kind: S.oneOf(['requires', 'order', 'replaces']), of: S.opt(S.oneOf(['level', 'piece', 'entry', 'tag', 'section'])), edges: S.opt(S.list(EDGE)), sequence: S.opt(S.list(REFERENCE)) })
export const SECTION = S.obj({ title: S.text(), desc: S.opt(S.text()), values: S.list(REFERENCE) })
export const TRAY_OBJECT = S.obj({ title: S.opt(S.text()), desc: S.opt(S.text()), workshop: S.opt(S.bool()), values: S.list(REFERENCE), menus: S.opt(S.list(S.obj({ id: S.str({ pattern: OBJECT_NAME }), title: S.text(), values: S.list(REFERENCE) }))) })
export const OBJECT_SCHEMAS = { tags: TAG, relations: RELATION, sections: SECTION, trays: TRAY_OBJECT }
export const referenceName = (namespace, value) => typeof value === 'string' && value.startsWith('#') ? `#${fullName(namespace, value.slice(1))}` : fullName(namespace, value)

/** Qualify each object at its declaring layer, including relation patches. */
export function qualifyObject(kind, value, namespace, text = (v) => v, resolve = referenceName) {
  const ref = (v) => resolve(namespace, v)
  if (['tags', 'trays', 'sections'].includes(kind)) return { ...value, ...(value.title !== undefined && { title: text(value.title) }), ...(value.desc !== undefined && { desc: text(value.desc) }), ...(value.values && { values: value.values.map(ref) }), ...(value.menus && { menus: value.menus.map(menu => ({ ...menu, id: ref(menu.id), title: text(menu.title), values: menu.values.map(ref) })) }), ...(value.remove && { remove: value.remove.map(ref) }) }
  const edge = (e) => ({ ...e, from: ref(e.from), to: ref(e.to) })
  if (kind === 'relations') return { ...value, ...(value.edges && { edges: value.edges.map(edge) }), ...(value.sequence && { sequence: value.sequence.map(ref) }), ...(value.remove && { remove: value.remove.map(edge) }) }
  throw new Error(`unknown object kind ${kind}`)
}

/** One resolver for every typed reference field and relation endpoint. Tags are unordered sets. */
export function referenceResolver(registries, problems = []) {
  const report = (at, says) => problems.push({ at, says })
  const stages = pieceStages(registries.piece)
  const has = (kind, id) => {
    if (kind === 'piece') return stages.has(id)
    return kind === 'any' ? ['level', 'piece', 'entry'].some((k) => has(k, id)) : Object.hasOwn(registries[kind] ?? {}, id)
  }
  const expand = (value, kind, at = 'reference', active = []) => {
    const values = Array.isArray(value) ? value : [value]
    const out = values.flatMap((id) => {
      if (typeof id !== 'string') return []
      if (kind === 'tag') {
        if (!id.startsWith('#')) { report(at, `expected a tag reference, got ${id}`); return [] }
        if (!registries.tag[id.slice(1)]) { report(at, `unknown tag ${id.slice(1)}`); return [] }
        return [id]
      }
      if (!id.startsWith('#')) {
        if (!has(kind, id)) report(at, `unknown ${kind} ${id}`)
        return [id]
      }
      const name = id.slice(1), tag = registries.tag[name]
      if (!tag) { report(at, `unknown tag ${name}`); return [] }
      if (kind !== 'any' && tag.kind !== kind) { report(at, `tag ${name} contains ${tag.kind}, expected ${kind}`); return [] }
      if (active.includes(name)) { report(at, `circular tags: ${[...active, name].join(' → ')}`); return [] }
      return expand(tag.values, kind === 'any' ? tag.kind : kind, at, [...active, name])
    })
    return [...new Set(out)].sort()
  }
  expand.menu = id => Object.values(registries.tray ?? {}).some(tray => (tray.menus ?? []).some(menu => menu.id === id))
  expand.pieceOf = id => stages.get(id)?.piece ?? id
  expand.kindOf = (id) => id.startsWith('#') ? registries.tag[id.slice(1)]?.kind
    : ['level', 'entry', 'piece', 'section'].find((kind) => has(kind, id))
  return expand
}

export const referenceKind = (schema) => schema?.type === 'either' ? schema.of.map(referenceKind).find(Boolean) : schema?.reference ?? (schema?.type === 'level' ? 'level' : ['ref', 'name'].includes(schema?.type) ? ({ part: 'piece', unlock: 'piece', entry: 'entry', ...Object.fromEntries(Object.keys(contentKindSchemas).map(kind => [kind, kind])) }[schema.kind]) : null)

/** Expand tags structurally, using schema types rather than a list of field names. */
export function expandReferences(value, schema, expand, vocabulary, at = 'content') {
  if (value === undefined || value === null) return value
  if (schema?.type === 'either') {
    const selected = (typeof value === 'string' && value.startsWith('#') && schema.of.find((s) => referenceKind(s))) || schema.of.find((s) => validate(s, value, { vocabulary }).length === 0) || schema.of.find((s) => s.type === (Array.isArray(value) ? 'list' : typeof value === 'object' ? 'obj' : 'str'))
    return expandReferences(value, selected, expand, vocabulary, at)
  }
  if (schema?.members && typeof value === 'string') {
    expand(value.startsWith('#') ? value : `#${value}`, schema.members, at)
    return value
  }
  if (schema?.type === 'by') return expandReferences(value, schema.cases[value[schema.field]], expand, vocabulary, at)
  if (Array.isArray(value)) {
    const kind = referenceKind(schema?.of)
    const tagged = kind && value.some((child) => typeof child === 'string' && child.startsWith('#'))
    const list = value.flatMap((child, i) => typeof child === 'string' && child.startsWith('#') && kind
      ? expand(child, kind, `${at}[${i}]`)
      : [expandReferences(child, schema?.of, expand, vocabulary, `${at}[${i}]`)])
    return tagged ? relationOrder(list, expand.order ?? [], kind) : list
  }
  if (typeof value === 'string' && (schema?.reference || contentKindSchemas[schema?.kind]) && !value.startsWith('#')) expand(value, schema.reference ?? schema.kind, at)
  if (typeof value === 'string' && value.startsWith('#') && referenceKind(schema)) {
    const ids = expand(value, referenceKind(schema), at)
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

const edgesOf = (relation) => [...(relation.edges ?? []), ...(relation.sequence ?? []).slice(1).map((to, i) => ({ from: relation.sequence[i], to }))]

/** Expand each relation's tag boundaries against its own edges, restricted to scheduled levels. */
export function expandRelations(relations, expand, scheduled, problems = [], optional = new Set()) {
  const result = { requires: [], order: [], replaces: [] }
  for (const [name, relation] of Object.entries(relations)) {
    const endpoints = edgesOf(relation).flatMap((e) => [e.from, e.to])
    const endpoint = endpoints.find((v) => v.startsWith('#')) ?? endpoints[0]
    const inferredKind = endpoint && expand.kindOf?.(endpoint)
    const kind = relation.kind === 'requires' ? 'level' : relation.kind === 'replaces' ? 'piece' : relation.of ?? inferredKind ?? 'any'
    const ends = (id, external = false) => ((external || relation.kind === 'order' && kind === 'piece' && expand.menu?.(id)) && !id.startsWith('#') ? [id] : expand(id, kind, `relations/${name}`)).filter((v) => external || kind !== 'level' || scheduled.has(v))
    const raw = edgesOf(relation)
    if (relation.kind === 'replaces') for (const edge of raw) for (const endpoint of [edge.from, edge.to]) {
      if (expand(endpoint, 'piece').some(id => expand.pieceOf?.(id) !== id)) problems.push({ at: `relations/${name}`, says: 'replaces only links different base pieces; stages upgrade in their declared order' })
      if (edge.from === edge.to) problems.push({ at: `relations/${name}`, says: 'a piece cannot replace itself' })
    }
    if (relation.of === 'tag' && relation.kind !== 'order') problems.push({ at: `relations/${name}`, says: 'only order relations can order tags' })
    if (relation.sequence && relation.kind !== 'order') problems.push({ at: `relations/${name}`, says: 'only order relations have a sequence' })
    if (['requires', 'order'].includes(relation.kind) && raw.some((e) => e.from === e.to)) problems.push({ at: `relations/${name}`, says: `circular ${relation.kind}: a relation cannot link an endpoint to itself` })
    const candidates = raw.map((edge) => ({ edge, from: ends(edge.from, Boolean(edge.game)), to: ends(edge.to) }))
    const direct = candidates.flatMap(({ edge, from, to }) => from.flatMap((f) => to.map((t) => ({ ...edge, from: f, to: t }))))
    if (['requires', 'order'].includes(relation.kind)) {
      const ids = [...new Set(direct.filter((edge) => !edge.game).flatMap((edge) => [edge.from, edge.to]))]
      const graph = new Map(ids.map((id) => [id, direct.filter((edge) => !edge.game && edge.to === id).map((edge) => edge.from)]))
      const cycle = dependencyCycle(graph)
      if (cycle) problems.push({ at: `relations/${name}`, says: `circular ${relation.kind}: ${cycle.join(' → ')}` })
    }
    const boundary = (id, ids, side) => {
      if (kind === 'tag' || !id.startsWith('#')) return ids
      const ends = ids.filter((v) => !direct.some((e) => !e.game && (side === 'from' ? e.from === v && ids.includes(e.to) : e.to === v && ids.includes(e.from))))
      const required = ends.filter((v) => !optional.has(v))
      return side === 'from' && kind === 'level' && required.length ? required : ends
    }
    for (const { edge, from, to } of candidates) for (const f of boundary(edge.from, from, 'from')) for (const t of boundary(edge.to, to, 'to')) result[relation.kind]?.push({ ...edge, ...(relation.kind === 'order' && { of: kind }), from: f, to: t })
  }
  for (const kind of ['requires', 'order']) for (const of of kind === 'requires' ? ['level'] : ['level', 'piece', 'entry', 'tag', 'section', 'any']) {
    const edges = result[kind].filter((e) => !e.game && (kind !== 'order' || e.of === of))
    const graph = new Map([...new Set(edges.flatMap((e) => [e.from, e.to]))].map((id) => [id, edges.filter((e) => e.to === id).map((e) => e.from)]))
    const cycle = dependencyCycle(graph)
    if (cycle) problems.push({ at: 'relations', says: `circular ${kind}: ${cycle.join(' → ')}` })
  }
  for (const kind of Object.keys(result)) result[kind] = [...new Map(result[kind].map((e) => [JSON.stringify(e), e])).values()]
  return result
}

/** Stable topological order: satisfy edges first, then compare full names by code point. */
export function relationOrder(ids, edges, kind = 'level') {
  edges = edges.filter((e) => !e.of || e.of === 'any' || e.of === kind)
  const pending = new Set(ids), out = []
  while (pending.size) {
    const ready = [...pending].filter((id) => !edges.some((e) => e.to === id && pending.has(e.from))).sort()
    if (!ready.length) return [...out, ...pending].sort()
    const id = ready[0]
    pending.delete(id); out.push(id)
  }
  return out
}

/** Order tag full names by explicit tag orders, then member prerequisites, then code point. */
export function orderedTags(content, kind) {
  const tags = content.registries?.tag ?? {}
  const names = Object.keys(tags).filter((name) => tags[name].kind === kind).sort()
  const expand = referenceResolver(content.registries)
  const owners = new Map()
  for (const name of names) for (const member of expand(`#${name}`, kind)) {
    owners.set(member, [...(owners.get(member) ?? []), name])
  }
  const requires = (content.relationEdges?.requires ?? []).filter((edge) => !edge.game).flatMap(({ from, to }) =>
    (owners.get(from) ?? []).flatMap((a) => (owners.get(to) ?? []).filter((b) => a !== b).map((b) => ({ from: a, to: b }))))
  const inferred = relationOrder(names, requires, kind)
  const hard = (content.relationEdges?.order ?? []).filter((edge) => edge.of === 'tag')
    .map(({ from, to }) => ({ from: from.slice(1), to: to.slice(1) }))
  // Explicit author order wins when inferred prerequisites disagree with it.
  const pending = new Set(inferred), out = []
  while (pending.size) {
    const next = inferred.find((name) => pending.has(name) && !hard.some((edge) => edge.to === name && pending.has(edge.from)))
      ?? inferred.find((name) => pending.has(name))
    pending.delete(next); out.push(next)
  }
  return out
}

/** The runtime route consumed by courseLayout, maps and domains; chapter rows belong to the game. */
export function assembleChapters(chapters, { expand, relations, optional = [], skippable = [], problems = [] }) {
  const opt = new Set(expand(optional, 'level')), skip = new Set(expand(skippable, 'level'))
  const seen = new Set()
  return chapters.map((chapter) => {
    const ids = expand(chapter.levels, 'level', `chapters/${chapter.id}`)
    for (const id of ids) { if (seen.has(id)) problems.push({ at: 'chapters', says: `${id} is placed twice` }); seen.add(id) }
    const requires = new Map(ids.map((id) => [id, relations.requires.filter((e) => !e.game && e.to === id).map((e) => e.from)]))
    const order = dependencyOrder(relationOrder(ids, relations.order), requires)
    return { ...chapter, levels: order.map((id) => ({ id, ...(opt.has(id) && { optional: true }), ...(skip.has(id) && { skippable: true }) })), links: relations.requires.filter((e) => ids.includes(e.to)).map(({ game, ...e }) => ({ ...e, ...(game && { fromGame: game }) })) }
  })
}

/** Read one registered object by full name. */
export function objectOf(content, kind, name) {
  const value = content.registries?.[kind]?.[name]
  if (!value) throw new Error(`unknown ${kind} ${name}`)
  return value
}

/** Expanded chapter order and prerequisite edges for route maps and relation boards. */
export const courseRoute = (content) => ({ chapters: content.eras ?? [], edges: content.relationEdges?.requires ?? [] })
