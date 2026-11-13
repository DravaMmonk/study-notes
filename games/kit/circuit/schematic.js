import { dependencyOrder } from './layout.js'
import { srcKey, srcNode } from './model.js'

// A board set out to be read, not edited (Schematic.jsx): each scope (the board itself, or a frame's region:
// frames.js) is rows from top to bottom, every part below everything it reads, the board's sources its first row and
// its sinks its last. A wire that runs past whole rows gets a via in each row it passes, so it is drawn between the
// parts there and never across one; the wires of one output share their vias.
//
//   schematic(graph, parts) → { rows(scope) → [[{ id } | { via }]], paths: [{ wire, vias: [via], back }] }
//
// `scope` is null for the board, '<frame>/<region>' for a region. A path's vias are in the order the wire meets them;
// `back` marks a wire that runs upward (a loop through a part that holds its value), which has none.

const mean = (values) => values.reduce((a, b) => a + b, 0) / values.length

export function schematic(graph, parts) {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  const scopeOf = (id) => byId.get(id)?.in ?? null
  const isRegion = (id, name) => (parts.frames?.(byId.get(id) ?? {}) ?? []).some((r) => r.name === name)
  const parent = (scope) => scopeOf(scope.split('/')[0])
  const role = (n) => parts.role(n)

  // Each wire as legs, one per scope it runs in, outermost first: from a node there (or the scope's top edge) to a
  // node there (or its bottom edge).
  const legsOf = (w) => {
    const [src, key] = [srcNode(w.from), srcKey(w.from)]
    const start = key !== null && isRegion(src, key) ? { scope: `${src}/${key}` } : { scope: scopeOf(src), id: src }
    const end = isRegion(w.to, w.port) ? { scope: `${w.to}/${w.port}` } : { scope: scopeOf(w.to), id: w.to }
    const scopes = []
    for (let s = end.scope; ; s = parent(s)) {
      scopes.unshift(s)
      if (s === start.scope) break
      if (s === null) return []
    }
    return scopes.map((scope, k) => ({ scope, a: k === 0 ? start.id : undefined, b: k === scopes.length - 1 ? end.id : scopes[k + 1].split('/')[0] }))
  }
  const legs = graph.wires.map(legsOf)

  const plans = new Map()
  const plan = (scope) => {
    if (plans.has(scope)) return plans.get(scope)
    const here = graph.nodes.filter((n) => (n.in ?? null) === scope)
    const ends = (kind) => (scope === null ? here.filter((n) => role(n) === kind) : [])
    const [sources, sinks] = [ends('source'), ends('sink')]
    const steps = here.filter((n) => !sources.includes(n) && !sinks.includes(n))
    const inner = new Set(steps.map((n) => n.id))
    const edges = legs.flat().filter((l) => l.scope === scope && inner.has(l.a) && inner.has(l.b) && l.a !== l.b).map((l) => ({ from: l.a, to: l.b }))
    const depth = new Map()
    for (const n of dependencyOrder(steps, edges)) depth.set(n.id, Math.max(0, ...edges.filter((e) => e.to === n.id && depth.has(e.from)).map((e) => depth.get(e.from) + 1)))
    // A part that reads nothing (a constant) sits just above the first part that reads it.
    for (const n of steps) {
      const readers = edges.filter((e) => e.from === n.id).map((e) => depth.get(e.to))
      if (!graph.wires.some((w) => w.to === n.id) && readers.length) depth.set(n.id, Math.max(0, Math.min(...readers) - 1))
    }
    const rows = []
    if (sources.length) rows.push(sources.map((n) => ({ id: n.id })))
    const first = rows.length
    for (const n of steps) (rows[first + depth.get(n.id)] ??= []).push({ id: n.id })
    for (let k = first; k < rows.length; k++) rows[k] ??= []
    if (sinks.length) rows.push(sinks.map((n) => ({ id: n.id })))
    const rowOf = new Map(rows.flatMap((row, k) => row.map((item) => [item.id, k])))
    const made = { rows, rowOf, links: [] }
    plans.set(scope, made)
    return made
  }

  const paths = graph.wires.map((wire, k) => {
    const vias = []
    let back = false
    for (const { scope, a, b } of legs[k]) {
      const { rows, rowOf, links } = plan(scope)
      const [from, to] = [a === undefined ? -1 : rowOf.get(a), b === undefined ? rows.length : rowOf.get(b)]
      if (to <= from) back = true
      const run = a === undefined ? [] : [a]
      for (let r = from + 1; r < to; r++) {
        const via = `${scope ?? ''}|${wire.from}|${r}`
        if (!rows[r].some((item) => item.via === via)) rows[r].push({ via })
        vias.push(via)
        run.push(via)
      }
      if (b !== undefined && to > from) run.push(b)
      for (let i = 1; i < run.length; i++) links.push([run[i - 1], run[i]])
    }
    return { wire, vias, back }
  })

  // Fewer crossings: each row in the order of what it is wired to in the row above, then below, then above again.
  for (const { rows, links } of plans.values()) {
    const key = (item) => item.via ?? item.id
    const at = new Map()
    const place = (row) => row.forEach((item, k) => at.set(key(item), (k + 0.5) / row.length))
    rows.forEach(place)
    const settle = (row, side) => {
      const want = new Map(row.map((item) => {
        const near = links.filter((l) => l[side] === key(item)).map((l) => at.get(l[1 - side]))
        return [item, near.length ? mean(near) : at.get(key(item))]
      }))
      row.sort((p, q) => want.get(p) - want.get(q))
      place(row)
    }
    for (let k = 1; k < rows.length; k++) settle(rows[k], 1)
    for (let k = rows.length - 2; k >= 0; k--) settle(rows[k], 0)
    for (let k = 1; k < rows.length; k++) settle(rows[k], 1)
  }

  return { rows: (scope = null) => plan(scope).rows, paths }
}
