// Data-flow columns shared by browser stage diagrams, the arrangement action and headless SVGs. Cycles keep a
// finite depth; sources outside the supplied nodes do not add a column.
export function flowLayout(nodes, wires, { sizeOf, gapX = 44, gapY = 14 } = {}) {
  const ids = new Set(nodes.map((n) => n.id))
  const depth = new Map()
  const depthOf = (id, seen = new Set()) => {
    if (depth.has(id)) return depth.get(id)
    if (seen.has(id)) return 0
    seen.add(id)
    const inputs = wires.filter((w) => w.to === id).map((w) => w.from.split('#')[0]).filter((src) => ids.has(src))
    const d = inputs.length ? 1 + Math.max(...inputs.map((src) => depthOf(src, seen))) : 0
    depth.set(id, d)
    return d
  }
  const columns = []
  for (const node of nodes) (columns[depthOf(node.id)] ??= []).push(node)
  const positions = new Map()
  let x = 0, h = 0
  for (const column of columns.filter(Boolean)) {
    let y = 0, w = 0
    for (const node of column) {
      const size = sizeOf(node)
      positions.set(node.id, { ...size, x, y })
      y += size.h + gapY
      w = Math.max(w, size.w)
    }
    h = Math.max(h, y - gapY)
    x += w + gapX
  }
  return { positions, w: Math.max(0, x - gapX), h }
}

/** Arrange stage units as a DAG, retaining full-size internal positions for expansion and saved-board ordering. */
export function pipelineLayout(graph, stages, { sizeOf, roleOf, gapX = 64, gapY = 28 }) {
  const roots = graph.nodes.filter((n) => !n.in)
  const byId = new Map(roots.map((n) => [n.id, n]))
  const owner = new Map(stages.flatMap((s) => s.nodes.filter((id) => byId.has(id)).map((id) => [id, `stage:${s.id}`])))
  const interiors = new Map()
  for (const s of stages) interiors.set(s.id, flowLayout(s.nodes.map((id) => byId.get(id)).filter(Boolean), graph.wires, { sizeOf, gapX: 32, gapY: 24 }))
  const units = stages.map((stage) => ({ id: `stage:${stage.id}`, stage })).concat(roots.filter((n) => roleOf(n) === 'part' && !owner.has(n.id)))
  const unitSize = (n) => n.stage ? { w: interiors.get(n.stage.id).w + 32, h: interiors.get(n.stage.id).h + 56 } : sizeOf(n)
  const wires = graph.wires.flatMap((w) => {
    const from = owner.get(w.from.split('#')[0]) ?? w.from.split('#')[0], to = owner.get(w.to) ?? w.to
    return from === to ? [] : [{ from, to, port: w.port }]
  })
  const working = flowLayout(units, wires, { sizeOf: unitSize, gapX, gapY })
  const nodes = new Map()
  const sources = roots.filter((n) => roleOf(n) === 'source'), sinks = roots.filter((n) => roleOf(n) === 'sink')
  const offset = Math.max(0, ...sources.map((n) => sizeOf(n).w)) + gapX + 24
  const stack = (list, x) => {
    let y = 40
    for (const n of list) { nodes.set(n.id, { x, y }); y += sizeOf(n).h + gapY }
  }
  stack(sources, 24)
  stack(sinks, offset + working.w + gapX)
  for (const unit of units) {
    const at = working.positions.get(unit.id), origin = { x: at.x + offset, y: at.y + 40 }
    if (!unit.stage) { nodes.set(unit.id, origin); continue }
    for (const [id, p] of interiors.get(unit.stage.id).positions) nodes.set(id, { x: origin.x + p.x + 16, y: origin.y + p.y + 36 })
  }
  return { nodes }
}

/** Save desktop coordinates without changing slot membership or divider boundaries. */
export function arrangedBoard(graph, planned) {
  return { ...graph, nodes: graph.nodes.map((n) => planned.nodes.has(n.id) ? { ...n, ...planned.nodes.get(n.id) } : n) }
}
