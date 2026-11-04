/** Related logical inputs share a source without changing tests or packed-part signatures. */
export const groupOf = (level, name) => level.inputGroups?.find((g) => g.inputs.includes(name))
export const groupedSource = (level, source) => {
  const group = groupOf(level, source)
  return group ? `${group.name}#${source}` : source
}

/** Upgrade saved sources once on load, preserving graph edges, positions and alternate boards. */
export function mergeInputGroups(board, level) {
  if (!board?.nodes || !level?.inputGroups?.length) return board
  let nodes = board.nodes
  for (const group of level.inputGroups) {
    const first = nodes.find((n) => n.type === 'in' && group.inputs.includes(n.params?.name))
    if (!first) continue
    nodes = nodes.flatMap((node) => node.type === 'in' && group.inputs.includes(node.params?.name)
      ? node === first ? [{ ...node, id: group.name, params: { name: group.name, members: group.inputs.join(',') } }] : [] : [node])
  }
  if (nodes === board.nodes) return board
  return { ...board, nodes, wires: board.wires.map((wire) => ({ ...wire, from: groupedSource(level, wire.from) })) }
}

export function migrateInputGroups(saved, tasks) {
  const byId = new Map(tasks.map((task) => [task.taskId, task]))
  const visit = (value, level) => {
    if (Array.isArray(value)) return value.map((item) => visit(item, level))
    if (!value || typeof value !== 'object') return value
    if (value.nodes) return mergeInputGroups(value, level)
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, visit(item, level)]))
  }
  return { ...saved, ...Object.fromEntries(['data', 'slots', 'built'].filter((key) => saved[key]).map((key) =>
    [key, Object.fromEntries(Object.entries(saved[key]).map(([id, value]) => [id, byId.get(id)?.inputGroups?.length ? visit(value, byId.get(id)) : value]))])) }
}
