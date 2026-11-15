// Placement is display order. Moving a level preserves its wires and optional status.
const same = (a, b) => String(a) === String(b)
const without = (levels, id) => levels.filter((level) => level !== id)

export function locate(eras, id) {
  for (const [era, chapter] of eras.entries()) {
    const index = chapter.levels.indexOf(id)
    if (index >= 0) return { era, index }
  }
  return null
}

export function describe(eras, at) {
  return at ? `era ${eras[at.era].id}, level #${at.index + 1}` : 'nowhere'
}

const setLinks = (chapter, links) => {
  if (links.length) chapter.links = links
  else delete chapter.links
}

export function takeOut(eras, id) {
  const was = locate(eras, id)
  if (!was) return { eras, was: null }
  const next = structuredClone(eras)
  const chapter = next[was.era]
  chapter.levels.splice(was.index, 1)
  if (chapter.optional) {
    chapter.optional = without(chapter.optional, id)
    if (!chapter.optional.length) delete chapter.optional
  }
  for (const era of next) if (era.links) setLinks(era, era.links.filter(({ from, to }) => from !== id && to !== id))
  return { eras: next, was }
}

/** Put an unplaced level before/after a neighbour, or at a position in a chapter. */
export function putIn(eras, id, to) {
  if (locate(eras, id)) throw new Error(`${id} is placed already`)
  const next = structuredClone(eras)
  const neighbour = to.before ?? to.after
  const at = neighbour === undefined ? null : locate(next, neighbour)
  if (neighbour !== undefined && !at) throw new Error(`${neighbour} is in no era`)
  const era = at ? next[at.era] : next.find((chapter) => same(chapter.id, to.era))
  if (!era) throw new Error(`no era ${to.era}`)
  const index = at ? at.index + Number(to.after !== undefined) : to.at ?? era.levels.length
  if (index < 0 || index > era.levels.length) throw new Error(`index ${index} is outside 0–${era.levels.length}`)
  era.levels.splice(index, 0, id)
  return next
}

export function moveLevel(eras, id, to) {
  const removed = takeOut(eras, id)
  if (!removed.was) throw new Error(`${id} is in no era`)
  const next = putIn(removed.eras, id, to)
  const { era: from } = removed.was
  const { era: into } = locate(next, id)
  const source = eras[from]
  if (from === into) {
    if (source.optional) next[into].optional = source.optional
  } else if (source.optional?.includes(id)) (next[into].optional ??= []).push(id)
  for (const [i, chapter] of eras.entries()) {
    const links = chapter.links ?? []
    if (from === into || (i !== from && i !== into)) setLinks(next[i], links)
    else if (i === from) setLinks(next[i], links.filter((link) => link.to !== id))
    else setLinks(next[i], [...links, ...(source.links ?? []).filter((link) => link.to === id)])
  }
  return { eras: next, was: removed.was }
}
