// Writing proofs in a level's spec (《证明完毕》): a proof is a circuit (proof.js), here written compactly.
//
//   proof({ f: ['impI', { A: 'A' }], m: ['mp', {}, 'f'] }, ['p>m.imp', 'f#body>m.a', 'm>f.body', 'f>goal'], { premises: ['p'] })
//
// Nodes are { id: [rule, card settings?, where?] }: `where` is the box region the card sits in ('f' for a box's only
// region, 'e/left' for one of several; ../../circuit/frames.js), the board itself when left out. A wire is
// 'from>to.port' ('from>goal' into the goal); a box's assumption is the source '<box>#<region>' and what a region
// proves goes into the box's port of that region's name. A premise is a source named as the level names it.
import { RULES } from './proof.js'

const parse = (wires) => wires.map((s) => {
  const [from, to] = s.split('>')
  const [id, port = 'in'] = to.split('.')
  return { from, to: id, port }
})

/** A proof of a level's goal from its premises. */
export function proof(nodes, wires, { premises = [] } = {}) {
  const entries = Object.entries(nodes)
  const region = (where) => (where && !where.includes('/') ? `${where}/${RULES[nodes[where][0]].frames()[0].name}` : where)
  // Cards go in rows of three, in the order written, in whichever region holds them.
  const count = new Map()
  const cards = entries.map(([id, [type, params = {}, where]]) => {
    const at = region(where) ?? ''
    const k = count.get(at) ?? 0
    count.set(at, k + 1)
    return { id, type, params, ...(at ? { in: at } : {}), x: (at ? 44 : 220) + (k % 3) * 200, y: (at ? 20 : 40) + Math.floor(k / 3) * 190 }
  })
  return {
    nodes: [...premises.map((name, k) => ({ id: name, type: 'premise', params: { name }, x: 20, y: 40 + k * 130 })), ...cards, { id: 'goal', type: 'goal', params: { name: 'goal' }, x: 900, y: 40 }],
    wires: parse(wires),
  }
}

/** The board a level starts from: its premises and its goal. */
export const startProof = (level) => proof({}, [], { premises: Object.keys(level.tests[0].premises ?? {}) })
