// The __name__ domain's play hook for a blind session (../../engine/play/circuit.js tickPlay): a level as its board
// screen (ui/Screen.jsx) shows it, in words — the line and the level's inputs down the left, what it says and its
// outputs down the right, the parts it holds, every test as the waveform draws it (the line, the inputs and what each
// output should be, tick by tick) — and an attempt judged as a run judges it.
import { tickPlay } from '../../engine/play/circuit.js'
import { REGISTERS } from './parts.js'
import { checked, runLevel } from './run.js'
import { T } from '../../shell/i18n.js'

export const play = tickPlay({
  run: runLevel,
  registers: { names: REGISTERS, top: 32 },
  given: (L) => T(
    [...(L.listens ? ['line：这一拍线上的位'] : []), ...(L.inputs ?? []).map((i) => `${i.name}：输入「${i.label.zh}」`), ...(L.talks ? ['say：接到这里的位这一拍说到线上，每一拍检查'] : []), ...(L.outputs ?? []).map((o) => `${o.name}：输出「${o.label.zh}」，每一拍检查`)].join('\n'),
    [...(L.listens ? ['line: the bit on the line this tick'] : []), ...(L.inputs ?? []).map((i) => `${i.name}: input “${i.label.en}”`), ...(L.talks ? ['say: the bit wired here goes on the line this tick, checked every tick'] : []), ...(L.outputs ?? []).map((o) => `${o.name}: output “${o.label.en}”, checked every tick`)].join('\n'),
  ),
  lanes: (L, test) => {
    const want = L.want(test)
    return [
      ...(L.listens ? [{ name: 'line', ticks: test.line, text: (v) => (v === undefined ? '.' : String(v)) }] : []),
      ...(L.inputs ?? []).map((i) => ({ name: i.name, ticks: test.inputs[i.name] })),
      ...checked(L).map((o) => ({ name: o.name, ticks: want[o.name], wanted: true })),
    ]
  },
})
