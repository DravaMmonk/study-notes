// Stages describe a board's provenance, not its computation. Ownership follows the first appearance of a node id;
// terminals stay outside stages so changing a task's interface never hides its inputs or outputs.
export const OPEN_PART_LIMIT = 8

export function stagesOf({ task, board, chain = [], isFixed = (node) => ['in', 'out'].includes(node.type) }) {
  const terminals = new Set([...(task.inputs ?? []), ...(task.outputs ?? [])].map((p) => p.name))
  const parts = board.nodes.filter((n) => !isFixed(n) && !terminals.has(n.id))
  const owner = new Map()
  for (const stage of chain) for (const node of stage.board?.nodes ?? []) if (!owner.has(node.id)) owner.set(node.id, stage.id)
  const stages = chain.flatMap(({ id, label }) => {
    const nodes = parts.filter((n) => owner.get(n.id) === id).map((n) => n.id)
    if (!nodes.length) return []
    const within = new Set(nodes)
    return [{ id, label, nodes,
      ins: board.wires.filter((w) => within.has(w.to) && !within.has(w.from.split('#')[0])),
      outs: board.wires.filter((w) => within.has(w.from.split('#')[0]) && !within.has(w.to)),
    }]
  })
  return { stages, loose: parts.filter((n) => !owner.has(n.id)).map((n) => n.id) }
}
