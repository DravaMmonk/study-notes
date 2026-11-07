// Training a vision board (train.js): gradients through the vision resources (grad.js) match finite differences, a
// kernel is learned back from its own outputs, and a two-layer board learns what one layer cannot.
import test from 'node:test'
import assert from 'node:assert/strict'
import { Tape, backward } from '../../engine/tape.js'
import { runBoard } from '../../engine/boards.js'
import { PARTS, PRIMITIVES } from './fixture.js'
import { board } from './board.js'
import { RULES } from './grad.js'
import { influence, lossOf, train } from './train.js'
import { fromRows, make, toRows } from './image.js'
import { filterImage } from './operators.js'

const parts = (type) => PARTS[type]
const read = (lines, inputs = ['image'], outputs = ['out']) => board.fromText(lines, { inputs: inputs.map((name) => ({ name })), outputs: outputs.map((name) => ({ name })) }, PRIMITIVES)
const picture = (seed, w = 6, h = 5) => make(w, h, 1, (x, y) => ((Math.sin(seed * 12.9898 + x * 78.233 + y * 37.719) * 43758.5453) % 1 + 1) % 1)

test('gradients through shift, the weighted line, the kernel filter, max and total match finite differences', () => {
  const lines = ['k = learn[shape=kernel3]()', 'f = kernelFilter[outside=zero](image,k)', 'd = direction[way=right]()', 's = shift[outside=reflect](f,d)', 'z = const[value=0]()', 'r = max(s,z)', 'w = learn[shape=row3]()', 'l = weightedLine[outside=clamp](r,w,d)', 't = total(l)', 'out <- t']
  const circuit = read(lines)
  const kernel = [[0.1, -0.2, 0.3], [0.05, 0.4, -0.1], [0.2, 0, -0.3]]
  const weights = [[0.3, -0.5, 0.7]]
  const withValues = (k, w) => ({ ...circuit, nodes: circuit.nodes.map((n) => (n.id === 'k' ? { ...n, params: { ...n.params, value: k } } : n.id === 'w' ? { ...n, params: { ...n.params, value: w } } : n)) })
  const image = picture(1)
  const value = (k, w) => runBoard(withValues(k, w), { parts, bind: { image } }).outputs.out
  const tape = new Tape()
  const run = runBoard(withValues(kernel, weights), { parts, bind: { image }, ctx: { tape } })
  const grads = backward(tape, run.ids.get(circuit.nodes.find((n) => n.type === 'out').id), 1, RULES)
  const gk = grads.get(tape.leaves.get('k').id)
  const gw = grads.get(tape.leaves.get('w').id)
  const h = 1e-6
  for (let k = 0; k < 9; k++) {
    const up = kernel.map((row) => row.slice()); up[Math.floor(k / 3)][k % 3] += h
    const down = kernel.map((row) => row.slice()); down[Math.floor(k / 3)][k % 3] -= h
    assert.ok(Math.abs(gk.data[k] - (value(up, weights) - value(down, weights)) / (2 * h)) < 1e-5, `kernel ${k}`)
  }
  for (let k = 0; k < 3; k++) {
    const up = [weights[0].slice()]; up[0][k] += h
    const down = [weights[0].slice()]; down[0][k] -= h
    assert.ok(Math.abs(gw.data[k] - (value(kernel, up) - value(kernel, down)) / (2 * h)) < 1e-5, `weight ${k}`)
  }
})

test('a kernel is learned back from the pictures it made', () => {
  const sobel = fromRows([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]])
  const examples = [1, 2, 3, 4].map((seed) => {
    const image = picture(seed)
    return { inputs: { image }, expect: { out: filterImage(image, sobel, { outside: 'clamp' }) } }
  })
  const circuit = read(['k = learn[shape=kernel3]()', 'f = kernelFilter[outside=clamp](image,k)', 'out <- f'])
  const result = train({ circuit, parts, examples, output: 'out', rate: 0.5, epochs: 400, momentum: 0.8 })
  const learned = result.circuit.nodes.find((n) => n.id === 'k').params.value
  learned.flat().forEach((v, k) => assert.ok(Math.abs(v - sobel.data[k]) < 0.02, `${k}: ${v}`))
  assert.ok(result.curve.train[result.curve.train.length - 1] < result.curve.train[0] / 1000)
  assert.deepEqual(result.blocked, [])
})

test('cross-entropy on class probabilities: its gradient is p − y through softmax', () => {
  const p = fromRows([[0.2, 0.7, 0.1]])
  const y = fromRows([[0, 1, 0]])
  const { value, grad } = lossOf(p, y, 'crossEntropy')
  assert.ok(Math.abs(value + Math.log(0.7)) < 1e-12)
  const through = RULES.grad('softmax', grad, { args: [null], out: p, named: {} })[0]
  toRows(through)[0].forEach((v, k) => assert.ok(Math.abs(v - (p.data[k] - y.data[k])) < 1e-12))
})

