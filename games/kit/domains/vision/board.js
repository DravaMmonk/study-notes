// A board of a vision task (../../engine/circuit-domain.js circuitBoard), run once on a test (run.js): the cards a
// task gives it are its inputs down the left — each a number, an image or a vector ({ x, y }: `kind`), or a group of
// them on one card (`inputGroups`, a card with an output each) — and its outputs down the right. Every other node is
// one of the game's parts (parts.json) or a part a level builds. As text, a part is `id = type[settings](its inputs
// in order)`, a grouped input `group.input`, and a wire into an output `sum <- s`:
//
//   s = arithmetic[op=add](a, weights.left)
//   sum <- s
import { OUTPUTS, circuitBoard } from '../../engine/circuit-domain.js'

export const board = circuitBoard({
  cards: [
    {
      type: 'in',
      side: 'left',
      of: (task) => task.inputs,
      params: (port) => ({ name: port.name, ...(port.type ? { kind: port.type } : {}) }),
      group: (task) => (task.inputGroups ?? []).map((g) => ({ name: g.name, label: g.label, members: g.inputs })),
    },
    OUTPUTS,
  ],
  right: 900,
  gap: 120,
})
