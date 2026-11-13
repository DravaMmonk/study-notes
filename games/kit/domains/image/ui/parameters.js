// Drop wires into inputs a part's current settings have made unavailable.
export function pruneUnavailableWires(kit, graph) {
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]))
  return { ...graph, wires: graph.wires.filter((wire) => {
    const node = nodes.get(wire.to)
    return node?.type !== 'arith' || kit.BOARD_PARTS.inputs(node).includes(wire.port)
  }) }
}

export function updateParams(kit, graph, id, next) {
  const nodes = graph.nodes.map((node) => {
    if (node.id !== id) return node
    const params = { ...next }
    for (const key of Object.keys(params)) {
      if (params[key] !== node.params[key]) params[key] = kit.snapSetting(node.type, key, params[key])
    }
    return { ...node, params }
  })
  return pruneUnavailableWires(kit, { ...graph, nodes })
}

export function setParam(kit, graph, id, key, value) {
  const node = graph.nodes.find((candidate) => candidate.id === id)
  return updateParams(kit, graph, id, kit.applyRules(node.type, { ...node.params, [key]: value }, key))
}
