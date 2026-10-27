// Running a board in 《软件工厂》: the machine runs it once a turn (games/factory/DESIGN.md 3.1). A turn binds the
// board's fixed cards (the issue, and in a loop the history so far), evaluates it, lands a write that reaches the
// repository, and keeps what reaches the output for the next turn's history, after the actions the model gave this
// turn (the machine keeps those itself). A done action or a true flag reaching stop ends the run; so does running out
// of turns. A level of one call (`once`) is one turn with no history.
//
// level.machine   { mode: 'once' | 'loop', window, turns }      the machine the level is played on
// test            { repo, issue, code? }                          a repository, an issue, the code card's file (1-2)
// runEpisode(level, circuit, test) → { turns: [turn], state, report, stopped, tokens, calls }
//   turn  { values, errors, calls: [{ id, action, seen, dropped, tokens }], wrote, kept, stop, state }
import { evaluate } from '../../engine/circuit.js'
import { PARTS } from './parts.js'
import { actEntry, applyWrite, fileEntry, freshState, issueEntry, runTests } from './world.js'

const nodeOf = (circuit, type) => circuit.nodes.find((n) => n.type === type)

export function runEpisode(level, circuit, test) {
  const { mode, window, turns: most } = level.machine
  let state = freshState()
  let history = []
  const turns = []
  let stopped = false
  for (let k = 0; k < (mode === 'once' ? 1 : most) && !stopped; k++) {
    const calls = []
    const bind = { issue: [issueEntry(test.issue)], history, ...(test.code ? { code: [fileEntry(test.repo, test.code)] } : {}) }
    const ctx = { bind, repo: test.repo, issue: test.issue, state, mode, window, calls }
    const { values, errors } = evaluate(circuit, { parts: PARTS, ctx })
    const sinkValue = (type) => { const n = nodeOf(circuit, type); return n ? values.get(n.id) : undefined }
    const wrote = sinkValue('repo')
    state = applyWrite(state, wrote)
    const kept = mode === 'loop' ? sinkValue('out') ?? [] : []
    const halt = sinkValue('stop')
    stopped = halt === true || halt?.type === 'done'
    history = [...history, ...calls.map((c) => actEntry(c.action)), ...kept]
    turns.push({ values, errors, calls, wrote, kept, stop: stopped, state })
  }
  const calls = turns.flatMap((t) => t.calls)
  return { turns, state, report: runTests(test.issue, state), stopped: mode === 'once' || stopped, tokens: calls.reduce((n, c) => n + c.tokens, 0), calls: calls.length }
}

const T = (zh, en) => ({ zh, en })

/**
 * Why a run fails its test, or null: the tests must pass, a loop must have stopped by itself, and the level's budgets
 * (tokens, turns) hold.
 */
export function verdict(level, run) {
  if (!run.report.green) return T('测试没有通过', 'The tests fail')
  if (!run.stopped) return T(`跑满 ${level.machine.turns} 轮还没停下`, `Still going after ${level.machine.turns} turns`)
  if (level.budget?.tokens && run.tokens > level.budget.tokens) return T(`用了 ${run.tokens} 个 token，这一关最多 ${level.budget.tokens} 个`, `It took ${run.tokens} tokens; this level allows ${level.budget.tokens}`)
  if (level.budget?.turns && run.turns.length > level.budget.turns) return T(`用了 ${run.turns.length} 轮，这一关最多 ${level.budget.turns} 轮`, `It took ${run.turns.length} turns; this level allows ${level.budget.turns}`)
  return null
}

/** Every test of a level run on a board: { runs, pass }. */
export function runLevel(level, circuit) {
  const runs = level.tests.map((test) => {
    const run = runEpisode(level, circuit, test)
    return { ...run, fail: verdict(level, run) }
  })
  return { runs, pass: runs.every((r) => !r.fail) }
}
