// The can domain's play hook for a blind session (../../engine/play/circuit.js tickPlay): a task of 《车在说话》 as its
// board screen (ui/Screen.jsx) shows it, in words — the bus and the task's inputs down the left, its outputs down the
// right, the parts it holds, every bus as the waveform draws it (the line, the inputs and what each output should be,
// tick by tick) — and an attempt judged as a run judges it.
import { tickPlay } from '../../engine/play/circuit.js'
import { REGISTERS } from './parts.js'
import { runLevel } from './run.js'
import { BUS_WORDS } from './bus.js'
import { T } from '../../shell/i18n.js'

export const play = tickPlay({
  run: runLevel,
  words: BUS_WORDS,
  registers: { names: REGISTERS },
  settings: { reg: [{ key: 'reg', values: REGISTERS }, { key: 'start', values: ['0', '…'], about: T('可输入初值；不写时为「—」', 'enter a start value; omitted means no value') }], const: [{ key: 'value', values: ['0', '…'], about: T('可输入数值', 'enter a number') }], compare: [{ key: 'form', values: ['eq', 'lt'] }], arith: [{ key: 'form', values: ['inc', 'add'] }] },
  given: (task) => T(
    [...(task.listens ? ['line：这一拍总线上的位（0 显性，1 隐性）'] : []), ...(task.inputs ?? []).map((i) => `${i.name}：输入「${i.label.zh}」`), ...task.outputs.map((o) => `${o.name}：输出「${o.label.zh}」，每一拍检查`)].join('\n'),
    [...(task.listens ? ['line: the bit on the bus this tick (0 dominant, 1 recessive)'] : []), ...(task.inputs ?? []).map((i) => `${i.name}: input “${i.label.en}”`), ...task.outputs.map((o) => `${o.name}: output “${o.label.en}”, checked every tick`)].join('\n'),
  ),
  lanes: (task, test) => {
    const want = task.want(test)
    return [
      ...(task.listens ? [{ name: 'line', ticks: test.bus.bits }] : []),
      ...(task.inputs ?? []).map((i) => ({ name: i.name, ticks: test.inputs[i.name] })),
      ...task.outputs.map((o) => ({ name: o.name, ticks: want[o.name], wanted: true })),
    ]
  },
})
