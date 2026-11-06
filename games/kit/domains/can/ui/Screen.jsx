import CircuitScreen, { registerCards } from '../../../shell/CircuitScreen.jsx'
import { valueText } from '../../../engine/views.js'
import { REGISTERS } from '../parts.js'
import { entries, runLevel } from '../run.js'
import { BUS_WORDS } from '../bus.js'
import { CARDS, FORMS, PORT_LABELS } from './catalog.js'

// A task of 《车在说话》 on the circuit base's screen (../../../shell/CircuitScreen.jsx), run tick by tick: the bus and
// the task's inputs down the left, its outputs down the right; under the board, the bus, the inputs, and what the board
// gives against what it should, on one time axis (run.js entries).

const { settings, defaults } = registerCards({ registers: REGISTERS, top: 32, forms: FORMS })

export default function Screen(screen) {
  return <CircuitScreen screen={screen} cards={CARDS} portLabels={PORT_LABELS} run={runLevel} says={(r) => r.error} show={valueText} entries={entries} settings={settings} defaults={defaults} words={BUS_WORDS} />
}
