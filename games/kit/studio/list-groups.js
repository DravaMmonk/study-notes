// The build workspace's three lists — levels, parts, entries — grouped (games/DESIGN.md 6.7): by the tags of their
// kind, or by the objects that gather them (a relation for levels and the others, a tray for parts, a section for
// entries). An object shows under every group that names it; what no group names is left over. A group is an object of
// its own, opened in the middle from its heading row.
import { grantObjects } from '../../../packages/circuit/core/index.js'
import { orderedTags } from '../engine/objects.js'
import { tagKey, tagKeyOfRef, tagMembers, tagName } from './objects-edit.js'
import { edgesOf } from './override-edit.js'

/** How each list can be grouped, the first the default. */
export const GROUPINGS = { level: ['tag', 'relation'], 'circuit/part': ['tag', 'circuit/tray', 'relation'], symbol: ['tag', 'circuit/tray', 'relation'], entry: ['tag', 'section', 'relation'] }

const byName = (a, b) => (a < b ? -1 : a > b ? 1 : 0)

/** The part a stage belongs to (a part is its own first stage): full stage id → full part id. */
export function stageOwners(content) {
  const owners = new Map()
  for (const [part, raw] of Object.entries(content ? grantObjects(content) : {})) {
    owners.set(part, part)
    const ns = part.includes('/') ? `${part.slice(0, part.indexOf('/'))}/` : ''
    for (const stage of raw.stages ?? []) owners.set(stage.id.includes('/') ? stage.id : `${ns}${stage.id}`, part)
  }
  return owners
}

/** The kind of object a relation's endpoints are (level, part, entry), or null when it orders tags or sections. */
export function relationKind(content, relation) {
  if (relation.kind === 'requires') return 'level'
  if (relation.kind === 'replaces') return 'circuit/part'
  if (relation.of) return ['level', 'circuit/part', 'symbol', 'entry'].includes(relation.of) ? relation.of : null
  const registries = content?.registries ?? {}
  for (const { from } of edgesOf(relation)) {
    if (from.startsWith('#')) return relation.member ?? Object.entries(registries.tag ?? {}).find(([key]) => tagName(key) === from.slice(1))?.[1]?.kind ?? null
    for (const kind of ['level', 'circuit/part', 'symbol', 'entry']) if (registries[kind]?.[from]) return kind
  }
  return null
}

/** Each reference expanded (a `#` tag to its members), each once, in order; `owner` maps a member to the row it is. */
const expanded = (content, refs, owner = (id) => id, kinds = ['level', 'circuit/part', 'symbol', 'entry']) => [...new Set(refs.flatMap((ref) => (ref.startsWith('#') ? tagMembers(content, tagKeyOfRef(content, kinds, ref)) : [ref])).map(owner))]

/**
 * The groups of the `kind` list by `by` ('tag', 'relation', 'circuit/tray', 'section'), in their order: [{ kind: the group's
 * object kind, full, members: [full names of the list's objects] }].
 */
export function groupsOf(content, kind, by) {
  const registries = content?.registries ?? {}
  const owners = ['circuit/part', 'symbol'].includes(kind) ? stageOwners(content) : null
  const owner = owners ? (id) => owners.get(id) ?? id : (id) => id
  if (by === 'tag') return orderedTags(content, kind).map((name) => tagKey(kind, name)).map((full) => ({ kind: 'tag', full, members: [...new Set(tagMembers(content, full).map(owner))] }))
  if (by === 'circuit/tray' || by === 'section') {
    const names = Object.keys(registries[by] ?? {}).sort(byName)
    // Trays and sections in a package are listed by name; a game orders its encyclopedia's sections itself.
    return names.map((full) => {
        const value = registries[by][full]
        return { kind: by, full, members: expanded(content, [...(value.values ?? []), ...(value.menus ?? []).flatMap((menu) => menu.values ?? [])], owner, by === 'section' ? ['entry'] : ['circuit/part', 'symbol']) }
      })
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
