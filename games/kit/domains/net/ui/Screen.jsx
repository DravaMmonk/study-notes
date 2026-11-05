import CircuitScreen, { CardField, WANTED } from '../../../shell/CircuitScreen.jsx'
import { L, T } from '../../../shell/i18n.js'
import { REGISTERS } from '../parts.js'
import { checked, runLevel, show } from '../run.js'
import { CARDS, FORMS, PORT_LABELS } from './catalog.js'

// A level of 《从一根线开始》 on the circuit base's screen (../../../shell/CircuitScreen.jsx), run tick by tick: its
// wires in and inputs down the left, its wires out and outputs down the right. Under the board, the waveform: what
// arrives on each wire and input, what the board gives against what it should, and what the level wants in order,
// timing aside.

const NAMES = REGISTERS.map((r) => [r, r])
const STARTS = [['', '—'], ['0', '0'], ['1', '1']]
const NUMBERS = Array.from({ length: 256 }, (_, k) => [String(k), String(k)])
// Registers start named A; a new card's settings are its defaults written in, so the card shows them.
const defaults = (type) => (type === 'reg' || type === 'keep' ? { reg: 'A' } : type === 'const' ? { value: '0' } : FORMS[type] ? { form: Object.keys(FORMS[type])[0] } : {})

function settings(node, set) {
  const p = node.params ?? {}
  if (node.type === 'reg') return <><CardField label={T('名字', 'Name')} value={p.reg ?? 'A'} options={NAMES} onChange={set('reg')} /><CardField label={T('初值', 'Start')} value={p.start ?? ''} options={STARTS} onChange={set('start')} /></>
  if (node.type === 'keep') return <CardField label={T('名字', 'Name')} value={p.reg ?? 'A'} options={NAMES} onChange={set('reg')} />
  if (node.type === 'const') return <CardField label={T('数值', 'Value')} value={p.value ?? '0'} options={NUMBERS} onChange={set('value')} />
  if (FORMS[node.type]) return <CardField label={T('形状', 'Form')} value={p.form ?? Object.keys(FORMS[node.type])[0]} options={Object.entries(FORMS[node.type])} onChange={set('form')} />
  return null
}

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
