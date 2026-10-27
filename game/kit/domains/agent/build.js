// Writing boards in a level's spec (《软件工厂》), compactly:
//
//   board({ m: 'model', r: ['read', { file: 'src/cart.js' }], k: 'concat' }, ['issue>k.a', 'r>k.b', 'k>m', 'm>repo'])
//
// Nodes are { id: type } or { id: [type, settings] }. A wire is 'from>to.port'; the port may be left out when the card
// has one input (the first of a concat's is `a`). A fixed card (issue, history, code, repo, out, stop) is named by its
// type and need not be listed: every one a wire names is put on the board. One of a card's several outputs is
// 'id#key' ('t#green'). startBoard(level) is the board a level opens on: its fixed cards alone.
import { FIXED, PARTS } from './parts.js'

const SOURCES = ['issue', 'history', 'code']

// The fixed cards down the left (sources) and right (sinks) edges; the parts in rows of three between them.
function place(fixed, parts) {
  const left = fixed.filter((t) => SOURCES.includes(t))
  const right = fixed.filter((t) => !SOURCES.includes(t))
  return [
    ...left.map((t, k) => ({ id: t, type: t, params: { name: t }, x: 20, y: 40 + k * 150 })),
    ...right.map((t, k) => ({ id: t, type: t, params: { name: t }, x: 980, y: 40 + k * 150 })),
    ...parts.map(([id, type, params], k) => ({ id, type, params, x: 260 + (k % 3) * 230, y: 40 + Math.floor(k / 3) * 190 })),
  ]
}

const firstPort = (type) => {
  const part = PARTS[type]
  return part.sink ? 'in' : (typeof part.inputs === 'function' ? part.inputs({}) : part.inputs)[0]
}

/** A board from nodes and wires; `fixed` adds fixed cards no wire names (a level's own, for startBoard). */
export function board(nodes, wires, { fixed = [] } = {}) {
  const parts = Object.entries(nodes).map(([id, spec]) => {
    const [type, params = {}] = Array.isArray(spec) ? spec : [spec]
    return [id, type, params]
  })
  const types = new Map(parts.map(([id, type]) => [id, type]))
  const parsed = wires.map((s) => {
    const [from, to] = s.split('>')
    const [id, port] = to.split('.')
    const type = types.get(id) ?? id
    return { from, to: id, port: port ?? firstPort(type) }
  })
  const named = parsed.flatMap((w) => [w.from.split('#')[0], w.to]).filter((id) => FIXED.includes(id) && !types.has(id))
  const cards = FIXED.filter((t) => fixed.includes(t) || named.includes(t))
  return { nodes: place(cards, parts), wires: parsed }
}

/** The board a level opens on: its fixed cards. */
export const startBoard = (level) => board({}, [], { fixed: level.fixed })
