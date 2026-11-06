// Preset coordinates are anchors; live card sizes decide how much room each sibling needs.
// Only move overlapping cards downward, keeping their connections, parameters and horizontal placement.
export function spaceNodes(graph, sizes, gap = 24) {
  const groups = new Map()
  for (const node of graph.nodes) {
    const size = sizes[node.id]
    if (!size || !size.every(v => Number.isFinite(v) && v > 0)) continue
    const key = node.in ?? ''
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(node)
  }
  const moved = new Map()
  for (const nodes of groups.values()) {
    const placed = []
    for (const node of [...nodes].sort((a, b) => (a.y ?? 0) - (b.y ?? 0) || (a.x ?? 0) - (b.x ?? 0))) {
      const [width, height] = sizes[node.id]
      const x = node.x ?? 0
      let y = node.y ?? 0
      for (const other of placed.sort((a, b) => a.y - b.y)) {
        if (x + width + 16 <= other.x || other.x + other.width + 16 <= x) continue
        if (y + height + gap <= other.y || other.y + other.height + gap <= y) continue
        y = other.y + other.height + gap
      }
      placed.push({ x, y, width, height })
      if (y !== (node.y ?? 0)) moved.set(node.id, { ...node, y })
    }
  }
  return moved.size ? { ...graph, nodes: graph.nodes.map(node => moved.get(node.id) ?? node) } : graph
}
