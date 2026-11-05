// A __name__ board, the same object everywhere: saved in progress, drawn by the shared circuit editor (../../circuit),
// run tick by tick (run.js), written as blueprint text in content (../../circuit/text.js):
//
//   { nodes: [{ id, type, params, x?, y? }], wires: [{ from, to, port }] }
//
// The level gives the board its fixed cards, named by what they stand for: 'line' (when the level listens) and each of
// its inputs by name down the left, 'say' (when it talks) and each of its outputs by name down the right. Every other
// node is a part the player placed (parts.js PARTS, or a part a level builds), its settings in params as strings
// ({ reg: 'A', start: '1' }).
//
// As text, a part is `id = type[settings](its inputs in order)` and a wire into an output `bit <- r`:
//
//   r = reg[reg=A, start=1]()
//   k = keep[reg=A](line)
//   bit <- r
//   say <- r
import { INPUTS, OUTPUTS, circuitBoard } from '../../engine/circuit-domain.js'
import { drive, hearing } from '../../engine/ticks.js'

export const board = circuitBoard({
  ticks: true,
  cards: [
    { type: 'line', side: 'left', of: (task) => (task.listens ? [{ name: 'line', label: { zh: '线', en: 'Line' } }] : []), params: () => ({}), part: hearing() },
    INPUTS,
    { type: 'say', side: 'right', of: (task) => (task.talks ? [{ name: 'say', label: { zh: '说', en: 'Say' } }] : []), part: drive() },
    OUTPUTS,
  ],
})
