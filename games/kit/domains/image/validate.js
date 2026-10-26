// The image domain's checks for `npm run check` (../../engine/check.js): every level has an intro whose figures
// exist, every bench proves its lesson (verify()), and every circuit level keeps hidden tests, cannot be met by a
// constant, passes with its reference circuit and fails with its naive ones (every task of a level, too). The parts'
// own text has English too.
import { existsSync, readdirSync } from 'node:fs'
import { keyOf } from '../../shell/i18n.js'
import { untranslated } from '../../engine/text.js'
import { runLevel } from './engine/graph.js'
import { NODE_TYPES } from './engine/nodes.js'
import { introProblems } from './intros.js'

// The figures an intro may show: every folder of the notes' figures with a figure.js, under the id its registry
// gives it.
const FIGURE_IDS = { conv: 'conv-press', stereo: 'stereo-rangefinder', ransac: 'ransac-pegboard' }
const figuresDir = new URL('../../../../trace-viewer/src/figures/', import.meta.url)
const FIGURES = readdirSync(figuresDir).filter((name) => existsSync(new URL(`${name}/figure.js`, figuresDir))).map((name) => FIGURE_IDS[name] ?? name)

/** spec: { levels, intros }. Returns [{ text, fail? }]. */
export function validate({ levels, intros }) {
  const out = []
  const fail = (text) => out.push({ text, fail: true })
  const say = (text) => out.push({ text })

  const parts = Object.fromEntries(Object.entries(NODE_TYPES).map(([type, spec]) => [type, { label: spec.label, description: spec.description, params: spec.params }]))
  for (const problem of untranslated(parts, 'parts')) fail(`text ${problem}`)

  for (const level of levels) for (const problem of introProblems(intros[level.id], level, FIGURES)) fail(`${level.id}: 引入：${problem}`)

  // A level of several tasks is checked task by task, each as a level of its own (`1-11/1`).
  const played = levels.flatMap((level) => (level.tasks ? level.tasks.map((task, k) => ({ ...task, id: `${level.id}/${k + 1}` })) : [level]))
  for (const level of played) {
    if (level.kind !== 'graph') {
      // Boards and probes may export verify(): '' when the level is winnable and its lesson holds.
      const problem = level.verify ? level.verify() : ''
      const line = `${level.id} ${keyOf(level.title)}: (${level.kind}${level.board ? ` ${level.board}` : ''}) ${level.verify ? (problem ? problem : 'verified') : 'no verify()'}`
      if (problem) fail(line)
      else say(line)
      continue
    }
    const report = (graph) => {
      const run = runLevel(level, graph)
      const detail = run.results.map((r, i) => `${keyOf(level.tests[i].label)}:${r.checks.map((c) => `${c.pass ? '✓' : '✗'}${c.wrong}/${Number.isFinite(c.worst) ? c.worst.toFixed(3) : '∞'}`).join(',')}`).join('  ')
      return { run, detail }
    }
    // An output that expects the same flat image in every test can be met by a constant, whatever the circuit.
    for (const name of Object.keys(level.tests[0]?.expected ?? {})) {
      const first = level.tests[0].expected[name]?.data?.[0]
      if (level.tests.every((t) => t.expected[name]?.data?.every((v) => Math.abs(v - first) < 1e-9))) fail(`${level.id}: every test expects the same flat ${name}, so a constant passes`)
    }
    // Every circuit level keeps tests back: a run must pass them too, and they are shown only once it is solved.
    if (!level.hidden?.length) fail(`${level.id}: 没有隐藏测试`)
    for (const t of level.hidden ?? []) if (level.tests.some((v) => keyOf(v.label) === keyOf(t.label))) fail(`${level.id}: 隐藏测试「${keyOf(t.label)}」和可见测试重名`)
    if (level.hidden?.length) {
      const hiddenRun = runLevel({ ...level, tests: level.hidden }, level.solution)
      const detail = hiddenRun.results.map((r, i) => `${keyOf(level.hidden[i].label)}:${r.checks.map((c) => `${c.pass ? '✓' : '✗'}${c.wrong}`).join(',')}`).join('  ')
      const line = `${level.id} hidden: solution ${hiddenRun.results.every((r) => r.pass) ? 'PASS' : 'FAIL'}  ${detail}`
      if (hiddenRun.results.every((r) => r.pass)) say(line)
      else fail(line)
    }
    const good = report(level.solution)
    const line = `${level.id} ${keyOf(level.title)}: solution ${good.run.pass ? 'PASS' : 'FAIL'} [n=${good.run.score.nodes} c=${good.run.score.cost}${good.run.constraint ? ` ${keyOf(good.run.constraint)}` : ''}]  ${good.detail}`
    if (good.run.pass) say(line)
    else fail(line)
    for (const [name, graph] of [['naive', level.naive], ...(level.alsoFails ?? []).map((g, i) => [`fail${i}`, g])]) {
      if (!graph) continue
      const bad = report(graph)
      const text = `  ${name} ${bad.run.pass ? 'PASSES (bad)' : 'fails'}${bad.run.constraint ? ` (${keyOf(bad.run.constraint)})` : ''}  ${bad.detail}`
      if (bad.run.pass) fail(text)
      else say(text)
    }
  }
  return out
}
