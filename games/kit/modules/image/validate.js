// The image domain's checks for `npm run check` (../../engine/checks.js), over a game's spec (domain.js): every level
// checks its authored intro figures, every bench proves its lesson (its item's verify, items/benches.js), and every
// circuit task keeps hidden tests, cannot be met by a constant, passes with its reference circuit and fails with its
// naive ones; a task a built piece runs is passed by that piece alone, wired to the task's inputs. The parts'
// own text has English too.
import { existsSync, readdirSync } from 'node:fs'
import { checkWorks } from '../../engine/authoring.js'
import { keyOf } from '../../shell/i18n.js'
import { withHidden } from '../../engine/tests.js'
import { startBoard } from './engine/board.js'
import { introProblems } from './intros.js'

// The figures an intro may show: every folder of the notes' figures with a figure.js, under the id its registry
// gives it.
const FIGURE_IDS = { conv: 'conv-press', stereo: 'stereo-rangefinder', ransac: 'ransac-pegboard' }
const figuresDir = new URL('../../../../trace-viewer/src/figures/', import.meta.url)
const FIGURES = readdirSync(figuresDir).filter((name) => existsSync(new URL(`${name}/figure.js`, figuresDir))).map((name) => FIGURE_IDS[name] ?? name)

/** spec: { levels, intros, kit, course, packageTarget?, publishedBy } (kit: the course's, engine/kit.js; publishedBy(key) the built
 *  pieces a task runs inside). Returns [{ text, fail?, level? }]: a line
 *  about one level names it. Notes editions and independent package levels may omit introductions. */
export function validate({ levels, intros, kit, course, publishedBy, packageTarget = false, memo = (_id, _name, f) => f() }) {
  const { runLevel } = kit
  const out = []
  const failAt = (text, level) => out.push({ text, fail: true, ...(level ? { level } : {}) })

  for (const level of levels) {
    if ((course.notes || packageTarget) && !intros[level.id]?.length) continue
    for (const problem of introProblems(intros[level.id], level, FIGURES, kit.types)) failAt(`${level.id}: 引言：${problem}`, level.id)
  }

  // Every task is checked as a level of its own, a task of a level of several named by its place (`1-11/1`); `home` is
  // its level.
  const played = levels.flatMap((level) => level.tasks.map((task, k) => ({ ...task, id: level.tasks.length > 1 ? `${level.id}/${k + 1}` : level.id, home: level.id })))
  // A task's checks, run or read back while nothing they read has changed (memo: ../../engine/check-cache.js).
  for (const level of played) out.push(...memo(level.home, `task ${level.id}`, () => {
    const out = []
    const fail = (text) => out.push({ text, fail: true, level: level.home })
    const say = (text) => out.push({ text, level: level.home })
    if (level.kind !== "image:graph") {
      const problem = level.verify()
      const line = `${level.id} ${keyOf(level.title)}: (${level.kind}${level.board ? ` ${level.board}` : ''}) ${problem || 'verified'}`
      if (problem) fail(line)
      else say(line)
      return out
    }
    const all = withHidden(level)
    const inspect = (graph) => runLevel(all, graph)
    const visible = (run) => run.runs.slice(0, level.tests.length)
    const describe = (run) => visible(run).map((r, i) => `${keyOf(level.tests[i].label)}:${r.checks.map((c) => `${c.pass ? '✓' : '✗'}${c.wrong}/${Number.isFinite(c.worst) ? c.worst.toFixed(3) : '∞'}`).join(',')}`).join('  ')
    // An output that expects the same flat image in every test can be met by a constant, whatever the circuit.
    for (const name of Object.keys(level.tests[0]?.expected ?? {})) {
      const first = level.tests[0].expected[name]?.data?.[0]
      if (level.tests.every((t) => t.expected[name]?.data?.every((v) => Math.abs(v - first) < 1e-9))) fail(`${level.id}: every test expects the same flat ${name}, so a constant passes`)
    }
    // Every circuit level keeps tests back: a run must pass them too, and they are shown only once it is solved.
    const hidden = level.hidden ?? []
    if (!hidden.length) fail(`${level.id}: 没有隐藏测试`)
    for (const t of hidden) if (level.tests.some((v) => keyOf(v.label) === keyOf(t.label))) fail(`${level.id}: 隐藏测试「${keyOf(t.label)}」和可见测试重名`)
    const { reference: good, naive } = checkWorks(inspect, { reference: level.solution, naive: level.naive })
    if (hidden.length) {
      const hiddenRuns = good.runs.slice(level.tests.length)
      const pass = hiddenRuns.every((r) => r.pass)
      const detail = hiddenRuns.map((r, i) => `${keyOf(hidden[i].label)}:${r.checks.map((c) => `${c.pass ? '✓' : '✗'}${c.wrong}`).join(',')}`).join('  ')
      const line = `${level.id} hidden: solution ${pass ? 'PASS' : 'FAIL'}  ${detail}`
      if (pass) say(line)
      else fail(line)
    }
    const visiblePass = visible(good).every((run) => run.pass) && !good.constraint
    const line = `${level.id} ${keyOf(level.title)}: solution ${visiblePass ? 'PASS' : 'FAIL'} [n=${good.score.nodes} c=${good.score.cost}${good.constraint ? ` ${keyOf(good.constraint)}` : ''}]  ${describe(good)}`
    if (visiblePass) say(line)
    else fail(line)
    const examples = (level.alsoFails ?? []).map((graph, i) => [`fail${i}`, checkWorks(inspect, { naive: graph }).naive])
    for (const [name, bad] of [['naive', naive], ...examples]) {
      if (!bad) continue
      const detail = bad.constraint ? ` (${keyOf(bad.constraint)})` : bad.fail?.check >= level.tests.length ? ' (hidden test)' : ''
      const text = `  ${name} ${bad.ok ? 'fails' : 'PASSES (bad)'}${detail}  ${describe(bad)}`
      if (!bad.ok) fail(text)
      else say(text)
    }
    // A built piece, alone between its task's inputs and its output, passes that task's tests.
    for (const type of publishedBy(level.key)) {
      const board = startBoard(level)
      board.nodes.push({ id: 'part', type, x: 300, y: 60, params: {} })
      board.wires.push(...level.inputs.map((name) => ({ from: name, to: 'part', port: name })), { from: 'part', to: level.outputs[0], port: 'in' })
      const run = runLevel({ ...all, constraint: undefined }, board)
      if (run.pass) say(`  its part alone passes`)
      else fail(`${level.id}: its packed part, wired to the level's inputs, fails ${run.runs.filter((r) => !r.pass).length} test(s)`)
    }
    return out
  }))
  return out
}
