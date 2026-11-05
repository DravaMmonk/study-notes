// A board of 《从一根线开始》 (../../engine/circuit-domain.js circuitBoard): the cards a level gives it are its wires
// in and inputs down the left, its wires out and outputs down the right. Every other node is a part the player placed
// (parts.js PARTS, or a part a level builds), its settings in params as strings ({ reg: 'A', start: '1' }). As text:
//
//   r = reg[reg=A, start=0]()
//   k = keep[reg=A](left)
//   right <- r
import { circuitBoard } from '../../engine/circuit-domain.js'

export const board = circuitBoard({
  ticks: true,
  cards: [
    { type: 'rx', side: 'left', of: (task) => task.wires?.in ?? [] },
    { type: 'in', side: 'left', of: (task) => task.inputs ?? [] },
    { type: 'tx', side: 'right', of: (task) => task.wires?.out ?? [] },
    { type: 'out', side: 'right', of: (task) => task.outputs ?? [] },
  ],
})
export const { FIXED, portsIn, portsOut, fixedOf, startBoard, fits, carriedOnto, wiring, fromText, toText } = board
