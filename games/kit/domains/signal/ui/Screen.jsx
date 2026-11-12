import CircuitScreen from '../../../shell/CircuitScreen.jsx'
import { entries, runLevel, show } from '../run.js'
import { CARDS } from './catalog.js'

// A signal level on the circuit base's screen (../../../shell/CircuitScreen.jsx), judged: a board's value follows
// from its inputs at once, so checking shows every test's result in one go, with nothing to step through. The game's
// own parts (parts.json) are the kernel's to draw (`defined`, the game's: ../../../shell/circuit-game.js definedGame). Under the board, each output against what it should be
// (run.js entries); before the board is checked, what it should be.

export default function Screen(screen) {
  return <CircuitScreen screen={screen} cards={CARDS} defined={screen.game.defined} run={runLevel} says={(r) => r.fail?.why} show={show} entries={entries} judged canvas={{ width: 140, height: 96 }} />
}
