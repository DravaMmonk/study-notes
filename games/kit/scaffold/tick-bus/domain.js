// The __name__ domain for the checks (games/DESIGN.md 6.3): the circuit preset (../../engine/circuit-preset.js) over its
// vocabulary, its course and its runs, each run tick by tick on its line (run.js; a reference board that says in a tick what it hears
// in that tick has a loop, and fails), and its play hook for blind sessions (play.js). Nothing here draws: the page's
// side is game.js.
import { circuitDomain } from '../../engine/circuit-preset.js'
import { vocabulary } from './vocabulary.js'
import { __name__Course } from './course.js'
import { entries, runLevel } from './run.js'
import { play } from './play.js'

export default circuitDomain('__name__', {
  vocabulary,
  course: __name__Course,
  run: runLevel,
  entries,
  failure: (r) => (r.error ? '(a loop)' : r.fail ? `at tick ${r.fail.at?.tick} (${(r.fail.at?.id ?? r.fail.at)}: want ${r.fail.want}, got ${r.fail.got})` : ''),
  play,
})
