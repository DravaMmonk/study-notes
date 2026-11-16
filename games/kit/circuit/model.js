// The circuit both games build, in one shape:
//
//   { nodes: [{ id, type, x, y, slot?, … }], wires: [{ from, to, port }] }
//
// A node has inputs (named ports) and one output, which may feed any number of inputs; an input takes one wire. A
// node may have several outputs instead (`parts.outputs`): a wire from one of them starts at `<node>#<key>`. `x, y` place a card on the desktop board, `slot` a block on the phone's grid; neither changes what the
// circuit computes. A node may sit inside a frame (`in`, `fold`: frames.js). A frame may save its phone column span.
// Anything else on a node (params, a
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
//   refuse(proposedGraph, wire) → null, or a { zh, en } reason the proposed board cannot accept the wire
//   valueView?(node) → the view a card uses for its value; hasSettings?(node) → it draws setting controls
//   packed?(node)    → whether it is a packed part: one that runs a circuit the player built (its family chip drawn solid)
//   defaults?(type) → initial settings for a part imported from a blueprint
//   frames?(node) → [{ name, label, opens }] the regions of a frame (frames.js)
//   outputs?(node) → [{ key, label, short?, glyph? }] a node with several outputs, or null for one; an output
//                                          goes by its glyph (SVG markup) when it has one, else by its short name
//   text?: { sets?(node), read?(node, key, value), opens?(node, key) }   as text (text.js): the settings a given
//                                          node's statement may write, a setting read back, and the settings of a given
//                                          node switched on to give output `key` a wire reads (null when it cannot)
import { splitSource, srcNode, wireEdges } from '../engine/wire-source.js'
import { sameJson } from '../engine/json-value.js'
import { cardColumns, slotColumns, slotWidth } from './card-size.js'
import { SLOT_GUTTER } from './slot-metrics.js'
import { slotGrid } from './slot-grid.js'
import { dependencyOrder, indexEdges, wouldCycle } from '../graph.js'
import { keepFixedSettings, lockedCards, lockedRefusal, PRESET_PORT_REFUSAL } from './presets.js'
import { frameEdges, scopeRefusal } from './frames.js'
import { frameId, frameTree, regionAddress, regionsFit, regionsOf } from './regions.js'

// Port ids, the same on the desktop board and the phone: an output is `o|<node>`, an input `i|<node>|<port>`.
// `id` of an output is a wire's source: a node's id, or `<node>#<key>` for one of several outputs.
export const outPort = (id) => `o|${id}`
export const inPort = (id, port) => `i|${id}|${port}`
export const parsePort = (p) => {
  const [side, id, port] = p.split('|')
  return side === 'o' ? { side: 'out', id } : { side: 'in', id, port }
}

/** A node's outputs: the declared ports, one unnamed output, or none for a sink. */
export const outputsOf = (parts, node) => parts.role(node) === 'sink' ? [] : parts.outputs?.(node) ?? [{ key: null, label: '' }]

/** The wire two ports make, in either order, or null when both are outputs or both inputs. */
export function ends(a, b) {
  const [pa, pb] = [parsePort(a), parsePort(b)]
  if (pa.side === pb.side) return null
  const [from, to] = pa.side === 'out' ? [pa, pb] : [pb, pa]
  return { from: from.id, to: to.id, port: to.port }
}

const into = (graph, to, port) => graph.wires.find((wire) => wire.to === to && wire.port === port)
export const feeding = (graph, id, port) => into(graph, id, port)?.from ?? null
export const byId = (graph, id) => graph.nodes.find((n) => n.id === id)

function replaceInput(graph, to, port, wire) {
  const wires = graph.wires.filter((existing) => existing.to !== to || existing.port !== port)
  if (wire) wires.push(wire)
  return { ...graph, wires }
}

/** Disconnect an input and return the source that was there, if any. */
export function unplugWire(graph, to, port) {
  const old = into(graph, to, port)
  if (!old) return { graph, from: null }
  const reason = lockedRefusal(graph, to, port)
  return reason ? { reason } : { graph: replaceInput(graph, to, port), from: old.from }
}

