// The image engine over one course's part table (`types`: NODE_TYPES and the parts the course's levels pack, own.js):
// what each part is (nodes.js specsOf), running boards of them (graph.js runnerOf) and reading and writing them as
// blueprint text (board.js blueprintOf). Each course holds its own (../course.js), so two courses read in one process
// never run each other's packed parts.
import { blueprintOf } from './board.js'
import { runnerOf } from './graph.js'
import { specsOf } from './nodes.js'

export function imageKit(types) {
  const specs = specsOf(types)
  return { ...specs, ...runnerOf(types), ...blueprintOf(specs) }
}
