// node --test games/kit/engine — the engine on small circuits of plain numbers.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Halt, MISSING, PartError, evaluate } from './circuit.js'
import { packed, runBoard, sink, source } from './boards.js'
import { walk } from './machine.js'
import { paceOf, viewAt } from './trace.js'
import { runLevel, withHidden } from './tests.js'

const PARTS = {
  input: source(),
  output: sink(),
  add: { inputs: ['a', 'b'], eval: ({ a, b }) => a + b },
  merge: { inputs: ['a', 'b', 'c'], optional: ['a', 'b', 'c'], eval: (ins) => Object.values(ins).reduce((s, v) => s + v, 0) },
  neg: { inputs: ['in'], eval: ({ in: x }) => -x },
  half: { inputs: ['in'], eval: ({ in: x }) => { if (x % 2) throw new PartError({ zh: '奇数', en: 'odd' }); return x / 2 } },
  split: { inputs: ['in'], outputs: () => ['lo', 'hi'], eval: ({ in: x }, _n, _c, key) => (key === 'lo' ? x % 10 : Math.floor(x / 10)) },
  gate: { inputs: ['c', 'v'], idle: (port) => (port === 'c' ? false : null), eval: ({ c, v }) => (c ? v : null) },
  // A part that hands out a value of its own (`k`, from `in` alone) and reads back what was made of it (`back`).
  loan: { inputs: ['in', 'back'], outputs: () => [null, 'k'], reads: (_n, key) => (key ? ['in'] : undefined), eval: ({ in: x, back }, _n, _c, key) => (key ? x * 10 : back + 1) },
}
const io = (nodes, wires) => ({ nodes: [{ id: 'in', type: 'input', params: { name: 'in' } }, { id: 'out', type: 'output', params: { name: 'out' } }, ...nodes], wires })
const w = (text) => text.split(' ').map((s) => { const [from, to] = s.split('>'); const [id, port = 'in'] = to.split('.'); return { from, to: id, port } })

test('values flow from inputs to outputs', () => {
  const c = io([{ id: 'a', type: 'add' }], w('in>a.a in>a.b a>out'))
  assert.equal(runBoard(c, { parts: PARTS, bind: { in: 3 } }).outputs.out, 6)
})

test('a missing input marks the node, and nodes downstream', () => {
  const c = io([{ id: 'a', type: 'add' }, { id: 'n', type: 'neg' }], w('in>a.a a>n n>out'))
  const { errors, outputs } = runBoard(c, { parts: PARTS, bind: { in: 1 } })
  assert.equal(errors.get('a'), MISSING)
  assert.equal(errors.get('n'), MISSING)
  assert.equal(outputs.out, undefined)
  assert.equal(errors.has('out'), false)
})

test('optional ports: any one is enough, none is missing', () => {
  const one = io([{ id: 'm', type: 'merge' }], w('in>m.b m>out'))
  assert.equal(runBoard(one, { parts: PARTS, bind: { in: 4 } }).outputs.out, 4)
  const none = io([{ id: 'm', type: 'merge' }], w('m>out'))
  assert.equal(runBoard(none, { parts: PARTS }).errors.get('m'), MISSING)
})

test('idle ports read their idle value', () => {
  const c = io([{ id: 'g', type: 'gate' }], w('in>g.v g>out'))
  assert.equal(runBoard(c, { parts: PARTS, bind: { in: 5 } }).outputs.out, null)
})

test('a part error carries its message', () => {
  const c = io([{ id: 'h', type: 'half' }], w('in>h h>out'))
  assert.deepEqual(runBoard(c, { parts: PARTS, bind: { in: 3 } }).errors.get('h'), { zh: '奇数', en: 'odd' })
})

test('several outputs, each its own value', () => {
  const c = io([{ id: 's', type: 'split' }, { id: 'a', type: 'add' }], w('in>s s#lo>a.a s#hi>a.b a>out'))
  assert.equal(runBoard(c, { parts: PARTS, bind: { in: 47 } }).outputs.out, 11)
})

test('targets: only what they need is computed, and a halt stops it all', () => {
  let read = 0
  const parts = { ...PARTS, probe: { inputs: [], eval: () => { read++; throw new Halt({ empty: 'k' }) } } }
  const c = io([{ id: 'p', type: 'probe' }, { id: 'n', type: 'neg' }], w('in>n n>out'))
  assert.equal(runBoard(c, { parts, bind: { in: 2 }, targets: ['out'] }).outputs.out, -2)
  assert.equal(read, 0)
  assert.throws(() => evaluate(c, { parts }), Halt)
})

test('an output that reads only some ports can feed the node it comes from', () => {
  const c = io([{ id: 'l', type: 'loan' }, { id: 'n', type: 'neg' }], w('in>l l#k>n n>l.back l>out'))
  assert.equal(runBoard(c, { parts: PARTS, bind: { in: 3 } }).outputs.out, -29)
})

