import CircuitScreen, { registerCards } from '../../../shell/CircuitScreen.jsx'
import { REGISTERS } from '../parts.js'
import { entries, runLevel, show } from '../run.js'
import { CARDS, FORMS, PORT_LABELS } from './catalog.js'

// A level of 《从一根线开始》 on the circuit base's screen (../../../shell/CircuitScreen.jsx), run tick by tick: its
// wires in and inputs down the left, its wires out and outputs down the right; under the board, what arrives on each
// wire and input and what the board gives against what it should, on one time axis (run.js entries).

const { settings, defaults } = registerCards({ registers: REGISTERS, top: 255, forms: FORMS })

export default function Screen(screen) {
  return <CircuitScreen screen={screen} cards={CARDS} portLabels={PORT_LABELS} run={runLevel} says={(r) => r.final} show={show} entries={entries} settings={settings} defaults={defaults} />
}
