// Drop wires into inputs a part's current settings have made unavailable.
export function pruneUnavailableWires(kit, graph) {
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]))
  return { ...graph, wires: graph.wires.filter((wire) => {
    const node = nodes.get(wire.to)
    return node?.type !== 'arith' || kit.BOARD_PARTS.inputs(node).includes(wire.port)
  }) }
}

export function setParams(kit, graph, id, patch, changed) {
  const nodes = graph.nodes.map((node) => {
    if (node.id !== id) return node
    const edited = { ...node.params, ...patch }
    const ruled = kit.applyRules?.(node.type, edited, changed) ?? edited
    const params = { ...ruled }
    for (const key of Object.keys(params)) {
      if (params[key] !== node.params[key]) params[key] = kit.snapSetting(node.type, key, params[key])
    }
    return { ...node, params }
  })
  return pruneUnavailableWires(kit, { ...graph, nodes })
}

export const setParam = (kit, graph, id, key, value) => setParams(kit, graph, id, { [key]: value }, key)
