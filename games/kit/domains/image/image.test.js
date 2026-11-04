// The image board as content and saves hold it: blueprint text both ways (a course's references too), how a board
// read from text is laid out, and a packed part running the player's own circuit, on a course written here.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fromText, toText } from './engine/board.js'
import { evaluate, outputImages } from './engine/graph.js'
import { OWN } from './engine/own.js'
import { picture } from './items/pictures.js'
import { imageCourse } from './course.js'

// A course of three levels: one packs its circuit, one holds that part, one is two tasks.
const L = (s) => ({ zh: s, en: s })
const square = { square: { x0: 4, y0: 4, s: 8 } }
const filter = (rest) => ({ scene: 'filter', setup: { target: 'same' }, tests: [{ label: L('t'), in: square }], ...rest })
const content = {
  primitives: ['const', 'add', 'sub', 'mul', 'arith', 'merge'],
  eras: [{ id: 0, foundation: ['wide', 'use', 'two'], chapter: { title: L('c'), lecture: L('l'), question: L('q') } }],
  levels: [
    { id: 'wide', kind: 'graph', packs: { name: L('p'), desc: L('d') }, ...filter({ solution: ['l = shift[dir=left](in)', 'r = shift[dir=right](in)', 'h = max(l, r)', 'out <- h'] }) },
    { id: 'use', kind: 'graph', ...filter({ solution: ['k = const[c="pi/8"]()', 'm = arith[op=mul](in, k)', 'p = own-wide(m)', 'out <- p'], naive: ['out <- in'] }) },
    { id: 'two', kind: 'graph', tasks: [filter({ solution: ['s = shift[dir=up, n=2](in)', 'out <- s'] }), filter({ solution: ['t = threshold[t=0.3](in)', 'out <- t'] })] },
  ],
}
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

test('a course’s reference boards, a packed part’s and a task’s too, read back to the lines content wrote', () => {
  for (const raw of content.levels) {
    const played = image.levelById[raw.id]
    for (const [k, task] of (raw.tasks ?? [raw]).entries()) {
      const board = (played.tasks?.[k] ?? played).solution
      if (task.solution) assert.deepEqual(toText(board), task.solution, raw.id)
    }
  }
})

test('a packed part runs the circuit the player passed its level with', () => {
  const level = image.levelById.use
  const input = { in: picture('square') }
  const run = () => Array.from(outputImages(level.solution, evaluate(level.solution, input).values).out.data)
  const reference = run()
  try {
    OWN.set('wide', fromText(['out <- in']))
    assert.notDeepEqual(run(), reference)
    image.syncOwn({ solved: ['wide'], data: { wide: { ...image.levelById.wide.solution, passed: image.levelById.wide.solution } }, slots: {} })
    assert.deepEqual(run(), reference)
  } finally {
    OWN.clear()
  }
})