test('a packed circuit is a part', () => {
  const inner = io([{ id: 'a', type: 'add' }], w('in>a.a in>a.b a>out'))
  const parts = { ...PARTS, dbl: packed({ circuit: inner, inputs: ['in'], outputs: ['out'] }) }
  const c = io([{ id: 'd', type: 'dbl' }, { id: 'e', type: 'dbl' }], w('in>d d>e e>out'))
  assert.equal(runBoard(c, { parts, bind: { in: 5 } }).outputs.out, 20)
})

test('a packed part traces each card inside with its path', () => {
  const inner = io([{ id: 'a', type: 'add' }], w('in>a.a in>a.b a>out'))
  const parts = { ...PARTS, dbl: packed({ circuit: inner, inputs: ['in'], outputs: ['out'] }) }
  const c = io([{ id: 'd', type: 'dbl' }], w('in>d d>out'))
  const trace = []
  runBoard(c, { parts, bind: { in: 2 }, ctx: { trace } })
  assert.ok(trace.some((s) => s.id === 'a' && s.path?.[0] === 'd' && s.value === 4))
  assert.ok(trace.some((s) => s.id === 'd' && !s.path && s.value === 4))
})

test('a walk fills a table and stops at a key not written yet', () => {
  const run = (order) => walk({
    order,
    keys: (i) => ({ cell: i }),
    base: [[0, 1]],
    step: (i, get) => ({ out: { cell: get(i - 1) + (i > 1 ? get(i - 2) : 0) } }),
    answer: (table) => table.get(order.at(-1)),
  })
  assert.equal(run([1, 2, 3, 4, 5]).value, 8)
  const stopped = run([1, 3, 2])
  assert.deepEqual(stopped.error, { cell: 3, key: 2 })
})

test('a walk in rounds settles', () => {
  const r = walk({ order: [1, 2], keys: (i) => ({ v: i }), rounds: true, step: (i, get) => ({ out: { v: Math.min(5, (get(3 - i) ?? 0) + 1) } }), answer: (t) => t.get(2) })
  assert.equal(r.value, 5)
  assert.ok(r.rounds > 1)
})

test('a level runs its tests through the domain, hidden ones too', () => {
  const domain = {
    runTest: (level, circuit, t) => runBoard(circuit, { parts: PARTS, bind: t.inputs }),
    check: (level, t, outputs) => Object.entries(t.expected).map(([name, v]) => ({ name, pass: outputs[name] === v })),
    score: (level, circuit) => ({ nodes: circuit.nodes.length - 2 }),
  }
  const level = { tests: [{ inputs: { in: 1 }, expected: { out: -1 } }], hidden: [{ inputs: { in: 2 }, expected: { out: -2 } }], constraint: (s) => (s.nodes > 1 ? 'too many' : '') }
  const good = io([{ id: 'n', type: 'neg' }], w('in>n n>out'))
  assert.equal(runLevel(domain, withHidden(level), good).pass, true)
  const long = io([{ id: 'n', type: 'neg' }, { id: 'm', type: 'neg' }, { id: 'k', type: 'neg' }], w('in>n n>m m>k k>out'))
  const run = runLevel(domain, level, long)
  assert.equal(run.results[0].pass, true)
  assert.equal(run.constraint, 'too many')
  assert.equal(run.pass, false)
})

test('a traced run lists every node in the order it ran, and replays to any step', () => {
  const c = io([{ id: 'a', type: 'add' }, { id: 'n', type: 'neg' }, { id: 'h', type: 'half' }, { id: 'stray', type: 'neg' }], w('in>a.a in>a.b a>n n>h h>out'))
  const trace = []
  runBoard(c, { parts: PARTS, bind: { in: 3 }, targets: ['out'], ctx: { trace } })
  assert.deepEqual(trace.map((e) => [e.id, e.value ?? e.error.en]), [['in', 3], ['a', 6], ['n', -6], ['h', -3]])
  const mid = viewAt(trace, 1)
  assert.equal(mid.values.get('a'), 6)
  assert.equal(mid.values.has('n'), false)
  const odd = []
  runBoard(c, { parts: PARTS, bind: { in: 1.5 }, targets: ['out'], ctx: { trace: odd } })
  assert.deepEqual(odd.at(-1), { id: 'h', key: null, error: { zh: '奇数', en: 'odd' } })
})

test('a run plays its first test slowly and the rest fast, at a pace that does not depend on its length', () => {
  assert.ok(paceOf(0, 5).per > paceOf(1, 5).per)
  assert.equal(paceOf(0, 5).per, paceOf(0, 40).per)
  assert.equal(paceOf(1, 5).per, paceOf(1, 1000).per)
  assert.equal(paceOf(1, 5).stride, 1)
  assert.ok(paceOf(1, 1000).stride > 1)
  assert.ok(paceOf(0, 1000).per * (Math.ceil(1000 / paceOf(0, 1000).stride) - 1) <= 12000)
})
