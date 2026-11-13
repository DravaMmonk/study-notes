import { REGISTERS } from '../parts.js'
import * as play from '../run.js'
import { BUS_WORDS } from '../bus.js'
import { FORMS, PORT_LABELS } from './catalog.js'
import FrameReplay from './FrameReplay.jsx'

// What 《车在说话》 declares of its screen (../../../shell/CircuitScreen.jsx circuitScreen), run tick by tick: the bus and
// the task's inputs down the left, its outputs down the right; under the board, the bus, the inputs, and what the board
// gives against what it should, on one time axis (run.js entries); beside them the frames the test puts on the bus
// (FrameReplay.jsx).
export const screen = {
  play,
  portLabels: PORT_LABELS,
  words: BUS_WORDS,
  registers: { registers: REGISTERS, numberConstants: true, numberStarts: true, forms: FORMS },
  scene: ({ test }) => [{ part: 'frames', events: test?.frameEvents }],
  parts: { frames: FrameReplay },
}
