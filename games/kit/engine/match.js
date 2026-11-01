// Finding one board inside another, for the course audit's `bypass` (../course.js): where a level's reference answer
// wires up, from smaller parts, exactly the board a built part runs. Boards are the shared circuit model
// (../circuit/model.js): { nodes: [{ id, type, params?, value? }], wires: [{ from: 'node' | 'node#key', to, port }] }.

const nodeOf = (src) => String(src).split('#')[0]
const keyOf = (src) => (String(src).includes('#') ? String(src).slice(String(src).indexOf('#') + 1) : '')
const settings = (n) => JSON.stringify([Object.entries(n.params ?? {}).sort(), n.value ?? null])
const intoOf = (board) => {
  const into = new Map(board.nodes.map((n) => [n.id, new Map()]))
  for (const w of board.wires) into.get(w.to)?.set(w.port, w.from)
  return into
}

/**
 * The parts of `board` that are `pattern`'s parts: each of the same type and settings, wired to each other port for
 * port as in `pattern`, an input of `pattern` (a wire from a node that is no part, `isPart(type)`) read from one same
 * place wherever `pattern` reads it, a port open in one open in the other, and nothing outside them reading them but
 * where `pattern` gives a result out. So the matched parts could give way to one part running `pattern`. Returns the
 * map pattern node id → board node id, or null when there is no such set.
 */
export function rebuilt(pattern, board, isPart) {
  const own = pattern.nodes.filter((n) => isPart(n.type))
  if (!own.length) return null
  const mine = new Set(own.map((n) => n.id))
  const pInto = intoOf(pattern), bInto = intoOf(board)
  const byId = new Map(board.nodes.map((n) => [n.id, n]))
  // Match each node next to one matched already, so a wire pins most choices down.
  const order = []
  const near = (id) => pattern.wires.flatMap((w) => (w.to === id && mine.has(nodeOf(w.from)) ? [nodeOf(w.from)] : nodeOf(w.from) === id && mine.has(w.to) ? [w.to] : []))
  for (const n of own) {
    const queue = [n.id]
    while (queue.length) {
      const id = queue.shift()
      if (order.includes(id)) continue
      order.push(id)
      queue.push(...near(id))
    }
  }
  const phi = new Map(), taken = new Set(), source = new Map()
  const fits = (p, b) => {
    const pn = own.find((n) => n.id === p), bn = byId.get(b)
    if (pn.type !== bn.type || settings(pn) !== settings(bn)) return false
    const pin = pInto.get(p), bin = bInto.get(b)
    for (const port of new Set([...pin.keys(), ...bin.keys()])) {
      const ps = pin.get(port), bs = bin.get(port)
      if ((ps === undefined) !== (bs === undefined)) return false
      if (ps === undefined) continue
      if (mine.has(nodeOf(ps))) { if (phi.has(nodeOf(ps)) && (phi.get(nodeOf(ps)) !== nodeOf(bs) || keyOf(ps) !== keyOf(bs))) return false }
      else if (source.has(ps) && source.get(ps) !== bs) return false
    }
    for (const w of pattern.wires) {
      if (nodeOf(w.from) !== p || !phi.has(w.to)) continue
      const bs = bInto.get(phi.get(w.to)).get(w.port)
      if (bs === undefined || nodeOf(bs) !== b || keyOf(bs) !== keyOf(w.from)) return false
    }
    return true
  }
  const place = (k) => {
    if (k === order.length) return true
    const p = order[k]
    for (const b of board.nodes) {
      if (taken.has(b.id) || !fits(p, b.id)) continue
      phi.set(p, b.id)
      taken.add(b.id)
      const bound = [...pInto.get(p)].filter(([, ps]) => !mine.has(nodeOf(ps)) && !source.has(ps))
      for (const [port, ps] of bound) source.set(ps, bInto.get(b.id).get(port))
      if (place(k + 1)) return true
      phi.delete(p)
      taken.delete(b.id)
      for (const [, ps] of bound) source.delete(ps)
    }
    return false
  }
  if (!place(0)) return null
  // An input read from inside the matched parts is no input.
  for (const bs of source.values()) if (taken.has(nodeOf(bs))) return null
  // What the rest of the board reads from them, `pattern` gives out.
  const out = new Set(pattern.wires.filter((w) => mine.has(nodeOf(w.from)) && !mine.has(w.to)).map((w) => w.from))
  const back = new Map([...phi].map(([p, b]) => [b, p]))
  for (const w of board.wires) {
    if (!taken.has(nodeOf(w.from)) || taken.has(w.to)) continue
    const p = back.get(nodeOf(w.from))
    if (!out.has(keyOf(w.from) ? `${p}#${keyOf(w.from)}` : p)) return null
  }
  return phi
}
