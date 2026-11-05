// A __name__ board, the same object everywhere: saved in progress, drawn by the shared circuit editor (../../circuit),
// run by the shared engine (run.js), written as blueprint text in content (../../circuit/text.js):
//
//   { nodes: [{ id, type, params, x?, y? }], wires: [{ from, to, port }] }
//
// The level gives the board its fixed cards, named by what they stand for: each of its inputs by name down the left,
// each of its outputs by name down the right. Every other node is a part the player placed (one of the game's
// parts.json, or a part a level builds). As text, a part is `id = type[settings](its inputs in order)` and a wire
// into an output `sum <- s`:
//
//   s = add(a, b)
//   sum <- s
import { circuitBoard } from '../../engine/circuit-domain.js'

export const board = circuitBoard({
  cards: [
    { type: 'in', side: 'left', of: (task) => task.inputs },
    { type: 'out', side: 'right', of: (task) => task.outputs },
  ],
  right: 900,
  gap: 120,
})
export const { FIXED, portsIn, portsOut, fixedOf, startBoard, fits, carriedOnto, wiring, fromText, toText } = board
