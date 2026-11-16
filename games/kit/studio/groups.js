// Project level tags onto the existing sidebar until the object editors replace it.
import { referenceResolver, relationOrder } from '../engine/objects.js'
import { sameJson } from '../engine/json-value.js'
import { localName } from './objects-edit.js'

/** Read-only sidebar projection of level tags in effective relation order. */
export const levelTags = (content) => Object.fromEntries(Object.entries(content.tags ?? {}).filter(([, tag]) => tag.kind === 'level').map(([name, tag]) => {
  const expand = referenceResolver(content.registries)
  return [name, { ...tag, levels: relationOrder(expand(`#${name}`, 'level'), content.relationEdges?.order ?? []).map((id) => ({ id })) }]
}))
export const groupOf = (content, level) => Object.entries(levelTags(content)).find(([, tag]) => tag.levels.some(({ id }) => id === level))?.[0] ?? null

/**
 * The tree's sections (`order`: the levels in play order, for those in no group): [{ key, group (null: the levels in no group), levels: [{ id, optional?, skippable? }], slots }],
 * slots[k] the place before the k-th level and at the end ({ group, at: 0 } / { group, after } / { out: true }; null: none).
 */
export function groupTree(content, order = []) {
  const grouped = new Set()
  const sections = Object.entries(levelTags(content)).map(([id, group]) => {
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
    if (full === to.group) values.push(...levels)
    return sameJson(values, value.values) ? [] : [{ op: 'tag.set', tag: localName(namespace, full), path: 'values', value: values.map((id) => localName(namespace, id) ?? id) }]
  })
}
