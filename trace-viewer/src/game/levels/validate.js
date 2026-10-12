/* global process */
// node src/game/levels/validate.js — every reference solution must pass its level, every naive one must fail.
import { runLevel } from '../engine/graph.js'
import { LEVELS } from './index.js'

let problems = 0
for (const level of LEVELS) {
  if (level.kind !== 'graph') {
    // Boards and probes may export verify(): '' when the level is winnable and its lesson holds.
    const problem = level.verify ? level.verify() : ''
    console.log(`${level.id} ${level.title}: (${level.kind}${level.board ? ` ${level.board}` : ''}) ${level.verify ? (problem ? `FAIL ${problem}` : 'verified') : 'no verify()'}`)
    if (problem) problems += 1
    continue
  }
  const report = (graph) => {
    const run = runLevel(level, graph)
    const detail = run.results.map((r, i) => `${level.tests[i].label}:${r.checks.map((c) => `${c.pass ? '✓' : '✗'}${c.wrong}/${Number.isFinite(c.worst) ? c.worst.toFixed(3) : '∞'}`).join(',')}`).join('  ')
    return { run, detail }
  }
  const good = report(level.solution)
  const line = [`${level.id} ${level.title}: solution ${good.run.pass ? 'PASS' : 'FAIL'} [n=${good.run.score.nodes} c=${good.run.score.cost}${good.run.constraint ? ` ${good.run.constraint}` : ''}]  ${good.detail}`]
  if (!good.run.pass) problems += 1
  for (const [name, graph] of [['naive', level.naive], ...(level.alsoFails ?? []).map((g, i) => [`fail${i}`, g])]) {
    if (!graph) continue
    const bad = report(graph)
    line.push(`    ${name} ${bad.run.pass ? 'PASSES (bad)' : 'fails'}${bad.run.constraint ? ` (${bad.run.constraint})` : ''}  ${bad.detail}`)
    if (bad.run.pass) problems += 1
  }
  console.log(line.join('\n'))
}
console.log(problems ? `\n${problems} problem(s)` : '\nall levels ok')
process.exit(problems ? 1 : 0)
