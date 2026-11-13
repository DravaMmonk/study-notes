import { REGISTERS } from '../parts.js'
import * as play from '../run.js'
import { PORT_LABELS, FORMS } from './catalog.js'

// What the __name__ domain declares of its screen (../../../shell/CircuitScreen.jsx circuitScreen), run tick by tick:
// the line and the level's inputs down the left, what it says and its outputs down the right; under the board, the
// line, the inputs, and what the board gives against what it should, on one time axis (run.js entries).
export const screen = {
  play,
  portLabels: PORT_LABELS,
  registers: { registers: REGISTERS, top: 32, forms: FORMS },
}
