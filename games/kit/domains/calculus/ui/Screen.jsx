import CircuitScreen, { registerCards } from '../../../shell/CircuitScreen.jsx'
import { valueText } from '../../../engine/views.js'
import { REGISTERS } from '../parts.js'
import { entries, runLevel } from '../run.js'
import { CARDS, PORT_LABELS } from './catalog.js'

// A calculus level on the circuit base's screen (../../../shell/CircuitScreen.jsx), run a term a tick: the input
// sequences down the left, the output sequences down the right; under the board, each input's terms and each output's
// terms against the wanted ones, on one axis of n (run.js entries).

const { settings, defaults } = registerCards({ registers: REGISTERS, top: 9, numbers: true })

export default function Screen(screen) {
  return <CircuitScreen screen={screen} cards={CARDS} portLabels={PORT_LABELS} run={runLevel} show={valueText} entries={entries} settings={settings} defaults={defaults} />
}
