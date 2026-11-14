import { test } from 'node:test'
import assert from 'node:assert/strict'
import { evaluate, parse, print, problemsOf } from './expr.js'
import { BUILTIN_ITEMS, BUILTINS } from './builtins.js'
import { applyRules, defineParts, evalSettings, failedCheck, partDesc, partProblems, withParts } from './define.js'
import { facesOf, holesOf, insideOf, keepsOf, regionsOf, settingsOf } from '../pieces.js'
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
      checks: [{ holds: 'le($k, 3)', say: { zh: 'k 太大' } }],
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

test('if works out only the branch it takes; a builtin’s numbers are plain numbers', () => {
  const env = { ins: {}, settings: { a: 6, b: 0 }, run: (name, args, named) => BUILTINS[name].run(args, named) }
  assert.equal(evaluate(parse('if(eq($b, 0), $a, over($a, $b))'), env), 6, 'no division by 0 on the branch not taken')
  const ops = { ...BUILTIN_ITEMS, ...vocabulary.kinds.op }
  const said = (text) => problemsOf(parse(text), { ops, inputs: ['a'], settings: { k: { control: 'slider' } }, fits: () => true })
  assert.deepEqual(said('round(a)'), ['round(a): the input a is no plain number'])
  assert.deepEqual(said('plus(add(a, a), 1)'), ['plus(a): what add gives is no plain number'])
  assert.deepEqual(said('times(plus($k, 1), 2)'), [])
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
  assert.throws(() => PARTS.scaled.eval({ a: 1 }, { params: { k: 4 } }), /太大/)
})

test('an optional input left unwired reads 「—」 and does not make the part give 「—」; wired to 「—」 it does', () => {
  const some = { parts: { first: { name: 'First', desc: 'a, else b', icon: 'Plus', family: 'value', inputs: [{ name: 'a' }, { name: 'b', optional: true }], compute: 'add(a, b)' } } }
  const { PARTS } = defineParts(some, { add: { args: [{ name: 'a' }, { name: 'b' }], run: ([a, b]) => (b === undefined ? a : a + b) } })
  assert.deepEqual(PARTS.first.optional, ['b'])
  const registry = { ...PARTS, in: { inputs: [], eval: () => 5 }, none: { inputs: [], eval: () => null } }
  const alone = { nodes: [{ id: 'x', type: 'in' }, { id: 'f', type: 'first' }], wires: [{ from: 'x', to: 'f', port: 'a' }] }
  assert.equal(run(alone, { parts: registry }).values.get('f'), 5)
  const blank = { nodes: [...alone.nodes, { id: 'n', type: 'none' }], wires: [...alone.wires, { from: 'n', to: 'f', port: 'b' }] }
  assert.equal(run(blank, { parts: registry }).values.get('f'), null)
  assert.deepEqual(partProblems(some, vocabulary), [])
})

