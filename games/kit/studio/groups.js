// Project level tags onto the package workspace's tree: each level tag a section, in the order tag-order.js gives
// tags (the order relations, then prerequisites, then names), its levels in the order its order relation gives; a level
// dragged writes the tags' members (tag.set) and the order of the group it lands in (`<tag>-order`).
import { referenceResolver, relationOrder } from '../engine/objects.js'
import { sameJson } from '../engine/json-value.js'
import { localName, tagKey, tagName, tagTarget } from './objects-edit.js'
import { memberOrderName, memberOrderOps, orderedTags, reordered } from './tag-order.js'

/** Read-only sidebar projection of level tags in effective relation order. */
export const levelTags = (content) => Object.fromEntries(Object.entries(content.tags ?? {}).filter(([, tag]) => tag.kind === 'level').map(([name, tag]) => {
  const expand = referenceResolver(content.registries)
  return [name, { ...tag, levels: relationOrder(expand(`#${tagName(name)}`, 'level'), content.relationEdges?.order ?? []).map((id) => ({ id })) }]
}))
export const groupOf = (content, level) => Object.entries(levelTags(content)).find(([, tag]) => tag.levels.some(({ id }) => id === level))?.[0] ?? null

/**
 * The tree's sections (`order`: the levels in play order, for those in no group): [{ key, group (null: the levels in no group), levels: [{ id, optional?, skippable? }], slots }],
 * slots[k] the place before the k-th level and at the end ({ group, at: 0 } / { group, after } / { out: true }; null: none).
 */
export function groupTree(content, order = []) {
  const grouped = new Set()
  const tags = levelTags(content)
  const sections = orderedTags(content, 'level').map((full) => tagKey('level', full)).filter((id) => tags[id]).map((id) => [id, tags[id]]).map(([id, group]) => {
    for (const { id: level } of group.levels) grouped.add(level)
    return { key: id, group: id, levels: group.levels, slots: [{ group: id, at: 0 }, ...group.levels.map(({ id: level }) => ({ group: id, after: level }))] }
  })
  // The levels in no group, in the order the game plays them.
  const rank = new Map(order.map((id, k) => [id, k]))
  const loose = content.levels.filter(({ id }) => !grouped.has(id)).map(({ id }) => ({ id }))
    .sort((a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity))
  sections.push({ key: '', group: null, levels: loose, slots: [{ out: true }, ...loose.map(() => null)] })
  return { sections }
}

/** Whether dropping `level` at `to` leaves it where it is. */
export function stays(tree, level, to) {
  if (to.after === level || to.before === level) return true
  return tree.sections.some(({ levels, slots }) => {
    const index = levels.findIndex(({ id }) => id === level)
    return index >= 0 && (sameJson(slots[index], to) || (to.out && slots[0]?.out))
  })
}

/** Update explicit tag membership through the package operation set: only the layer's own level tags, by short names. */
export function groupMoves(levels, to, content, namespace) {
  return Object.entries(content.tags ?? {}).filter(([full, tag]) => tag.kind === 'level' && localName(namespace, full)).flatMap(([full, value]) => {
    const values = value.values.filter((id) => !levels.includes(id))
    if (full === to.group) values.push(...levels.filter((id) => !values.includes(id)))
    // A tag is a set: the same members in another order is no change.
    const same = values.length === value.values.length && values.every((id) => value.values.includes(id))
    return same ? [] : [{ op: 'tag.set', ...tagTarget(namespace, full), path: 'values', value: values.map((id) => localName(namespace, id) ?? id) }]
  })
}

/**
 * The operations a drop of `levels` at `to` (a slot of groupTree) makes: the members of the layer's own tags, the order
 * of the group they land in (`<tag>-order`, when the layer may write it) and of the groups they leave.
 */
export function treeMoves(levels, to, content, namespace) {
  const ops = groupMoves(levels, to, content, namespace)
  const tags = levelTags(content)
  const idsOf = (tag) => tags[tag].levels.map(({ id }) => id)
  if (to.group && tags[to.group]) {
    const ids = idsOf(to.group)
    // Into another layer's group the levels cannot go; within it they can be reordered.
    if (localName(namespace, to.group) || levels.every((id) => ids.includes(id))) {
      const rest = ids.filter((id) => !levels.includes(id))
      const sequence = reordered(ids, levels, to.after !== undefined ? { after: to.after } : rest.length ? { before: rest[0] } : {})
      ops.push(...(memberOrderOps(content, namespace, to.group, sequence) ?? []))
    }
  }
  for (const tag of Object.keys(tags)) {
    if (tag === to.group) continue
    const order = content.registries?.relation?.[memberOrderName(tag)]
    if (!order?.sequence?.some((id) => levels.includes(id))) continue
    ops.push(...(memberOrderOps(content, namespace, tag, idsOf(tag).filter((id) => !levels.includes(id))) ?? []))
  }
  return ops
}
