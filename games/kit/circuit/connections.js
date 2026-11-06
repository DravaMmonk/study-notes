// One rule for desktop and phone: keep a stage's internal wires, replace distant or branching connections with
// paired source labels. The synthetic input/output/current units describe view placement, never circuit nodes.
import { L } from '../shell/i18n.js'
export const CONNECTION_LIMITS = { length: 320, fanoutStages: 2 }
export const wireKey = (w) => `${w.from}>${w.to}.${w.port}`
export const stageOwners = (stages) => new Map(stages.flatMap((s) => s.nodes.map((id) => [id, s.id])))
export function labelledConnections(graph, stages, parts, pointOf = null) {
  if (!stages.length) return []
  const owners = stageOwners(stages), nodes = new Map(graph.nodes.map((n) => [n.id, n]))
  const rank = new Map(stages.map((s, k) => [s.id, k]))
  const unit = (id) => owners.get(id) ?? (parts.role(nodes.get(id)) === 'source' ? 'input' : parts.role(nodes.get(id)) === 'sink' ? 'output' : 'loose')
  const destinations = new Map()
  for (const w of graph.wires) if (owners.has(w.to)) destinations.set(w.from, new Set([...(destinations.get(w.from) ?? []), owners.get(w.to)]))
  return graph.wires.filter((w) => {
    const src = w.from.split('#')[0], a = owners.get(src), b = owners.get(w.to)
    if (a && a === b) return false
    if ((destinations.get(w.from)?.size ?? 0) >= CONNECTION_LIMITS.fanoutStages) return true
    if (a && b && a !== b) return true
    if (a || b) {
      const other = unit(a ? w.to : src), at = rank.get(a ?? b)
      if (other === 'loose' ? at < stages.length - 1 : other === 'input' ? at > 0 : at < stages.length - 1) return true
    } else if (unit(src) !== unit(w.to)) return true
    const points = pointOf?.(w)
    return points?.every(Boolean) && Math.hypot(points[1][0] - points[0][0], points[1][1] - points[0][1]) > CONNECTION_LIMITS.length
  })
}
export function sourceLabel(wire, graph, parts) {
  const id = wire.from.split('#')[0], key = wire.from.split('#')[1]
  const node = graph.nodes.find((n) => n.id === id)
  const name = L(parts.label(node))
  const same = graph.nodes.filter((n) => L(parts.label(n)) === name)
  const number = same.length > 1 ? ` ${same.findIndex((n) => n.id === id) + 1}` : ''
  const port = key && parts.outputs?.(node)?.find((p) => p.key === key)
  return `${name}${number}${port ? ` · ${L(port.label)}` : ''}`
}
