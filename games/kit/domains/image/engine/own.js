import { packed } from '../../../engine/boards.js'

// A circuit the player has solved, used again as a part of its own, as in Turing Complete: the level's inputs are
// its ports and the level's output is what it gives (the shared engine's packed part). A level with
// `packs: { name, desc }` makes one, in its course's part table (`types`, ../course.js). `circuitOf()` is the circuit it
// runs: the player's passing circuit once the course has it (syncOwn), until then, and when the levels are checked,
// the level's reference circuit.
export function ownPart(level, circuitOf, types) {
  return {
    ...packed({ circuit: circuitOf, inputs: level.inputs ?? ['in'], outputs: [level.outputs?.[0] ?? 'out'] }),
    kit: true,
    circuitOf,
    label: level.packs.name,
    description: level.packs.desc,
    // The circuit inside checks its own sizes: a packed part may take a small picture and a big one.
    anySize: true,
    unlock: `own-${level.id}`,
    // What the circuit inside costs per pixel, as if each of its parts ran at full size.
    cost: () => circuitOf().nodes.reduce((sum, n) => {
      const cost = types[n.type]?.cost ?? 0
      return sum + (typeof cost === 'function' ? cost(n.params ?? {}) : cost)
    }, 0),
  }
}
