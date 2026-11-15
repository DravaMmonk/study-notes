// node --test games/kit/circuit — a board as text: printed, read back to the same board, and what reading refuses.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { framePart } from './frames.js'
import { headOf, parse, print, read } from './text.js'
import { boardSvg } from './svg.js'
import { withPreset } from './presets.js'

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

test('reading and drawing a blueprint reject a frame redeclared inside itself', () => {
  const text = 'f = box() {\n  body {\n    f = box()\n  }\n}'
  const { errors } = read(text, { nodes: given, wires: [] }, parts, TYPES)
  assert.match(errors[0].en, /Line 3: .*written twice/)
  assert.throws(() => boardSvg(text), (error) => error.en === errors[0].en)
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

test('a setting called value is a setting like any other', () => {
  const { graph, errors } = read('k = const[value=10]()\nout <- k', { nodes: given, wires: [] }, parts, TYPES)
  assert.equal(errors, undefined)
  const k = graph.nodes.find((n) => n.id === 'k')
  assert.deepEqual(k.params, { value: 10 })
  assert.equal(k.value, undefined)
  assert.match(print(graph, parts), /k = const\[value=10\]\(\)/)
})

test('parse keeps what it reads apart from the board', () => {
  assert.deepEqual(parse('x = and(_, y.k)'), { statements: [{ id: 'x', type: 'and', settings: {}, in: null, line: 1 }], wires: [{ from: 'y#k', to: 'x', port: 1, line: 1, by: 0 }] })
})

test('a given node a wire reads is switched on to give it, when the game says it can', () => {
  // A given card with outputs it reads only once switched on (params.on), offering sun and rain.
  const card = { id: 'sky', type: 'sky', params: { on: [] }, x: 20, y: 280 }
  const sky = {
    ...parts,
    role: (n) => (n.type === 'sky' ? 'source' : parts.role(n)),
    inputs: (n) => (n.type === 'sky' ? [] : parts.inputs(n)),
    outputs: (n) => (n.type === 'sky' ? n.params.on.map((key) => ({ key })) : parts.outputs(n)),
    text: { ...parts.text, sets: (n) => (n.type === 'sky' ? ['on'] : []), opens: (n, key) => (['sun', 'rain'].includes(key) ? { on: ['sun', 'rain'].filter((k) => k === key || n.params.on.includes(k)) } : null) },
  }
  const fresh = { nodes: [...given, card], wires: [] }
  const { graph, errors } = read('a = and(sky.rain, sky.sun)\nout <- a', fresh, sky, TYPES)
  assert.equal(errors, undefined)
  assert.deepEqual(graph.nodes.find((n) => n.id === 'sky').params, { on: ['sun', 'rain'] })
  assert.deepEqual(shape(graph).wires, ['a>out.in', 'sky#rain>a.a', 'sky#sun>a.b'])
  assert.deepEqual(card.params, { on: [] }, 'the board on screen is left as it was')
  assert.deepEqual(read('a = and(sky.snow, Rain)', fresh, sky, TYPES).errors.map((e) => e.en), ['Line 1: “sky” has no output “snow”.'])
})

test('a malformed quoted escape is reported on its blueprint line', () => {
  const { errors } = read(String.raw`a = and[setting="\q"](Rain, Wind)`, { nodes: [], wires: [] }, {}, [])
  assert.equal(errors[0].line, 1)
  assert.match(errors[0].en, /Invalid escape/)
})

test('a blueprint reads against preset parts and wires and cannot override them', () => {
  const opening = withPreset({ nodes: given, wires: [] }, {
    nodes: [{ id: 'n', type: 'not', params: { mode: 'sharp', note: 'old' }, fixed: ['mode'], x: 100, y: 100 }],
    wires: [{ from: 'Rain', to: 'n', port: 'a' }],
  })
  const imported = read('out <- n', opening, parts, TYPES)
  assert.equal(imported.errors, undefined)
  assert.deepEqual(imported.graph.nodes.at(-1), opening.nodes.at(-1))
  assert.deepEqual(imported.graph.wires, [...opening.wires, { from: 'n', to: 'out', port: 'in' }])
  const roundTrip = read(print(imported.graph, parts), opening, parts, TYPES)
  assert.deepEqual(roundTrip, imported)
  const edited = read('n[note=new](Rain)\nout <- n', opening, parts, TYPES)
  assert.deepEqual(edited.graph.nodes.at(-1).params, { mode: 'sharp', note: 'new' })
  for (const [text, reason] of [
    ['n = not[mode=soft]()', /Line 1: The level fixes/],
    ['n = and()', /Line 1: .*type and region are fixed/],
    ['n = not(Wind)', /Line 1: This wire came with the level/],
  ]) assert.match(read(text, opening, parts, TYPES).errors[0].en, reason)
})

test('blueprint cycle checks include connections omitted because they are preset', () => {
  const opening = withPreset({ nodes: given, wires: [] }, {
    nodes: [{ id: 'a', type: 'not' }, { id: 'b', type: 'not' }],
    wires: [{ from: 'a', to: 'b', port: 'a' }],
  })
  assert.match(read('a = not(b)', opening, parts, TYPES).errors[0].en, /make a loop/)
})

test('an imported replacement keeps the frame required by a locked card inside', () => {
  const saved = { ...board, nodes: board.nodes.map((node) => node.id === 'm' ? { ...node, locked: true } : node) }
  const { graph, errors } = read('out <- f', saved, parts, TYPES)
  assert.equal(errors, undefined)
  assert.deepEqual(graph.nodes.filter((node) => parts.role(node) === 'part').map(({ id }) => id), ['f', 'm'])
  assert.equal(graph.nodes.find((node) => node.id === 'm').in, 'f/body')
  assert.match(read('f = not(Rain)', saved, parts, TYPES).errors[0].en, /type and region are fixed/)
})
