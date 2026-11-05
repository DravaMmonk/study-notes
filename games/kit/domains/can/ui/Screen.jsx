import CircuitScreen, { WANTED, registerCards } from '../../../shell/CircuitScreen.jsx'
import { showValue } from '../../../engine/circuit-domain.js'
import { REGISTERS } from '../parts.js'
import { runLevel } from '../run.js'
import { BUS_WORDS } from '../bus.js'
import { CARDS, FORMS, PORT_LABELS } from './catalog.js'

// A task of 《车在说话》 on the circuit base's screen (../../../shell/CircuitScreen.jsx), run tick by tick: the bus and
// the task's inputs down the left, its outputs down the right. Under the board, the waveform: the bus, the inputs, and
// what the board gives against what it should.

const { settings, defaults } = registerCards({ registers: REGISTERS, top: 32, forms: FORMS })

const lanes = ({ level, test, run, upTo }) => [
  ...(level.listens ? [{ key: 'line', label: CARDS.line.name, kind: 'wave', ticks: test.bus.bits }] : []),
  ...(level.inputs ?? []).map((i) => ({ key: `in:${i.name}`, label: i.label, kind: 'wave', ticks: test.inputs[i.name] })),
  ...level.outputs.flatMap((o) => [
    { key: `got:${o.name}`, label: o.label, kind: 'value', ticks: upTo(run.ticks.map((t) => t.outputs[o.name] ?? null)) },
    { key: `want:${o.name}`, label: WANTED, kind: 'value', ticks: run.want[o.name].map((v) => (v === undefined ? null : v)) },
  ]),
]

export default function Screen(screen) {
  return <CircuitScreen screen={screen} cards={CARDS} portLabels={PORT_LABELS} run={runLevel} says={(r) => r.error} show={showValue} lanes={lanes} settings={settings} defaults={defaults} words={BUS_WORDS} />
}
