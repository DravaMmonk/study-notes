// The circuit both games build, in one shape:
//
//   { nodes: [{ id, type, x, y, slot?, … }], wires: [{ from, to, port }] }
//
// A node has inputs (named ports) and one output, which may feed any number of inputs; an input takes one wire. A
// node may have several outputs instead (`parts.outputs`): a wire from one of them starts at `<node>#<key>`. `x, y` place a card on the desktop board, `slot` a block on the phone's grid; neither changes what the
// circuit computes. A node may sit inside a frame (`in`, `fold`: frames.js). Anything else on a node (params, a
// value, a view) belongs to the game.
//
// A game describes its nodes with a `parts` object (see CanvasEditor / useSlotEditing):
//   inputs(node) → [port]       role(node) → 'source' | 'sink' | 'part'      label(node) → text
//   portLabel(node, port) → text   family(node) → string   icon(node) → Component
//   refuse(graph, from, to, port) → null, or a { zh, en } reason the wire is not allowed
//   removable?(node) → whether the player may take it off the board (default: a part)
//   cardWidth?(node) → px a desktop card is wide, when not the board's width (CanvasEditor)
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

/**
 * The reasons every game shares for refusing a wire; a game's `refuse` adds its own (types, say) after these. On a
 * board with frames (`parts.frames`, frames.js) a wire also has to run inward, and a region's own output stands
 * apart from its frame, so a frame may read back what was made from it.
 */
export function baseRefusal(graph, from, to, port, parts = {}) {
  const { edges, from: start } = parts.frames ? frameEdges(graph, parts) : { edges: graph.wires.map((w) => [srcNode(w.from), w.to]), from: srcNode }
  if (start(from) === to) return { zh: '一块不能读它自己。', en: 'A block cannot read itself.' }
  if (wouldCycle(edges, start(from), to)) return { zh: '这样会绕成一个圈：这一块要等自己算完，才能算自己。', en: 'That would make a loop: this block would have to wait for itself to finish.' }
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
// slot counts in the grid of the region it sits in. A region shows at least two rows; the value it opens is a dot over
// its grid, not a cell. A frame takes a whole row of the grid it sits in.
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
  const size = Math.max(region ? 4 : 0, even(Math.max(-1, ...used) + 1) + 2)
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

/** Room on the desktop board for a new card: on the board itself, or in a frame's region from its corner. */
export const spotIn = (graph, region = null) => (region
  ? freeSpot({ nodes: graph.nodes.filter((n) => n.in === region) }, { w: 170, h: 150, x0: 44, y0: 20, dx: 190, cols: 2 })
  : freeSpot({ nodes: graph.nodes.filter((n) => !n.in) }, { w: 170, h: 150, x0: 240, dx: 200 }))
