// The circuit both games build, in one shape:
//
//   { nodes: [{ id, type, x, y, slot?, … }], wires: [{ from, to, port }] }
//
// A node has inputs (named ports) and one output, which may feed any number of inputs; an input takes one wire. A
// node may have several outputs instead (`parts.outputs`): a wire from one of them starts at `<node>#<key>`. `x, y` place a card on the desktop board, `slot` a block on the phone's grid; neither changes what the
// circuit computes. A node may sit inside a frame (`in`, `fold`: frames.js). Anything else on a node (params, a
// value, a view) belongs to the game.
//
// A level may put parts and wires on the board before the player starts (its `preset`, put in by withPreset): they are
// `locked`. The player may move a locked part (within the region it sits in), never take it off; a locked wire is
// never taken off or replaced. The ports a preset leaves free are the player's to wire. A locked part's settings are
// the player's too, unless the preset fixes them (`fixed`: true for all of them, or a list of setting keys). Every editor guards this
// (keepLocked on each change, lockedRefusal on each wire tried).
//
// A game describes its nodes with a `parts` object (see CanvasEditor / useSlotEditing):
//   inputs(node) → [port]       role(node) → 'source' | 'sink' | 'part'      label(node) → text
//   portLabel(node, port) → text   family(node) → string   icon(node) → Component
//   refuse(graph, from, to, port) → null, or a { zh, en } reason the wire is not allowed
//   removable?(node) → whether the player may take it off the board (default: a part)
//   cardWidth?(node) → px a desktop card is wide, when not the board's width (CanvasEditor)
//   packed?(node)    → whether it is a packed part: one that runs a circuit the player built (its family chip drawn solid)
//   frames?(node) → [{ name, label, opens }] the regions of a frame (frames.js)
//   outputs?(node) → [{ key, label, short?, glyph? }] a node with several outputs, or null for one; an output
//                                          goes by its glyph (SVG markup) when it has one, else by its short name
import { wouldCycle } from '../graph.js'
import { frameEdges, moveInto, scopeRefusal, within } from './frames.js'

// Port ids, the same on the desktop board and the phone: an output is `o|<node>`, an input `i|<node>|<port>`.
// `id` of an output is a wire's source: a node's id, or `<node>#<key>` for one of several outputs.
export const outPort = (id) => `o|${id}`
export const inPort = (id, port) => `i|${id}|${port}`
export const parsePort = (p) => {
  const [side, id, port] = p.split('|')
  return side === 'o' ? { side: 'out', id } : { side: 'in', id, port }
}

/** The node a wire's source belongs to, and which of its outputs it is (null for a node's only output). */
export const srcNode = (src) => String(src).split('#')[0]
export const srcKey = (src) => (String(src).includes('#') ? String(src).slice(String(src).indexOf('#') + 1) : null)
/** The source of a node's output `key` (its only output when `key` is null). */
export const srcOf = (node, key) => (key === null || key === undefined ? node.id : `${node.id}#${key}`)
/** A node's outputs: [{ key, label, short? }], or one unnamed output. */
export const outputsOf = (parts, node) => parts.outputs?.(node) ?? [{ key: null, label: '' }]

/** The wire two ports make, in either order, or null when both are outputs or both inputs. */
export function ends(a, b) {
  const [pa, pb] = [parsePort(a), parsePort(b)]
  if (pa.side === pb.side) return null
  const [from, to] = pa.side === 'out' ? [pa, pb] : [pb, pa]
  return { from: from.id, to: to.id, port: to.port }
}

export const feeding = (graph, id, port) => graph.wires.find((w) => w.to === id && w.port === port)?.from ?? null
export const byId = (graph, id) => graph.nodes.find((n) => n.id === id)

/** Set (or with `from` null, clear) the wire into input `port` of node `id`; an input takes one wire. */
export function connect(graph, id, port, from) {
  const wires = graph.wires.filter((w) => !(w.to === id && w.port === port))
  return { ...graph, wires: from ? [...wires, { from, to: id, port }] : wires }
}

