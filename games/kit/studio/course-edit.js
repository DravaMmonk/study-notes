// Pure chapter metadata edits; membership, relations and layouts have separate object operations.
/** The course with chapter `e` moved by `by` places (-1 earlier, 1 later). */
export function moveChapter(eras, e, by) {
  const to = e + by
  if (to < 0 || to >= eras.length) return eras
  const next = [...eras]
  const [era] = next.splice(e, 1)
  next.splice(to, 0, era)
  return next
}

/** A new chapter shaped like `like` (its own fields, no levels, no links, no map), with an id no chapter has. */
export function blankChapter(eras, like, blankText) {
  const ids = eras.map((era) => era.id)
  const numbered = ids.every((id) => typeof id === 'number')
  let id = numbered ? Math.max(0, ...ids) + 1 : `chapter-${eras.length + 1}`
  for (let k = eras.length + 2; ids.includes(id); k++) id = numbered ? id + 1 : `chapter-${k}`
  const { levels: _, layout: __, id: ___, ...fields } = like
  return { id, ...blankText(fields), levels: [] }
}
