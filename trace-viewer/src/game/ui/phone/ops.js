import { placeNear } from '../../../../../games/kit/circuit/index.js'
import { defaultParams, inputsOf } from '../../engine/nodes.js'

// How Vision Complete makes parts on the phone. Editing the circuit (wires, slots, moving, removing) is the shared
// circuit editor's (games/kit/circuit); these only create Vision Complete's nodes, with their default settings and
// a tidy place on the desktop board too.

const freshId = (graph, type) => {
  const taken = new Set(graph.nodes.map((n) => n.id))
  let index = graph.nodes.length
  while (taken.has(`${type}-${index}`)) index += 1
  return `${type}-${index}`
}

// Insert a part right after block `after` (a source or a step), for the add sheet's previews. The new part reads
// `after`, and whatever came next after `after` (the following block, or the output) now reads the new part
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

/** A new part of `type` in phone slot `at`, unwired. */
export function placeAt(graph, type, at) {
  const id = freshId(graph, type)
  const [x, y] = placeNear(graph, graph.nodes.at(-1))
  return { graph: { ...graph, nodes: [...graph.nodes, { id, type, x, y, slot: at, params: defaultParams(type) }] }, id }
}

export const setParam = (graph, id, key, value) => ({ ...graph, nodes: graph.nodes.map((n) => (n.id === id ? { ...n, params: { ...n.params, [key]: value } } : n)) })
