import { test } from 'node:test'
import assert from 'node:assert/strict'
import { appleLight } from './apple-light.js'

test('neutral light scales all channels while the red decision uses their proportions', () => {
  const setup = { colours: [[0.8, 0.18, 0.15], [0.75, 0.72, 0.65]], red: 0 }
  const model = appleLight.make(setup)
  const dark = model.view({ light: 0.25, pick: 0 })
  const bright = model.view({ light: 1, pick: 1 })
  for (let i = 0; i < 2; i++) for (let c = 0; c < 3; c++) assert.equal(dark.channels[i][c], bright.channels[i][c] * 0.25)
  assert.equal(dark.correct, true)
  assert.equal(bright.correct, false)
  assert.equal(model.view({ light: 0.5, pick: null }).correct, false)
  const bench = { setup, knobs: { light: { min: 0.2, max: 1 }, pick: { choices: [{ value: 0 }, { value: 1 }] } } }
  assert.equal(appleLight.verify(model, bench), '')
  assert.notEqual(appleLight.verify(model, { ...bench, setup: { ...setup, red: 1 } }), '')
})
