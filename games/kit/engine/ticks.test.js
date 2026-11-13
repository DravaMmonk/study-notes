// node --test games/kit/engine — the tick world on small boards of plain numbers.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { packed, sink, source } from './boards.js'
import { boardNode, drive, hearing, reacting, register, runTicks, store } from './ticks.js'

const PARTS = {
  input: source(),
  output: sink(),
  rx: hearing(),
  tx: drive(),
  reg: register({ start: 0 }),
  bit: register({ start: 1 }),
  set: store(),
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

test('a world answers a board: what the board gives this tick is what the world shows it the next', () => {
  // The board doubles what it reads; the world shows it back one more than it was given.
  const circuit = { nodes: [{ id: 'seen', type: 'input', params: { name: 'seen' } }, { id: 'a', type: 'add' }, { id: 'out', type: 'output', params: { name: 'out' } }], wires: w('seen>a.a seen>a.b a>out') }
  const world = reacting({ board: 'you', start: 1, reads: (state) => ({ seen: state }), step: (state, { out }) => ({ state: out + 1, shown: { was: state, given: out } }) })
  const run = runTicks({ nodes: [boardNode({ id: 'you', circuit, parts: PARTS, bind: world.bind }), world.node], ticks: 3, line: () => null })
  assert.deepEqual(run.steps.map((s) => s.heard.world), [{ was: 1, given: 2 }, { was: 3, given: 6 }, { was: 7, given: 14 }])
})
