// The circuit domain for the checks (games/DESIGN.md 6.3): the circuit preset (../../engine/circuit-preset.js) over its
// vocabulary, its course and its runs, each test run once (run.js). Nothing here draws: the page's side is game.js.
import { circuitRuntime } from '../../engine/circuit-preset.js'
import { vocabulary } from './vocabulary.js'
import { circuitWorks, prepareWorks } from './work.js'
import { entries, runLevel } from './run.js'
import { play } from './play.js'

export default circuitRuntime({
  vocabulary,
  play,
  prepare: prepareWorks,
  course: circuitWorks,
  run: runLevel,
  entries,
  failure: (r) => (r.fail ? `(${r.fail.at}: want ${r.fail.want}, got ${r.fail.got})` : ''),
})
