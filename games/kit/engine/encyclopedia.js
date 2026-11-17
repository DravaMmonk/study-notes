// Sections are authored objects; the glossary is their ordered display projection.

export function encyclopedia(entries, sections, resolve, ordered = []) {
  const groups = [...new Set([...ordered, ...Object.keys(sections).sort()])].filter(id => sections[id]).map(id => ({
    id, title: sections[id].title, desc: sections[id].desc,
    values: sections[id].values.flatMap(value => resolve(value, 'entry', `sections/${id}`)),
  }))
  const grouped = entries.map(({ group: _group, ...entry }) => ({
    ...entry, group: groups.find(group => group.values.includes(entry.id))?.id ?? '',
  }))
  const ungrouped = grouped.filter(entry => !entry.group).map(entry => entry.id)
  if (ungrouped.length) groups.push({ id: '', title: { zh: '其它', en: 'Other' }, values: ungrouped })
  return { groups, entries: grouped }
}
