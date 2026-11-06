// Dividers are ordinary board layout. Course provenance supplies a preset only until the player writes sections;
// an explicit empty array means all dividers were deleted, not that a preset should be generated again.
import { layout, order, placement, srcNode } from './model.js'

export function sectionsOf(board, placed) {
  const rows = [...new Map((board.sections ?? []).filter((s) => Number.isInteger(s.row) && s.row >= 0).map((s) => [s.row, s])).values()].sort((a, b) => a.row - b.row)
  const starts = rows[0]?.row === 0 ? rows : [{ row: 0, implicit: true }, ...rows]
  return starts.map((s, k) => {
    const end = starts[k + 1]?.row ?? Math.max(placed.rows, s.row + 1)
    const nodes = [...placed.cell].filter(([, slot]) => slot >= s.row * placed.cols && slot < end * placed.cols).map(([id]) => id)
    const within = new Set(nodes)
    return { ...s, id: `section:${s.row}`, end, nodes, label: s.note ?? '',
      ins: board.wires.filter((w) => within.has(w.to) && !within.has(srcNode(w.from))),
      outs: board.wires.filter((w) => within.has(srcNode(w.from)) && !within.has(w.to)),
    }
  })
}

/** Materialise the current placement before editing dividers so membership stays stable across reloads. */
export function withSections(board, parts, sections) {
  const placed = placement(board, parts)
  return { ...board, sections: sections.map(({ row, note, folded }) => ({ row, ...(note !== undefined ? { note } : {}), ...(folded ? { folded: true } : {}) })).sort((a, b) => a.row - b.row),
    nodes: board.nodes.map((n) => placed.cell.has(n.id) ? { ...n, slot: placed.cell.get(n.id) } : n) }
}

export function sectionPreset(board, stages, parts) {
  if (board.sections !== undefined) return board
  if (!stages.length) return { ...board, sections: [] }
  const placed = placement(board, parts), roots = layout(board, parts).steps.filter((n) => !n.in)
  const used = new Set(), slots = new Map(), sections = []
  const ordered = order(board)
  let cursor = 0
  const take = (ids, note, folded) => {
    const nodes = roots.filter((n) => ids.has(n.id) && !used.has(n.id)).sort((a, b) => ordered.indexOf(a.id) - ordered.indexOf(b.id))
    if (!nodes.length) return
    sections.push({ row: cursor / placed.cols, ...(note !== undefined ? { note } : {}), ...(folded ? { folded: true } : {}) })
    const occupied = new Set()
    for (const n of nodes) {
      const [w, h] = placed.span.get(n.id)
      const cells = (slot) => Array.from({ length: w * h }, (_, k) => slot + Math.floor(k / w) * placed.cols + k % w)
      let at = 0
      while (at % placed.cols + w > placed.cols || cells(at).some((i) => occupied.has(i))) at++
      for (const i of cells(at)) occupied.add(i)
      slots.set(n.id, cursor + at)
      used.add(n.id)
    }
    cursor += Math.ceil((Math.max(...occupied) + 1) / placed.cols) * placed.cols
  }
  for (const s of stages) take(new Set(s.nodes), s.label, true)
  take(new Set(roots.map((n) => n.id)), undefined, false)
  if (sections.at(-1)?.folded) sections.push({ row: cursor / placed.cols })
  return { ...board, sections, nodes: board.nodes.map((n) => slots.has(n.id) ? { ...n, slot: slots.get(n.id) } : n) }
}

/** Divider gaps never cut through a frame spanning several rows. */
export function sectionGaps(placed) {
  return Array.from({ length: placed.rows + 1 }, (_, row) => row).filter((row) => [...placed.cell].every(([id, at]) => {
    const start = Math.floor(at / placed.cols), height = placed.span.get(id)[1]
    return row <= start || row >= start + height
  }))
}

export function editSection(board, parts, row, patch) {
  const sections = board.sections ?? []
  if (patch?.row !== undefined && sections.some((s) => s.row === patch.row && s.row !== row)) return board
  const next = patch === null ? sections.filter((s) => s.row !== row) : sections.some((s) => s.row === row) ? sections.map((s) => s.row === row ? { ...s, ...patch } : s) : [...sections, { row, ...patch }]
  return withSections(board, parts, next)
}

/** Keep section order and row boundaries while sorting its own slots by dependency. */
export function arrangeSections(board, parts) {
  const placed = placement(board, parts), ordered = order(board), slots = new Map()
  for (const s of sectionsOf(board, placed)) {
    const occupied = new Set()
    for (const id of [...s.nodes].sort((a, b) => ordered.indexOf(a) - ordered.indexOf(b))) {
      const [w, h] = placed.span.get(id)
      let at = s.row * placed.cols
      const cells = (slot) => Array.from({ length: w * h }, (_, k) => slot + Math.floor(k / w) * placed.cols + k % w)
      while (at % placed.cols + w > placed.cols || cells(at).some((i) => occupied.has(i))) at++
      if (Math.floor(at / placed.cols) + h > s.end) return board
      cells(at).forEach((i) => occupied.add(i))
      slots.set(id, at)
    }
  }
  return { ...board, nodes: board.nodes.map((n) => slots.has(n.id) ? { ...n, slot: slots.get(n.id) } : n) }
}

/** Tray additions use visible free work slots rather than holes inside folded sections. */
export function firstOpenSlot(board, parts) {
  const placed = placement(board, parts), sections = sectionsOf(board, placed)
  return placed.free.find((slot) => !sections.find((s) => slot >= s.row * placed.cols && slot < s.end * placed.cols)?.folded) ?? placed.free.at(-1)
}
