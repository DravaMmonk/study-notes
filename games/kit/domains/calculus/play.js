// The calculus domain's play hook for a blind session (../../engine/play/circuit.js tickPlay): a level as its board
// screen (ui/screen.js) shows it, in words — the input sequences down the left, the output sequences down the right,
// the parts it holds, every test as the results draw it (each input's terms and each output's wanted terms, tick by
// tick) — and an attempt judged as a run judges it.
import { tickPlay } from '../../engine/play/circuit.js'
import { REGISTERS } from './parts.js'
import { runLevel } from './run.js'
import { T } from '../../shell/i18n.js'

export const play = tickPlay({
  run: runLevel,
  registers: { names: REGISTERS, top: 9 },
  given: ({ inputs = [], outputs }) => T(
    [...inputs.map((i) => `${i.name}：输入数列「${i.label.zh}」，第 n 拍是第 n 项`), ...outputs.map((o) => `${o.name}：输出数列「${o.label.zh}」，每一项检查`)].join('\n'),
    [...inputs.map((i) => `${i.name}: input sequence “${i.label.en}”, term n at tick n`), ...outputs.map((o) => `${o.name}: output sequence “${o.label.en}”, every term checked`)].join('\n'),
  ),
  lanes: (L, test) => [
    ...(L.inputs ?? []).map((i) => ({ name: i.name, ticks: test.inputs[i.name] })),
    ...L.outputs.map((o) => ({ name: o.name, ticks: test.want[o.name], wanted: true })),
  ],
})
