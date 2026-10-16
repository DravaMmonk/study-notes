/* global process */
// node src/game/levels/validate.js — every reference solution must pass its level, every naive one must fail.
import { existsSync, readdirSync } from 'node:fs'
import { runLevel } from '../engine/graph.js'
import { NODE_TYPES } from '../engine/nodes.js'
import { isPair, keyOf } from '../../../../games/kit/shell/i18n.js'
import { CHAPTERS, LEVELS } from './index.js'
import { INTROS, introProblems } from './intros/index.js'

// The figures an intro may show: every folder of src/figures with a figure.js, under the id the registry gives it.
const FIGURE_IDS = { conv: 'conv-press', stereo: 'stereo-rangefinder', ransac: 'ransac-pegboard' }
const figuresDir = new URL('../../figures/', import.meta.url)
const FIGURES = readdirSync(figuresDir).filter((name) => existsSync(new URL(`${name}/figure.js`, figuresDir))).map((name) => FIGURE_IDS[name] ?? name)

let problems = 0

// Every piece of text a player can read is a { zh, en } pair with a real English side. A Chinese string left
// outside a pair has no English; reference graphs (solution, naive, alsoFails) hold no text and are skipped.
const HAN = /\p{Script=Han}/u
const SKIP = new Set(['solution', 'naive', 'alsoFails'])
function untranslated(value, path, out = [], visited = new Set()) {
  if (typeof value === 'string') {
    if (HAN.test(value)) out.push(`${path} has no English: ${value.slice(0, 40)}`)
    return out
  }
  if (!value || typeof value !== 'object' || visited.has(value) || ArrayBuffer.isView(value)) return out
  visited.add(value)
  if (isPair(value)) {
    if (typeof value.en !== 'string' || !value.en.trim()) out.push(`${path} has an empty English side: ${value.zh.slice(0, 40)}`)
    else if (HAN.test(value.en)) out.push(`${path} has Chinese in its English side: ${value.en.slice(0, 40)}`)
    return out
  }
  for (const [key, inner] of Object.entries(value)) if (!SKIP.has(key)) untranslated(inner, `${path}.${key}`, out, visited)
  return out
}
const textProblems = [
  ...untranslated(CHAPTERS, 'CHAPTERS'),
  ...untranslated(Object.fromEntries(Object.entries(NODE_TYPES).map(([type, spec]) => [type, { label: spec.label, description: spec.description, params: spec.params }])), 'NODE_TYPES'),
  ...LEVELS.flatMap((level) => untranslated(level, level.id)),
  ...untranslated(INTROS, 'INTROS'),
]
for (const problem of textProblems) console.log(`FAIL text ${problem}`)
problems += textProblems.length

const seen = new Set()
for (const level of LEVELS) {
  if (seen.has(level.id)) {
    console.log(`${level.id}: FAIL duplicate id`)
    problems += 1
  }
  seen.add(level.id)
  for (const id of level.requires) if (!LEVELS.some((l) => l.id === id)) {
    console.log(`${level.id}: FAIL requires missing level ${id}`)
    problems += 1
  }
}
for (const level of LEVELS) {
  for (const problem of introProblems(level, FIGURES)) {
    console.log(`${level.id}: FAIL 引入：${problem}`)
    problems += 1
  }
}
for (const level of LEVELS) {
  if (level.kind !== 'graph') {
    // Boards and probes may export verify(): '' when the level is winnable and its lesson holds.
    const problem = level.verify ? level.verify() : ''
    console.log(`${level.id} ${keyOf(level.title)}: (${level.kind}${level.board ? ` ${level.board}` : ''}) ${level.verify ? (problem ? `FAIL ${problem}` : 'verified') : 'no verify()'}`)
    if (problem) problems += 1
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
    if (level.tests.every((t) => t.expected[name]?.data?.every((v) => Math.abs(v - first) < 1e-9))) {
      console.log(`${level.id}: FAIL every test expects the same flat ${name}, so a constant passes`)
      problems += 1
    }
  }
  // Every circuit level keeps tests back: a run must pass them too, and they are shown only once it is solved.
  if (!level.hidden?.length) {
    console.log(`${level.id}: FAIL 没有隐藏测试`)
    problems += 1
  }
  for (const t of level.hidden ?? []) {
    if (level.tests.some((v) => keyOf(v.label) === keyOf(t.label))) {
      console.log(`${level.id}: FAIL 隐藏测试「${keyOf(t.label)}」和可见测试重名`)
      problems += 1
    }
  }
  if (level.hidden?.length) {
    const hiddenRun = runLevel({ ...level, tests: level.hidden }, level.solution)
    const detail = hiddenRun.results.map((r, i) => `${keyOf(level.hidden[i].label)}:${r.checks.map((c) => `${c.pass ? '✓' : '✗'}${c.wrong}`).join(',')}`).join('  ')
    console.log(`${level.id} hidden: solution ${hiddenRun.results.every((r) => r.pass) ? 'PASS' : 'FAIL'}  ${detail}`)
    if (!hiddenRun.results.every((r) => r.pass)) problems += 1
  }
  const good = report(level.solution)
  const line = [`${level.id} ${keyOf(level.title)}: solution ${good.run.pass ? 'PASS' : 'FAIL'} [n=${good.run.score.nodes} c=${good.run.score.cost}${good.run.constraint ? ` ${keyOf(good.run.constraint)}` : ''}]  ${good.detail}`]
  if (!good.run.pass) problems += 1
  for (const [name, graph] of [['naive', level.naive], ...(level.alsoFails ?? []).map((g, i) => [`fail${i}`, g])]) {
    if (!graph) continue
    const bad = report(graph)
    line.push(`    ${name} ${bad.run.pass ? 'PASSES (bad)' : 'fails'}${bad.run.constraint ? ` (${keyOf(bad.run.constraint)})` : ''}  ${bad.detail}`)
    if (bad.run.pass) problems += 1
  }
  console.log(line.join('\n'))
}
console.log(problems ? `\n${problems} problem(s)` : '\nall levels ok')
process.exit(problems ? 1 : 0)
