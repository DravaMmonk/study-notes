// A machine board's run as steps for the shared playback (../../../shell/usePlayback.jsx, 《证明完毕》 chapter 4 on):
// every card's own value in the order the engine computed it (../../../engine/circuit.js trace). Inside a repeat frame
// each card is a step in every round, labelled with its round; inside a search, in every step of the search. A part
// the player built runs the board that built it (../machine.js builtParts), and each card on that board is a step
// too, labelled with the parts it is in (auto › search › Goal apart); its own step, once they are done, is what it
// gives. A step fails when its card cannot compute, or when a tactic fails where no frame catches the failure (a
// card inside a frame or a built part may fail: that is how the frame knows to stop, switch or go back, and how the
// part says it cannot go on).
import { MISSING, sourceOf } from '../../../engine/circuit.js'

const T = (zh, en) => ({ zh, en })
const join = (a, b, mark = '·') => T(`${a.zh} ${mark} ${b.zh}`, `${a.en} ${mark} ${b.en}`)
const ROUND = { repeat: (k) => T(`第 ${k} 圈`, `round ${k}`), search: (k) => T(`第 ${k} 步`, `step ${k}`) }
const samePath = (a = [], b = []) => a.length === b.length && a.every((id, k) => id === b[k])
const within = (path = [], prefix) => prefix.every((id, k) => id === path[k])

/**
 * The boards a run goes through: the level's, and inside each built part the board that built it. `opens(type)` is
 * a built part's { circuit, level } (null for any other part). boardAt(path) → { byId, level } | null.
 */
function boards(circuit, level, opens) {
  const cache = new Map()
  const at = (path) => {
    const key = path.join('/')
    if (!cache.has(key)) {
      let board = { circuit, level }
      for (const id of path) {
        const node = board?.circuit.nodes.find((n) => n.id === id)
        board = node ? opens(node.type) : null
      }
      cache.set(key, board && { ...board, byId: new Map(board.circuit.nodes.map((n) => [n.id, n])) })
    }
    return cache.get(key)
  }
  return at
}

/**
 * The steps of one traced test: [{ id, path, at, value?, error?, failed, label }]. `name(node, level)` is a card's
 * name and `partName(type)` a part's, both { zh, en }; `opens(type)` what a built part runs (above); `isRulePart(type)`
 * whether a card is a rule part; `failing`: the test wants the tactic to fail, so a tactic failing is no failed step.
 */
export function machineSteps(traced, circuit, level, { name, partName, opens, isRulePart, failing = false }) {
  const boardAt = boards(circuit, level, opens)
  // How many rounds (or search steps) each frame has opened so far, by its board and id.
  const rounds = new Map()
  // The round of the nearest repeat frame or search around a card, if it is in one.
  const roundAround = (node, board, key) => {
    for (let at = node.in; at;) {
      const frame = board.byId.get(at.split('/')[0])
      if (!frame) return null
      const k = rounds.get(`${key}|${frame.id}`)
      if (ROUND[frame.type] && k) return ROUND[frame.type](k)
      at = frame.in
    }
    return null
  }
  const steps = []
  // Parts that showed steps inside: their last step is what they give.
  const went = new Set()
  traced.trace.forEach((e, at) => {
    const path = e.path ?? []
    const board = boardAt(path)
    const node = board?.byId.get(e.id)
    if (!node) return
    const key = path.join('/')
    if (e.key === 'body' && ROUND[node.type]) rounds.set(`${key}|${e.id}`, e.round ?? (rounds.get(`${key}|${e.id}`) ?? 0) + 1)
    // A rule part only makes a list of rules: no step of the machine.
    if (e.key !== null || e.quiet || node.type === 'in' || isRulePart(node.type)) return
    for (let k = 1; k <= path.length; k++) went.add(path.slice(0, k).join('/'))
    const n = name(node, board.level)
    const round = roundAround(node, board, key)
    const own = e.inner
      ? join(n, e.label ?? (e.round ? ROUND.repeat(e.round) : partName(e.sub)))
      : node.type === 'repeat' || went.has([...path, node.id].join('/')) ? join(n, T('得出', 'gives'))
      : round ? join(n, round) : n
    // The parts it is in, outermost first, each with the round of a frame it is in on its own board.
    const segment = (k) => {
      const outer = boardAt(path.slice(0, k))
      const part = outer.byId.get(path[k])
      const at = roundAround(part, outer, path.slice(0, k).join('/'))
      return at ? join(name(part, outer.level), at) : name(part, outer.level)
    }
    const label = path.reduceRight((inner, _, k) => join(segment(k), inner, '›'), own)
    const top = !path.length
    const failed = e.error === MISSING ? T(`「${n.zh}」还缺输入`, `“${n.en}” is missing an input`)
      : !top ? null
      : e.error ?? (e.value?.kind === 'state' && e.value.error && !node.in && !e.inner && !failing ? e.value.error : null)
    if (e.inner) went.add([...path, node.id].join('/'))
    steps.push({ ...e, path, at, node, label, failed })
  })
  return steps
}

// What one board shows from trace entries `from`..`upTo` on it: its values and errors.
function viewOn(trace, path, from, upTo) {
  const values = new Map()
  const errors = new Map()
  for (let k = from; k <= upTo; k++) {
    const e = trace[k]
    if (!samePath(e.path, path)) continue
    if (e.error) errors.set(e.id, e.error)
    else values.set(sourceOf(e.id, e.key), e.value)
  }
  return { values, errors }
}

/** The level's board as it stood after step `k` of a traced test (−1: before any card ran; past the end: the whole run). */
export function machineViewAt(traced, steps, k) {
  if (k >= steps.length) return traced.run
  const upTo = k < 0 ? (steps[0]?.at ?? traced.trace.length) - 1 : steps[k].at
  return viewOn(traced.trace, [], 0, upTo)
}

/**
 * The built part step `k` is inside, opened: null on the level's own board; else { path: [{ node, level }] (the parts
 * it is in, outermost first), circuit, level (the one that built it), view (this run of the part so far), step (the
 * card on it computing) }.
 */
export function insideAt(traced, steps, k, circuit, level, opens) {
  const step = steps[k]
  if (!step?.path.length) return null
  const boardAt = boards(circuit, level, opens)
  const { trace } = traced
  // This run of the part: the entries just before the step that are inside it.
  let from = step.at
  while (from > 0 && within(trace[from - 1].path, step.path)) from -= 1
  const board = boardAt(step.path)
  return {
    path: step.path.map((id, i) => ({ node: boardAt(step.path.slice(0, i)).byId.get(id), level: boardAt(step.path.slice(0, i)).level })),
    circuit: board.circuit,
    level: board.level,
    view: viewOn(trace, step.path, from, step.at),
    step: step.id,
  }
}
