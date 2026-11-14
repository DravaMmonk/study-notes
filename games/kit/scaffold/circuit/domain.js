// The __name__ domain for the checks (games/DESIGN.md 6.3): the circuit preset (../../engine/circuit-preset.js) over its
// vocabulary, its course and its runs, each test run once (run.js). Nothing here draws: the page's side is game.js.
import { circuitDomain } from '../../engine/circuit-preset.js'
import { vocabulary } from './vocabulary.js'
import { __name__Course } from './course.js'
import { entries, runLevel } from './run.js'

export default circuitDomain('__name__', {
  vocabulary,
  course: __name__Course,
  run: runLevel,
  entries,
  failure: (r) => (r.fail ? `(${r.fail.at}: want ${r.fail.want}, got ${r.fail.got})` : ''),
})
