// The image board as content and saves hold it: blueprint text both ways (every level's reference too), how a board
// read from text is laid out, boards saved before version 15, and a packed part running the player's own circuit.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readContent } from '../../engine/content-node.js'
import { fromText, toText } from './engine/board.js'
import { evaluate, outputImages } from './engine/graph.js'
import { OWN } from './engine/own.js'
import { savesOf } from './items/migrations.js'
import { picture } from './items/pictures.js'
import { imageCourse } from './course.js'

const content = readContent('vision-complete')
const image = imageCourse(content)

test('blueprint text reads into a board and writes back the same', () => {
  const lines = ['k = const[c="pi/8"]()', 's = shift[dir=left, n=2](in)', 'm = arith[op=mul](s, k)', 'out <- m']
  const b = fromText(lines)
  assert.deepEqual(b.nodes.find((n) => n.id === 's').params, { dir: 'left', n: 2, border: 'zero' })
  assert.equal(b.nodes.find((n) => n.id === 'k').params.c, Math.PI / 8)
  assert.deepEqual(b.wires.filter((w) => w.to === 'm'), [{ from: 's', to: 'm', port: 'a' }, { from: 'k', to: 'm', port: 'b' }])
  assert.deepEqual(toText(b), lines)
})

test('blueprint text names the line it cannot read', () => {
  assert.throws(() => fromText(['s = nope(in)', 'out <- s']), (e) => e.line === 1 && /nope/.test(e.en))
  assert.throws(() => fromText(['s = shift[speed=2](in)', 'out <- s']), (e) => e.line === 1 && /speed/.test(e.en))
  assert.throws(() => fromText(['out <- s']), (e) => e.line === 1)
})

test('a board read from text has each part a column after what it reads, and its outputs after them all', () => {
  const b = fromText(['a = shift[dir=left](in)', 'k = const[c=2]()', 'm = arith[op=mul](a, k)', 'out <- m'])
  const at = Object.fromEntries(b.nodes.map((n) => [n.id, n.x]))
  assert.ok(at.in < at.a && at.a === at.k && at.k < at.m && at.m < at.out)
  const cards = b.nodes.map((n) => `${n.x},${n.y}`)
  assert.equal(new Set(cards).size, cards.length)
})

test('every level’s reference boards read back to the lines content wrote', () => {
  for (const raw of content.levels) {
    const played = image.levelById[raw.id]
    for (const [k, task] of (raw.tasks ?? [raw]).entries()) {
      const board = (played.tasks?.[k] ?? played).solution
      if (task.solution) assert.deepEqual(toText(board), task.solution, raw.id)
    }
  }
})

test('a board saved before version 15 has Shift’s arrows and the reparameterisation’s Greek ports spelt in ASCII', () => {
  const step = savesOf(content.saves).find((s) => s.version === 15)
  const ascii = step.ops[0].data
  const old = { nodes: [{ id: 's', type: 'shift', params: { dir: '→' } }], wires: [{ from: 'm', to: 'r', port: 'μ' }, { from: 'e', to: 'r', port: 'ε' }] }
  const now = ascii({ ...old, passed: old })
  assert.equal(now.nodes[0].params.dir, 'right')
  assert.deepEqual(now.wires.map((w) => w.port), ['mu', 'eps'])
  assert.deepEqual(now.passed, { nodes: now.nodes, wires: now.wires })
  assert.equal(ascii(null), null)
})

test('a packed part runs the circuit the player passed its level with', () => {
  const level = image.levelById['6-3']
  const input = { in: picture('square') }
  const run = () => Array.from(outputImages(level.solution, evaluate(level.solution, input).values).out.data)
  const reference = run()
  try {
    OWN.set('6-2', fromText(['out <- in']))
    assert.notDeepEqual(run(), reference)
    image.syncOwn({ solved: ['6-2'], data: { '6-2': { ...image.levelById['6-2'].solution, passed: image.levelById['6-2'].solution } }, slots: {} })
    assert.deepEqual(run(), reference)
  } finally {
    OWN.clear()
  }
})
