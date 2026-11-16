// Names and lists for the studio's object editors (games/DESIGN.md 6.1, 6.7): the registries hold full names
// (`<namespace>/<name>`), the operations write a layer's own objects by their short names.
import { referenceResolver, relationOrder } from '../engine/objects.js'
import { edgesOf } from './override-edit.js'

/** The namespace of a full name: `qed` for `qed/table`, `@qed` for `@qed/title`. */
export const namespaceOf = (full) => (typeof full === 'string' && full.includes('/') ? full.slice(0, full.indexOf('/')).replace(/^#/, '') : null)

/** A full name's short name when it belongs to `namespace`, else null. Tag references keep their `#`. */
export function localName(namespace, full) {
  if (typeof full !== 'string') return null
  const tag = full.startsWith('#'), name = tag ? full.slice(1) : full
  if (!name.startsWith(`${namespace}/`)) return null
  return `${tag ? '#' : ''}${name.slice(namespace.length + 1)}`
}

/** How a full name is shown inside `namespace`: short when it is the layer's own, full otherwise. */
export const shownName = (namespace, full) => localName(namespace, full) ?? full

/** The objects of one registry (`tag`, `relation`, `layout`) as [full, value, own], own ones first, each by name. */
export function objectsOf(content, kind, namespace) {
  const all = Object.entries(content?.registries?.[kind] ?? {})
  return all.map(([full, value]) => [full, value, namespaceOf(full) === namespace])
    .sort((a, b) => (a[2] === b[2] ? a[0].localeCompare(b[0]) : a[2] ? -1 : 1))
}

/** The members a tag stands for once nested tags are expanded, in effective order. */
export function tagMembers(content, full) {
  const tag = content?.registries?.tag?.[full]
  if (!tag) return []
  const expand = referenceResolver(content.registries)
  return relationOrder(expand(`#${full}`, tag.kind), content.relationEdges?.order ?? [], tag.kind)
}

/** The candidates a tag of `kind` may take: every object of that kind and every tag of the same kind but itself. */
export function tagCandidates(content, kind, self) {
  const registry = kind
  const objects = Object.keys(content?.registries?.[registry] ?? {})
  const tags = Object.entries(content?.registries?.tag ?? {}).filter(([name, tag]) => tag.kind === kind && name !== self).map(([name]) => `#${name}`)
  return [...objects, ...tags]
}

/** A short name not taken in `taken` (short names), from `base`: base, base-2, base-3 … */
export function freeObjectName(taken, base) {
  const used = new Set(taken)
  if (!used.has(base)) return base
  for (let k = 2; ; k++) if (!used.has(`${base}-${k}`)) return `${base}-${k}`
}

/** The short names a layer already uses for one kind. */
export const ownNames = (content, kind, namespace) => objectsOf(content, kind, namespace).filter(([, , own]) => own).map(([full]) => localName(namespace, full))

/** Where `full` (an object of `kind`) is named: { tags, relations, trays, sections }, each a list of full names. */
export function objectPlaces(content, kind, full) {
  const registries = content?.registries ?? {}
  const tagKind = kind
  const tags = Object.entries(registries.tag ?? {}).filter(([, tag]) => tag.kind === tagKind && tag.values.includes(full)).map(([name]) => name)
  const named = new Set([full, ...tags.map((name) => `#${name}`)])
  const relations = Object.entries(registries.relation ?? {}).filter(([, relation]) => edgesOf(relation).some(({ from, to }) => named.has(from) || named.has(to))).map(([name]) => name)
  const gathers = (value) => [...(value.values ?? []), ...(value.menus ?? []).flatMap((menu) => menu.values ?? [])].some((ref) => named.has(ref))
  const trays = kind === 'piece' ? Object.entries(registries.tray ?? {}).filter(([, tray]) => gathers(tray)).map(([name]) => name) : []
  const sections = kind === 'entry' ? Object.entries(registries.section ?? {}).filter(([, section]) => gathers(section)).map(([name]) => name) : []
  return { tags, relations, trays, sections }
}
