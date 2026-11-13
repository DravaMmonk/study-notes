import { REGISTERS } from '../parts.js'
import * as play from '../run.js'
import { PORT_LABELS } from './catalog.js'
import { terms } from './terms.js'

// What the calculus domain declares of its screen (../../../shell/CircuitScreen.jsx circuitScreen), run a term a tick:
// the input sequences down the left, the output sequences down the right; under the board, each input's terms and each
// output's terms against the wanted ones, on one axis of n (run.js entries); beside them the test's sequences on shared
// axes (terms.js).
export const screen = {
  play,
  portLabels: PORT_LABELS,
  registers: { registers: REGISTERS, top: 9, numbers: true },
  scene: terms,
}
