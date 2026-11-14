// A calculus board, the same object everywhere: saved in progress, drawn by the shared circuit editor (../../circuit),
// run tick by tick (run.js), written as blueprint text in content (../../circuit/text.js):
//
//   { nodes: [{ id, type, params, x?, y? }], wires: [{ from, to, port }] }
//
// The level gives the board its fixed cards: each of its input sequences by name down the left, each of its output
// sequences by name down the right. Every other node is a part the player placed (parts.js PARTS, or a part a level
// builds), its settings in params as strings ({ reg: 'A', start: '3' }).
//
// As text, a part is `id = type[settings](its inputs in order)` and a wire into an output `seq <- r`:
//
//   r = reg[reg=A, start=3]()
//   c = const[value=2]()
//   s = add(r, c)
//   k = keep[reg=A](s)
//   seq <- r
import { INPUTS, OUTPUTS, circuitBoard } from '../../engine/board-cards.js'

export const board = circuitBoard({ ticks: true, cards: [INPUTS, OUTPUTS] })
