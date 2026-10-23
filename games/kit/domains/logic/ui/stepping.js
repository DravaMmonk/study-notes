// A machine board's run as steps for the shared playback (../../../shell/usePlayback.jsx, 《证明完毕》 chapter 4 on):
// every card's own value in the order the engine computed it (../../../engine/circuit.js trace), a repeat frame's
// rounds among them. A step fails when its card cannot compute, or when a tactic fails where no frame catches the
// failure (a card inside a repeat or or-else frame may fail: that is how the frame knows to stop or switch).
import { MISSING } from '../../../engine/circuit.js'
import { viewAt } from '../../../engine/trace.js'

const T = (zh, en) => ({ zh, en })

/** The steps of one traced test: [{ id, at, round?, value?, error?, failed, name }], `name(node)` a card's { zh, en }. */
export function machineSteps(traced, circuit, name) {
  const byId = new Map(circuit.nodes.map((n) => [n.id, n]))
  return traced.trace
    .map((e, at) => ({ ...e, at, node: byId.get(e.id) }))
    .filter((e) => e.key === null && e.node && e.node.type !== 'in')
    .map((e) => {
      const n = name(e.node)
      return {
        ...e,
        label: e.round ? T(`${n.zh} · 第 ${e.round} 圈`, `${n.en} · round ${e.round}`) : n,
        failed: e.error === MISSING ? T(`「${n.zh}」还缺输入`, `“${n.en}” is missing an input`) : e.error ?? (e.value?.kind === 'state' && e.value.error && !e.node.in ? e.value.error : null),
      }
    })
}

/** The board as it stood after step `k` of a traced test (−1: before any card ran; past the end: the whole run). */
export function machineViewAt(traced, steps, k) {
  if (k >= steps.length) return traced.run
  if (k < 0) return viewAt(traced.trace, (steps[0]?.at ?? traced.trace.length) - 1)
  return viewAt(traced.trace, steps[k].at)
}
