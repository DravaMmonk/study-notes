import CircuitScreen, { WANTED, registerCards } from '../../../shell/CircuitScreen.jsx'
import { L } from '../../../shell/i18n.js'
import { REGISTERS } from '../parts.js'
import { checked, runLevel, show } from '../run.js'
import { CARDS, FORMS, PORT_LABELS } from './catalog.js'

// A level of 《从一根线开始》 on the circuit base's screen (../../../shell/CircuitScreen.jsx), run tick by tick: its
// wires in and inputs down the left, its wires out and outputs down the right. Under the board, the waveform: what
// arrives on each wire and input, what the board gives against what it should, and what the level wants in order,
// timing aside.

const { settings, defaults } = registerCards({ registers: REGISTERS, top: 255, forms: FORMS })

const labelOf = (list, name) => list?.find((x) => x.name === name)?.label ?? name
const text = (v) => L(show(v))

function lanes({ level, test, run, upTo }) {
  const wave = (name) => (level.wires?.out ?? []).some((w) => w.name === name)
  return [
    ...(level.wires?.in ?? []).map((w) => ({ key: `rx:${w.name}`, label: w.label, kind: 'wave', ticks: test.wires[w.name] })),
    ...(level.inputs ?? []).filter((i) => i.name !== level.pulls?.input && i.name !== level.pulls?.last).map((i) => ({ key: `in:${i.name}`, label: i.label, kind: 'value', ticks: test.inputs[i.name] ?? [], text })),
    ...(level.pulls ? [{ key: 'queue', label: labelOf(level.inputs, level.pulls.input), kind: 'value', ticks: upTo(run.ticks.map((t) => t.bind[level.pulls.input])), text }] : []),
    ...checked(level).flatMap((o) => [
      { key: `got:${o.name}`, label: o.label, kind: wave(o.name) ? 'wave' : 'value', ticks: upTo(run.ticks.map((t) => t.outputs[o.name] ?? null)), text },
      ...(run.want[o.name]?.ticks ? [{ key: `want:${o.name}`, label: WANTED, kind: wave(o.name) ? 'wave' : 'value', ticks: run.want[o.name].ticks.map((v) => (v === undefined ? null : v)), text }] : []),
    ]),
  ]
}

// What the level wants in order, timing aside.
const notes = ({ level, run }) => checked(level).filter((o) => run.want[o.name]?.order).map((o) => {
  const want = run.want[o.name]
  return <p key={o.name} className="net-order"><b>{L(o.label)}</b> · {L(want.words)}: {want.order.map(text).join(' ') || '—'}</p>
})

export default function Screen(screen) {
  return <CircuitScreen screen={screen} cards={CARDS} portLabels={PORT_LABELS} run={runLevel} says={(r) => r.final} show={show} lanes={lanes} notes={notes} settings={settings} defaults={defaults} />
}
