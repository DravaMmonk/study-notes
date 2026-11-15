import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lookupBoard, packedBoards } from './packed-boards.js'

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