/** The board without node `id`, and without whatever sits inside it (a frame's cards, frames.js), with their wires. */
export function removeNode(graph, id) {
  const gone = new Set([id, ...within(graph, id)])
  return { ...graph, nodes: graph.nodes.filter((n) => !gone.has(n.id)), wires: graph.wires.filter((w) => !gone.has(srcNode(w.from)) && !gone.has(w.to)) }
}
export const removeWire = (graph, wire) => ({ ...graph, wires: graph.wires.filter((w) => !(w.to === wire.to && w.port === wire.port)) })
export const moveNode = (graph, id, x, y) => ({ ...graph, nodes: graph.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)) })

/** The preset a level takes from its reference `answer`: the cards `items` (an id, or { id, fixed } to fix its
 *  settings: true, or a list of keys), and the answer's wires between them and the nodes `own` (the board's own inputs
 *  and outputs). */
export function presetOf(answer, items, own = new Set()) {
  const fixed = new Map(items.map((item) => (typeof item === 'string' ? [item, undefined] : [item.id, item.fixed])))
  const picked = new Set(fixed.keys())
  const on = (id) => picked.has(id) || own.has(id)
  return {
    nodes: answer.nodes.filter((n) => picked.has(n.id)).map((n) => (fixed.get(n.id) ? { ...n, fixed: fixed.get(n.id) } : n)),
    wires: answer.wires.filter((w) => on(srcNode(w.from)) && on(w.to) && (picked.has(srcNode(w.from)) || picked.has(w.to))),
  }
}

/** A level's preset on a board (a fresh one or a saved one): its parts and wires, locked, each where the board
 *  already has it (with the settings it has there, but for those the preset fixes), else where the preset puts it; a wire into a port the preset fills replaces the board's. */
export function withPreset(graph, preset) {
  if (!preset) return graph
  const had = new Map(graph.nodes.map((n) => [n.id, n]))
  const nodes = preset.nodes.map((n) => {
    const at = had.get(n.id)
    const params = settingsOf(n, at)
    const placed = at && { x: at.x, y: at.y, slot: at.slot, ...(n.nest ? { in: at.in } : {}) }
    return { ...n, ...placed, ...(params && { params }), locked: true }
  })
  const ids = new Set(nodes.map((n) => n.id))
  const wires = preset.wires.map((w) => ({ ...w, locked: true }))
  const filled = new Set(wires.map((w) => `${w.to}|${w.port}`))
  return {
    ...graph,
    nodes: [...graph.nodes.filter((n) => !ids.has(n.id)), ...nodes],
    wires: [...graph.wires.filter((w) => !w.locked && !filled.has(`${w.to}|${w.port}`)), ...wires],
  }
}

/** `next` with every locked part and wire of `prev` back in it: a change never takes them off (a part keeps the place
 *  `next` gives it). */
export function keepLocked(prev, next) {
  const nodes = prev.nodes.filter((n) => n.locked)
  const wires = prev.wires.filter((w) => w.locked)
  if (!nodes.length && !wires.length) return next
  return withPreset(next, { nodes, wires })
}

const LOCKED = { zh: '这根线是关卡接好的，不能改。', en: 'This wire came with the level; it cannot be changed.' }
/** Why the wire into input `port` of `to` cannot be changed: a locked wire is there. */
export const lockedRefusal = (graph, to, port) => (graph.wires.some((w) => w.locked && w.to === to && w.port === port) ? LOCKED : null)
/** Whether a setting of a node is one the level fixed. */
export const isFixed = (node, key) => node.fixed === true || (Array.isArray(node.fixed) && node.fixed.includes(key))
// A locked part's settings: the board's, but for the fixed ones, which are the preset's.
const settingsOf = (preset, at) => {
  if (!at?.params) return preset.params
  if (!preset.fixed) return at.params
  if (preset.fixed === true) return preset.params
  return { ...at.params, ...Object.fromEntries(preset.fixed.filter((k) => preset.params && k in preset.params).map((k) => [k, preset.params[k]])) }
}

