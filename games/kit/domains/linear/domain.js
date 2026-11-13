// The linear domain for the checks (games/DESIGN.md 6.3): its vocabulary, a game's spec from its content (the circuit
// base's, ../../engine/circuit-domain.js circuitSpec) and the domain's checks. Nothing here draws: the page's side is
// game.js.
import { circuitNames, circuitSpec } from '../../engine/circuit-domain.js'
import { vocabulary } from './vocabulary.js'
import { linearCourse } from './course.js'
import { validate } from './validate.js'

// The tools' hooks on a domain (kit/engine/contract.js EXTENSIONS: changes, play, scene) go here too.
export default { vocabulary, names: circuitNames, spec: circuitSpec('linear', linearCourse), validate }
