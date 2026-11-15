import { test } from 'node:test'
import assert from 'node:assert/strict'
import { circuitWorkStamp, lookupBoard, packedBoards } from './packed-boards.js'

test('nested packed boards and edit destinations resolve against their own parent task', () => {
  const inner = { level: 'inside', circuit: { nodes: [{ id: 'again', type: 'shared', params: { form: 'second' } }] } }
  const correct = { level: 'correct', circuit: { nodes: [] } }
  const outerVersion = { level: 'outerVersion', circuit: { nodes: [] } }
  let resolutions = 0
  const task = (pieces) => ({
    BUILT: pieces,
    builtBy: (type, params) => pieces[type]?.opens(params).level,
  })
  const tasks = {
    top: task({ shared: { opens: () => outerVersion }, main: { opens: () => inner } }),
    inside: task({ shared: { opens: ({ form }) => { assert.equal(form, 'second'); resolutions++; return correct } } }),
    correct: task({}),
    outerVersion: task({}),
  }
  const course = { BUILT: tasks.top.BUILT, forTask: (level) => tasks[level] }
  const packed = packedBoards(course, (board, view) => ({ ...board, view }))
  const top = { level: 'top', circuit: { nodes: [{ id: 'first', type: 'main' }] } }
  const at = lookupBoard(top, packed.open)
  assert.equal(packed.root('main').level, 'inside')
  assert.equal(at(['first', 'missing']), null)
  const opened = at(['first', 'again'])
  assert.equal(opened.level, 'correct')
  assert.equal(opened.view, tasks.correct)
  assert.strictEqual(at(['first', 'again']), opened)
  assert.equal(resolutions, 1)
  assert.equal(packed.builder(inner.circuit.nodes[0], at(['first'])), 'correct')
})

test('a packed run changes only when its selected dependency work changes', () => {
  const work = (taskId, nodes) => ({ level: { taskId }, circuit: { nodes, wires: [] } })
  const top = work('outer', [{ id: 'a', type: 'stage' }])
  const stage = work('middle', [{ id: 'a', type: 'part', params: { form: 'second' } }])
  const leaf = (value) => work('chosen', [{ id: 'number', type: 'const', params: { value } }])
  const stamp = (choices) => circuitWorkStamp(top, (node, at) => at === top ? stage : at === stage ? choices[node.params.form] : undefined)
  const first = leaf(1)
  const second = leaf(2)
  assert.equal(stamp({ first, second }), stamp({ first: leaf(9), second }))
  assert.notEqual(stamp({ first, second }), stamp({ first, second: leaf(3) }))
})

test('a run follows domain references transitively, including references inside packed work', () => {
  const board = (type, params) => ({ nodes: [{ id: 'a', type, params }], wires: [] })
  const outer = { level: { taskId: 'outer' }, circuit: board('part') }
  const packed = { level: { taskId: 'builder' }, circuit: board('lemma') }
  const lemma = { task: { taskId: 'proof' }, key: 'proof', work: board('earlierLemma') }
  const stamp = (value) => circuitWorkStamp(outer, (node) => node.type === 'part' ? packed : null, (task) => {
    if (task === packed.level) return [lemma]
    if (task === lemma.task) return [{ key: 'earlierProof', task: { taskId: 'earlierProof' }, work: board('rule', { value }) }]
    return []
  })
  assert.notEqual(stamp(1), stamp(2))
})
