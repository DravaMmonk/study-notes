// Game route topology and prerequisite ordering.
export const eraLevels = (era) => era.levels.map(({ id }) => id)

/** Numeric positions follow the chapter's ordered list. */
export function levelLabels(eras) {
  return new Map(eras.flatMap((era, e) => {
    const chapter = era.number ?? e
    return eraLevels(era).map((id, i) => [id, `${chapter}-${i + 1}`])
  }))
}

/** Put prerequisites before their consumers, keeping input order where possible. */
export function dependencyOrder(ids, requires) {
  const local = new Set(ids)
  const seen = new Set(), order = []
  const visit = (id) => {
    if (seen.has(id)) return
    seen.add(id)
    for (const before of requires.get(id) ?? []) if (local.has(before)) visit(before)
    order.push(id)
  }
  ids.forEach(visit)
  return order
}

/** Layer the supplied ids by the longest local prerequisite chain. */
export function dependencyLayers(ids, requires) {
  const rank = new Map()
  const layers = []
  for (const id of dependencyOrder(ids, requires)) {
    const row = Math.max(0, ...(requires.get(id) ?? []).map((before) => (rank.get(before) ?? -1) + 1))
    rank.set(id, row)
    ;(layers[row] ??= []).push(id)
  }
  return layers
}

/**
 * A chapter's map, row by row (games/DESIGN.md 2.5): each row at most three places, a level or an empty one (null).
 * The selected package layout's rows stay as authored, less the levels not on this map; every other
 * level is laid out by the map's rules around it: one layer of the prerequisite graph at a time, in rows of up to
 * three after the rows of the layers before it, below each of its prerequisites and above every saved level that needs
 * it (a row put in pushes the rows under it down). Returns { at: id → { row, col } (col 0 is the middle), rows }.
 */
export function mapRows(ids, requires, selectedLayout = null) {
  const saved = selectedLayout?.rows ?? []
  const known = new Set(ids)
  const local = new Map(ids.map((id) => [id, (requires.get(id) ?? []).filter((from) => known.has(from))]))
  const rows = []
  const placed = new Set()
  for (const row of saved) {
    const slots = row.filter((id) => id === null || (known.has(id) && !placed.has(id) && placed.add(id)))
    if (slots.some((id) => id !== null)) rows.push({ slots, layer: null })
  }
  const rowOf = (id) => rows.findIndex((row) => row.slots.includes(id))
  const after = new Map(ids.map((id) => [id, []]))
  for (const [id, froms] of local) for (const from of froms) after.get(from).push(id)
  // The saved levels that need a level, all the way down.
  const savedBelow = (id, seen = new Set()) => {
    for (const next of after.get(id)) if (!seen.has(next)) { seen.add(next); savedBelow(next, seen) }
    return [...seen].filter((x) => placed.has(x))
  }
  for (const [layer, members] of dependencyLayers(ids, local).entries()) for (const id of members) {
    if (placed.has(id)) continue
    const min = Math.max(0, ...local.get(id).map((from) => rowOf(from) + 1))
    const max = Math.min(rows.length, ...savedBelow(id).map(rowOf))
    let at = rows.findIndex((row, i) => i >= min && i < max && row.layer === layer && row.slots.length < 3)
    if (at < 0) {
      const last = rows.reduce((end, row, i) => (row.layer !== null && row.layer <= layer ? i + 1 : end), 0)
      at = min > max ? min : Math.min(Math.max(min, last), max)
      rows.splice(at, 0, { slots: [], layer })
    }
    rows[at].slots.push(id)
    placed.add(id)
  }
  const at = new Map()
  rows.forEach(({ slots }, row) => slots.forEach((id, slot) => { if (id !== null) at.set(id, { row, col: slot - (slots.length - 1) / 2 }) }))
  return { at, rows: rows.map(({ slots }) => slots) }
}

/** Direct author prerequisites, effective unlock gates, and chapter information. */
export function layout(eras, { notes = false, links = eras.flatMap((era) => era.links ?? []) } = {}) {
  const place = new Map(), requires = new Map(), tracks = new Map(), rows = new Map()
  const incoming = new Map()
  for (const era of eras) {
    for (const { id, optional = false, skippable = false } of era.levels) {
      place.set(id, { era: era.id, optional, skippable })
      incoming.set(id, [])
    }
    tracks.set(era.id, eraLevels(era))
    rows.set(era.id, era.rows ?? [])
  }
  if (!notes) for (const link of links) if (!link.fromGame) incoming.get(link.to)?.push(link)
  for (const [id, links] of incoming) requires.set(id, [...new Set(links.map(({ from }) => from))])

  const order = [...place.keys()]
  const required = new Map()
  for (const id of dependencyOrder(order, requires)) {
    const direct = incoming.get(id).flatMap(({ from, required: strict }) => place.get(from)?.skippable && !strict
      ? required.get(from) ?? [from]
      : [from])
    required.set(id, [...new Set(direct)])
  }
  return { order, place, requires, required, tracks, rows }
}

/** The first loop in the prerequisite graph, with its starting level repeated at the end. */
export function dependencyCycle(requires) {
  const done = new Set()
  const active = new Set()
  const visit = (id) => {
    if (active.has(id)) {
      const path = [...active]
      return [...path.slice(path.indexOf(id)), id]
    }
    if (done.has(id)) return null
    active.add(id)
    for (const before of requires.get(id) ?? []) {
      const cycle = visit(before)
      if (cycle) return cycle
    }
    active.delete(id)
    done.add(id)
    return null
  }
  for (const id of requires.keys()) {
    const cycle = visit(id)
    if (cycle) return cycle
  }
  return null
}
