import { test } from 'node:test'
import assert from 'node:assert/strict'
import { baselineValue, differences, nameNormalizer, packBaseline, unpackBaseline } from './baseline-value.js'
import { taskReports } from './baseline-reports.js'

test('stable serialization keeps nonfinite values, sets, maps and ordered trace steps', () => {
  const a = baselineValue({ z: new Set(['b', 'a']), m: new Map([['b', undefined], ['a', NaN]]), trace: [2, 1], data: new Float32Array([0.5]), zero: -0 })
  const b = baselineValue({ zero: -0, data: new Float32Array([0.5]), trace: [2, 1], m: new Map([['a', NaN], ['b', undefined]]), z: new Set(['a', 'b']) })
  assert.equal(JSON.stringify(a), JSON.stringify(b))
  assert.deepEqual(a.m.$map[0][1], { $number: 'NaN' })
  assert.notDeepEqual(a.m.$map[0][1], null)
  assert.deepEqual(a.trace, [2, 1])
  assert.deepEqual(differences(a, b), [])
  assert.equal(differences(a, { ...b, trace: [1, 2] }).length, 2)
  const cyclic = {}; cyclic.self = cyclic
  assert.throws(() => baselineValue(cyclic), /cyclic/)
})
test('migration names normalize without erasing real differences or ambiguous identities', () => {
  const before = nameNormalizer(['old/lesson', 'table:world-river', 'old/task'])
  const after = nameNormalizer(['new/lesson', 'state:river', 'new/task'])
  const a = { 'old/lesson': { task: 'old/task', text: 'table:world-river: PASS', value: 2, formula: 'A/B' } }
  const b = { 'new/lesson': { task: 'new/task', text: 'state:river: PASS', value: 2, formula: 'A/B' } }
  assert.deepEqual(differences(before(a), after(b)), [])
  b['new/lesson'].value = 3
  assert.equal(differences(before(a), after(b))[0].path, '$/lesson/value')
  const ambiguous = nameNormalizer(['one/x', 'two/x'])
  assert.equal(ambiguous('one/x two/x'), 'one/x two/x')
  assert.equal(before('old/lesson-extra A/B'), 'old/lesson-extra A/B')
  assert.throws(() => before({ 'old/task': 1, task: 2 }), /collision/)
})
test('task observations retain passing/failed hand steps and hidden image traces', async () => {
  const hand = { id: 'tiny', taskId: 'hand', mode: 'table:fill', cells: [{ id: 's' }, { id: 'e' }], edges: [['s', 'e']], start: 's', end: 'e' }
  const [observed] = await taskReports({ levels: [{ id: 'tiny' }], table: { played: new Map([['tiny', [hand]]]) } })
  assert.equal(observed.report.reference.report.pass, true)
  assert.equal(observed.report.naive.report.pass, false)
  assert.equal(observed.report.reference.report.steps.length, 2)
  let tested
  const [image] = await taskReports({ levels: [{ id: 'tiny', tasks: [{ id: 'g', kind: 'image:graph', solution: 'yes', naive: 'no', tests: [{ n: 1 }], hidden: [{ n: 2 }] }] }], kit: { runLevel: (task, work, options) => { tested = task.tests; return { pass: work === 'yes', trace: options.traced ? ['step'] : [] } } } })
  assert.deepEqual(tested, [{ n: 1 }, { n: 2, hidden: true }])
  assert.deepEqual(image.report.reference.report.trace, ['step'])
  assert.equal(image.report.naive.report.pass, false)
})

test('disk encoding retains shared terms and comparison ignores object sharing', () => {
  const term = { op: 'atom', name: 'A' }
  const shared = { steps: Array.from({ length: 100 }, () => ({ term })) }
  const restored = unpackBaseline(JSON.parse(JSON.stringify(packBaseline(shared))))
  assert.equal(restored.steps[0].term, restored.steps[99].term)
  assert.deepEqual(differences(restored, structuredClone(JSON.parse(JSON.stringify(shared)))) , [])
  assert.deepEqual(differences(baselineValue(restored), baselineValue(shared)), [])
  assert.equal(JSON.stringify(packBaseline(shared)), JSON.stringify(packBaseline(shared)))
})

test('namespace normalization reorders unordered maps after relocation', () => {
  const old = nameNormalizer(['alpha/z', 'zeta/a'])
  const current = nameNormalizer(['lib/z', 'lib/a'])
  assert.deepEqual(differences(old(baselineValue(new Map([['alpha/z', 1], ['zeta/a', 2]]))), current(baselineValue(new Map([['lib/a', 2], ['lib/z', 1]])))), [])
})

test('the declared piece-to-part migration changes only naming in diagnostics and keys', () => {
  const normalize = nameNormalizer([])
  assert.deepEqual(normalize({ piece: 'x', parts: ['x'] }), { part: 'x', parts: ['x'] })
  assert.deepEqual(normalize({ kind: 'piece', path: 'pieces/x.json', key: '@pkg/piece.x.name', tag: 'tags/piece/x' }), normalize({ kind: 'circuit/part', path: 'parts/x.json', key: '@pkg/part.x.name', tag: 'tags/circuit/part/x' }))
  assert.equal(differences(normalize({ kind: 'piece', value: 1 }), normalize({ kind: 'circuit/part', value: 2 })).length, 1)
})
