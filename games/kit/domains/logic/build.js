// Writing proofs in a level's spec (《证明完毕》): a proof is a circuit (proof.js), here written compactly.
//
//   proof({ m: ['mp'], k: ['axK', { A: 'A', B: 'B' }] }, ['k>m.imp', 'p>m.a', 'm>goal'], { premises: ['p'] })
//
// Nodes are { id: [rule, card settings?, boards?] }; a wire is 'from>to.port' (into the goal or a box's out, just
// 'from>goal' / 'from>out'); a premise is a source named as the level names it. A box's board is box(nodes, wires,
// { sees }): its assumption is the source `assume`, `sees` lists the names it uses from outside (premises, and the
// assumptions of the boxes around it, by hypothesis id: '<box node>/<board>'), and its sink is `out`.

const parse = (wires) => wires.map((s) => {
  const [from, to] = s.split('>')
  const [id, port = 'in'] = to.split('.')
  return { from, to: id, port }
})
const cards = (nodes) => Object.entries(nodes).map(([id, [type, params = {}, boards]], k) => ({ id, type, params, ...(boards ? { boards } : {}), x: 220 + (k % 3) * 210, y: 40 + Math.floor(k / 3) * 210 }))
const sources = (names, type) => names.map((name, k) => ({ id: name, type, params: { name }, x: 20, y: 40 + k * 130 }))

/** A proof of a level's goal from its premises. */
export const proof = (nodes, wires, { premises = [] } = {}) => ({
  nodes: [...sources(premises, 'premise'), ...cards(nodes), { id: 'goal', type: 'goal', params: { name: 'goal' }, x: 900, y: 40 }],
  wires: parse(wires),
})

/** A box's board: what it proves under its assumption (and whatever it sees from outside). */
export const box = (nodes, wires, { sees = [], assumes = true } = {}) => ({
  nodes: [...(assumes ? [{ id: 'assume', type: 'assume', params: { name: 'assume' }, x: 20, y: 40 }] : []), ...sources(sees, 'premise').map((n, k) => ({ ...n, y: 170 + k * 130 })), ...cards(nodes), { id: 'out', type: 'out', params: { name: 'out' }, x: 900, y: 40 }],
  wires: parse(wires),
})

/** The board a level starts from: its premises and its goal. */
export const startProof = (level) => proof({}, [], { premises: Object.keys(level.tests[0].premises ?? {}) })

/**
 * A box's board with exactly the fixed cards it should have (proof.js seenAt): a source for each name it reads from
 * outside, `assume` when it opens an assumption, and `out`. Cards that no longer apply go, with their wires; missing
 * ones are added down the left edge.
 */
export function fitBoard(board, { names, assumes }) {
  const want = new Set(names)
  const stale = (n) => (n.type === 'premise' && !want.has(n.params.name)) || (n.type === 'assume' && !assumes)
  const gone = new Set(board.nodes.filter(stale).map((n) => n.id))
  const nodes = board.nodes.filter((n) => !gone.has(n.id))
  const has = (type, name) => nodes.some((n) => n.type === type && (!name || n.params.name === name))
  const left = nodes.filter((n) => n.type === 'premise' || n.type === 'assume').length
  const added = [
    ...(assumes && !has('assume') ? [{ id: 'assume', type: 'assume', params: { name: 'assume' } }] : []),
    ...names.filter((name) => !has('premise', name)).map((name) => ({ id: name, type: 'premise', params: { name } })),
  ].map((n, k) => ({ ...n, x: 20, y: 40 + (left + k) * 130 }))
  const out = has('out') ? [] : [{ id: 'out', type: 'out', params: { name: 'out' }, x: 900, y: 40 }]
  if (!gone.size && !added.length && !out.length) return board
  return { ...board, nodes: [...nodes, ...added, ...out], wires: board.wires.filter((w) => !gone.has(w.from.split('#')[0]) && !gone.has(w.to)) }
}
