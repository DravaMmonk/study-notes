// node --test (npm test) — a number as a player reads it (number.js).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { numberText } from './number.js'

test('a number is rounded to a few decimals, its float noise and trailing zeros gone, −0 read as 0', () => {
  assert.equal(numberText(0.1 + 0.1 + 0.1), '0.3')
  assert.equal(numberText(0.19999999999999998), '0.2')
  assert.equal(numberText(-0.70710678), '-0.7071')
  assert.equal(numberText(-0.00001), '0')
  assert.equal(numberText(2.5, 0), '3')
  assert.equal(numberText(12), '12')
  assert.equal(numberText(Infinity), 'Infinity')
})
