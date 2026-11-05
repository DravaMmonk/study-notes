import CircuitScreen, { CardField, WANTED } from '../../../shell/CircuitScreen.jsx'
import { L, T } from '../../../shell/i18n.js'
import { REGISTERS } from '../parts.js'
import { checked, runLevel, show } from '../run.js'
import { CARDS, FORMS, PORT_LABELS } from './catalog.js'

// A __name__ level on the circuit base's screen (../../../shell/CircuitScreen.jsx), run tick by tick: the line and the
// level's inputs down the left, what it says and its outputs down the right. Under the board, the waveform: the line,
// the inputs, and what the board gives against what it should.

const NAMES = REGISTERS.map((r) => [r, r])
const STARTS = [['', '—'], ['0', '0'], ['1', '1']]
const NUMBERS = Array.from({ length: 33 }, (_, k) => [String(k), String(k)])
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

const text = (v) => L(show(v))

const lanes = ({ level, test, run, upTo }) => [
  ...(level.listens ? [{ key: 'line', label: CARDS.line.name, kind: 'wave', ticks: test.line }] : []),
  ...(level.inputs ?? []).map((i) => ({ key: `in:${i.name}`, label: i.label, kind: 'wave', ticks: test.inputs[i.name] })),
  ...checked(level).flatMap((o) => [
    { key: `got:${o.name}`, label: o.label, kind: 'value', ticks: upTo(run.ticks.map((t) => (o.name === 'say' && level.talks ? t.said : t.outputs[o.name] ?? null))), text },
    { key: `want:${o.name}`, label: WANTED, kind: 'value', ticks: run.want[o.name].map((v) => (v === undefined ? null : v)), text },
  ]),
]

export default function Screen(screen) {
  return <CircuitScreen screen={screen} cards={CARDS} portLabels={PORT_LABELS} run={runLevel} says={(r) => r.error} show={show} lanes={lanes} settings={settings} defaults={defaults} />
}
