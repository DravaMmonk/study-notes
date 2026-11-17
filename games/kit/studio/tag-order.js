// Order where an author cares about it (games/DESIGN.md 6.1): a tag is a set; the order of its members is the order
// relation `<tag>-order` (a sequence of members), the order among the tags of one kind the relation `<kind>-tags-order`
// (a sequence of `#` tag references, `"of": "tag"`: it orders the tags, not their members). Dragging in the studio (the
// tree's groups and levels, the tag list, a tag's members) rewrites these relations: the layer's own by `relation.put`,
// another package's by an override of it (override-edit.js), once the layer overrides. The order the studio shows tags
// in is the kernel's (engine/objects.js orderedTags): the tag orders, then prerequisites between members, then names.
import { orderedTags } from '../engine/objects.js'
import { localName, namespaceOf, splitTagKey, tagKey, tagMembers, tagName } from './objects-edit.js'
import { edgesOf, overridesIt, relationOverrideOps } from './override-edit.js'
import { writtenName } from './tag-edit.js'

export { orderedTags }

/** The relation that orders a tag's members, and the one that orders the tags of a kind in `namespace`. */
export const memberOrderName = (tag) => `${tagName(tag)}-order`
export const kindOrderName = (namespace, kind) => `${namespace}/${kind}-tags-order`

/** `list` with `ids` moved before or after `to.before` / `to.after` (to the end without either). */
export function reordered(list, ids, to = {}) {
  const rest = list.filter((id) => !ids.includes(id))
  const anchor = to.before ?? to.after
  const at = anchor === undefined || !rest.includes(anchor) ? rest.length : rest.indexOf(anchor) + (to.after !== undefined ? 1 : 0)
  return [...rest.slice(0, at), ...ids, ...rest.slice(at)]
}

/** `list` with `id` moved `by` places (−1 up, +1 down); the same list at an end. */
export function shifted(list, id, by) {
  const k = list.indexOf(id)
  const j = k + by
  if (k < 0 || j < 0 || j >= list.length) return list
  const next = [...list]
  next.splice(k, 1)
  next.splice(j, 0, id)
  return next
}

/** Whether `layer` may rewrite the order relation `relation` (of the object `owner`): its own, or one it overrides. */
export function canOrder(content, layer, relation, owner = null, overriding = false) {
  if (namespaceOf(relation) === layer) return true
  if (!content?.registries?.relation?.[relation]) return false
  return overriding || overridesIt(content, layer, 'relation', relation) || (owner !== null && overridesIt(content, layer, 'tag', owner))
}

/**
 * The operations that make `sequence` (full names, or `#` tag references) the order relation `relation` (of objects of
 * kind `of`): the layer's own written whole, another package's overridden by the edges it adds and takes out. Null when
 * the layer may not (canOrder; `overriding`: the author has asked to override it here), [] when nothing changes.
 */
export function orderOps(content, layer, relation, sequence, of, owner = null, overriding = false, member) {
  if (!canOrder(content, layer, relation, owner, overriding)) return null
  const now = content?.registries?.relation?.[relation]
  if (now?.sequence && now.sequence.length === sequence.length && now.sequence.every((id, k) => id === sequence[k]) && !now.edges?.length) return []
  if (namespaceOf(relation) === layer) {
    return [{ op: 'relation.put', relation: localName(layer, relation), data: { kind: 'order', of, ...(of === 'tag' && { member }), sequence: sequence.map((id) => writtenName(layer, id)) } }]
  }
  return relationOverrideOps(content, layer, relation, sequence.slice(1).map((to, k) => ({ from: sequence[k], to })))
}

/**
 * The operations that move the tag `tag` (of `kind`) before or after another (`to`, as reordered takes it) among the
 * tags of its kind, written as the layer's `<kind>-tags-order` (of tags).
 */
