// The net domain for the checks (games/DESIGN.md 6.3): the circuit preset (../../engine/circuit-preset.js) over its
// vocabulary, its course and its runs, each run tick by tick on its wires (run.js), its play hook for blind sessions
// (play.js) and its headless drawing of a level (scene.js, an SVG string). Nothing here draws: the page's side is game.js.
import { circuitDomain } from '../../engine/circuit-preset.js'
import { vocabulary } from './vocabulary.js'
import { netCourse } from './course.js'
import { entries, runLevel } from './run.js'
import { play } from './play.js'
import { scene } from './scene.js'

export default circuitDomain('net', {
  vocabulary,
  course: netCourse,
  run: runLevel,
  entries,
  failure: (r) => (r.fail ? `${r.fail.at?.tick !== undefined ? `at tick ${r.fail.at?.tick} ` : ''}(${(r.fail.at?.id ?? r.fail.at)}: want ${JSON.stringify(r.fail.want)}, got ${JSON.stringify(r.fail.got)})` : ''),
  play,
  scene,
})
