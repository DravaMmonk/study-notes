// node --test games/kit/circuit — a board as text: printed, read back to the same board, and what reading refuses.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { framePart } from './frames.js'
import { headOf, parse, print, read } from './text.js'

// A small game: two inputs and an output given by the level, gates with ports a and b, a constant with a value, a
// part with two outputs, and a box (a frame with one region that opens a value).
const box = framePart([], [{ name: 'body', opens: true }])
const INPUTS = { and: ['a', 'b'], not: ['a'], const: [], split: ['a'], box: box.inputs }
const parts = {
  role: (n) => (n.type === 'in' ? 'source' : n.type === 'out' ? 'sink' : 'part'),
  inputs: (n) => (n.type === 'out' ? ['in'] : n.type === 'in' ? [] : INPUTS[n.type]),
  outputs: (n) => (n.type === 'split' ? [{ key: 'hi' }, { key: 'lo' }] : n.type === 'box' ? [{ key: null }, { key: 'body' }] : null),
  frames: (n) => (n.type === 'box' ? box.frames() : []),
  text: { value: (_n, _k, v) => (v === '→' ? 'right' : v), read: (_n, _k, v) => (v === 'right' ? '→' : v) },
}
const TYPES = ['and', 'not', 'const', 'split', 'box']
const given = [
  { id: 'Rain', type: 'in', params: { name: 'Rain' }, x: 20, y: 40 },
  { id: 'Wind', type: 'in', params: { name: 'Wind' }, x: 20, y: 160 },
  { id: 'out', type: 'out', params: { name: 'out' }, x: 760, y: 40 },
]
const board = {
  nodes: [
    ...given,
    { id: 'n', type: 'not', params: {}, x: 220, y: 40 },
    { id: 'a', type: 'and', params: { dir: '→', w: [0.25, -1, 2e-3], m: { k: 'x y' } }, x: 400, y: 40 },
    { id: 's', type: 'split', params: {}, x: 300, y: 300 },
    { id: 'f', type: 'box', params: {}, x: 500, y: 300 },
    { id: 'm', type: 'and', params: {}, in: 'f/body', x: 44, y: 20 },
  ],
  wires: [
    { from: 'Wind', to: 'n', port: 'a' },
    { from: 'n', to: 'a', port: 'b' },
    { from: 'Rain', to: 's', port: 'a' },
    { from: 'f#body', to: 'm', port: 'a' },
    { from: 's#lo', to: 'm', port: 'b' },
    { from: 'm', to: 'f', port: 'body' },
    { from: 'a', to: 'out', port: 'in' },
  ],
}
const shape = (g) => ({
  nodes: g.nodes.map(({ id, type, params, in: region }) => JSON.stringify({ id, type, params: params ?? {}, in: region ?? null })).sort(),
  wires: g.wires.map((w) => `${w.from}>${w.to}.${w.port}`).sort(),
})

test('a board prints as ASCII and reads back to itself', () => {
  const text = print(board, parts, { game: 'demo', level: 'g-1' })
  assert.match(text, /^[\x09\x0a\x20-\x7e]*$/)
  assert.deepEqual(headOf(text), { game: 'demo', level: 'g-1' })
  assert.match(text, /a = and\[dir=right, w=\[0\.25, -1, 0\.002\], m=\{k: "x y"\}\]\(_, n\)/)
  assert.match(text, /f = box\(body: m\) \{\n  body \{\n    m = and\(f\.body, s\.lo\)\n  \}\n\}/)
  assert.match(text, /\nout <- a\n/)
  const { graph, errors } = read(text, board, parts, TYPES)
  assert.equal(errors, undefined)
  assert.deepEqual(shape(graph), shape(board))
  // Parts keep their places; the level's nodes are the board's own.
  assert.deepEqual(graph.nodes.find((n) => n.id === 'a'), { ...board.nodes.find((n) => n.id === 'a') })
})

test('a text read onto a fresh board lays new cards out', () => {
  const fresh = { nodes: given, wires: [] }
  const { graph } = read(print(board, parts), fresh, parts, TYPES)
  assert.deepEqual(shape(graph), shape(board))
  assert.ok(graph.nodes.every((n) => Number.isFinite(n.x) && Number.isFinite(n.y)))
})

test('hand-written text: comments, named ports, any order', () => {
  const text = '# my notes, in any script: 笔记\nout <- a   # the answer\na = and(b: n, a: Rain)\nn = not(Wind)\n'
  const { graph, errors } = read(text, { nodes: given, wires: [] }, parts, TYPES)
  assert.equal(errors, undefined)
  assert.deepEqual(shape(graph).wires, ['Rain>a.a', 'Wind>n.a', 'a>out.in', 'n>a.b'])
})

test('what reading refuses, by line', () => {
  const fresh = { nodes: given, wires: [] }
  const errs = (text) => read(text, fresh, parts, TYPES).errors.map((e) => [e.line, e.en])
  assert.deepEqual(errs('n = nand(Rain)'), [[1, 'Line 1: “nand” is not available on this level.']])
  assert.deepEqual(errs('n = not(Rain)\nn = not(Wind)'), [[2, 'Line 2: “n” is written twice.']])
  assert.deepEqual(errs('n = not(Snow)'), [[1, 'Line 1: There is no node called “Snow”.']])
  assert.deepEqual(errs('n = not(Rain, Wind)'), [[1, 'Line 1: “n” has no input number 2.']])
  assert.deepEqual(errs('n = not(s.mid)\ns = split(Rain)'), [[1, 'Line 1: “s” has no output “mid”.']])
  assert.deepEqual(errs('a = and(b, Rain)\nb = and(a, Rain)').map(([l]) => l), [2])
  assert.deepEqual(errs('Rain = not()'), [[1, 'Line 1: “Rain” is given by the level; its type cannot change.']])
  assert.deepEqual(errs('n = nöt(Rain)'), [[1, 'Line 1: Only ASCII characters; found “ö”.']])
  assert.deepEqual(errs('n = not(Rain'), [[1, 'Line 1: It ends too soon; “)” is missing.']])
  // A value made in a box is seen only inside it.
  assert.equal(errs('f = box(body: m) {\n  body {\n    m = and(f.body, Rain)\n  }\n}\nout <- m')[0][0], 6)
})

test('parse keeps what it reads apart from the board', () => {
  assert.deepEqual(parse('x = and(_, y.k)'), { statements: [{ id: 'x', type: 'and', settings: {}, in: null, line: 1 }], wires: [{ from: 'y#k', to: 'x', port: 1, line: 1, by: 0 }] })
})
