// The market domain for the checks (games/DESIGN.md 6.3): the circuit preset (../../engine/circuit-preset.js) over its
// vocabulary, its course and its runs, each run against its streets (run.js). Nothing here draws: the page's side is game.js.
import { circuitDomain } from '../../engine/circuit-preset.js'
import { vocabulary } from './vocabulary.js'
import { marketCourse } from './course.js'
import { entries, runLevel } from './run.js'

export default circuitDomain('market', {
  vocabulary,
  course: marketCourse,
  run: runLevel,
  entries,
  failure: (r) => (r.fail ? `(${r.fail.at} ${r.fail.got}, wants ${r.fail.want})` : ''),
})
