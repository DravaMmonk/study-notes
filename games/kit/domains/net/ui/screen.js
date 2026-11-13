import { REGISTERS } from '../parts.js'
import * as play from '../run.js'
import { PORT_LABELS, FORMS } from './catalog.js'

// What 《从一根线开始》 declares of its screen (../../../shell/CircuitScreen.jsx circuitScreen), run tick by tick: its
// wires in and inputs down the left, its wires out and outputs down the right; under the board, what arrives on each
// wire and input and what the board gives against what it should, on one time axis (run.js entries).
export const screen = {
  play,
  says: (r) => r.final,
  portLabels: PORT_LABELS,
  registers: { registers: REGISTERS, top: 255, forms: FORMS },
}
