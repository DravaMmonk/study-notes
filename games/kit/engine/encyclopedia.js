// The encyclopedia is a display projection; entries, membership and ordering are authored independently.
import { relationOrder } from './objects.js'

export function encyclopedia(entries, tags, relations, resolve, order) {
  const names = Object.keys(tags).filter((name) => tags[name].kind === 'entry')
  const edges = Object.values(relations).filter((r) => r.kind === 'order').flatMap((r) => [
    ...(r.edges ?? []), ...(r.sequence ?? []).slice(1).map((to, i) => ({ from: r.sequence[i], to })),
  ])
  const groups = relationOrder(names.map((name) => `#${name}`), edges).map((ref) => ({
    id: ref.slice(1), title: tags[ref.slice(1)].title ?? ref.slice(1),
    values: relationOrder(resolve(ref, 'entry'), order, 'entry'),
  }))
  const grouped = entries.map(({ group: _group, ...entry }) => ({
    ...entry, group: groups.find((g) => g.values.includes(entry.id))?.id ?? '',
  }))
  const ungrouped = grouped.filter((entry) => !entry.group).map((entry) => entry.id)
  if (ungrouped.length) groups.push({ id: '', title: '', values: ungrouped })
  return { groups, entries: grouped }
}
