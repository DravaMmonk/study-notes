import { order } from '../../engine/graph.js'
import { NODE_TYPES, defaultParams, inputsOf } from '../../engine/nodes.js'

// Graph edits for the phone builder. The circuit is the same { nodes, wires } graph the desktop
// board edits; these helpers express the phone's gestures (insert after a block, skip a block,
// choose a source) as plain graph changes, and give new parts a tidy place on the desktop board.

export const NUMBERS = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳'

// Blocks in reading order: inputs, then parts in data-flow order, then outputs.
export function layout(graph) {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  const ordered = order(graph).map((id) => byId.get(id)).filter(Boolean)
  return {
    sources: graph.nodes.filter((n) => n.type === 'input'),
    steps: ordered.filter((n) => !NODE_TYPES[n.type].fixed),
    outputs: graph.nodes.filter((n) => n.type === 'output'),
  }
}

export const feeding = (graph, id, port) => graph.wires.find((w) => w.to === id && w.port === port)?.from ?? null
export const isUsed = (graph, id) => graph.wires.some((w) => w.from === id)

const freshId = (graph, type) => {
  const taken = new Set(graph.nodes.map((n) => n.id))
  let index = graph.nodes.length
  while (taken.has(`${type}-${index}`)) index += 1
  return `${type}-${index}`
}

// Somewhere to the right of `near` on the desktop board that no other card covers.
function placeNear(graph, near) {
  let [x, y] = near ? [near.x + 150, near.y] : [200, 60]
  for (let tries = 0; tries < 40 && graph.nodes.some((n) => Math.abs(n.x - x) < 140 && Math.abs(n.y - y) < 170); tries++) y += 180
  return [x, y]
}

// Insert a part right after block `after` (a source or a step). The new part reads `after`, and
// whatever came next after `after` (the following block, or the output) now reads the new part
// instead, so inserting into a chain keeps the chain whole. Parts without inputs are just added.
export function insertAfter(graph, after, type, nextInLine) {
  const id = freshId(graph, type)
  const near = graph.nodes.find((n) => n.id === after)
  const [x, y] = placeNear(graph, near)
  const node = { id, type, x, y, params: defaultParams(type) }
  const [first] = inputsOf(type)
  let wires = graph.wires
  if (first && after) {
    const moved = wires.filter((w) => w.from === after && (w.to === nextInLine || graph.nodes.find((n) => n.id === w.to)?.type === 'output'))
    wires = wires.map((w) => (moved.includes(w) ? { ...w, from: id } : w))
    wires = [...wires, { from: after, to: id, port: first }]
  }
  return { graph: { ...graph, nodes: [...graph.nodes, node], wires }, id }
}

// Take a part off the board with its wires.
export const removeNode = (graph, id) => ({ ...graph, nodes: graph.nodes.filter((n) => n.id !== id), wires: graph.wires.filter((w) => w.from !== id && w.to !== id) })

export function connect(graph, id, port, from) {
  const wires = graph.wires.filter((w) => !(w.to === id && w.port === port))
  return { ...graph, wires: from ? [...wires, { from, to: id, port }] : wires }
}

export const setParam = (graph, id, key, value) => ({ ...graph, nodes: graph.nodes.map((n) => (n.id === id ? { ...n, params: { ...n.params, [key]: value } } : n)) })

// Phone slots: each part sits in a numbered cell of a two-column grid and stays there. A part keeps
// its saved `slot` when it is free; parts without one take the first free cells in data-flow order.
// The grid always ends with at least one empty row, so there is room to drop a new part.
export function placement(graph) {
  const { steps } = layout(graph)
  const cell = new Map()
  const used = new Set()
  for (const node of steps) {
    if (Number.isInteger(node.slot) && node.slot >= 0 && !used.has(node.slot)) {
      cell.set(node.id, node.slot)
      used.add(node.slot)
    }
  }
  for (const node of steps) {
    if (cell.has(node.id)) continue
    let at = 0
    while (used.has(at)) at += 1
    cell.set(node.id, at)
    used.add(at)
  }
  const even = (n) => n + (n % 2)
  const size = Math.max(4, even(Math.max(-1, ...used) + 1) + 2)
  return { cell, size, free: Array.from({ length: size }, (_, at) => at).filter((at) => !used.has(at)) }
}

// Put a new part of `type` into slot `at`, unwired.
export function placeAt(graph, type, at) {
  const id = freshId(graph, type)
  const [x, y] = placeNear(graph, graph.nodes.at(-1))
  return { graph: { ...graph, nodes: [...graph.nodes, { id, type, x, y, slot: at, params: defaultParams(type) }] }, id }
}

// Move a part to slot `at`; a part already there swaps into the moved part's old slot.
export function moveTo(graph, id, at) {
  const { cell } = placement(graph)
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
