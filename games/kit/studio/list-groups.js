// The build workspace's three lists — levels, parts, entries — grouped (games/DESIGN.md 6.7): by the tags of their
// kind, or by the objects that gather them (a relation for levels and the others, a tray for parts, a section for
// entries). An object shows under every group that names it; what no group names is left over. A group is an object of
// its own, opened in the middle from its heading row.
import { memberOwners, collectionProvider, relationType, editorForType } from './editors.js'
import { orderedTags } from '../engine/objects.js'
import { tagKey, tagKeyOfRef, tagMembers, tagName } from './objects-edit.js'
import { edgesOf } from './override-edit.js'

/** How each list can be grouped, the first the default. */
export const GROUPINGS = { level: ['tag', 'relation'], entry: ['tag', 'section', 'relation'] }

export const groupingsFor = kind => editorForType(kind)?.groupings ?? GROUPINGS[kind] ?? ['tag', 'relation']

const byName = (a, b) => (a < b ? -1 : a > b ? 1 : 0)

/** The part a stage belongs to (a part is its own first stage): full stage id → full part id. */
export function stageOwners(content) {
  return memberOwners(content)
}

/** The kind of object a relation's endpoints are (level, part, entry), or null when it orders tags or sections. */
export function relationKind(content, relation) {
  if (relation.kind === 'requires') return 'level'
  if (relationType(relation.kind)) return relationType(relation.kind)
  if (relation.of) return !['tag', 'section'].includes(relation.of) ? relation.of : null
  const registries = content?.registries ?? {}
  for (const { from } of edgesOf(relation)) {
    if (from.startsWith('#')) return relation.member ?? Object.entries(registries.tag ?? {}).find(([key]) => tagName(key) === from.slice(1))?.[1]?.kind ?? null
    for (const kind of Object.keys(registries).filter(kind => !['tag', 'relation', 'section'].includes(kind))) if (registries[kind]?.[from]) return kind
  }
  return null
}

/** Each reference expanded (a `#` tag to its members), each once, in order; `owner` maps a member to the row it is. */
const expanded = (content, refs, owner = (id) => id, kinds = Object.keys(content?.registries ?? {})) => [...new Set(refs.flatMap((ref) => (ref.startsWith('#') ? tagMembers(content, tagKeyOfRef(content, kinds, ref)) : [ref])).map(owner))]

/**
 * The groups of the `kind` list by `by` ('tag', 'relation', or a registered collection type), in their order: [{ kind: the group's
 * object kind, full, members: [full names of the list's objects] }].
 */
export function groupsOf(content, kind, by) {
  const registries = content?.registries ?? {}
  const owners = stageOwners(content)
  const owner = owners ? (id) => owners.get(id) ?? id : (id) => id
  if (by === 'tag') return orderedTags(content, kind).map((name) => tagKey(kind, name)).map((full) => ({ kind: 'tag', full, members: [...new Set(tagMembers(content, full).map(owner))] }))
  const collection = collectionProvider(by)
  if (by === 'section' || collection?.accepts(kind)) {
    const names = Object.keys(registries[by] ?? {}).sort(byName)
    return names.map(full => ({ kind: by, full, members: expanded(content,
      collection ? collection.members(registries[by][full]) : registries[by][full].values ?? [], owner,
      collection ? collection.types() : ['entry']) }))
  }
  if (by === 'relation') {
    return Object.entries(registries.relation ?? {}).filter(([, relation]) => relationKind(content, relation) === kind)
      .sort(([a], [b]) => byName(a, b))
      .map(([full, relation]) => ({ kind: 'relation', full, members: expanded(content, edgesOf(relation).flatMap(({ from, to }) => [from, to]), owner, [kind]) }))
  }
  return []
}

/** The items no group names, in the order given. */
export const ungrouped = (items, groups) => {
  const named = new Set(groups.flatMap((group) => group.members))
  return items.filter((id) => !named.has(id))
}
