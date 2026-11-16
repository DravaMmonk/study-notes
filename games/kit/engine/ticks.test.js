// node --test games/kit/engine — the tick world on small boards of plain numbers.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { packed, sink, source } from './boards.js'
import { boardNode, drive, hearing, runTicks } from './ticks.js'
import { defineParts } from './parts/define.js'

// The registers as parts defined as data: reg reads one (0 until kept), bit too (1), set keeps one.
const name = { control: 'select', options: ['n', 'last', 'k'].map((value) => ({ value })) }
const reading = (start) => ({ name: 'r', desc: 'd', icon: 'Box', family: 'f', inputs: [], settings: { reg: name, start: { control: 'number', default: start } }, compute: "circuit:held($reg, $start)" })
const REGISTERS = defineParts({ parts: { reg: reading(0), bit: reading(1), set: { name: 's', desc: 'd', icon: 'Box', family: 'f', inputs: [{ name: 'in' }], settings: { reg: name }, keeps: { input: 'in', register: 'reg' } } } }, {}).PARTS
const PARTS = {
  input: source(),
  output: sink(),
  rx: hearing(),
  tx: drive(),
  ...REGISTERS,
  one: { inputs: [], eval: () => 1 },
  add: { inputs: ['a', 'b'], eval: ({ a, b }) => a + b },
  min: { inputs: ['a', 'b'], eval: ({ a, b }) => Math.min(a, b) },
}
const w = (text) => text.split(' ').map((s) => { const [from, to] = s.split('>'); const [id, port = 'in'] = to.split('.'); return { from, to: id, port } })
// A bus where the smallest value said wins and an undriven line reads 1.
const bus = (said) => Math.min(1, ...said.filter((v) => v !== undefined))
const script = (id, bits) => ({ id, say: (t) => bits[t], hear: () => null })

// A counter: what the register holds, plus one, kept for the next tick.
const COUNTER = { nodes: [{ id: 'r', type: 'reg', params: { reg: 'n' } }, { id: 'o', type: 'one' }, { id: 'a', type: 'add' }, { id: 's', type: 'set', params: { reg: 'n' } }, { id: 'out', type: 'output', params: { name: 'out' } }], wires: w('r>a.a o>a.b a>s r>out') }

test('the line is what the rule makes of everything said', () => {
  const { steps } = runTicks({ nodes: [script('a', [1, 0, 1]), script('b', [1, 1, 0])], ticks: 3, line: bus })
  assert.deepEqual(steps.map((s) => s.line), [1, 0, 0])
})

test('a register keeps a value from one tick to the next', () => {
  const node = boardNode({ id: 'p', circuit: COUNTER, parts: PARTS })
  const { steps } = runTicks({ nodes: [node], ticks: 4, line: bus })
  assert.deepEqual(steps.map((s) => s.heard.p.outputs.out), [0, 1, 2, 3])
})

test('saying what the line is this very tick is a loop', () => {
  const echo = { nodes: [{ id: 'rx', type: 'rx' }, { id: 'tx', type: 'tx' }], wires: w('rx>tx') }
  const run = runTicks({ nodes: [boardNode({ id: 'p', circuit: echo, parts: PARTS })], ticks: 2, line: bus })
  assert.deepEqual(run.error, { tick: 0, node: 'p', card: 'rx' })
})

test('a board says from its registers and hears the line', () => {
  // Says 1 at tick 0, then says whatever the line was the tick before: once anyone pulls it to 0, it holds it there.
  const relay = { nodes: [{ id: 'r', type: 'bit', params: { reg: 'last' } }, { id: 'rx', type: 'rx' }, { id: 'tx', type: 'tx' }, { id: 's', type: 'set', params: { reg: 'last' } }], wires: w('r>tx rx>s') }
  const { steps } = runTicks({ nodes: [boardNode({ id: 'p', circuit: relay, parts: PARTS }), script('w', [1, 0, 1, 1])], ticks: 4, line: bus })
  assert.deepEqual(steps.map((s) => s.line), [1, 0, 0, 0])
})

