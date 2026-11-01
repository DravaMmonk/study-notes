// How a run of a table board is judged, test by test, and what the fail dialog says (ui/modes/Circuit.jsx, and a blind
// session: ../play.js): the answer against the expected one, and on a level whose reference board is known the first
// step (or, scanning in rounds, the first settled cell) where the board's writes differ from it.

import { WORLDS } from './worlds.js';
import { MAX_ROUNDS, runCircuit } from './run.js';
import { signal } from './format.js';
import { explain } from '../items/explains.js';
import { fill } from '../items/labels.js';
import { lazy, tr } from '../lang.js';

/** A test's label: the level's own template, else its world's. */
export const testLabel = (L, V, t) => (L.testLabel ? fill(L.testLabel, t) : V.label(t));

/** First step whose outputs differ from the reference board's; scanning in rounds, the first cell that settled wrong. */
function firstMismatch(L, s, t, res, o) {
  if (!s.solution || L.noTrace) return null
  const ref = runCircuit(WORLDS[s.world], t, s.solution, o)
  if (s.rounds) {
    const key = [...ref.table.keys()].find((x) => res.table.get(x) !== ref.table.get(x))
    if (key === undefined) return null
    const q = res.steps.map((x) => x.at.includes(key)).lastIndexOf(true)
    return { q: q < 0 ? res.steps.length - 1 : q, key, want: ref.table.get(key), got: res.table.get(key) }
  }
  for (let q = 0; q < res.steps.length; q++) {
    const z = res.steps[q].writes.findIndex(([, v], j) => ref.steps[q].writes[j][1] !== v)
    if (z >= 0) return { q, z, want: ref.steps[q].writes[z][1], got: res.steps[q].writes[z][1] }
  }
  return null
}

/** Test k of stage `s` run on board `b`: its result, the first step gone wrong (or cell settled wrong), the view of its end. */
export function judge(L, s, b, k, o) {
  const t = s.tests[k], res = runCircuit(WORLDS[s.world], t, b, o), want = s.expected[k]
  // A level that grades every cell (checkAll) compares the whole table, not just the answer.
  const mm = res.error || s.onFail || (!s.checkAll && res.value === want) ? null : firstMismatch(L, s, t, res, o)
  const ok = !res.error && res.value === want && !mm
  const stop = mm && mm.key === undefined ? mm.q + 1 : res.steps.length
  return { t, res, mm, ok, stop, view: { res, k: 0, pass: ok, end: false, halt: Boolean(res.error && !res.error.diverge) || (Boolean(mm) && mm.key === undefined), focus: null, badKey: mm ? mm.key : undefined } }
}

/**
 * Why test k of a stage failed, as the fail dialog says it: { head, body }, each worded again in the current language
 * when shown. ctx: { L, V (the stage's world), opt (the stage's settings), label(test), expected }.
 */
export function whyFailed({ L, V, opt, label, expected }, k, test, res, mm) {
  const failed = lazy(() => tr(`测试 ${k + 1} 没通过`, `Test ${k + 1} failed`))
  if (res.error && res.error.diverge) {
    return {
      head: lazy(() => tr('表一直停不下来', 'The table never settles')),
      body: lazy(() => tr(`测试 ${k + 1} 中，机器扫了 ${MAX_ROUNDS} 轮，表还在变。照这块电路板，有些格子会越算越大（或越算越小），永远不会稳定下来。`,
        `In test ${k + 1}, the machine scanned ${MAX_ROUNDS} rounds and the table was still changing. With this circuit board, some cells keep growing (or shrinking) and will never settle down.`)),
    }
  }
  if (res.error) {
    return {
      head: lazy(() => tr('读到了空格子', 'Read an empty cell')),
      body: lazy(() => tr(`测试 ${k + 1} 中，机器算到<b>${V.where(res.error.cell)}</b>时，电路要读<b>${V.name(res.error.key)}</b>，可那里还空着。机器是按「${V.orderText(opt)}」的顺序算的，读之前，那个格子必须已经算好。`,
        `In test ${k + 1}, when the machine reached <b>${V.where(res.error.cell)}</b>, the circuit tried to read <b>${V.name(res.error.key)}</b>, but that cell was still empty. The machine works in the order “${V.orderText(opt)}”, so a cell must already be computed before anything reads it.`)),
    }
  }
  if (mm && mm.key !== undefined) {
    return {
      head: failed,
      body: lazy(() => tr(`${label(test)}：表稳定下来以后，<b>${V.name(mm.key)}</b>应该是 <b>${signal(mm.want)}</b>，你的电路板算出了 <b>${signal(mm.got)}</b>。棋盘上标红的就是这一格。`,
        `${label(test)}: once the table settles, <b>${V.name(mm.key)}</b> should be <b>${signal(mm.want)}</b>, but your circuit board computed <b>${signal(mm.got)}</b>. It is the cell marked in red on the board.`)),
    }
  }
  if (mm) {
    const at = res.steps[mm.q]
    return {
      head: failed,
      body: lazy(() => tr(`${label(test)}：机器在<b>${V.where(at.cell)}</b>出了错。「${V.outs[mm.z][1]}」应该是 <b>${signal(mm.want)}</b>，你的电路算出了 <b>${signal(mm.got)}</b>。棋盘停在了这一格；电路板上的小数字，是机器在这一格算出的值。`,
        `${label(test)}: the machine went wrong at <b>${V.where(at.cell)}</b>. “${V.outs[mm.z][1]}” should be <b>${signal(mm.want)}</b>, but your circuit computed <b>${signal(mm.got)}</b>. The board has stopped on this cell; the small numbers on the circuit board are the values the machine computed here.`)),
    }
  }
  const why = () => (L.explain ? explain(L.explain, test, res, opt) : '')
  return {
    head: failed,
    body: lazy(() => tr(`${label(test)}：答案应该是 <b>${signal(expected[k])}</b>，机器算出了 <b>${signal(res.value)}</b>。${why()}`, `${label(test)}: the answer should be <b>${signal(expected[k])}</b>, but the machine computed <b>${signal(res.value)}</b>. ${why()}`)),
  }
}
