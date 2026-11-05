import { useMemo } from 'react'
import CircuitScreen, { WANTED } from '../../../shell/CircuitScreen.jsx'
import { L, tr } from '../../../shell/i18n.js'
import { OPS } from '../ops.js'
import { runLevel, show } from '../run.js'
import { CARDS } from './catalog.js'

// A __name__ level on the circuit base's screen (../../../shell/CircuitScreen.jsx), each test run once: the game's
// own parts (parts.json) are the kernel's to draw (`defined`); under the board, the test: what it gives, what it wants
// and what this board gives.

function results({ level, test, run, ran }) {
  const rows = [
    ...level.inputs.map((i) => [i.label, show(test.inputs[i.name]), null]),
    ...level.outputs.map((o) => [o.label, show(test.expect[o.name]), ran ? show(run.outputs[o.name]) : '']),
  ]
  return (
    <table className="__name__-test">
      <thead><tr><th /><th>{L(WANTED)}</th><th>{tr('这块板', 'This board')}</th></tr></thead>
      <tbody>{rows.map(([label, want, got], k) => <tr key={k}><th>{L(label)}</th><td>{want}</td><td>{got ?? ''}</td></tr>)}</tbody>
    </table>
  )
}

export default function Screen(screen) {
  const own = screen.game.circuit
  const defined = useMemo(() => ({ of: (type) => own.defs[type] ?? null, defaults: own.defaultsOf, ops: OPS }), [own])
  return <CircuitScreen screen={screen} cards={CARDS} defined={defined} run={runLevel} says={(r) => r.fail?.why} show={show} results={results} canvas={{ width: 140, height: 96 }} />
}
