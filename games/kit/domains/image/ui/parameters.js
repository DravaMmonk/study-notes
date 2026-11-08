// Drop wires into inputs a part's current settings have made unavailable.
export function pruneUnavailableWires(kit, graph) {
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]))
  return { ...graph, wires: graph.wires.filter((wire) => {
    const node = nodes.get(wire.to)
    return node?.type !== 'arith' || kit.BOARD_PARTS.inputs(node).includes(wire.port)
  }) }
}

export function setParam(kit, graph, id, key, value) {
  const nodes = graph.nodes.map((node) => node.id === id ? { ...node, params: { ...node.params, [key]: kit.snapSetting(node.type, key, value) } } : node)
  return pruneUnavailableWires(kit, { ...graph, nodes })
}
