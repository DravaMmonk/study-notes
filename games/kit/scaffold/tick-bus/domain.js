// The __name__ domain for the checks (games/DESIGN.md 6.3): its vocabulary, a game's spec from its content (the circuit
// base's, ../../engine/circuit-domain.js circuitSpec), the domain's checks and its play hook for blind sessions
// (play.js). Nothing here draws: the page's side is game.jsx.
import { circuitSpec } from '../../engine/circuit-domain.js'
import { vocabulary } from './vocabulary.js'
import { __name__Course } from './course.js'
import { validate } from './validate.js'
import { play } from './play.js'

// The tools' other hooks on a domain (kit/engine/contract.js EXTENSIONS: changes, scene) go here too.
export default { vocabulary, spec: circuitSpec('__name__', __name__Course), validate, play }