test('a packed part that holds registers keeps them per instance', () => {
  const counter = packed({ circuit: COUNTER, inputs: [], outputs: ['out'], holds: true })
  const parts = { ...PARTS, counter }
  // Two counters on one board, each counting on its own: their sum is twice the tick.
  const board = { nodes: [{ id: 'c1', type: 'counter' }, { id: 'c2', type: 'counter' }, { id: 'a', type: 'add' }, { id: 'out', type: 'output', params: { name: 'out' } }], wires: w('c1>a.a c2>a.b a>out') }
  const { steps } = runTicks({ nodes: [boardNode({ id: 'p', circuit: board, parts })], ticks: 3, line: bus })
  assert.deepEqual(steps.map((s) => s.heard.p.outputs.out), [0, 2, 4])
})

test('a packed part with several outputs says from its registers before it hears', () => {
  // Inside: says what it heard the tick before (kept in a register), and gives the line it hears as `got`.
  const inner = {
    nodes: [
      { id: 'in', type: 'input', params: { name: 'line' } }, { id: 'r', type: 'bit', params: { reg: 'k' } }, { id: 's', type: 'set', params: { reg: 'k' } },
      { id: 'say', type: 'output', params: { name: 'say' } }, { id: 'got', type: 'output', params: { name: 'got' } },
    ],
    wires: w('r>say in>s in>got'),
  }
  const relay = packed({ circuit: inner, inputs: ['line'], outputs: ['say', 'got'], holds: true })
  const board = { nodes: [{ id: 'rx', type: 'rx' }, { id: 'p', type: 'relay' }, { id: 'tx', type: 'tx' }, { id: 'out', type: 'output', params: { name: 'out' } }], wires: w('rx>p.line p#say>tx p#got>out') }
  const node = boardNode({ id: 'b', circuit: board, parts: { ...PARTS, relay } })
  const { steps, error } = runTicks({ nodes: [node, script('w', [1, 0, 1, 1])], ticks: 4, line: bus })
  assert.equal(error, undefined)
  assert.deepEqual(steps.map((s) => s.line), [1, 0, 0, 0])
  assert.deepEqual(steps.map((s) => s.heard.b.outputs.out), [1, 0, 0, 0])
})

test('nested packed outputs follow the inner output dependencies', () => {
  const inner = {
    nodes: [{ id: 'in', type: 'input', params: { name: 'line' } }, { id: 'r', type: 'bit', params: { reg: 'k' } }, { id: 's', type: 'set', params: { reg: 'k' } }, { id: 'say', type: 'output', params: { name: 'say' } }, { id: 'got', type: 'output', params: { name: 'got' } }],
    wires: w('in>s r>say in>got'),
  }
  let chosen = inner
  const relay = packed({ circuit: () => chosen, inputs: ['line'], outputs: ['say', 'got'], holds: true })
  const wrapper = {
    nodes: [{ id: 'in', type: 'input', params: { name: 'line' } }, { id: 'p', type: 'relay' }, { id: 'say', type: 'output', params: { name: 'say' } }, { id: 'got', type: 'output', params: { name: 'got' } }],
    wires: w('in>p.line p#say>say p#got>got'),
  }
  const box = packed({ circuit: wrapper, inputs: ['line'], outputs: ['say', 'got'], parts: { ...PARTS, relay }, holds: true })
  const board = { nodes: [{ id: 'rx', type: 'rx' }, { id: 'p', type: 'box' }, { id: 'tx', type: 'tx' }, { id: 'out', type: 'output', params: { name: 'out' } }], wires: w('rx>p.line p#say>tx p#got>out') }
  const node = boardNode({ id: 'b', circuit: board, parts: { ...PARTS, relay, box } })
  const { steps, error } = runTicks({ nodes: [node, script('w', [1, 0, 1, 1])], ticks: 4, line: bus })
  assert.equal(error, undefined)
  assert.deepEqual(steps.map((step) => step.line), [1, 0, 0, 0])
  assert.deepEqual(steps.map((step) => step.heard.b.outputs.out), [1, 0, 0, 0])
  chosen = { ...inner, wires: w('in>s in>say in>got') }
  const changed = boardNode({ id: 'b', circuit: board, parts: { ...PARTS, relay, box } })
  assert.ok(runTicks({ nodes: [changed, script('w', [1])], ticks: 1, line: bus }).error)
})