export function tagMoveOps(content, layer, kind, tag, to) {
  const plain = (id) => splitTagKey(id)?.full ?? id
  tag = plain(tag)
  to = Object.fromEntries(Object.entries(to ?? {}).map(([k, v]) => [k, typeof v === 'string' ? plain(v) : v]))
  const now = orderedTags(content, kind)
  const next = reordered(now, [tag], to)
  if (next.every((id, k) => id === now[k])) return []
  // Only what the author has ordered: the tags the relation already names, and those the move passes over. A tag before
  // another puts its members before the other's, so an order nobody asked for is not written.
  const relation = kindOrderName(layer, kind)
  const named = edgesOf(content?.registries?.relation?.[relation] ?? {}).flatMap((e) => [e.from, e.to]).map((ref) => ref.replace(/^#/, ''))
  const [a, b] = [now.indexOf(tag), next.indexOf(tag)].sort((x, y) => x - y)
  const keep = new Set([...named, ...now.slice(a, b + 1)])
  return orderOps(content, layer, relation, next.filter((id) => keep.has(id)).map((id) => `#${id}`), 'tag', null, false, kind)
}

/** The operations that make `members` (full names) the order of the tag `tag`'s members (null when the layer may not). */
export const memberOrderOps = (content, layer, tag, members, overriding = false) => orderOps(content, layer, memberOrderName(tag), members, content?.registries?.tag?.[tag]?.kind ?? 'level', tag, overriding)

/** A tag's own values (members and nested `#` tags) in the order its members come in (a nested tag at its first). */
export function valuesInOrder(content, tag) {
  const values = content?.registries?.tag?.[tag]?.values ?? []
  const ordered = tagMembers(content, tag)
  const rank = (value) => {
    const at = value.startsWith('#') ? tagMembers(content, tagKey(content.registries.tag[tag].kind, value.slice(1))).map((id) => ordered.indexOf(id)).filter((k) => k >= 0) : [ordered.indexOf(value)].filter((k) => k >= 0)
    return at.length ? Math.min(...at) : Infinity
  }
  return values.map((value, k) => [value, rank(value), k]).sort((a, b) => a[1] - b[1] || a[2] - b[2]).map(([value]) => value)
}

/** `sequence` with the places `ids` hold refilled by `next` (the same ids in a new order), every other item kept. */
export function resequence(sequence, ids, next) {
  const places = sequence.map((id, k) => (ids.includes(id) ? k : -1)).filter((k) => k >= 0)
  const out = [...sequence]
  places.forEach((place, k) => { out[place] = next[k] })
  return out
}

/**
 * The operations that put `ids` (members of one object, in the order shown) into the order `next`. Order relations are
 * global: every one the layer may write that lists two or more of them is rewritten in place to agree (its order of
 * everything else standing); when none lists them all, `preferred` (`<object>-order`) is written with the whole order.
 */
export function subsetOrderOps(content, layer, preferred, ids, next, of, owner = null, overriding = false) {
  const relations = content?.registries?.relation ?? {}
  const named = (name) => (relations[name]?.kind === 'order' ? edgesOf(relations[name]).flatMap(({ from, to }) => [from, to]) : [])
  const listed = (name) => ids.filter((id) => named(name).includes(id))
  const names = [...new Set([preferred, ...Object.keys(relations).sort()])].filter((name) => listed(name).length >= 2 && canOrder(content, layer, name, owner, overriding))
  const ops = names.flatMap((name) => {
    const mine = listed(name)
    const order = next.filter((id) => mine.includes(id))
    const relation = relations[name]
    if (Array.isArray(relation.sequence) && !relation.edges?.length) return orderOps(content, layer, name, resequence(relation.sequence, mine, order), relation.of ?? of, owner, overriding) ?? []
    // Edges: those between two of them give way to a chain in the new order.
    const edges = [...edgesOf(relation).filter((e) => !(mine.includes(e.from) && mine.includes(e.to))), ...order.slice(1).map((to, k) => ({ from: order[k], to }))]
    if (namespaceOf(name) !== layer) return relationOverrideOps(content, layer, name, edges)
    const { sequence: _, id: __, ...rest } = relation
    return [{ op: 'relation.put', relation: localName(layer, name), data: { ...rest, edges: edges.map((e) => ({ ...e, from: writtenName(layer, e.from), to: writtenName(layer, e.to) })) } }]
  })
  if (names.some((name) => listed(name).length === ids.length)) return ops
  return [...ops.filter((op) => op.relation !== localName(layer, preferred) && op.name !== preferred), ...(orderOps(content, layer, preferred, next, of, owner, overriding) ?? [])]
}
