import assert from 'node:assert/strict'
import { test } from 'node:test'
import { definePlays } from '../../engine/plays.js'
import { play } from './play.js'

test('the circuit template requires an explicit target column policy', () => {
  const circuit = { editor: 'circuit', judge: 'cases' }
  assert.throws(() => definePlays({ circuit }), /is missing/)
  assert.throws(() => definePlays({ circuit: { ...circuit, target: 'sometimes' } }), /expected one of/)
  for (const target of ['shown', 'hidden']) {
    assert.equal(definePlays({ circuit: { ...circuit, target } }).circuit.target, target)
  }
})

test('text play follows the circuit target policy in the table and on failure', () => {
  const game = { logic: { syncOwn: () => {}, offerIn: () => ({ shown: ['gNot'], folded: [] }) } }
  for (const [fields, showTarget, showSentence] of [
    [{}, true, true],
    [{ hideTarget: false }, true, true],
    [{ hideTarget: true }, false, true],
    [{ blind: true, hideTarget: false }, false, false],
  ]) {
    const source = { kind: 'gates', target: '¬A', ...fields }
    const ctx = { game, level: { kind: 'gates', source }, progress: { built: {} } }
    const opened = play.open(ctx)
    assert.equal(opened.given.en.includes('the sentence'), showSentence)
    assert.equal(opened.tests[0].text.en, showTarget ? 'A (A) | target\nrow 1: T | F\nrow 2: F | T' : 'A (A)\nrow 1: T\nrow 2: F')
    const wrong = play.attempt(ctx, 'out <- A')
    assert.equal(wrong.pass, false)
    assert.equal(wrong.tests[0].says.en, showTarget
      ? 'This row is wrong: the circuit outputs T; it should be F.'
      : 'This row is wrong: the circuit outputs T.')
    assert.equal(play.attempt(ctx, 'n = gNot(A)\nout <- n').pass, true)
  }
})
