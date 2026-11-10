import { useMemo } from 'react'
import CircuitScreen from '../../../shell/CircuitScreen.jsx'
import { OPS } from '../ops.js'
import { entries, runLevel, show } from '../run.js'
import { CARDS } from './catalog.js'

// A linear level on the circuit base's screen (../../../shell/CircuitScreen.jsx), each test run once: the game's
// own parts (parts.json) are the kernel's to draw (`defined`). Under the board, each output against what it should be
// (run.js entries); before the test has run, what it should be.

export default function Screen(screen) {
  const own = screen.game.circuit
  const defined = useMemo(() => ({ of: (type) => own.defs[type] ?? null, defaults: own.defaultsOf, ops: OPS }), [own])
  return <CircuitScreen screen={screen} cards={CARDS} defined={defined} run={runLevel} says={(r) => r.fail?.why} show={show} entries={entries} canvas={{ width: 140, height: 96 }} />
}