/**
 * Whether a part must stay in the region it sits in: a locked part does, unless the level lets it nest (`nest`: a
 * frame it put on the board that the player may put into another frame, and take out again; it is still never
 * deleted).
 */
export const staysPut = (node) => Boolean(node?.locked && !node.nest)

/** Whether a wire is one a level put in. */
export const isLocked = (graph, wire) => graph.wires.some((w) => w.locked && w.to === wire.to && w.port === wire.port)

/**
 * The reasons every game shares for refusing a wire; a game's `refuse` adds its own (types, say) after these. On a
 * board with frames (`parts.frames`, frames.js) a wire also has to run inward, and a region's own output stands
 * apart from its frame, so a frame may read back what was made from it.
 */
export function baseRefusal(graph, from, to, port, parts = {}) {
  const locked = lockedRefusal(graph, to, port)
  if (locked) return locked
  const { edges, from: start } = parts.frames ? frameEdges(graph, parts) : { edges: graph.wires.map((w) => [srcNode(w.from), w.to]), from: srcNode }
  if (start(from) === to) return { zh: '一个元件不能读它自己。', en: 'A part cannot read itself.' }
  if (wouldCycle(edges, start(from), to)) return { zh: '这样会绕成一个圈：这个元件要等自己算完，才能算自己。', en: 'That would make a loop: this part would have to wait for itself to finish.' }
  return parts.frames ? scopeRefusal(graph, parts, from, to, port) : null
}

/** Nodes in data-flow order (each after everything it reads); nodes caught in a loop come last. */
export function order(graph) {
  const ins = new Map(graph.nodes.map((n) => [n.id, 0]))
  for (const w of graph.wires) if (ins.has(w.to) && ins.has(srcNode(w.from))) ins.set(w.to, ins.get(w.to) + 1)
  const queue = graph.nodes.filter((n) => !ins.get(n.id)).map((n) => n.id)
  const out = []
  while (queue.length) {
    const id = queue.shift()
    out.push(id)
    for (const w of graph.wires) {
      if (srcNode(w.from) !== id || !ins.has(w.to)) continue
      ins.set(w.to, ins.get(w.to) - 1)
      if (!ins.get(w.to)) queue.push(w.to)
    }
  }
  return [...out, ...graph.nodes.map((n) => n.id).filter((id) => !out.includes(id))]
}

/** Sources, parts in data-flow order, and sinks. */
export function layout(graph, parts) {
  const ids = order(graph)
  const nodes = ids.map((id) => byId(graph, id)).filter(Boolean)
  return {
    sources: graph.nodes.filter((n) => parts.role(n) === 'source'),
    steps: nodes.filter((n) => parts.role(n) === 'part'),
    sinks: graph.nodes.filter((n) => parts.role(n) === 'sink'),
  }
}

// Phone slots: each part sits in a numbered cell of a two-column grid and stays there. A part keeps its saved
// `slot` when it is free; parts without one take the first free cells in data-flow order. The grid always ends
// with at least one empty row, so there is room to drop a new part.
//
// A frame's regions (frames.js) are grids of their own, inside the frame's block: `region` names one, and a part's
// slot counts in the grid of the region it sits in, which also ends with an empty row; the value it opens is a dot
// over its grid, not a cell. A frame takes a whole row of the grid it sits in.
export function placement(graph, parts, region = null) {
  const { steps } = layout(graph, parts)
  const here = steps.filter((n) => (n.in ?? null) === region)
  const wide = (n) => (parts.frames?.(n) ?? []).length > 0
  // Cells taken: each part's (a frame's whole row).
  const used = new Set()
  const cell = new Map()
  const fits = (n, at) => !used.has(at) && (!wide(n) || (at % 2 === 0 && !used.has(at + 1)))
  const take = (n, at) => {
    cell.set(n.id, at)
    used.add(at)
    if (wide(n)) used.add(at + 1)
  }
  for (const node of here) if (Number.isInteger(node.slot) && node.slot >= 0 && fits(node, node.slot)) take(node, node.slot)
  for (const node of here) {
    if (cell.has(node.id)) continue
    let at = 0
    while (!fits(node, at)) at += 1
    take(node, at)
  }
  const even = (n) => n + (n % 2)
  const size = even(Math.max(-1, ...used) + 1) + 2
  return { cell, size, wide: new Set(here.filter(wide).map((n) => n.id)), free: Array.from({ length: size }, (_, at) => at).filter((at) => !used.has(at)) }
}

