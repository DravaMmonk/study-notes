import { test } from 'node:test'
import assert from 'node:assert/strict'
import { exprEvaluate as evaluate, parse, print, problemsOf } from '../../../core/index.js'
import { BUILTIN_ITEMS, BUILTINS } from '../../../core/index.js'
import { applyRules, defineParts, evalSettings, failedCheck, partDesc, partProblems, withParts } from '../../../core/index.js'
import { facesOf, holesOf, insideOf, keepsOf, regionsOf, settingsOf } from '../../../core/index.js'
import { S } from "../../../../../games/kit/engine/schema.js"
import { evaluate as run } from '../../../core/index.js'

// A small domain written here: plain numbers, two resources and one family.
const OPS = {
  add: { about: 'a + b', args: [{ name: 'a' }, { name: 'b' }], run: ([a, b]) => a + b },
  upper: { args: [{ name: 'a' }], run: ([a]) => a + 1 },
  lower: { args: [{ name: 'a' }], run: ([a]) => a - 1 },
  initial: { args: [], params: S.obj({ start: S.opt(S.num()) }), run: (_args, { start }) => start ?? null },
  scale: { about: 'a × k', args: [{ name: 'a' }], params: S.obj({ k: S.num(), how: S.opt(S.oneOf(['up', 'down'])) }), run: ([a], { k, how = 'up' }) => (how === 'up' ? a * k : a / k) },
}
const vocabulary = {
  domain: 'toy',
  version: 1,
  kinds: { op: Object.fromEntries(Object.entries(OPS).map(([k, { run: _, ...item }]) => [k, item])), family: { value: { about: 'numbers' } } },
}
const file = {

  parts: {
    sum: { name: 'Sum', desc: 'a + b', icon: 'Plus', family: 'value', inputs: [{ name: 'a' }, { name: 'b' }], op: 'add' },
    scaled: {
      name: 'Scaled', desc: 'a scaled', icon: 'Scaling', family: 'value', inputs: [{ name: 'a' }],
      settings: { 'k': { control: 'slider', min: 1, max: 4, default: 2 }, 'how': { control: 'buttons', label: 'how', options: [{ value: 'up' }, { value: 'down' }], default: 'up' }, 'lock': { control: 'toggle', when: "circuit:eq($how, 'up')" } },
      op: 'scale',
      rules: [{ on: 'how', when: "circuit:eq($how, 'down')", set: { k: "circuit:plus($k, 1)" } }],
      checks: [{ holds: "circuit:le($k, 3)", say: { en: 'k is too large' } }],
      views: { tile: [{ show: 'summary', text: '{how} ×{k}' }], card: [{ show: 'row', blocks: [{ show: 'setting', key: 'k' }, { show: 'readout', label: 'k²', expr: "circuit:times($k, $k)" }] }] },
    },
    split: { name: 'Split', desc: 'two', icon: 'Split', family: 'value', inputs: [{ name: 'a' }], outputs: [{ name: 'hi' }, { name: 'lo' }], op: { hi: 'upper', lo: 'lower' } },
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
  assert.equal(evaluate(parse("circuit:if(circuit:eq($b, 0), $a, circuit:over($a, $b))"), env), 6, 'no division by 0 on the branch not taken')
  const ops = { ...BUILTIN_ITEMS, ...vocabulary.kinds.op }
  const said = (text) => problemsOf(parse(text), { ops, inputs: ['a'], settings: { k: { control: 'slider' } }, fits: () => true })
  assert.deepEqual(said("circuit:round(a)"), ['circuit:round(a): the input a is no plain number'])
  assert.deepEqual(said("circuit:plus(add(a, a), 1)"), ['circuit:plus(a): what add gives is no plain number'])
  assert.deepEqual(said("circuit:times(circuit:plus($k, 1), 2)"), [])
})

