// The net domain's play hook for a blind session (../../engine/play/circuit.js tickPlay): a level of 《从一根线开始》
// as its board screen (ui/screen.js) shows it, in words — its wires in and inputs down the left, its wires out and
// outputs down the right, the parts it holds, every test as the waveform draws it (what arrives on each wire, the
// inputs, the queue's head, and what each output and wire out should be, tick by tick, or in order) — and an attempt
// judged as a run judges it.
import { tickPlay } from '../../engine/play/circuit.js'
import { REGISTERS } from './parts.js'
import { checked, runLevel, show } from './run.js'
import { T } from '../../shell/i18n.js'

const word = (v, lang) => (typeof show(v) === 'object' ? show(v)[lang] : show(v))

export const play = tickPlay({
  run: runLevel,
  show,
  registers: { names: REGISTERS, top: 255 },
  given: (L) => T(
    [
      ...(L.wires?.in ?? []).map((w) => `${w.name}：进线「${w.label.zh}」，这一拍到达的位`),
      ...(L.inputs ?? []).map((i) => `${i.name}：输入「${i.label.zh}」${L.pulls?.input === i.name ? '，队首的字节（取完了是「—」）' : L.pulls?.last === i.name ? '，队首是一帧的最后一个字节时为是' : ''}`),
      ...(L.wires?.out ?? []).map((w) => `${w.name}：出线「${w.label.zh}」，接到这里的位这一拍说到线上（不接为 0）`),
      ...(L.outputs ?? []).map((o) => `${o.name}：输出「${o.label.zh}」${L.pulls?.next === o.name ? '，为 1 或是的那一拍取走队首，下一拍出现下一个' : ''}`),
    ].join('\n'),
    [
      ...(L.wires?.in ?? []).map((w) => `${w.name}: wire in “${w.label.en}”, the bit arriving this tick`),
      ...(L.inputs ?? []).map((i) => `${i.name}: input “${i.label.en}”${L.pulls?.input === i.name ? ', the byte at the head of the queue (「—」 once used up)' : L.pulls?.last === i.name ? ', yes when the head is the last byte of its frame' : ''}`),
      ...(L.wires?.out ?? []).map((w) => `${w.name}: wire out “${w.label.en}”, the bit wired here is said on it this tick (0 when nothing is wired)`),
      ...(L.outputs ?? []).map((o) => `${o.name}: output “${o.label.en}”${L.pulls?.next === o.name ? ', the tick it is 1 or yes takes the head of the queue, the next showing the tick after' : ''}`),
    ].join('\n'),
  ),
  lanes: (L, test) => {
    const want = L.want(test)
    return [
      ...(L.wires?.in ?? []).map((w) => ({ name: w.name, ticks: test.wires[w.name], text: String })),
      ...Object.keys(test.inputs).map((name) => ({ name, ticks: test.inputs[name] })),
      ...checked(L).filter((o) => want[o.name]?.ticks).map((o) => ({ name: o.name, ticks: want[o.name].ticks, wanted: true })),
    ]
  },
  // The queue the board pulls from, and what is wanted in order, timing aside.
  more: (L, test, lang) => {
    const want = L.want(test)
    return [
      ...(L.pulls ? [`${lang === 'en' ? 'queue (frames, bytes)' : '队列（帧，字节）'}: ${JSON.stringify(test.queue)}`] : []),
      ...checked(L).filter((o) => want[o.name]?.order).map((o) => `${o.name} (${lang === 'en' ? 'wanted, in order' : '应当，依次'}): ${want[o.name].words[lang]} = ${want[o.name].order.map((v) => word(v, lang)).join(' ') || '—'}`),
    ]
  },
})