/**
 * Move a part to slot `at` of `region` (null: the board itself); a part already there swaps into the moved part's
 * old slot. Into another region it goes as frames.js moveInto has it, at a free spot there on the desktop board.
 */
export function moveToSlot(graph, parts, id, at, region = null) {
  const node = byId(graph, id)
  if ((node?.in ?? null) !== region) {
    const moved = moveInto(graph, parts, id, region, ...spotIn(graph, region))
    return moved === graph ? graph : { ...moved, nodes: moved.nodes.map((n) => (n.id === id ? { ...n, slot: at } : n)) }
  }
  const { cell } = placement(graph, parts, region)
  const from = cell.get(id)
  const other = [...cell].find(([, slot]) => slot === at)?.[0]
  return {
    ...graph,
    nodes: graph.nodes.map((n) => {
      if (n.id === id) return { ...n, slot: at }
      if (n.id === other) return { ...n, slot: from }
      return cell.has(n.id) ? { ...n, slot: cell.get(n.id) } : n
    }),
  }
}

/** Somewhere on the desktop board, right of `near`, that no other card covers. */
export function placeNear(graph, near, { w = 140, h = 170 } = {}) {
  let [x, y] = near ? [near.x + w + 10, near.y] : [200, 60]
  for (let tries = 0; tries < 40 && graph.nodes.some((n) => Math.abs(n.x - x) < w && Math.abs(n.y - y) < h); tries++) y += h + 10
  return [x, y]
}

/** The first free cell of a loose grid between the sources and the sinks, for a part added on the desktop. */
export function freeSpot(graph, { w = 140, h = 170, cols = 3, rows = 5, x0 = 200, y0 = 40, dx = 150, dy = 190 } = {}) {
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const [x, y] = [x0 + col * dx, y0 + row * dy]
      if (!graph.nodes.some((n) => Math.abs(n.x - x) < w && Math.abs(n.y - y) < h)) return [x, y]
    }
  }
  const n = graph.nodes.length
  return [x0 + 20 + (n % 4) * 30, y0 + 20 + (n % 6) * 30]
}

/**
 * Where a card of size `size` ([w, h]) wanted at `at` ([x, y]) can sit clear of `boxes` ([x, y, w, h] each, the cards
 * beside it as drawn), `gap` apart: `at` itself if it is clear, else the nearest clear spot right of it or below it,
 * on a 20px grid. Null when `at` is already clear.
 */
export function clearSpot(boxes, [w, h], [x0, y0], gap = 16) {
  const clear = (x, y) => boxes.every(([bx, by, bw, bh]) => x >= bx + bw + gap || x + w + gap <= bx || y >= by + bh + gap || y + h + gap <= by)
  if (clear(x0, y0)) return null
  for (let d = 1; d < 200; d++) {
    for (let j = 0; j <= d; j++) if (clear(x0 + (d - j) * 20, y0 + j * 20)) return [x0 + (d - j) * 20, y0 + j * 20]
  }
  return null
}

/** Room on the desktop board for a new card: on the board itself, or in a frame's region from its corner. */
export const spotIn = (graph, region = null) => (region
  ? freeSpot({ nodes: graph.nodes.filter((n) => n.in === region) }, { w: 170, h: 150, x0: 44, y0: 20, dx: 190, cols: 2 })
  : freeSpot({ nodes: graph.nodes.filter((n) => !n.in) }, { w: 170, h: 150, x0: 240, dx: 200 }))
