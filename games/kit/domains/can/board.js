// A board of 《车在说话》 (../../engine/circuit-domain.js circuitBoard), run tick by tick on the bus (run.js): the cards
// a task gives it are the bus (when it listens) and its inputs down the left, its outputs down the right. Every other
// node is a part the player placed (parts.js PARTS, or a part a level builds), its settings in params as strings
// ({ reg: 'A', start: '1' }). As text:
//
//   r = reg[reg=A, start=1]()
//   k = keep[reg=A](line)
//   bit <- r
import { INPUTS, OUTPUTS, circuitBoard } from '../../engine/circuit-domain.js'
import { drive, hearing } from '../../engine/ticks.js'

export const board = circuitBoard({
  ticks: true,
  cards: [
    // The bus this tick: a board that says something from it in the same tick has a loop.
    { type: 'line', side: 'left', of: (task) => (task.listens ? [{ name: 'line', label: { zh: '总线', en: 'Bus' } }] : []), params: () => ({}), part: hearing() },
    INPUTS,
    { type: 'drive', side: 'right', of: (task) => (task.drives ? [{ name: 'send', label: { zh: '说', en: 'Send' } }] : []), params: () => ({ name: 'send' }), part: drive() },
    OUTPUTS,
  ],
})
