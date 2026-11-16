import assert from 'node:assert/strict'
import { test } from 'node:test'
import { reportRuns } from '../../engine/test-run.js'
import { validate } from './validate.js'

test('the image author check accepts a naive board caught only by a hidden case', () => {
  const expected = { out: { data: [0, 1] } }
  const task = {
    id: 'puzzle', kind: 'image:graph', title: 'Puzzle',
    tests: [{ label: 'shown', expected }], hidden: [{ label: 'hidden', expected }],
    solution: 'reference', naive: 'naive',
  }
  const inspected = []
  const runLevel = ({ tests }, board) => {
    inspected.push({ board, cases: tests.map((entry) => entry.label) })
    const runs = tests.map((entry) => {
      const pass = board !== 'naive' || !entry.hidden
      return { pass, fail: pass ? null : { why: 'Wrong image' }, checks: [{ pass, wrong: pass ? 0 : 1, worst: pass ? 0 : 1 }] }
    })
    return reportRuns(runs, { score: { nodes: 1, cost: 1 } })
  }
  const lines = validate({ levels: [{ id: task.id, tasks: [task] }], intros: {}, kit: { runLevel }, course: { notes: true }, publishedBy: () => [] })
  assert.equal(lines.some((line) => line.fail), false)
  assert.match(lines.at(-1).text, /naive fails \(hidden test\)/)
  assert.deepEqual(inspected, [
    { board: 'reference', cases: ['shown', 'hidden'] },
    { board: 'naive', cases: ['shown', 'hidden'] },
  ])
})

test('package previews allow omitted introductions but still check authored pages and tasks', () => {
  const task = { id: 'sample', kind: 'board', title: 'Sample', board: 'sample', verify: () => '' }
  const spec = { levels: [{ id: task.id, tasks: [task] }], intros: {}, kit: {}, course: {}, publishedBy: () => [] }
  assert.ok(validate(spec).some((line) => line.fail && line.text.includes('没有引言')))
  const preview = { ...spec, packagePreview: { id: 'sample' } }
  assert.ok(validate(preview).every((line) => !line.fail))
  assert.ok(validate({ ...preview, intros: { sample: [{ t: '' }] } }).some((line) => line.fail && line.text.includes('没有文字')))
  assert.ok(validate({ ...preview, levels: [{ id: task.id, tasks: [{ ...task, verify: () => 'Broken task' }] }] }).some((line) => line.fail && line.text.includes('Broken task')))
})
