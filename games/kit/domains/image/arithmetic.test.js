import { test } from 'node:test'
import assert from 'node:assert/strict'
import { imageCourse } from './course.js'
import { outputImages } from './engine/graph.js'
import { image } from './engine/image.js'
import { pruneUnavailableWires, setParam } from './ui/parameters.js'

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

test('arithmetic uses a constant on the selected side and exposes only the other input', () => {
  for (const [op, left, right] of [['add', [5, 7], [5, 7]], ['sub', [1, -1], [-1, 1]], ['mul', [6, 12], [6, 12]], ['div', [1.5, 0.75], [2 / 3, 4 / 3]]]) {
    for (const [side, port, expected] of [['a', 'b', left], ['b', 'a', right]]) {
      const { values, graph } = run([`n = arith[op=${op},constantSide=${side},constant=3]()`, `n.${port} <- in`, 'out <- n'])
      assert.ok(values)
      expected.forEach((value, i) => assert.ok(Math.abs(values[i] - value) < 1e-6))
      assert.deepEqual(kit.toText(kit.fromText(kit.toText(graph))), kit.toText(graph))
    }
  }
  assert.throws(() => kit.fromText(['n = arith[op=sub,constantSide=a,constant=3](in, in)', 'out <- n']))
})

test('arithmetic reports missing input when a needed operand has no wire or constant', () => {
  for (const lines of [
    ['n = arith[op=sub](in)', 'out <- n'],
    ['n = arith[op=sub,constantSide=a]()', 'out <- n'],
    ['n = arith[op=sub,constantSide=b]()', 'out <- n'],
  ]) {
    const { values, errors } = run(lines)
    assert.equal(values, undefined)
    assert.equal(errors.get('n')?.en, 'Missing input')
  }
})


test('switching constant sides removes only the occupied wire and restores ports when disabled', () => {
  const original = kit.fromText(['n = arith[op=sub](in, in)', 'out <- n'])
  const right = setParam(kit, original, 'n', 'constantSide', 'b')
  const node = right.nodes.find((n) => n.id === 'n')
  assert.deepEqual(kit.BOARD_PARTS.inputs(node), ['a'])
  assert.deepEqual(right.wires.filter((w) => w.to === 'n').map((w) => w.port), ['a'])
  assert.deepEqual(pruneUnavailableWires(kit, { ...right, wires: original.wires }).wires, right.wires)
  const left = setParam(kit, right, 'n', 'constantSide', 'a')
  assert.deepEqual(kit.BOARD_PARTS.inputs(left.nodes.find((n) => n.id === 'n')), ['b'])
  assert.equal(left.wires.filter((w) => w.to === 'n').length, 0)
  const off = setParam(kit, left, 'n', 'constantSide', 'none')
  assert.deepEqual(kit.BOARD_PARTS.inputs(off.nodes.find((n) => n.id === 'n')), ['a', 'b'])
})
