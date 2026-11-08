import { test } from 'node:test'
import assert from 'node:assert/strict'
import { imageCourse } from './course.js'
import { outputImages } from './engine/graph.js'
import { image } from './engine/image.js'

const text = (s) => ({ zh: s, en: s })
const course = imageCourse({
  primitives: ['arith'],
  eras: [{ id: 0, foundation: ['sample'], chapter: { title: text('c'), lecture: text('l'), question: text('q') } }],
  levels: [{ id: 'sample', title: text('sample'), after: text('a'), intro: [{ t: text('i') }], tasks: [{ id: 'sample', kind: 'graph', brief: text('b'), scene: 'filter', setup: { target: 'same' }, tests: [{ label: text('t'), in: 'disk' }] }] }],
})
const kit = course.kit
const input = image(2, 1)
input.data.set([2, 4])
const run = (lines) => {
  const graph = kit.fromText(lines)
  const result = kit.evaluate(graph, { in: input })
  return { values: outputImages(graph, result.values).out?.data, errors: result.errors, graph }
}

test('arithmetic accepts an optional left or right constant and keeps wired inputs authoritative', () => {
  for (const [op, left, right] of [['add', [5, 7], [5, 7]], ['sub', [1, -1], [-1, 1]], ['mul', [6, 12], [6, 12]], ['div', [1.5, 0.75], [2 / 3, 4 / 3]]]) {
    for (const [side, port, expected] of [['a', 'b', left], ['b', 'a', right]]) {
      const { values, graph } = run([`n = arith[op=${op},constantSide=${side},constant=3]()`, `n.${port} <- in`, 'out <- n'])
      assert.ok(values)
      expected.forEach((value, i) => assert.ok(Math.abs(values[i] - value) < 1e-6))
      assert.deepEqual(kit.toText(kit.fromText(kit.toText(graph))), kit.toText(graph))
    }
  }
  const both = run(['n = arith[op=sub,constantSide=a,constant=3](in, in)', 'out <- n'])
  assert.deepEqual(Array.from(both.values), [0, 0])
})

test('arithmetic reports missing input when a needed operand has no wire or constant', () => {
  for (const lines of [
    ['n = arith[op=sub](in)', 'out <- n'],
    ['n = arith[op=sub,constantSide=a](in)', 'out <- n'],
    ['n = arith[op=sub,constantSide=b]()', 'out <- n'],
  ]) {
    const { values, errors } = run(lines)
    assert.equal(values, undefined)
    assert.equal(errors.get('n')?.en, 'Missing input')
  }
})