test('one weighted sum cannot learn exclusive-or; a hidden layer with max(·, 0) can', () => {
  const pts = [[0, 0, 0], [0, 1, 1], [1, 0, 1], [1, 1, 0]]
  const examples = pts.map(([a, b, y]) => ({ inputs: { a, b }, expect: { out: y } }))
  const unit = (n, x, y) => [`w${n}a = learn()`, `w${n}b = learn()`, `b${n} = learn()`, `p${n}a = mul(${x},w${n}a)`, `p${n}b = mul(${y},w${n}b)`, `s${n} = add(p${n}a,p${n}b)`, `t${n} = add(s${n},b${n})`]
  const one = read([...unit(1, 'a', 'b'), 'out <- t1'], ['a', 'b'])
  const flat = train({ circuit: one, parts, examples, output: 'out', rate: 0.2, epochs: 400 })
  assert.ok(flat.curve.train[flat.curve.train.length - 1] > 0.24)
  const hidden = [1, 2, 3].flatMap((k) => [...unit(k, 'a', 'b'), `h${k} = max(t${k},z)`, `v${k} = learn()`, `q${k} = mul(h${k},v${k})`])
  const two = read(['z = const[value=0]()', ...hidden, 'c = learn()', 'r1 = add(c,q1)', 'r2 = add(r1,q2)', 'r3 = add(r2,q3)', 'out <- r3'], ['a', 'b'])
  const deep = train({ circuit: two, parts, examples, output: 'out', rate: 0.05, epochs: 800, optimizer: 'adam', restarts: 3 })
  assert.ok(deep.curve.train[deep.curve.train.length - 1] < 0.01, String(deep.curve.train[deep.curve.train.length - 1]))
})

test('a frozen parameter is left as it is while the others learn', () => {
  const examples = [1, 2].map((seed) => ({ inputs: { image: picture(seed) }, expect: { out: picture(seed + 10) } }))
  const lines = ['k = learn[shape=kernel3,frozen=true]()', 'f = kernelFilter[outside=clamp](image,k)', 'b = learn()', 'g = add(f,b)', 'out <- g']
  const frozen = read(lines)
  const kept = [[0, 0, 0], [0, 1, 0], [0, 0, 0]]
  const start = { ...frozen, nodes: frozen.nodes.map((n) => (n.id === 'k' ? { ...n, params: { ...n.params, value: kept } } : n)) }
  const result = train({ circuit: start, parts, examples, output: 'out', rate: 0.1, epochs: 20 })
  assert.deepEqual(result.circuit.nodes.find((n) => n.id === 'k').params.value, kept)
  assert.notEqual(result.circuit.nodes.find((n) => n.id === 'b').params.value, 0)
})

test('bilinear sampling passes gradients to the image and to the coordinates, as finite differences say', () => {
  const lines = ['dx = learn()', 'g = grid(w,h)', 'xs = add(g.x,dx)', 's = sample[method=bilinear,outside=clamp](image,xs,g.y)', 't = total(s)', 'sq = mul(t,t)', 'out <- sq']
  const circuit = board.fromText(lines, { inputs: [{ name: 'image' }, { name: 'w' }, { name: 'h' }], outputs: [{ name: 'out' }] }, PRIMITIVES)
  const image = make(5, 4, 1, (x, y) => Math.sin(x * 1.3) + 0.4 * y * y)
  const value = (dx) => runBoard({ ...circuit, nodes: circuit.nodes.map((n) => (n.id === 'dx' ? { ...n, params: { ...n.params, value: dx } } : n)) }, { parts, bind: { image, w: 5, h: 4 } }).outputs.out
  const tape = new Tape()
  const set = { ...circuit, nodes: circuit.nodes.map((n) => (n.id === 'dx' ? { ...n, params: { ...n.params, value: 0.37 } } : n)) }
  const run = runBoard(set, { parts, bind: { image, w: 5, h: 4 }, ctx: { tape } })
  const g = backward(tape, run.ids.get(circuit.nodes.find((n) => n.type === 'out').id), 1, RULES).get(tape.leaves.get('dx').id)
  const h = 1e-6
  assert.ok(Math.abs(g - (value(0.37 + h) - value(0.37 - h)) / (2 * h)) < 1e-5, `${g}`)
})

test('one 3 × 3 layer sees 3 × 3 of the input, two layers see 5 × 5', () => {
  const box = [[1, 1, 1], [1, 1, 1], [1, 1, 1]]
  const one = read(['k = learn[shape=kernel3]()', 'f = kernelFilter[outside=zero](image,k)', 'out <- f'])
  const two = read(['k = learn[shape=kernel3]()', 'f = kernelFilter[outside=zero](image,k)', 'g = kernelFilter[outside=zero](f,k)', 'out <- g'])
  const withBox = (c) => ({ ...c, nodes: c.nodes.map((n) => (n.id === 'k' ? { ...n, params: { ...n.params, value: box } } : n)) })
  const reach = (c) => influence({ circuit: withBox(c), parts, inputs: { image: make(9, 9, 1, 0.5) }, output: 'out', x: 4, y: 4 }).image.data.filter((v) => v !== 0).length
  assert.equal(reach(one), 9)
  assert.equal(reach(two), 25)
})
