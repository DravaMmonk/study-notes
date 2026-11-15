import assert from 'node:assert/strict'
import { test } from 'node:test'
import { definePlays } from '../../engine/plays.js'
import { defineParts } from '../../engine/parts/define.js'
import { gateCourse } from './gates.js'
import { play } from './play.js'

// The gate the level holds, as a game's pieces.json defines it.
const gNot = { name: { zh: '非' }, desc: { zh: 'd' }, icon: 'ToggleLeft', family: 'gate', inputs: [{ name: 'a' }], compute: 'not(a)' }
const gates = { gNot: { ...defineParts({ parts: { gNot } }, {}).PARTS.gNot, name: gNot.name, desc: gNot.desc } }

test('the circuit template requires an explicit target column policy', () => {
  const circuit = { editor: 'circuit', judge: 'cases', resources: 'gates' }
  assert.throws(() => definePlays({ circuit }), /is missing/)
  assert.throws(() => definePlays({ circuit: { ...circuit, target: 'sometimes' } }), /expected one of/)
  for (const target of ['shown', 'hidden']) {
    assert.equal(definePlays({ circuit: { ...circuit, target } }).circuit.target, target)
  }
})

test('text play follows the circuit target policy in the table and on failure', () => {
  const game = { circuit: gateCourse({
    built: {},
    builders: {},
    syncOwn: () => {},
    offerIn: () => ({ shown: ['gNot', 'unrelated'], folded: [], types: ['gNot', 'unrelated'] }),
  }) }
  for (const [fields, showTarget, showSentence] of [
    [{}, true, true],
    [{ hideTarget: false }, true, true],
    [{ hideTarget: true }, false, true],
    [{ blind: true, hideTarget: false }, false, false],
  ]) {
    const source = { kind: 'gates', target: '¬A', gates, ...fields }
    const ctx = { game, level: { kind: 'gates', source }, progress: { built: {} } }
    const opened = play.open(ctx)
    assert.deepEqual(opened.palette.map(({ type }) => type), ['gNot'])
    assert.equal(opened.given.en.includes('the sentence'), showSentence)
    assert.equal(opened.tests[0].text.en, showTarget ? 'A (A) | target\nrow 1: T | F\nrow 2: F | T' : 'A (A)\nrow 1: T\nrow 2: F')
    const wrong = play.attempt(ctx, 'out <- A')
    assert.equal(wrong.pass, false)
    assert.equal(wrong.tests[0].says.en, showTarget
      ? 'This row is wrong: the circuit outputs T; it should be F.'
      : 'This row is wrong: the circuit outputs T.')
    const answer = 'n = gNot(A)\nout <- n'
    const passed = play.attempt(ctx, answer)
    assert.equal(passed.pass, true)
    assert.equal(play.open({ ...ctx, saved: passed.board }).start?.trimEnd(), answer)
    const invalid = { ...passed.board, wires: [...passed.board.wires, passed.board.wires[0]] }
    assert.equal(play.open({ ...ctx, saved: invalid }).start, null)
  }
})
