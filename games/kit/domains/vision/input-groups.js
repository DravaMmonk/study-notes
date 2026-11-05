// A board saved before its task grouped some inputs on one card (board.js `inputGroups`) has a card for each: on
// loading a save, those cards become the group's card and their wires its outputs, every kept board of the task (its
// boards, its slots', the one its part runs) alike. Tests and the signature of a part the board becomes do not change.
const groupOf = (task, name) => task.inputGroups?.find((g) => g.inputs.includes(name))
const groupedSource = (task, source) => {
  const group = groupOf(task, source)
  return group ? `${group.name}#${source}` : source
}

/** A board with the task's grouped inputs on their group's card. */
export function mergeInputGroups(board, task) {
  if (!board?.nodes || !task?.inputGroups?.length) return board
  let nodes = board.nodes
  for (const group of task.inputGroups) {
    const first = nodes.find((n) => n.type === 'in' && group.inputs.includes(n.params?.name))
    if (!first) continue
    nodes = nodes.flatMap((node) => node.type === 'in' && group.inputs.includes(node.params?.name)
      ? node === first ? [{ ...node, id: group.name, params: { name: group.name, members: group.inputs.join(',') } }] : [] : [node])
  }
  if (nodes === board.nodes) return board
  return { ...board, nodes, wires: board.wires.map((wire) => ({ ...wire, from: groupedSource(task, wire.from) })) }
}

/** A save with every board of a task that groups inputs merged (circuit-game.js migrate; tasks: every task read). */
export function migrateInputGroups(saved, tasks) {
  const byId = new Map(tasks.map((task) => [task.taskId, task]))
  const visit = (value, task) => {
    if (Array.isArray(value)) return value.map((item) => visit(item, task))
    if (!value || typeof value !== 'object') return value
    if (value.nodes) return mergeInputGroups(value, task)
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, visit(item, task)]))
  }
  return { ...saved, ...Object.fromEntries(['data', 'slots', 'built'].filter((key) => saved[key]).map((key) =>
    [key, Object.fromEntries(Object.entries(saved[key]).map(([id, value]) => [id, byId.get(id)?.inputGroups?.length ? visit(value, byId.get(id)) : value]))])) }
}
