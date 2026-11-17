import assert from 'node:assert/strict'
import { test } from 'node:test'
import { gridProbe } from './../core/grid-probe.js'

const input = { w: 2, h: 1, data: [0, 1] }
const exercise = {
  examples: [{ label: 'Bars', input }],
  run: (value) => value,
  answers: ['Right', 'Left'],
  answer: 'Right',
}

test('an accepted answer must be offered by a probe with valid examples', () => {
  const probe = gridProbe(exercise)
  assert.equal(probe.verify(), '')
  assert.equal(probe.judge('Left'), false)
  assert.equal(probe.judge({ en: 'Right', zh: '右' }), true)
  assert.match(gridProbe({ ...exercise, answer: 'Up' }).verify(), /missing/)
  assert.match(gridProbe({ ...exercise, examples: [] }).verify(), /sample image/)
  assert.match(gridProbe({ ...exercise, answers: ['Right', 'Right'] }).verify(), /distinct choices/)
  assert.match(gridProbe({ ...exercise, examples: [...exercise.examples, { label: 'Bars', input }] }).verify(), /labels must be distinct/)
})

test('checking a probe runs every sample and rejects an unreadable result', () => {
  const second = { w: 1, h: 1, c: 3, data: new Float32Array([0, 1, 0.5]) }
  const examples = [...exercise.examples, { label: 'Colour', input: second }]
  assert.equal(gridProbe({ ...exercise, examples }).verify(), '')
  const run = (value) => value === second ? { ...second, data: [0, 1] } : value
  assert.equal(gridProbe({ ...exercise, examples, run }).verify(), 'Colour: output must be a readable grid')
  assert.match(gridProbe({ ...exercise, run: () => { throw Error('No input') } }).verify(), /Bars.*No input/)
})
