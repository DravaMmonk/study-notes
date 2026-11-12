import CircuitScreen from '../../../shell/CircuitScreen.jsx'
import { entries, runLevel, show } from '../run.js'
import { CARDS } from './catalog.js'

// A __name__ level on the circuit base's screen (../../../shell/CircuitScreen.jsx), each test run once: the game's
// own parts (parts.json) are the kernel's to draw (`defined`, the game's: ../../../shell/circuit-game.js definedGame). Under the board, each output against what it should be
// (run.js entries); before the test has run, what it should be.

export default function Screen(screen) {
  return <CircuitScreen screen={screen} cards={CARDS} defined={screen.game.defined} run={runLevel} says={(r) => r.fail?.why} show={show} entries={entries} canvas={{ width: 140, height: 96 }} />
}
