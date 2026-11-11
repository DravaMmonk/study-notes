import CircuitScreen, { registerCards } from '../../../shell/CircuitScreen.jsx'
import { valueText } from '../../../engine/views.js'
import { entries, once, runLevel } from '../run.js'
import { CARDS } from './catalog.js'

// A market level on the circuit base's screen (../../../shell/CircuitScreen.jsx), run a tick at a time against its
// street: each shop's price and what it showed the tick before down the left, each shop's price down the right; under the board, tick by
// tick, the prices given, what sold, what was left, who went without and what the street earned (run.js entries).

const { settings, defaults } = registerCards({ registers: [], top: 9, numbers: true })

export default function Screen(screen) {
  return <CircuitScreen screen={screen} cards={CARDS} run={runLevel} says={(r) => r.error ?? r.said} show={valueText} entries={entries} once={once} settings={settings} defaults={defaults} />
}
