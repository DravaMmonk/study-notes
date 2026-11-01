// node --test games/kit/engine — the parameter bench's data: knobs, the goal's judge, number formats, the schema.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { S, validate } from './schema.js'
import { defineVocabulary } from './vocabulary.js'
import { benchSchema, displayItems, formatValue, judge, knobStart, knobValues, needText, openKnobs, passingSettings, rowValue, startValues } from './bench.js'

const BENCH = {
  knobs: {
    a: { min: 0, max: 1, step: 0.25 },
    b: { values: [10, 20, 30], start: 1 },
    c: { choices: [{ value: 'x' }, { value: 'y' }], start: null },
    d: { toggle: true, fixed: true, start: true },
    k: { min: 1, max: 5, step: 1, start: 2, perCase: true },
  },
  cases: [{ label: 'one' }, { label: 'two' }],
  goal: [{ of: 'sum', atLeast: 1 }],
}

test('a knob starts at its start, else at its first value; a stage overrides it, null included', () => {
  assert.equal(knobStart(BENCH.knobs.a), 0)
  assert.equal(knobStart(BENCH.knobs.b), 1)
  assert.equal(knobStart(BENCH.knobs.c), null)
  assert.equal(knobStart({ choices: [{ value: 3 }, { value: 4 }] }), 3)
  assert.deepEqual(knobStart({ list: true }), [])
  assert.deepEqual(startValues(BENCH), { a: 0, b: 1, c: null, d: true, k: [2, 2] })
  assert.deepEqual(startValues(BENCH, { start: { a: 0.5, c: 'y' } }), { a: 0.5, b: 1, c: 'y', d: true, k: [2, 2] })
})

test('every value a knob takes, and the knobs a stage opens', () => {
  assert.deepEqual(knobValues(BENCH.knobs.a), [0, 0.25, 0.5, 0.75, 1])
  assert.deepEqual(knobValues(BENCH.knobs.b), [0, 1, 2])
  assert.deepEqual(knobValues(BENCH.knobs.d), [false, true])
  assert.deepEqual(openKnobs(BENCH, null), ['a', 'b', 'c', 'k'])
  assert.deepEqual(openKnobs(BENCH, { opens: ['b'] }), ['b'])
})

test('the judge: every limit must hold; near measures the distance, abs the size; a missing number fails', () => {
  const q = { x: 0.48, y: -0.3, n: NaN, s: 'mag' }
  const holds = (limit) => judge([limit], q).pass
  assert.ok(holds({ of: 'x', near: 0.5, atMost: 0.05 }))
  assert.ok(!holds({ of: 'x', near: 0.5, below: 0.01 }))
  assert.ok(holds({ of: 'y', abs: true, above: 0.2 }))
  assert.ok(!holds({ of: 'y', above: 0.2 }))
  assert.ok(!holds({ of: 'n', atLeast: 0 }))
  assert.ok(!holds({ of: 'missing', atMost: 1 }))
  assert.ok(holds({ of: 's', is: 'mag' }))
  assert.ok(!holds({ of: 's', not: 'mag' }))
  assert.ok(!holds({ of: 'x', below: 0.4 }))
  assert.ok(!judge([{ of: 'e', below: 1.5 }], { e: Infinity }).pass)
  const both = judge([{ of: 'x', atLeast: 0 }, { of: 'y', atLeast: 0 }], q)
  assert.equal(both.pass, false)
  assert.deepEqual(both.rows.map((r) => r.pass), [true, false])
})

test('passing settings run over a stage’s open knobs and write each as its values', () => {
  const bench = { knobs: { a: { min: 0, max: 3, step: 1 }, b: { min: 0, max: 2, step: 1 } }, goal: [{ of: 'sum', atLeast: 4 }] }
  const quantities = (v) => ({ sum: v.a + v.b })
  assert.deepEqual(passingSettings(bench, { opens: ['a', 'b'] }, quantities), ['2×2', '3×1', '3×2'])
  assert.deepEqual(passingSettings(bench, { opens: ['a'], start: { b: 1 } }, quantities), ['3'])
})

test('numbers and thresholds as a goal row writes them', () => {
  assert.equal(formatValue(0.3, 'auto'), '0.30')
  assert.equal(formatValue(2, 'auto'), '2')
  assert.equal(formatValue(-2, 'quarterPi'), '−π/2')
  assert.equal(formatValue(0.456, 'pct'), '46%')
  assert.equal(formatValue(0.5, 'pct1'), '50.0%')
  assert.equal(formatValue(Infinity, 'fixed2', ' px'), '—')
  assert.equal(formatValue(40000, 'grouped'), '40,000')
  assert.equal(formatValue(-2, 'pow10'), '0.01')
  assert.equal(needText({ near: 30, atMost: 1, unit: ' mm' }), '30 ± 1 mm')
  assert.equal(needText({ near: 0.5, atMost: 0.05, format: 'pct1' }), '50 ± 5%')
  assert.equal(needText({ atLeast: 0.4, format: 'pct' }), '≥ 40%')
  assert.equal(needText({ below: 1.5, unit: ' px' }), '< 1.5 px')
  assert.equal(needText({ atLeast: 4, format: 'outOf' }), '')
  assert.equal(rowValue({ atLeast: 3, format: 'outOf' }, 5), '3 / 3')
})

test('a bench is checked as data: knobs, goal, layout blocks and display items with their parameters', () => {
  const vocabulary = defineVocabulary({
    domain: 'test', version: 1, game: S.obj({}), level: S.obj({}),
    kinds: { display: displayItems({ picture: { about: 'a picture', params: S.obj({ big: S.opt(S.bool()) }) } }) },
  })
  const schema = benchSchema({ m: { about: 'a model', setup: S.obj({ n: S.int() }), stage: S.obj({ target: S.num() }) } })
  const bench = {
    model: 'm', setup: { n: 3 },
    knobs: { a: { min: 0, max: 1, step: 0.5, label: 'a' } },
    stages: [{ title: 'one', note: 'turn a', opens: ['a'], target: 1, goal: [{ of: 'a', atLeast: 1 }] }],
    layout: { main: [{ picture: { big: true, with: ['goals'] } }, { plot: { lines: [{ of: 'y', kind: 'yours' }], height: [200, 160] } }], side: [{ panel: ['step', 'knobs', 'verdict'] }, 'stages'] },
  }
  assert.deepEqual(validate(schema, bench, { vocabulary }), [])
  const wrong = { ...bench, knobs: { a: { min: 0, max: 1 } }, layout: { main: [{ picture: { huge: true } }, 'nothing'] } }
  const problems = validate(schema, wrong, { vocabulary }).map((p) => p.at)
  assert.ok(problems.some((at) => at.startsWith('.knobs.a')))
  assert.ok(problems.some((at) => at.startsWith('.layout.main[0]')))
  assert.ok(problems.some((at) => at.startsWith('.layout.main[1]')))
})
