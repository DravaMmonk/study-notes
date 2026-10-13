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

// Remove a step and let whatever read it read the step's own first input instead, so deleting a
// block from the middle of a chain does not break the chain.
export function skip(graph, id) {
  const [first] = inputsOf(graph.nodes.find((n) => n.id === id)?.type ?? 'input')
  const upstream = first ? feeding(graph, id, first) : null
  const wires = graph.wires
    .filter((w) => w.to !== id)
    .flatMap((w) => (w.from !== id ? [w] : upstream ? [{ ...w, from: upstream }] : []))
  return { nodes: graph.nodes.filter((n) => n.id !== id), wires }
}

export function connect(graph, id, port, from) {
  const wires = graph.wires.filter((w) => !(w.to === id && w.port === port))
  return { ...graph, wires: from ? [...wires, { from, to: id, port }] : wires }
}

export const setParam = (graph, id, key, value) => ({ ...graph, nodes: graph.nodes.map((n) => (n.id === id ? { ...n, params: { ...n.params, [key]: value } } : n)) })

// Where "append" inserts: after whatever feeds the first output, else after the last block.
export function tailOf(graph) {
  const out = graph.nodes.find((n) => n.type === 'output')
  const fed = out ? feeding(graph, out.id, 'in') : null
  if (fed) return fed
  const { sources, steps } = layout(graph)
  return steps.at(-1)?.id ?? sources[0]?.id ?? null
}
