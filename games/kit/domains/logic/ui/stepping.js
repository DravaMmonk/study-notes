// A machine board's run as steps for the shared playback (../../../shell/usePlayback.jsx, 《证明完毕》 chapter 4 on):
// every card's own value in the order the engine computed it (../../../engine/circuit.js trace). Inside a repeat frame
// each card is a step in every round, labelled with its round; a built part that goes round inside (the saturator,
// the unifier, auto) shows each of its rounds or each card it applies as a step of its own, then what it gives. A step
// fails when its card cannot compute, or when a tactic fails where no frame catches the failure (a card inside a
// repeat or or-else frame may fail: that is how the frame knows to stop or switch).
import { MISSING } from '../../../engine/circuit.js'
import { viewAt } from '../../../engine/trace.js'

const T = (zh, en) => ({ zh, en })
const join = (a, b) => T(`${a.zh} · ${b.zh}`, `${a.en} · ${b.en}`)
const roundOf = (k) => T(`第 ${k} 圈`, `round ${k}`)

/**
 * The steps of one traced test: [{ id, at, value?, error?, failed, label }]. `name(node)` is a card's name and
 * `partName(type)` a part's, both { zh, en }.
 */
export function machineSteps(traced, circuit, name, partName) {
  const byId = new Map(circuit.nodes.map((n) => [n.id, n]))
  // How many rounds each repeat frame has opened so far: each round starts with what the frame opens with.
  const rounds = new Map()
  // The round of the nearest repeat frame around a card, if it is in one.
  const roundAround = (node) => {
    for (let at = node.in; at;) {
      const frame = byId.get(at.split('/')[0])
      if (!frame) return null
      if (frame.type === 'repeat' && rounds.has(frame.id)) return rounds.get(frame.id)
      at = frame.in
    }
    return null
  }
  const steps = []
  // Parts that showed steps inside: their last step is what they give.
  const went = new Set()
  traced.trace.forEach((e, at) => {
    const node = byId.get(e.id)
    if (!node) return
    if (e.key === 'body' && node.type === 'repeat') rounds.set(e.id, (rounds.get(e.id) ?? 0) + 1)
    if (e.key !== null || e.quiet || node.type === 'in') return
    const n = name(node)
    const round = roundAround(node)
    const label = e.inner
      ? join(n, e.round ? roundOf(e.round) : partName(e.sub))
      : node.type === 'repeat' || went.has(node.id) ? join(n, T('得出', 'gives'))
      : round ? join(n, roundOf(round)) : n
    const failed = e.error === MISSING ? T(`「${n.zh}」还缺输入`, `“${n.en}” is missing an input`)
      : e.error ?? (e.value?.kind === 'state' && e.value.error && !node.in ? e.value.error : null)
    if (e.inner) went.add(node.id)
    steps.push({ ...e, at, node, label, failed })
  })
  return steps
}

/** The board as it stood after step `k` of a traced test (−1: before any card ran; past the end: the whole run). */
export function machineViewAt(traced, steps, k) {
  if (k >= steps.length) return traced.run
  if (k < 0) return viewAt(traced.trace, (steps[0]?.at ?? traced.trace.length) - 1)
  return viewAt(traced.trace, steps[k].at)
}