test('parts.json becomes engine parts: settings resolved from shared definitions, one or several outputs, 「—」 given on', () => {
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
  assert.throws(() => PARTS.scaled.eval({ a: 1 }, { params: { k: 4 } }), /too large/)
})

test('an optional input left unwired reads 「—」 and does not make the part give 「—」; wired to 「—」 it does', () => {
  const some = { parts: { first: { name: 'First', desc: 'a, else b', icon: 'Plus', family: 'value', inputs: [{ name: 'a' }, { name: 'b', optional: true }], op: 'add' } } }
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
  assert.deepEqual(applyRules(defs.scaled, { k: 2, how: 'down' }, 'how', OPS, key => key === 'k'), { k: 2, how: 'down' })
  assert.deepEqual(applyRules(defs.scaled, { k: 2, how: 'up' }, 'how', OPS), { k: 2, how: 'up' })
  assert.deepEqual(failedCheck(defs.scaled, { k: 4 }, OPS), { en: 'k is too large' })
  assert.equal(evalSettings("circuit:times($k, $k)", defs.scaled, { k: 3 }, OPS), 9)
})

test('a parts.json that holds together has no problems; one that does not says where', () => {
  assert.deepEqual(partProblems(file, vocabulary), [])
  const bad = structuredClone(file)
  bad.parts.sum.op = 'missing'
  bad.parts.sum.icon = 'Nope'
  bad.parts.scaled.settings.k.default = 9

  bad.parts.split.op = { hi: 'upper', lo: 'missing' }
  bad.parts.scaled.views.tile[0].text = '{nope}'
  bad.parts.scaled.rules[0].set = { z: '1' }
  const unknown = partProblems(bad, vocabulary)
  assert.deepEqual(unknown.map(p => p.at), ['parts/sum.json.op', 'parts/split.json.op.lo'])
  bad.parts.sum.op = 'add'
  bad.parts.split.op.lo = 'lower'
  assert.deepEqual(partProblems(bad, vocabulary).map((p) => `${p.at}: ${p.says}`), [
    'parts/sum.json.icon: Nope is no icon of the kernel’s table',
    'parts/scaled.json.settings.k.default: 9 is not a number in its range',
    'parts/scaled.json.rules[0].set.z: z is no setting of the part',
    'parts/scaled.json.views.tile[0].text: {nope} is no setting of the part',
  ])
  assert.deepEqual(Object.keys(withParts(vocabulary, file).kinds.part), ['sum', 'scaled', 'split'])
})

test('code and content parts share both the vocabulary and the running registry', () => {
  const code = { fixed: { inputs: [], eval: () => 4 } }
  const mixed = { ...vocabulary, kinds: { ...vocabulary.kinds, part: { fixed: { about: 'a fixed number' } } } }
  const data = { parts: { sum: file.parts.sum } }
  assert.deepEqual(Object.keys(withParts(mixed, data).kinds.part), ['fixed', 'sum'])
  assert.deepEqual(partProblems(data, mixed), [])
  const { PARTS } = defineParts(data, OPS, code)
  const board = { nodes: [{ id: 'f', type: 'fixed' }, { id: 's', type: 'sum' }], wires: [{ from: 'f', to: 's', port: 'a' }, { from: 'f', to: 's', port: 'b' }] }
  assert.equal(run(board, { parts: PARTS }).values.get('s'), 8)
})

