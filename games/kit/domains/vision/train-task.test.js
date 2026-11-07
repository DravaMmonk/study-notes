// A training task (run.js): the board is trained before its tests judge it, a classifier is judged by its most likely
// class, and a reference that trains passes while a board that cannot learn the rule fails.
import test from 'node:test'
import assert from 'node:assert/strict'
import { PARTS, PRIMITIVES } from './fixture.js'
import { board } from './board.js'
import { runLevel, trainedBoard } from './run.js'
import { fromRows, toRows } from './image.js'
import { filterImage } from './operators.js'

const partOf = (type) => PARTS[type]
const pic = (seed) => toRows({ w: 6, h: 5, c: 1, data: Array.from({ length: 30 }, (_, k) => ((Math.sin(seed * 9.1 + k * 3.7) * 1000) % 1 + 1) % 1) })
const sobel = fromRows([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]])
const pair = (seed) => ({ inputs: { image: pic(seed) }, expect: { out: toRows(filterImage(fromRows(pic(seed)), sobel, { outside: 'clamp' })) } })
const task = {
  inputs: [{ name: 'image', label: 'image' }], outputs: [{ name: 'out', label: 'out' }], tolerance: 0.05,
  tests: [pair(9)].map((t) => ({ inputs: { image: fromRows(t.inputs.image) }, expect: { out: fromRows(t.expect.out) } })),
  train: { examples: [1, 2, 3, 4].map(pair), rate: 0.5, epochs: 300, momentum: 0.8 },
}
const read = (lines) => board.fromText(lines, task, PRIMITIVES)

test('a learnable kernel is trained before the tests judge it; a fixed one is judged as it is', () => {
  const learning = read(['k = learn[shape=kernel3]()', 'f = kernelFilter[outside=clamp](image,k)', 'out <- f'])
  const result = runLevel(task, learning, partOf)
  assert.equal(result.pass, true)
  assert.ok(result.runs[0].training.curve.train.length === 300)
  assert.equal(trainedBoard(task, learning, partOf), result.training, 'a board is trained once')
  const fixed = read(['f = kernelFilter[outside=clamp](image,image)', 'out <- f'])
  assert.equal(runLevel(task, fixed, partOf).pass, false)
})

test('a classifier is judged by the class it rates most likely', () => {
  const classify = { inputs: [{ name: 'x', label: 'x' }], outputs: [{ name: 'p', label: 'p' }], judge: 'argmax', tests: [{ inputs: { x: fromRows([[2, 0.1, 0]]) }, expect: { p: fromRows([[1, 0, 0]]) } }] }
  const pass = board.fromText(['s = softmax(x)', 'p <- s'], classify, PRIMITIVES)
  assert.equal(runLevel(classify, pass, partOf).pass, true)
  const wrong = { ...classify, tests: [{ ...classify.tests[0], expect: { p: fromRows([[0, 1, 0]]) } }] }
  assert.match(runLevel(wrong, pass, partOf).runs[0].fail.why.en, /class 2.*class 1/)
})
