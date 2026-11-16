// The tick-bus domain for the checks (games/DESIGN.md 6.3): the circuit preset (../../engine/circuit-preset.js) over its
// vocabulary, its course and its runs, each run tick by tick on its line (run.js; a reference board that says in a tick what it hears
// in that tick has a loop, and fails), and its play hook for blind sessions (play.js). Nothing here draws: the page's
// side is game.js.
import { circuitRuntime } from '../../engine/circuit-preset.js'
import { vocabulary } from './vocabulary.js'
import { tickBusWorks, prepareWorks } from './work.js'
import { entries, runLevel } from './run.js'
import { play } from './play.js'

export default circuitRuntime({
  vocabulary,
  prepare: prepareWorks,
  course: tickBusWorks,
  run: runLevel,
  entries,
  failure: (r) => (r.error ? '(a loop)' : r.fail ? `at tick ${r.fail.at?.tick} (${(r.fail.at?.id ?? r.fail.at)}: want ${r.fail.want}, got ${r.fail.got})` : ''),
  play,
})
