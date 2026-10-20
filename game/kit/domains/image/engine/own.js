import { packed } from '../../../engine/boards.js'
import { NODE_TYPES } from './nodes.js'

// A circuit the player has solved, used again as a part of its own, as in Turing Complete: the level's inputs are
// its ports and the level's output is what it gives (the shared engine's packed part). A level with
// `packs: { name, desc }` makes one. The game fills OWN with each solved level's passing circuit (syncOwn); until
// then, and when the levels are checked, the level's reference circuit stands in.
export const OWN = new Map()

const circuitOf = (level) => OWN.get(level.id) ?? level.solution

export function ownPart(level) {
  return {
    ...packed({ circuit: () => circuitOf(level), inputs: level.inputs ?? ['in'], output: level.outputs?.[0] ?? 'out' }),
    kit: true,
    label: level.packs.name,
    description: level.packs.desc,
    // The circuit inside checks its own sizes: a packed part may take a small picture and a big one.
    anySize: true,
    unlock: `own-${level.id}`,
    // What the circuit inside costs per pixel, as if each of its parts ran at full size.
    cost: () => circuitOf(level).nodes.reduce((sum, n) => {
      const cost = NODE_TYPES[n.type]?.cost ?? 0
      return sum + (typeof cost === 'function' ? cost(n.params ?? {}) : cost)
    }, 0),
  }
}
