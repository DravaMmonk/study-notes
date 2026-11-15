/** Incoming and outgoing neighbours of each id, in edge order. */
export function indexEdges(edges) {
  const incoming = new Map()
  const outgoing = new Map()
  const append = (map, id, value) => {
    if (!map.has(id)) map.set(id, [])
    map.get(id).push(value)
  }
  for (const [from, to] of edges) {
    append(incoming, to, from)
    append(outgoing, from, to)
  }
  return {
    before: (id) => incoming.get(id) ?? [],
    after: (id) => outgoing.get(id) ?? [],
  }
}

/**
 * Order ids in dependency waves. Within a wave, use the original node order, or the order in which its edges
 * were followed. A layout may break a cycle at the first pending id to lay out every node.
 */
export function dependencyOrder(ids, { before, after }, { stable = true, breakCycles = false } = {}) {
  const rank = new Map(ids.map((id, index) => [id, index]))
  const waiting = new Map(ids.map((id) => [id, before(id).filter((parent) => rank.has(parent)).length]))
  const ordered = []
  let ready = ids.filter((id) => waiting.get(id) === 0)
  while (ready.length || (breakCycles && waiting.size)) {
    if (!ready.length) ready = [waiting.keys().next().value]
    if (stable) ready.sort((a, b) => rank.get(a) - rank.get(b))
    const next = []
    for (const id of ready) {
      waiting.delete(id)
      ordered.push(id)
      for (const child of after(id)) {
        if (!waiting.has(child)) continue
        const left = waiting.get(child) - 1
        waiting.set(child, left)
        if (left === 0) next.push(child)
      }
    }
    ready = next
  }
  return { ordered, pending: [...waiting.keys()] }
}

/** Whether any start can reach a target by following its allowed neighbours. */
export function reaches(starts, target, after) {
  const seen = new Set()
  const todo = [...starts]
  while (todo.length) {
    const id = todo.pop()
    if (seen.has(id)) continue
    if (target(id)) return true
    seen.add(id)
    for (const next of after(id)) if (!seen.has(next)) todo.push(next)
  }
  return false
}

/** A proposed edge closes a loop if its source is reachable from its destination. Held parts break that loop. */
export function wouldCycle(edges, from, to, holds = () => false) {
  if (holds(from) || holds(to)) return false
  const { after } = indexEdges(edges)
  return reaches([to], (id) => id === from, (id) => after(id).filter((next) => !holds(next)))
}
