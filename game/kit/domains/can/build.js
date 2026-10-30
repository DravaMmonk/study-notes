// Writing boards in 《车在说话》's spec compactly:
//
//   board(level, { r: ['reg', { reg: 'A', start: 1 }], k: ['keep', { reg: 'A' }] }, ['line>k', 'r>out'])
//
// Nodes are { id: type } or { id: [type, settings] }. A wire is 'from>to.port'; the port may be left out when the card
// has one input. The level's fixed cards are named by what they stand for: 'line' (the bus), each input and each
// output by its name; one of a card's several outputs is 'id#key'. startBoard(level) is the board a level opens on.
import { portsOf } from '../../engine/circuit.js'
import { PARTS } from './parts.js'

/** The fixed cards of a level: the bus if it listens, its inputs down the left, its outputs down the right. */
export function fixedOf(level) {
  const left = [...(level.listens ? [{ id: 'line', type: 'line', params: {} }] : []), ...(level.inputs ?? []).map((i) => ({ id: i.name, type: 'in', params: { name: i.name } }))]
  const right = level.outputs.map((o) => ({ id: o.name, type: 'out', params: { name: o.name } }))
  return [...left.map((n, k) => ({ ...n, x: 20, y: 40 + k * 140 })), ...right.map((n, k) => ({ ...n, x: 980, y: 40 + k * 140 }))]
}

/** A board on a level from nodes and wires; `partOf` gives a type's part (a built part's too). */
export function board(level, nodes, wires, partOf = (type) => PARTS[type]) {
  const fixed = fixedOf(level)
  const parts = Object.entries(nodes).map(([id, spec], k) => {
    const [type, params = {}] = Array.isArray(spec) ? spec : [spec]
    return { id, type, params: Object.fromEntries(Object.entries(params).map(([key, v]) => [key, String(v)])), x: 240 + (k % 3) * 230, y: 40 + Math.floor(k / 3) * 170 }
  })
  const all = [...fixed, ...parts]
  const parsed = wires.map((s) => {
    const [from, to] = s.split('>')
    const [id, port] = to.split('.')
    const node = all.find((n) => n.id === id)
    if (!node) throw new Error(`a wire goes to ${id}, which is not on the board`)
    return { from, to: id, port: port ?? portsOf(partOf(node.type), node)[0] }
  })
  return { nodes: all, wires: parsed }
}

/** The board a level opens on: its fixed cards. */
export const startBoard = (level) => ({ nodes: fixedOf(level), wires: [] })
