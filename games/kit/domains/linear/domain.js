// The linear domain for the checks (games/DESIGN.md 6.3): the circuit preset (../../engine/circuit-preset.js) over its
// vocabulary, its course and its runs, each test run once (run.js). Nothing here draws: the page's side is game.js.
import { circuitDomain } from '../../engine/circuit-preset.js'
import { vocabulary } from './vocabulary.js'
import { linearCourse } from './course.js'
import { entries, runLevel, show } from './run.js'

export default circuitDomain('linear', {
  vocabulary,
  course: linearCourse,
  run: runLevel,
  entries,
  failure: (r) => (r.fail ? `(${r.fail.at}: want ${show(r.fail.want)}, got ${show(r.fail.got)})` : ''),
})
