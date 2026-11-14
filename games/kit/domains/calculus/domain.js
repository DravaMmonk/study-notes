// The calculus domain for the checks (games/DESIGN.md 6.3): the circuit preset (../../engine/circuit-preset.js) over its
// vocabulary, its course and its runs, each run tick by tick (run.js), and its play hook for blind sessions (play.js).
// Nothing here draws: the page's side is game.js.
import { circuitDomain } from '../../engine/circuit-preset.js'
import { vocabulary } from './vocabulary.js'
import { calculusCourse } from './course.js'
import { entries, runLevel } from './run.js'
import { play } from './play.js'

export default circuitDomain('calculus', {
  vocabulary,
  course: calculusCourse,
  run: runLevel,
  entries,
  failure: (r) => (r.fail ? `at tick ${r.fail.at?.tick} (${(r.fail.at?.id ?? r.fail.at)}: want ${r.fail.want}, got ${r.fail.got})` : ''),
  play,
})
