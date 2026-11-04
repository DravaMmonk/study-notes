import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parse, print, problemsOf } from './expr.js'
import { applyRules, defineParts, evalSettings, failedCheck, partProblems, withParts } from './define.js'
import { S } from '../schema.js'
import { evaluate as run } from '../circuit.js'

// A small domain written here: plain numbers, two resources and one family.
const OPS = {
  add: { about: 'a + b', args: [{ name: 'a' }, { name: 'b' }], run: ([a, b]) => a + b },
  scale: { about: 'a × k', args: [{ name: 'a' }], params: S.obj({ k: S.num(), how: S.opt(S.oneOf(['up', 'down'])) }), run: ([a], { k, how = 'up' }) => (how === 'up' ? a * k : a / k) },
}
const vocabulary = {
  domain: 'toy',
  version: 1,
  kinds: { op: Object.fromEntries(Object.entries(OPS).map(([k, { run: _, ...item }]) => [k, item])), family: { value: { about: 'numbers' } } },
}
const file = {
  presets: { how: { control: 'buttons', label: 'how', options: [{ value: 'up' }, { value: 'down' }], default: 'up' } },
  parts: {
    sum: { name: 'Sum', desc: 'a + b', icon: 'Plus', family: 'value', inputs: [{ name: 'a' }, { name: 'b' }], compute: 'add(a, b)' },
    scaled: {
      name: 'Scaled', desc: 'a scaled', icon: 'Scaling', family: 'value', inputs: [{ name: 'a' }],
      settings: [{ key: 'k', control: 'slider', min: 1, max: 4, default: 2 }, { key: 'how', use: 'how' }, { key: 'lock', control: 'toggle', when: "eq($how, 'up')" }],
      compute: "match $how { up: scale(a, k=$k, how='up'), down: scale(a, k=$k, how=$how) }",
      rules: [{ on: 'how', when: "eq($how, 'down')", set: { k: 'plus($k, 1)' } }],
      checks: [{ holds: 'le($k, 3)', say: { zh: 'k 太大', en: 'k is too big' } }],
      views: { tile: [{ show: 'summary', text: '{how} ×{k}' }], card: [{ show: 'row', blocks: [{ show: 'setting', key: 'k' }, { show: 'readout', label: 'k²', expr: 'times($k, $k)' }] }] },
    },
    split: { name: 'Split', desc: 'two', icon: 'Split', family: 'value', inputs: [{ name: 'a' }], outputs: [{ name: 'hi' }, { name: 'lo' }], compute: { hi: 'add(a, 1)', lo: 'add(a, -1)' } },
  },
}

test('an expression reads, prints back, and says what it names wrong', () => {
  const text = "match $op { add: add(a, b), _: scale(a, k=2, how='down') }"
  assert.equal(print(parse(text)), text)
  assert.throws(() => parse('add(a, '), /expected a name/)
  assert.throws(() => parse('add(k=1, a)'), /positional argument after a named one/)
  const settings = { op: { control: 'select', options: [{ value: 'add' }, { value: 'sub' }] } }
  const said = problemsOf(parse('match $op { add: add(a), mul: c }'), { ops: vocabulary.kinds.op, inputs: ['a', 'b'], settings, fits: () => true })
  assert.deepEqual(said, ['add takes 2 arguments (a, b), given 1', 'c is no input of the part (its inputs: a, b)', 'match $op has no case for sub', 'match $op: mul is none of its options'])
})

test('parts.json becomes engine parts: settings with their presets, one or several outputs, 「—」 given on', () => {
  const { PARTS, defaultsOf } = defineParts(file, OPS)
  assert.deepEqual(defaultsOf('scaled'), { k: 2, how: 'up', lock: false })
  assert.deepEqual(PARTS.scaled.settings, { how: ['up', 'down'] })
  const board = { nodes: [{ id: 'x', type: 'in' }, { id: 's', type: 'scaled', params: { k: '3', how: 'down' } }, { id: 't', type: 'split' }], wires: [{ from: 'x', to: 's', port: 'a' }, { from: 's', to: 't', port: 'a' }] }
  const registry = { ...PARTS, in: { inputs: [], eval: () => 12 } }
  const { values } = run(board, { parts: registry })
  assert.equal(values.get('s'), 4)
  assert.equal(values.get('t#hi'), 5)
  assert.equal(values.get('t#lo'), 3)
  assert.equal(PARTS.sum.eval({ a: null, b: 1 }, { params: {} }), null)
  assert.throws(() => PARTS.scaled.eval({ a: 1 }, { params: { k: 4 } }), /too big/)
})

test('interaction: rules follow a change, checks say what fails, settings-only expressions', () => {
  const { defs } = defineParts(file, OPS)
  assert.deepEqual(applyRules(defs.scaled, { k: 2, how: 'down' }, 'how', OPS), { k: 3, how: 'down' })
  assert.deepEqual(applyRules(defs.scaled, { k: 2, how: 'up' }, 'how', OPS), { k: 2, how: 'up' })
  assert.deepEqual(failedCheck(defs.scaled, { k: 4 }, OPS), { zh: 'k 太大', en: 'k is too big' })
  assert.equal(evalSettings('times($k, $k)', defs.scaled, { k: 3 }, OPS), 9)
})

test('a parts.json that holds together has no problems; one that does not says where', () => {
  assert.deepEqual(partProblems(file, vocabulary), [])
  const bad = structuredClone(file)
  bad.parts.sum.compute = 'add(a, c)'
  bad.parts.sum.icon = 'Nope'
  bad.parts.scaled.settings[0].default = 9
  bad.parts.scaled.compute = 'match $how { up: a }'
  bad.parts.split.compute = { hi: 'add(a, 1)' }
  bad.parts.scaled.views.tile[0].text = '{nope}'
  bad.parts.scaled.rules[0].set = { z: '1' }
  assert.deepEqual(partProblems(bad, vocabulary).map((p) => `${p.at}: ${p.says}`), [
    'parts.json.parts.sum.icon: Nope is no icon of the kernel’s table',
    'parts.json.parts.sum.compute: c is no input of the part (its inputs: a, b)',
    'parts.json.parts.scaled.settings[0].default: 9 is not a number in its range',
    'parts.json.parts.scaled.rules[0].set.z: z is no setting of the part',
    'parts.json.parts.scaled.compute: match $how has no case for down',
    'parts.json.parts.scaled.views.tile[0].text: {nope} is no setting of the part',
    'parts.json.parts.split.compute: nothing computes the output lo',
  ])
  assert.deepEqual(Object.keys(withParts(vocabulary, file).kinds.part), ['sum', 'scaled', 'split'])
})
