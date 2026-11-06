// The vision domain for the checks (games/DESIGN.md 6.3, 6.8): its vocabulary, a game's spec from its content (the
// circuit base's, ../../engine/circuit-domain.js circuitSpec), the domain's checks, and its play hook for blind
// sessions. Nothing here draws: the page's side is game.jsx.
import { circuitSpec } from '../../engine/circuit-domain.js'
import { vocabulary } from './vocabulary.js'
import { visionCourse } from './course.js'
import { validate } from './validate.js'
import { play } from './play.js'

export default { vocabulary, spec: circuitSpec('vision', visionCourse), validate, play }
