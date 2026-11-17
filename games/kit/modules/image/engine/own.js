import { packed } from '../../../engine/boards.js'
import { workshopNodes } from '../../../engine/workshop.js'
import { workshopOf } from '../../../circuit/workshop-view.js'

// A circuit the player has solved, used again as a part of its own, as in Turing Complete: the task's inputs are
// its ports and the task's output is what it gives (the shared engine's packed part). A built part of parts.json
// (`inside`) makes one, in its course's part table (`types`, ../course.js), named by the part. `circuitOf()` is the
// circuit it runs: the player's passing circuit once the course has it (syncOwn), until then, and when the levels are
// checked, the task's reference circuit.
export function ownPart(task, type, part, circuitOf, types) {
  return {
    ...packed({ circuit: circuitOf, inputs: task.inputs ?? ['in'], outputs: [task.outputs?.[0] ?? 'out'] }),
    inputTypes: Object.fromEntries((part.inputs ?? []).map((port) => [port.name, port.type])),
    outputType: part.outputType,
    kit: true,
    circuitOf,
    label: part.name,
    description: part.desc,
    // The circuit inside checks its own sizes: a packed part may take a small picture and a big one.
    anySize: true,
    unlock: type,
    // What the circuit inside costs per pixel, as if each of its parts ran at full size.
    cost: () => {
      const circuit = circuitOf()
      return workshopNodes(circuit, workshopOf(circuit)?.resolve).reduce((sum, { node }) => {
        const cost = types[node.type]?.cost ?? 0
        return sum + (typeof cost === 'function' ? cost(node.params ?? {}) : cost)
      }, 0)
    },
  }
}
