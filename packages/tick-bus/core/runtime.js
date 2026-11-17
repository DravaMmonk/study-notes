import { circuitRuntime } from 'circuit'
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