test('interaction: rules follow a change, checks say what fails, settings-only expressions', () => {
  const { defs } = defineParts(file, OPS)
  assert.deepEqual(applyRules(defs.scaled, { k: 2, how: 'down' }, 'how', OPS), { k: 3, how: 'down' })
  assert.deepEqual(applyRules(defs.scaled, { k: 2, how: 'up' }, 'how', OPS), { k: 2, how: 'up' })
  assert.deepEqual(failedCheck(defs.scaled, { k: 4 }, OPS), { zh: 'k 太大' })
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

test('code and content pieces share both the vocabulary and the running registry', () => {
  const code = { fixed: { inputs: [], eval: () => 4 } }
  const mixed = { ...vocabulary, kinds: { ...vocabulary.kinds, part: { fixed: { about: 'a fixed number' } } } }
  const data = { parts: { sum: file.parts.sum } }
  assert.deepEqual(Object.keys(withParts(mixed, data).kinds.part), ['fixed', 'sum'])
  assert.deepEqual(partProblems(data, mixed), [])
  const { PARTS } = defineParts(data, OPS, code)
  const board = { nodes: [{ id: 'f', type: 'fixed' }, { id: 's', type: 'sum' }], wires: [{ from: 'f', to: 's', port: 'a' }, { from: 'f', to: 's', port: 'b' }] }
  assert.equal(run(board, { parts: PARTS }).values.get('s'), 8)
})

test('the piece readers expose the optional faces without renaming stored fields', () => {
  const piece = { ...file.parts.scaled, regions: [{ name: 'body', opens: true }], keeps: ['a'] }
  const built = { name: { zh: '做成的' }, desc: { zh: '跑 work 的板。' }, inside: [{ task: 'work' }, { task: 'better' }] }
  assert.equal(holesOf(piece), piece.inputs)
  assert.equal(settingsOf(piece), piece.settings)
  assert.equal(facesOf(piece), piece.views)
  assert.equal(regionsOf(piece), piece.regions)
  assert.equal(insideOf(built), built.inside)
  assert.equal(keepsOf(piece), piece.keeps)
  assert.deepEqual(partProblems({ ...file, parts: { ...file.parts, scaled: piece, made: built } }, vocabulary), [])
  // A piece computes or has an inside, never both; a built one's ports are its task's board's.
  assert.notDeepEqual(partProblems({ ...file, parts: { made: { ...built, compute: 'a' } } }, vocabulary), [])
  assert.notDeepEqual(partProblems({ ...file, parts: { made: { ...built, inputs: [] } } }, vocabulary), [])
  assert.deepEqual(Object.keys(defineParts({ ...file, parts: { ...file.parts, made: built } }, OPS).defs), Object.keys(file.parts))
  // A domain with its primitives in code keeps its built pieces alone in parts.json.
  const coded = { ...vocabulary, kinds: { part: { wire: { about: 'a wire' } } } }
  assert.deepEqual(partProblems({ parts: { made: built } }, coded), [])
  assert.ok(partProblems({ parts: { scaled: file.parts.scaled } }, coded).some((p) => /holds its built pieces alone/.test(p.says)))
  assert.deepEqual([holesOf({}), settingsOf({}), regionsOf({}), insideOf({}), facesOf({}), keepsOf({})], [[], [], [], null, {}, []])
})

test('a description names only the options that are open', () => {
  const def = {
    desc: { zh: '按 a 运算 b。' },
    settings: [{ key: 'op', options: [{ value: 'add', about: { zh: '加。' } }, { value: 'div', about: { zh: '除，除数为 0 报错。' } }, { value: 'sub' }] }],
  }
  assert.deepEqual(partDesc(def, () => ['add']), { zh: '按 a 运算 b。加。' })
  assert.deepEqual(partDesc(def), { zh: '按 a 运算 b。加。除，除数为 0 报错。' })
  assert.deepEqual(partDesc(def, () => ['sub']), def.desc)
  assert.equal(partDesc({ desc: 'plain', settings: [] }), 'plain')
})

test('a part with regions is a frame: its resource sees the card and the region, and can run a region as a function', () => {
  const FRAME_OPS = {
    // The box: inside its region, the value it was handed; outside, what came back from the region, plus one.
    box: { about: 'box', args: [{ name: 'x' }, { name: 'back' }], run: ([x, back], _named, ctx) => (ctx.key ? x : back + 1) },
    // A loop: the region run on the value three times.
    thrice: { about: 'loop', args: [{ name: 'x' }], run: ([x], _named, ctx) => { const round = ctx.region('body'); return round(round(round(x))) } },
    twice: { about: '2x', args: [{ name: 'x' }], run: ([x]) => x * 2 },
    named: { about: 'id', args: [], run: (_args, _named, ctx) => ctx.node.id },
  }
  const frames = {
    parts: {
      box: { name: 'Box', desc: 'b', icon: 'Box', family: 'value', inputs: [{ name: 'x' }], regions: [{ name: 'body', opens: true, closes: true }], compute: 'box(x, body)' },
      thrice: { name: 'Thrice', desc: 't', icon: 'Repeat', family: 'value', inputs: [{ name: 'x' }], regions: [{ name: 'body', opens: true }, { name: 'more', opens: true, when: "eq($more, 'yes')" }], settings: [{ key: 'more', control: 'select', options: [{ value: 'no' }, { value: 'yes' }] }], compute: 'thrice(x)' },
      twice: { name: 'Twice', desc: 'd', icon: 'Plus', family: 'value', inputs: [{ name: 'x' }], compute: 'twice(x)' },
      named: { name: 'Named', desc: 'n', icon: 'Plus', family: 'value', inputs: [], compute: 'named()' },
    },
  }
  const { PARTS } = defineParts(frames, FRAME_OPS)
  assert.deepEqual(PARTS.thrice.frames({ params: {} }), [{ name: 'body', opens: true }])
  assert.deepEqual(PARTS.thrice.frames({ params: { more: 'yes' } }).map((r) => r.name), ['body', 'more'])
  assert.deepEqual(PARTS.box.outputs({ params: {} }), [null, 'body'])
  const parts = { in: { inputs: [], source: true, eval: () => 5 }, ...PARTS }
  const boxed = { nodes: [{ id: 'i', type: 'in' }, { id: 'b', type: 'box' }, { id: 'd', type: 'twice', in: 'b/body' }], wires: [{ from: 'i', to: 'b', port: 'x' }, { from: 'b#body', to: 'd', port: 'x' }, { from: 'd', to: 'b', port: 'body' }] }
  assert.equal(run(boxed, { parts, ctx: { graph: boxed } }).values.get('b'), 11)
  const loop = { nodes: [{ id: 'i', type: 'in' }, { id: 'l', type: 'thrice' }, { id: 'd', type: 'twice', in: 'l/body' }], wires: [{ from: 'i', to: 'l', port: 'x' }, { from: 'l#body', to: 'd', port: 'x' }, { from: 'd', to: 'l', port: 'body' }] }
  assert.equal(run(loop, { parts, ctx: { graph: loop } }).values.get('l'), 40)
  // Inside, a card may not read a board input that is no constant.
  const leak = { ...loop, wires: [...loop.wires.filter((w) => w.to !== 'd'), { from: 'i', to: 'd', port: 'x' }] }
  assert.match(run(leak, { parts, ctx: { graph: leak } }).errors.get('l').en, /only what the frame opens/)
  assert.equal(run({ nodes: [{ id: 'n', type: 'named' }], wires: [] }, { parts }).values.get('n'), 'n')
})
