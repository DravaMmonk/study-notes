import { packed } from '../../../engine/boards.js'

// A circuit the player has solved, used again as a part of its own, as in Turing Complete: the task's inputs are
// its ports and the task's output is what it gives (the shared engine's packed part). A built piece of parts.json
// (`inside`) makes one, in its course's part table (`types`, ../course.js), named by the piece. `circuitOf()` is the
// circuit it runs: the player's passing circuit once the course has it (syncOwn), until then, and when the levels are
// checked, the task's reference circuit.
export function ownPart(task, type, piece, circuitOf, types) {
  return {
    ...packed({ circuit: circuitOf, inputs: task.inputs ?? ['in'], outputs: [task.outputs?.[0] ?? 'out'] }),
    kit: true,
    circuitOf,
    label: piece.name,
    description: piece.desc,
    // The circuit inside checks its own sizes: a packed part may take a small picture and a big one.
    anySize: true,
    unlock: type,
    // What the circuit inside costs per pixel, as if each of its parts ran at full size.
    cost: () => circuitOf().nodes.reduce((sum, n) => {
      const cost = types[n.type]?.cost ?? 0
      return sum + (typeof cost === 'function' ? cost(n.params ?? {}) : cost)
    }, 0),
  }
}
