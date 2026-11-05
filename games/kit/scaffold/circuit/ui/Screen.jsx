import { useMemo } from 'react'
import CircuitScreen from '../../../shell/CircuitScreen.jsx'
import { L } from '../../../shell/i18n.js'
import { OPS } from '../ops.js'
import { runLevel, show } from '../run.js'
import { CARDS } from './catalog.js'

// A __name__ level on the circuit base's screen (../../../shell/CircuitScreen.jsx), each test run once: the game's
// own parts (parts.json) are the kernel's to draw (`defined`). Under the board, the test on one line: what it gives,
// then each output as this board gives it, against what it should be when they differ (before the test has run, what
// it should be). That line already says what a failed run says, so the run's verdict is not repeated under it.

function results({ level, test, run, ran }) {
  const pair = (key, label, value) => <span key={key} className="__name__-pair"><b>{L(label)}</b>{value}</span>
  return (
    <p className="__name__-test">
      {level.inputs.map((i) => pair(i.name, i.label, show(test.inputs[i.name])))}
      <span className="__name__-to" aria-hidden="true">→</span>
      {level.outputs.map((o) => {
        const want = test.expect[o.name]
        const got = run.outputs[o.name] ?? null
        if (!ran) return pair(o.name, o.label, <i className="__name__-want">{show(want)}</i>)
        return pair(o.name, o.label, got === want ? <span className="is-pass">{show(got)}</span> : <><span className="is-fail">{show(got)}</span><i className="__name__-want">≠ {show(want)}</i></>)
      })}
    </p>
  )
}

export default function Screen(screen) {
  const own = screen.game.circuit
  const defined = useMemo(() => ({ of: (type) => own.defs[type] ?? null, defaults: own.defaultsOf, ops: OPS }), [own])
  return <CircuitScreen screen={screen} cards={CARDS} defined={defined} run={runLevel} says={(r) => r.fail?.why} show={show} results={results} canvas={{ width: 140, height: 96 }} />
}
