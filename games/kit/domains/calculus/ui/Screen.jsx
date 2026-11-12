import CircuitScreen, { registerCards } from '../../../shell/CircuitScreen.jsx'
import { valueText } from '../../../engine/views.js'
import { REGISTERS } from '../parts.js'
import { entries, runLevel } from '../run.js'
import { CARDS, PORT_LABELS } from './catalog.js'
import Terms from './Terms.jsx'

// A calculus level on the circuit base's screen (../../../shell/CircuitScreen.jsx), run a term a tick: the input
// sequences down the left, the output sequences down the right; under the board, each input's terms and each output's
// terms against the wanted ones, on one axis of n (run.js entries); beside them the test's sequences on shared axes
// (Terms.jsx).

const { settings, defaults } = registerCards({ registers: REGISTERS, top: 9, numbers: true })

export default function Screen(screen) {
  return <CircuitScreen screen={screen} cards={CARDS} portLabels={PORT_LABELS} run={runLevel} says={(r) => r.error} show={valueText} entries={entries} figure={Terms} settings={settings} defaults={defaults} />
}
