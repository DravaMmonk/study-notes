// The cards a vision task puts on its board, for the shared engine (../../engine/circuit.js): in (one of the task's
// inputs, params.name; a group of inputs, params.members, one output each) and out (an output). The parts a course
// starts from are each game's own, defined as data in its parts.json (games/DESIGN.md 6.9) over the domain's engine
// resources (ops.js); built parts are the boards of the levels that build them (course.js).
import { sink, source } from '../../engine/boards.js'

export const FIXED = ['in', 'out']

export const FIXED_PARTS = {
  in: source({
    outputs: (node) => (node.params?.members ? node.params.members.split(',') : null),
    eval: (_, node, ctx, key) => (node.params?.members ? ctx.bind?.[key] : ctx.bind?.[node.params.name]),
  }),
  out: sink(),
}
