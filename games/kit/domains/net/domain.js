// The net domain for the checks (games/DESIGN.md 6.3): its vocabulary, a game's spec from its content (the circuit
// base's, ../../engine/circuit-domain.js circuitSpec), the domain's checks, its play hook for blind sessions (play.js)
// and its headless drawing of a level (scene.js, an SVG string). The page's side is game.jsx.
import { circuitSpec } from '../../engine/circuit-domain.js'
import { vocabulary } from './vocabulary.js'
import { netCourse } from './course.js'
import { validate } from './validate.js'
import { play } from './play.js'
import { scene } from './scene.js'

// The tools' other hooks on a domain (kit/engine/contract.js EXTENSIONS: changes, play, scene) go here too.
export default { vocabulary, spec: circuitSpec('net', netCourse), validate, play, scene }
