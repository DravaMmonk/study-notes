// Preset coordinates are anchors; live card sizes decide how much room each sibling needs.
// Only move overlapping cards downward, keeping their connections, parameters and horizontal placement.
export function spaceNodes(graph, sizes, { gapX = 16, gapY = 24, moves = () => true } = {}) {
  const groups = new Map()
  for (const node of graph.nodes) {
    const size = sizes[node.id]
    if (!Array.isArray(size) || !size.every(v => Number.isFinite(v) && v > 0)) continue
    const key = node.in ?? ''
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(node)
  }
  const box = (node) => ({ x: node.x ?? 0, y: node.y ?? 0, width: sizes[node.id][0], height: sizes[node.id][1] })
  const moved = new Map()
  for (const nodes of groups.values()) {
    const placed = nodes.filter((node) => !moves(node)).map(box)
    for (const node of nodes.filter(moves).sort((a, b) => (a.y ?? 0) - (b.y ?? 0) || (a.x ?? 0) - (b.x ?? 0))) {
      const { x, width, height } = box(node)
      let y = node.y ?? 0
      for (const other of placed.sort((a, b) => a.y - b.y)) {
        if (x + width + gapX <= other.x || other.x + other.width + gapX <= x) continue
        if (y + height + gapY <= other.y || other.y + other.height + gapY <= y) continue
        y = other.y + other.height + gapY
      }
      placed.push({ x, y, width, height })
      if (y !== (node.y ?? 0)) moved.set(node.id, { ...node, y })
    }
  }
  return moved.size ? { ...graph, nodes: graph.nodes.map(node => moved.get(node.id) ?? node) } : graph
}


/** Reserve a wide source column and a separate sink column when a canvas first opens. */
export function alignTerminals(graph, sizes, roleOf, gap = 48) {
  const top = graph.nodes.filter(node => !node.in && sizes[node.id])
  const sources = top.filter(node => roleOf(node) === 'source')
  const sinks = top.filter(node => roleOf(node) === 'sink')
  const working = top.filter(node => roleOf(node) === 'part')
  const positions = new Map()
  const left = sources.length ? Math.min(...sources.map(node => node.x ?? 0)) : null
  const boundary = left === null ? null : left + Math.max(...sources.map(node => sizes[node.id][0])) + gap
  const shift = boundary !== null && working.length ? Math.max(0, boundary - Math.min(...working.map(node => node.x ?? 0))) : 0
  for (const node of sources) positions.set(node.id, left)
  for (const node of working) positions.set(node.id, (node.x ?? 0) + shift)
  if (sinks.length) {
    const end = working.length ? Math.max(...working.map(node => positions.get(node.id) + sizes[node.id][0])) + gap : boundary ?? -Infinity
    const right = Math.max(Math.min(...sinks.map(node => node.x ?? 0)), end)
    for (const node of sinks) positions.set(node.id, right)
  }
  let changed = false
  const nodes = graph.nodes.map(node => {
    const x = positions.get(node.id)
    if (x === undefined || x === (node.x ?? 0)) return node
    changed = true
    return { ...node, x }
  })
  return changed ? { ...graph, nodes } : graph
}
