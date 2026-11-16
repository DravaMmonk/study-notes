// Sections are authored objects; the glossary is their ordered display projection.
import { relationOrder } from './objects.js'

export function encyclopedia(entries, sections, resolve, order) {
  const groups = relationOrder(Object.keys(sections), order, 'section').map(id => ({
    id, title: sections[id].title, desc: sections[id].desc,
    values: relationOrder(resolve(sections[id].values, 'entry', `sections/${id}`), order, 'entry'),
  }))
  const grouped = entries.map(({ group: _group, ...entry }) => ({
    ...entry, group: groups.find(group => group.values.includes(entry.id))?.id ?? '',
  }))
  const ungrouped = grouped.filter(entry => !entry.group).map(entry => entry.id)
  if (ungrouped.length) groups.push({ id: '', title: { zh: '其它', en: 'Other' }, values: ungrouped })
  return { groups, entries: grouped }
}
