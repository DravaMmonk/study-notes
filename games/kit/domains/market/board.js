// A market board, the same object everywhere: saved in progress, drawn by the shared circuit editor (../../circuit),
// run tick by tick against the street (run.js), written as blueprint text in content (../../circuit/text.js):
//
//   { nodes: [{ id, type, params, x?, y? }], wires: [{ from, to, port }] }
//
// The level gives the board its fixed cards: each shop's price the tick before and what it showed then down the left,
// each shop's price down the right. Every other node is a part the player placed (parts.js PARTS, or a part a level
// builds), its settings in params as strings ({ value: '0.25' }). As text:
//
//   g = sub(short, left)
//   k = const[value=0.25]()
//   d = mul(g, k)
//   n = add(was, d)
//   price <- n
import { INPUTS, OUTPUTS, circuitBoard } from '../../engine/circuit-domain.js'

export const board = circuitBoard({ ticks: true, cards: [INPUTS, OUTPUTS] })
