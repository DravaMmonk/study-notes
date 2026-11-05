// The image board as content and saves hold it: blueprint text both ways (a course's references too), how a board
// read from text is laid out, and a packed part running the player's own circuit, on a course written here; and a
// course read, of that course and of every image game, writing nothing into its content.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { GAMES } from '../../../games.js'
import { deepFreeze } from '../../engine/content.js'
import { isDataGame, readContent } from '../../engine/content-node.js'
import { outputImages } from './engine/graph.js'
import { picture } from './items/pictures.js'
import { imageCourse } from './course.js'
import domain from './domain.js'

// A course of three levels: one packs its circuit, one holds that part, one is two tasks.
const L = (s) => ({ zh: s, en: s })
const square = { square: { x0: 4, y0: 4, s: 8 } }
const filter = (id, rest) => ({ id, kind: 'graph', brief: L('b'), scene: 'filter', setup: { target: 'same' }, tests: [{ label: L('t'), in: square }], ...rest })
const level = (id, tasks, once = {}) => ({ id, title: L(id), after: L('a'), intro: [{ t: L('i') }], ...once, tasks })
const content = deepFreeze({
  primitives: ['const', 'add', 'sub', 'mul', 'arith', 'merge'],
  eras: [{ id: 0, foundation: ['wide', 'use', 'two'], chapter: { title: L('c'), lecture: L('l'), question: L('q') } }],
  levels: [
    level('wide', [filter('wide', { solution: ['l = shift[dir=left](in)', 'r = shift[dir=right](in)', 'h = max(l, r)', 'out <- h'] })], { packs: { name: L('p'), desc: L('d') } }),
    level('use', [filter('use', { solution: ['k = const[c="pi/8"]()', 'm = arith[op=mul](in, k)', 'p = own-wide(m)', 'out <- p'], naive: ['out <- in'] })]),
    level('two', [filter('two_1', { solution: ['s = shift[dir=up, n=2](in)', 'out <- s'] }), filter('two_2', { solution: ['t = threshold[t=0.3](in)', 'out <- t'] })]),
  ],
})
const image = imageCourse(content)
const { fromText, toText } = image.kit

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

test('a course’s reference boards, a packed part’s and every task’s, read back to the lines content wrote', () => {
  for (const raw of content.levels) {
    const played = image.levelById[raw.id]
    assert.deepEqual(played.tasks.map((t) => t.key), raw.tasks.map((t) => t.id))
    for (const [k, task] of raw.tasks.entries()) assert.deepEqual(toText(played.tasks[k].solution), task.solution, raw.id)
  }
})

test('a packed part runs the circuit the player passed its level with, in its own course only', () => {
  const input = { in: picture('square') }
  const runOf = (course) => {
    const { solution } = course.levelById.use.tasks[0]
    return () => Array.from(outputImages(solution, course.kit.evaluate(solution, input).values).out.data)
  }
  const run = runOf(image)
  const reference = run()
  const passed = (board) => ({ solved: ['wide'], data: { wide: { ...board, passed: board } }, slots: {} })
  image.syncOwn(passed(fromText(['out <- in'])))
  assert.notDeepEqual(run(), reference)
  // Another read of the same content keeps circuits of its own: the first read's is not its part.
  assert.deepEqual(runOf(imageCourse(content))(), reference)
  assert.notDeepEqual(run(), reference)
  image.syncOwn(passed(image.levelById.wide.tasks[0].solution))
  assert.deepEqual(run(), reference)
})

// Every image game, and the domain's starter, read frozen: a write into its content anywhere in the read throws.
const games = GAMES.map((g) => g.id).filter((id) => isDataGame(id) && readContent(id).domain === 'image')
test('a course read writes nothing into its content, on every image game', () => {
  assert.ok(games.length)
  for (const read of [...games.map((id) => () => readContent(id)), () => readContent('starter', import.meta.dirname)]) {
    const frozen = deepFreeze(read())
    const spec = domain.spec(frozen)
    spec.syncOwn({})
    for (const level of spec.levels) assert.ok(level.tasks.length && level.tasks.every((t) => t.key && t.palette), level.id)
  }
})
