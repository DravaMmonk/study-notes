import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import spec from './spec.js'
import { parse } from '../kit/domains/logic/formula.js'
import { render } from '../kit/domains/logic/notation.js'

test('proof tasks offer a concrete default and a symbolic final case', () => {
  for (const entry of spec.levels) for (const level of entry.tasks ?? [entry]) {
    if (level.kind !== 'proof') continue
    assert.ok(level.tests.length >= 2, entry.id)
    assert.notEqual(level.tests[0].symbolic, true, entry.id)
    assert.equal(level.tests.at(-1).symbolic, true, entry.id)
    assert.equal(level.tests.at(-1).label.zh, '字母', entry.id)
  }
})

test('equality cases use object names by default and letters in the symbolic case', () => {
  const level = spec.levels.find((item) => item.id === 'h-eq-sym')
  const [concrete, symbolic] = level.tests
  const formula = (item) => parse(item.goal, { consts: level.consts })
  assert.match(render(formula(concrete), level.notation, 'zh'), /任意性质.*昏星.*晨星/)
  assert.doesNotMatch(render(formula(concrete), level.notation, 'zh'), /[PQ]/)
  assert.match(render(formula(concrete), level.notation, 'en'), /every property.*Evening Star.*Morning Star/)
  assert.match(render(formula(symbolic), { ...level.notation, words: null }, 'zh'), /Q\(j\).*Q\(i\)/)
  assert.match(concrete.caseBrief.zh, /昏星.*晨星/)
  assert.match(symbolic.caseBrief.zh, /Q\(j\).*Q\(i\)/)
})

test('higher-order propositions use words only in the concrete case', () => {
  const entry = spec.levels.find((item) => item.id === 'h-and-make')
  const level = entry.tasks[0]
  const concrete = level.tests[0]
  const symbolic = level.tests.at(-1)
  assert.match(render(parse(concrete.goal), level.notation, 'zh'), /任意命题.*该命题/)
  assert.match(render(parse(symbolic.goal), { ...level.notation, words: null }, 'zh'), /∀R/)
})
