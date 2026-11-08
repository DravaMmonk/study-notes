import { test } from 'node:test'
import assert from 'node:assert/strict'
import { imageKit } from './engine/kit.js'
import { NODE_TYPES } from './engine/nodes.js'
import { image } from './engine/image.js'

const kit = imageKit({ ...NODE_TYPES })
const io = { inputs: ['a', 'b', 'c'], outputs: ['x', 'y', 'z'] }
const graph = kit.fromText(['p = softmax(a, b, c)', 'x <- p.p1', 'y <- p.p2', 'z <- p.p3'], io)
const evaluate = (numbers) => {
  const inputs = Object.fromEntries(['a', 'b', 'c'].map((name, i) => [name, image(1, 1, numbers[i])]))
  const { values, errors } = kit.evaluate(graph, inputs)
  return { probabilities: ['x', 'y', 'z'].map((key) => values.get(key)?.data[0]), errors }
}

test('three Softmax outputs correspond to their input scores, including large values', () => {
  for (const scores of [[2, 0, -1], [1000, 998, 997], [-1000, -1002, -1003]]) {
    const { probabilities, errors } = evaluate(scores)
    assert.equal(errors.size, 0)
    assert.ok(Math.abs(probabilities.reduce((a, b) => a + b, 0) - 1) < 1e-6)
    assert.ok(Math.abs(probabilities[0] - 0.8437947) < 1e-6)
    assert.ok(Math.abs(probabilities[1] - 0.1141952) < 1e-6)
    assert.ok(Math.abs(probabilities[2] - 0.0420101) < 1e-6)
  }
  assert.deepEqual(kit.toText(kit.fromText(kit.toText(graph), io)), kit.toText(graph))
})

test('Softmax accepts two scores and gives zero at the unused third output', () => {
  const two = kit.fromText(['p = softmax(a, b)', 'x <- p.p1', 'y <- p.p2', 'z <- p.p3'], io)
  const { errors, values } = kit.evaluate(two, { a: image(1, 1, 1000), b: image(1, 1, 999) })
  assert.equal(errors.size, 0)
  assert.ok(Math.abs(values.get('x').data[0] - 1 / (1 + Math.exp(-1))) < 1e-6)
  assert.ok(Math.abs(values.get('y').data[0] - 1 / (1 + Math.exp(1))) < 1e-6)
  assert.equal(values.get('z').data[0], 0)
  const missing = kit.fromText(['p = softmax(a)', 'x <- p.p1'], io)
  assert.ok(kit.evaluate(missing, { a: image(1, 1, 1) }).errors.size > 0)
})

test('Softmax normalises corresponding pixels and broadcasts scalar inputs', () => {
  const pixels = image(2, 1)
  pixels.data.set([0, 2])
  const { values } = kit.evaluate(graph, { a: pixels, b: image(1, 1, 0), c: image(1, 1, 0) })
  const outputs = ['x', 'y', 'z'].map((key) => values.get(key).data)
  assert.ok(Math.abs(outputs[0][0] - 1 / 3) < 1e-6)
  assert.ok(Math.abs(outputs[0][1] - Math.exp(2) / (Math.exp(2) + 2)) < 1e-6)
  for (let i = 0; i < 2; i++) assert.ok(Math.abs(outputs[0][i] + outputs[1][i] + outputs[2][i] - 1) < 1e-6)
})
