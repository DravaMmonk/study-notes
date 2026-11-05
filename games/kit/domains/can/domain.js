// The can domain for the checks (games/DESIGN.md 6.3): its vocabulary, a game's spec from its content (the circuit
// base's, ../../engine/circuit-domain.js circuitSpec), the domain's checks, its play hook for blind sessions (play.js)
// and its headless drawing of a level (scene.js, an SVG string). The page's side is game.jsx.
import { circuitSpec } from '../../engine/circuit-domain.js'
import { vocabulary } from './vocabulary.js'
import { canCourse } from './course.js'
import { validate } from './validate.js'
import { play } from './play.js'
import { scene } from './scene.js'

export default { vocabulary, spec: circuitSpec('can', canCourse), validate, play, scene }
