import { splitSource, srcNode } from './wire-source.js'

/**
 * A board's shape, whatever its ids: each card its type and settings, then what feeds each of its inputs, read from
 * the cards nothing reads (the outputs). Two boards that compute the same thing the same way have one shape.
 */
export function boardShape(board) {
  const into = new Map()
  for (const w of board.wires) into.set(w.to, [...(into.get(w.to) ?? []), w])
  const byId = new Map(board.nodes.map((n) => [n.id, n]))
  const memo = new Map()
  const shape = (id, trail = new Set()) => {
    if (memo.has(id)) return memo.get(id)
    if (trail.has(id)) return '↺'
    const node = byId.get(id)
    const params = Object.entries(node?.params ?? {}).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(',')
    const next = new Set(trail).add(id)
    const ins = [...(into.get(id) ?? [])].sort((a, b) => String(a.port).localeCompare(String(b.port))).map((w) => {
      const [from, key] = splitSource(w.from)
      return `${w.port}:${shape(from, next)}${key === null ? '' : `.${key}`}`
    })
    const out = `${node?.type ?? '?'}[${params}](${ins.join(' ')})`
    memo.set(id, out)
    return out
  }
  const read = new Set(board.wires.map((w) => srcNode(w.from)))
  return board.nodes.filter((n) => !read.has(n.id)).map((n) => shape(n.id)).sort().join(' | ')
}