/** A circuit part, including one the level preset, as opposed to a fixed input or output. */
export const isPart = (parts, node) => Boolean(node && parts.role(node) === 'part')

/** A part the player can remove from this board. */
export const canRemoveCard = (parts, node, locked) => isPart(parts, node) && !locked.has(node.id)

/** Remove a card, any cards inside it and their wires, unless the level presets any of them. */
export function removeNode(graph, parts, id) {
  if (!canRemoveCard(parts, byId(graph, id), lockedCards(graph))) return graph
  const gone = frameTree(graph.nodes).included([id])
  return { ...graph, nodes: graph.nodes.filter((n) => !gone.has(n.id)), wires: graph.wires.filter((w) => !gone.has(srcNode(w.from)) && !gone.has(w.to)) }
}
export const moveNode = (graph, id, x, y) => ({ ...graph, nodes: graph.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)) })

const hasInput = (parts, node, port) => Boolean(node && parts.inputs(node).includes(port))
export const hasOutput = (parts, node, key) => Boolean(node && outputsOf(parts, node).some((port) => port.key === key))

/** Whether a picked or dragged port still belongs to a card on this board. */
export function hasPort(graph, parts, port) {
  const at = parsePort(port)
  if (at.side === 'in') return hasInput(parts, byId(graph, at.id), at.port)
  const [id, key] = splitSource(at.id)
  return hasOutput(parts, byId(graph, id), key)
}

/** Why a wire no longer has both of its terminals. */
export function wirePortRefusal(parts, wire, nodeAt) {
  const to = nodeAt(wire.to)
  if (!to) return missingCard(wire.to)
  if (!hasInput(parts, to, wire.port)) {
    return { zh: `「${to.id}」没有叫「${wire.port}」的输入口。`, en: `“${to.id}” has no input called “${wire.port}”.` }
  }
  const [id, key] = splitSource(wire.from)
  const from = nodeAt(id)
  if (!from) return missingCard(id)
  if (!hasOutput(parts, from, key)) {
    return { zh: `「${id}」没有输出「${key ?? ''}」。`, en: `“${id}” has no output “${key ?? ''}”.` }
  }
  return null
}

const missingCard = (id) => ({ zh: `没有叫「${id}」的元件。`, en: `There is no node called “${id}”.` })

/** Change one card's settings without stranding cards or disconnecting preset wires. */
export function editNodeSettings(graph, parts, id, params) {
  const before = byId(graph, id)
  if (!before) return { graph }
  const next = { ...before, params: keepFixedSettings(before, params) }
  if (sameJson(next.params, before.params)) return { graph }
  const nodes = graph.nodes.map((node) => node.id === id ? next : node)
  if (!regionsFit({ nodes }, parts)) {
    return { reason: { zh: '请先移出要关闭的区域里的元件。', en: 'Move the parts out of the regions you want to close first.' } }
  }

  const nodeAt = (key) => key === id ? next : byId(graph, key)
  const wires = []
  for (const wire of graph.wires) {
    const affected = wire.to === id || srcNode(wire.from) === id
    if (!affected || !wirePortRefusal(parts, wire, nodeAt)) wires.push(wire)
    else if (wire.locked) return { reason: PRESET_PORT_REFUSAL }
  }
  return { graph: { ...graph, nodes, wires } }
}

/**
 * Why a proposed wire is refused. A game's `refuse` adds its own rules after the shared rules. On a
 * board with frames (`parts.frames`, frames.js) a wire also has to run inward, and a region's own output stands
 * apart from its frame, so a frame may read back what was made from it.
 */