test('parts defined as data read and keep registers, and two packed counters count apart', async () => {
  const { defineParts } = await import('./parts/define.js')
  const reg = { control: 'select', options: [{ value: 'A' }] }
  const file = { parts: {
    read: { name: 'read', desc: 'd', icon: 'Box', family: 'f', inputs: [], settings: { reg, start: { control: 'number', default: 0, optional: true } }, compute: "circuit:held($reg, $start)" },
    keep: { name: 'keep', desc: 'd', icon: 'Box', family: 'f', inputs: [{ name: 'in' }], settings: { reg }, keeps: { input: 'in', register: 'reg' } },
    inc: { name: 'inc', desc: 'd', icon: 'Box', family: 'f', inputs: [{ name: 'a' }], compute: "circuit:plus(a, 1)" },
  } }
  const { PARTS } = defineParts(file, {})
  // A counter: what A holds, plus one, kept in A; it starts from 0.
  const counter = { nodes: [{ id: 'r', type: 'read', params: { reg: 'A', start: '0' } }, { id: 'i', type: 'inc', params: {} }, { id: 'k', type: 'keep', params: { reg: 'A' } }, { id: 'out', type: 'out', params: { name: 'out' } }], wires: [{ from: 'r', to: 'i', port: 'a' }, { from: 'i', to: 'k', port: 'in' }, { from: 'r', to: 'out', port: 'in' }] }
  const parts = { ...PARTS, out: sink() }
  const one = boardNode({ id: 'b', circuit: counter, parts })
  assert.deepEqual([0, 1, 2].map((t) => one.hear(t).outputs.out), [0, 1, 2])
  // A register kept 「—」 holds it; unkept, its start; with none, 「—」.
  const { BUILTINS } = await import('./parts/builtins.js')
  assert.equal(BUILTINS['circuit:held'].run(['A', 5], {}, { held: () => null }), null)
  assert.equal(BUILTINS['circuit:held'].run(['A', 5], {}, { held: () => undefined }), 5)
  assert.equal(PARTS.read.eval({}, { params: { reg: 'B', start: '' } }, {}), null)
  // Two counters packed on one board, each keeping its own A: one steps by 1, the other by 2.
  const step = { name: 'step', desc: 'd', icon: 'Box', family: 'f', inputs: [{ name: 'a' }, { name: 'by' }], compute: "circuit:plus(a, by)" }
  const by = { name: 'by', desc: 'd', icon: 'Box', family: 'f', inputs: [], settings: { 'n': { control: 'number', default: 0 } }, compute: '$n' }
  const more = defineParts({ ...file, parts: { ...file.parts, step, by } }, {}).PARTS
  const inner = { nodes: [{ id: 'r', type: 'read', params: { reg: 'A', start: '0' } }, { id: 's', type: 'step', params: {} }, { id: 'k', type: 'keep', params: { reg: 'A' } }, { id: 'n', type: 'in', params: { name: 'n' } }, { id: 'out', type: 'out', params: { name: 'out' } }], wires: [{ from: 'r', to: 's', port: 'a' }, { from: 'n', to: 's', port: 'by' }, { from: 's', to: 'k', port: 'in' }, { from: 'r', to: 'out', port: 'in' }] }
  const all = { ...more, in: source(), out: sink() }
  const count = packed({ circuit: inner, inputs: ['n'], outputs: ['out'], parts: all, holds: true })
  const two = { nodes: [{ id: 'one', type: 'by', params: { n: 1 } }, { id: 'two', type: 'by', params: { n: 2 } }, { id: 'p', type: 'count', params: {} }, { id: 'q', type: 'count', params: {} }, { id: 'x', type: 'out', params: { name: 'x' } }, { id: 'y', type: 'out', params: { name: 'y' } }], wires: [{ from: 'one', to: 'p', port: 'n' }, { from: 'two', to: 'q', port: 'n' }, { from: 'p', to: 'x', port: 'in' }, { from: 'q', to: 'y', port: 'in' }] }
  const board = boardNode({ id: 'b2', circuit: two, parts: { ...all, count } })
  assert.deepEqual([0, 1, 2, 3].map((t) => board.hear(t).outputs), [{ x: 0, y: 0 }, { x: 1, y: 2 }, { x: 2, y: 4 }, { x: 3, y: 6 }])
})