test('the part readers expose the optional faces without renaming stored fields', () => {
  const part = { ...file.parts.scaled, regions: [{ name: 'body', opens: true }] }
  const keeping = { keeps: { input: 'in', register: 'reg' } }
  const built = { name: { en: '做成的' }, desc: { en: 'The board that runs work.' }, inside: [{ id: 'base', reference: {} }, { id: 'better', reference: {} }] }
  assert.equal(holesOf(part), part.inputs)
  assert.deepEqual(settingsOf(part).map((s) => s.key), ['k', 'how', 'lock'])
  assert.equal(facesOf(part), part.views)
  assert.equal(regionsOf(part), part.regions)
  assert.equal(insideOf(built), built.inside)
  assert.equal(keepsOf(keeping), keeping.keeps)
  assert.deepEqual(partProblems({ ...file, parts: { ...file.parts, scaled: part, made: built } }, vocabulary), [])
  // A part computes or has an inside, never both; a built part can declare its typed interface.
  assert.notDeepEqual(partProblems({ ...file, parts: { made: { ...built, op: 'add' } } }, vocabulary), [])
  assert.deepEqual(partProblems({ ...file, parts: { made: { ...built, inputs: [] } } }, vocabulary), [])
  assert.deepEqual(Object.keys(defineParts({ ...file, parts: { ...file.parts, made: built } }, OPS).defs), Object.keys(file.parts))
  // A domain with its primitives in code keeps its built parts alone in parts/<name>.json.
  const coded = { ...vocabulary, kinds: { part: { wire: { about: 'a wire' } } } }
  assert.deepEqual(partProblems({ parts: { made: built } }, coded), [])
  assert.ok(partProblems({ parts: { scaled: file.parts.scaled } }, coded).some((p) => /circuit primitives in code/.test(p.says)))
  assert.deepEqual([holesOf({}), settingsOf({}), regionsOf({}), insideOf({}), facesOf({}), keepsOf({})], [[], [], [], null, {}, null])
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
    box: { about: 'box', args: [{ name: 'x' }, { name: 'body' }], run: ([x, back], _named, ctx) => (ctx.key ? x : back + 1) },
    // A loop: the region run on the value three times.
    thrice: { about: 'loop', args: [{ name: 'x' }], run: ([x], _named, ctx) => { const round = ctx.region('body'); return round(round(round(x))) } },
    twice: { about: '2x', args: [{ name: 'x' }], run: ([x]) => x * 2 },
    named: { about: 'id', args: [], run: (_args, _named, ctx) => ctx.node.id },
  }
  const frames = {

    parts: {
      box: { name: 'Box', desc: 'b', icon: 'Box', family: 'value', inputs: [{ name: 'x' }], regions: [{ name: 'body', opens: true, closes: true }], op: 'box' },
      thrice: { name: 'Thrice', desc: 't', icon: 'Repeat', family: 'value', inputs: [{ name: 'x' }], regions: [{ name: 'body', opens: true }, { name: 'more', opens: true, when: "circuit:eq($more, 'yes')" }], settings: { 'more': { control: 'select', options: [{ value: 'no' }, { value: 'yes' }] } }, op: 'thrice' },
      twice: { name: 'Twice', desc: 'd', icon: 'Plus', family: 'value', inputs: [{ name: 'x' }], op: 'twice' },
      named: { name: 'Named', desc: 'n', icon: 'Plus', family: 'value', inputs: [], op: 'named' },
    },
  }
  const { PARTS } = defineParts(frames, FRAME_OPS)
  assert.deepEqual(PARTS.thrice.frames({ params: {} }), [{ name: 'body', opens: true }])
  assert.deepEqual(PARTS.thrice.frames({ params: { more: 'yes' } }).map((r) => r.name), ['body', 'more'])
  assert.deepEqual(PARTS.box.outputs({ params: {} }), [null, 'body'])
  assert.deepEqual(PARTS.thrice.inputs({ params: {} }), ['x', 'body'])
  assert.deepEqual(PARTS.thrice.outputs({ params: { more: 'yes' } }), [null, 'body', 'more'])
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

test('a part keeps an input in the register a setting names, or computes, never both', () => {
  const settings = { register: { control: 'select', options: [{ value: 'A' }] } }
  const keep = { name: { en: '存' }, desc: { en: 'Store it in the register.' }, icon: 'Box', family: 'value', inputs: [{ name: 'in' }], settings: { 'reg': settings['register'] }, keeps: { input: 'in', register: 'reg' } }
  assert.deepEqual(partProblems({ parts: { keep } }, vocabulary), [])
  assert.ok(partProblems({ parts: { keep: { ...keep, op: 'add' } } }, vocabulary).some((p) => /one of the two/.test(p.says)))
  assert.ok(partProblems({ parts: { keep: { ...keep, keeps: { input: 'x', register: 'r' } } } }, vocabulary).length === 2)
  const { PARTS } = defineParts({ parts: { keep } }, OPS)
  assert.equal(PARTS.keep.sink && PARTS.keep.store, true)
  assert.equal(PARTS.keep.register({ params: {} }), 'A')
})

test('an optional number left unset reads 「—」, and a new card starts from its default', () => {
  const start = { control: 'number', default: 0, optional: true }
  const { PARTS, defaultsOf } = defineParts({ parts: { r: { name: { en: 'r' }, desc: { en: 'd' }, icon: 'Box', family: 'value', inputs: [], settings: { 'start': start }, op: 'initial' } } }, OPS)
  assert.deepEqual(defaultsOf('r'), { start: 0 })
  assert.equal(PARTS.r.eval({}, { params: {} }, {}), null)
  assert.equal(PARTS.r.eval({}, { params: { start: '3' } }, {}), 3)
})

test('inline settings inherit operation parameters for every output', () => {
  const parameters = S.obj({ gain: S.num({ min: 1, max: 4, default: 2 }), mode: S.oneOf(['up', 'down'], { default: 'up' }) })
  const ops = { scale: { args: [{ name: 'a' }], params: parameters, run: ([a], { gain, mode }) => mode === 'up' ? a * gain : a / gain } }
  const part = { ...file.parts.sum, settings: { mode: { remove: ['down'] } }, op: { hi: 'scale', lo: 'scale' } }
  const { defs, defaultsOf, PARTS } = defineParts({ parts: { scale: part } }, ops)
  assert.deepEqual(defaultsOf('scale'), { gain: 2, mode: 'up' })
  assert.deepEqual(defs.scale.setting.mode.options, [{ value: 'up' }])
  assert.equal(PARTS.scale.eval({ a: 3 }, { params: {} }, {}, 'lo'), 6)
})

test('settings reject incomplete standalone definitions, wider ranges, invalid defaults and added options', () => {
  const op = { args: [{ name: 'a' }], params: S.obj({ gain: S.num({ min: 1, max: 4, default: 2 }), mode: S.oneOf(['up', 'down'], { default: 'up' }) }) }
  const vocabulary = { kinds: { op: { scale: op }, family: { value: {} } } }
  const make = (settings) => ({ parts: { scaled: { ...file.parts.sum, settings, op: 'scale' } } })
  assert.deepEqual(partProblems(make({ gain: {}, mode: {} }), vocabulary), [])
  assert.deepEqual(partProblems(make({ gain: { min: 2, max: 3, default: 3 }, mode: { remove: ['down'] } }), vocabulary), [])
  const says = (settings) => partProblems(make(settings), vocabulary).map((p) => p.says).join('\n')
  assert.match(says({ gain: {}, mode: {}, tree: {} }), /control/)
  assert.match(says({ gain: { min: 0 }, mode: {} }), /cannot widen/)
  assert.match(says({ gain: { max: 5 }, mode: {} }), /cannot widen/)
  assert.match(says({ gain: { default: 5 }, mode: {} }), /default does not fit/)
  assert.match(says({ gain: {}, mode: { options: [{ value: 'other' }] } }), /not an option/)
  assert.match(says({ gain: {}, mode: { remove: ['other'] } }), /not an option/)
  assert.match(says({ gain: {}, mode: { remove: ['up'] } }), /none of its options/)
  assert.deepEqual(partProblems(make({ gain: {}, mode: {}, tree: { control: 'tree' } }), vocabulary), [])
  assert.ok(partProblems({ parts: { scaled: { ...file.parts.sum, settings: [{ key: 'k', setting: 'shared' }] } } }, vocabulary).length)
})