function wireProblem(graph, parts, wire) {
  if (!wire) return { zh: '两头都是输出口（或都是输入口）：一头接输出，一头接输入。', en: 'Both ends are outputs (or both inputs): connect an output to an input.' }
  const { from, to, port } = wire
  const unavailable = wirePortRefusal(parts, wire, (id) => byId(graph, id))
  if (unavailable) return unavailable
  const locked = lockedRefusal(graph, to, port)
  if (locked) return locked
  const { edges, from: start } = parts.frames ? frameEdges(graph, parts) : { edges: wireEdges(graph.wires), from: srcNode }
  if (start(from) === to) return { zh: '一个元件不能读它自己。', en: 'A part cannot read itself.' }
  // A board run tick by tick may feed back (parts.loops), but only through a part that keeps what it is given for the
  // next tick (parts.holds): a loop of parts that each answer at once has no tick to wait on.
  const holds = parts.loops ? (id) => parts.holds?.(byId(graph, id) ?? {}) : undefined
  if (wouldCycle(edges, start(from), to, holds)) return { zh: '这样会绕成一个圈：这个元件要等自己算完，才能算自己。', en: 'That would make a loop: this part would have to wait for itself to finish.' }
  const scope = parts.frames ? scopeRefusal(graph, parts, from, to, port) : null
  return scope
}

/** Connect or replace one input, validating the same proposed board that would be saved. */
export function connectWire(graph, parts, wire) {
  const problem = wireProblem(graph, parts, wire)
  if (problem) return { reason: problem }
  const next = replaceInput(graph, wire.to, wire.port, wire)
  const reason = parts.refuse?.(next, wire)
  return reason ? { reason } : { graph: next }
}

export const wireRefusal = (graph, parts, wire) => connectWire(graph, parts, wire).reason ?? null

/** The stored shape of a board, before using game-specific card and port descriptions. */
export function isCircuitBoard(board) {
  if (!Array.isArray(board?.nodes) || !Array.isArray(board.wires)) return false
  const ids = new Set()
  for (const node of board.nodes) {
    if (typeof node?.id !== 'string' || !node.id || typeof node.type !== 'string' || !node.type || ids.has(node.id)) return false
    ids.add(node.id)
  }
  return board.wires.every((wire) => typeof wire?.from === 'string' && typeof wire.to === 'string' && typeof wire.port === 'string')
}

/** A saved editable board, checked against the same rules as a series of new wires. */
export function boardFits(board, parts, knows) {
  if (!isCircuitBoard(board) || !board.nodes.every((node) => knows(node.type)) || !regionsFit(board, parts)) return false
  const wired = new Set()
  let soFar = { ...board, wires: [] }
  for (const wire of board.wires) {
    const input = inPort(wire.to, wire.port)
    if (wired.has(input)) return false
    const result = connectWire(soFar, parts, wire)
    if (result.reason) return false
    wired.add(input)
    soFar = result.graph
  }
  return true
}

/** Sources, parts in data-flow order, and sinks. */
export function layout(graph, parts) {
  const byNode = new Map(graph.nodes.map((node) => [node.id, node]))
  const { ordered, pending } = dependencyOrder([...byNode.keys()], indexEdges(wireEdges(graph.wires)), { stable: false })
  const nodes = [...ordered, ...pending].map((id) => byNode.get(id))
  return {
    sources: graph.nodes.filter((n) => parts.role(n) === 'source'),
    steps: nodes.filter((n) => isPart(parts, n)),
    sinks: graph.nodes.filter((n) => parts.role(n) === 'sink'),
  }
}

// Phone slots: each grid numbers its cells by row × cols + column, with a part sitting in a cell
// and staying there. A part keeps its saved `slot` when it fits there; parts without one take the first free cells in
// data-flow order. The last row keeps room for a new part.
//
// A frame's regions (frames.js) are grids of their own, inside the frame's block: `region` names one, and a part's
// slot counts in the grid of the region it sits in. The frame spans the rows its regions take, each region a row for
// its head (the value it opens), its own rows, and a row for its foot (the dot its result goes into), so its cells line
// up with the cells beside it. Each frame's regions use the columns it covers in its parent grid.
//
//   { cell: id → slot, span: id → [columns, rows], cols, rows, size, free: [slot] }
export function placement(graph, parts, region = null, { fixed = false } = {}) {
  const { steps } = layout(graph, parts)
  const regions = (n) => regionsOf(parts, n)
  const byNode = new Map(steps.map((node) => [node.id, node]))
  const tree = frameTree(graph.nodes)
  const rootWidth = parts.availableWidth ?? Infinity
  const rootCols = slotColumns(rootWidth, parts.traySize)
  const columnWidth = slotWidth(rootWidth, rootCols)
  const grids = new Map()
  const place = (r) => {
    if (grids.has(r)) return grids.get(r)
    const ancestors = tree.ancestors(r)
    const cols = (ancestors ?? []).reduce((width, address) => {
      const span = byNode.get(frameId(address))?.span
      return Number.isInteger(span) && span > 0 ? Math.min(span, width) : width
    }, rootCols)
    const width = cols * columnWidth + (cols - 1) * SLOT_GUTTER
    const grid = slotGrid(cols)
    const cell = new Map()
    const span = new Map()
    const sizeOf = (n) => {
      const frames = regions(n)
      if (!frames.length) return [cardColumns(parts, n, width, cols), 1]
      const children = frames.map((g) => place(regionAddress(n.id, g.name)))
      const frameColumns = children[0].cols
      return [frameColumns, children.reduce((sum, child) => sum + 2 + child.rows, 0)]
    }
    const take = (node, at, size) => {
      cell.set(node.id, at)
      span.set(node.id, size)
      grid.take(at, size)
    }
    const here = ancestors ? steps.filter((n) => (n.in ?? null) === r) : []
    for (const node of here) {
      if (!Number.isInteger(node.slot) || node.slot < 0) continue
      const size = sizeOf(node)
      if (grid.fits(node.slot, size)) take(node, node.slot, size)
    }
    for (const node of here) {
      if (cell.has(node.id)) continue
      const size = sizeOf(node)
      take(node, grid.firstFree(size), size)
    }
    const last = Math.ceil((grid.last + 1) / cols)
    const reserved=r===null?Math.max(0,...(graph.blocks??[]).filter(b=>Number.isInteger(b.slot)&&Number.isInteger(b.rows)).map(b=>Math.floor(b.slot/cols)+b.rows)):0
    const rows = fixed ? Math.max(1, last) : Math.max(last, reserved) + 1
    const size = rows * cols
    const result = { cell, span, cols, rows, size, free: Array.from({ length: size }, (_, at) => at).filter((at) => !grid.has(at)) }
    grids.set(r, result)
    return result
  }
  return place(region)
}

/** Every requested slot must fit without displacing another card in the destination grid. */
export function fitsSlotEdit(placed, slots) {
  return [...slots].every(([id, slot]) => placed.cell.get(id) === slot)
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
 * beside it as drawn), `gap` apart: `at` itself if it is clear, else the nearest clear spot on a 20px grid, sideways
 * (right, or with `toward` -1 left) or below. Null when `at` is already clear.
 */
export function clearSpot(boxes, [w, h], [x0, y0], gap = 16, toward = 1) {
  const clear = (x, y) => boxes.every(([bx, by, bw, bh]) => x >= bx + bw + gap || x + w + gap <= bx || y >= by + bh + gap || y + h + gap <= by)
  if (clear(x0, y0)) return null
  for (let d = 1; d < 200; d++) {
    for (let j = 0; j <= d; j++) if (clear(x0 + toward * (d - j) * 20, y0 + j * 20)) return [x0 + toward * (d - j) * 20, y0 + j * 20]
  }
  return null
}

/**
 * Room on the desktop board for a new card: in a frame's region from its corner; on the board itself left of `before`
 * (the outputs' left edge, when the board has them), column by column leftwards, else from the board's left.
 */
export const spotIn = (graph, region = null, before = null) => (region
  ? freeSpot({ nodes: graph.nodes.filter((n) => n.in === region) }, { w: 170, h: 150, x0: 44, y0: 20, dx: 190, cols: 2 })
  : freeSpot({ nodes: graph.nodes.filter((n) => !n.in) }, Number.isFinite(before) ? { w: 170, h: 150, x0: before - 230, dx: -200 } : { w: 170, h: 150, x0: 240, dx: 200 }))
