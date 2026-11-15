// The image board as content and saves hold it: blueprint text both ways (a course's references too), how a board
// read from text is laid out, and a packed part running the player's own circuit, on a course written here; and a
// course read, of that course and of every image game, writing nothing into its content.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deepFreeze } from '../../engine/content.js'
import { readContent } from '../../engine/content-node.js'
import { fresh } from '../../shell/progress.js'
import { boxBlur3, gradientMagnitude, horizontalDifference, sobelGradient, squaredGradient } from './engine/filters.js'
import { at, fromFn } from './engine/image.js'
import { ransacLine, robustHomography } from './engine/match.js'
import { MATCHING } from './engine/parts/matching.js'
import { picture } from './items/pictures.js'
import { constraintOf, depthOf } from './items/constraints.js'
import { imageCourse } from './course.js'
import { imageBoards } from './engine/board-view.js'
import { play } from './play.js'
import domain from './domain.js'

// A course of three levels: one a built piece runs, one holds that piece, one is two tasks.
const L = (s) => ({ zh: s, en: s })
const square = { square: { x0: 4, y0: 4, s: 8 } }
const filter = (id, rest) => ({ id, kind: 'graph', brief: L('b'), scene: 'filter', setup: { target: 'same' }, tests: [{ label: L('t'), in: square }], ...rest })
const level = (id, tasks, once = {}) => ({ id, title: L(id), after: L('a'), intro: [{ t: L('i') }], ...once, tasks })
const content = deepFreeze({
  primitives: ['const', 'add', 'sub', 'mul', 'arith', 'merge'],
  eras: [{ id: 0, foundation: ['wide', 'use', 'two'], chapter: { title: L('c'), label: L('l'), question: L('q') } }],
  levels: [
    level('wide', [filter('wide', { solution: ['l = shift[dir=left](in)', 'r = shift[dir=right](in)', 'h = max(l, r)', 'out <- h'] })]),
    level('use', [filter('use', { solution: ['k = const[c="pi/8"]()', 'm = arith[op=mul](in, k)', 'p = widen(m)', 'out <- p'], naive: ['out <- in'] })]),
    level('two', [filter('two_1', { solution: ['s = shift[dir=up, n=2](in)', 'out <- s'] }), filter('two_2', { carries: true, solution: ['t = threshold[t=0.3](in)', 'out <- t'] })], { adds: ['shift'] }),
  ],
  partDefs: { parts: { widen: { name: L('p'), desc: L('d'), inside: [{ task: 'wide' }] } } },
})
const image = imageCourse(content)
const { fromText, toText } = image.kit

test('shared neighbourhood filters preserve signs, scaling and edge padding', () => {
  const ramp = fromFn(3, 3, (x, y) => 2 * x + 4 * y)
  const [gx, gy] = sobelGradient(ramp, 'edge')
  assert.deepEqual([at(gx, 1, 1), at(gy, 1, 1)], [2, 4])
  assert.deepEqual([at(gx, 0, 0), at(gy, 0, 0)], [1, 2])
  assert.equal(at(gradientMagnitude(ramp), 1, 1), Math.fround(Math.sqrt(20)))
  assert.equal(at(squaredGradient(ramp), 1, 1), 20)
  assert.ok(Math.abs(at(boxBlur3(ramp), 1, 1) - 6) < 1e-6)
  assert.deepEqual(Array.from(horizontalDifference(ramp).data.slice(0, 3)), [2, 2, -4])
})

test('line and homography estimation stop before sampling when there are too few points', () => {
  const next = () => assert.fail('not enough points to sample')
  assert.equal(ransacLine([], 10, 1, next), null)
  assert.equal(ransacLine([[0, 0]], 10, 1, next), null)
  const tooFew = [[0, 0], [1, 0], [0, 1]].map((point) => ({ from: point, to: point }))
  assert.equal(robustHomography(tooFew, 10, next), null)
  assert.throws(() => MATCHING.homography.eval({ pairs: { w: 4, data: [0, 0, 0, 0] } }, { k: 10 }), /do not fix a homography/)
  const onePoint = fromFn(2, 2, (x, y) => Number(!x && !y))
  assert.deepEqual(Array.from(MATCHING.ransac.eval({ in: onePoint }, { k: 10 }).data), [0, 0, 0, 0])
})

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
    return () => Array.from(course.kit.evaluate(solution, input).outputs.out.data)
  }
  const run = runOf(image)
  const reference = run()
  const passed = (board) => ({ solved: ['wide'], data: { wide: { ...board, passed: board } }, slots: {} })
  image.syncOwn(passed(fromText(['out <- in'])))
  assert.notDeepEqual(run(), reference)
  // Another read of the same content keeps circuits of its own: the first read's is not its part.
  assert.deepEqual(runOf(imageCourse(content))(), reference)
  assert.notDeepEqual(run(), reference)
  const dangling = fromText(['out <- in'])
  image.syncOwn(passed({ ...dangling, wires: [{ from: 'missing', to: 'out', port: 'in' }] }))
  assert.deepEqual(run(), reference)
  image.syncOwn(passed(image.levelById.wide.tasks[0].solution))
  assert.deepEqual(run(), reference)
})

test('image text play opens on the same valid inherited board as the editor', () => {
  const [previous, task] = image.levelById.two.tasks
  const circuit = imageBoards(image)
  const context = (board) => ({
    game: { image, circuit }, level: { ...task, source: task }, flags: new Set(['shift']),
    progress: { ...fresh(), passed: [previous.key], built: { [previous.key]: board } },
  })
  assert.match(play.open(context(previous.solution)).start, /shift/)
  const corrupt = { ...previous.solution, wires: previous.solution.wires.map((wire) => wire.from === 'in' ? { ...wire, from: 'in#r' } : wire) }
  assert.equal(play.open(context(corrupt)).start, null)
})

test('image text play preserves the three channels of each pixel', () => {
  const task = image.levelById.wide.tasks[0]
  const rgb = { w: 2, h: 1, c: 3, data: new Float32Array([0.125, 0.25, 0.5, 1, 0, 0.75]) }
  const output = { w: 1, h: 1, c: 3, data: [0, 0.5, 1] }
  const source = { ...task, tests: [{ label: 'colour', inputs: { in: rgb }, expected: { out: output } }] }
  const opened = play.open({
    game: { image, circuit: imageBoards(image) }, level: { ...source, source }, flags: new Set(), progress: fresh(),
  })
  assert.equal(opened.tests[0].text, 'in:\n2×1 · RGB\n(0.13,0.25,0.5) (1,0,0.75)\nout (target):\n1×1 · RGB\n(0,0.5,1)')
})

test('a packed image trace and its test verdict share the evaluated output', () => {
  const task = image.levelById.use.tasks[0]
  const [run] = image.kit.runLevel(task, task.solution, { traced: true }).runs
  const inside = run.trace?.find(({ path, id }) => path?.[0] === 'p' && id === 'h')
  assert.ok(inside)
  assert.equal(inside.value, run.outputs.out)
  assert.equal(image.kit.runLevel(task, task.solution).runs[0].trace, undefined)
  const direct = image.levelById.wide.tasks[0]
  assert.equal(image.kit.runLevel(direct, direct.solution, { traced: true }).runs[0].trace, undefined)
})

// The domain's starter read frozen: a write into its content anywhere in the read throws.
test('a course read writes nothing into its content', () => {
  const spec = domain.spec(deepFreeze(readContent('starter', import.meta.dirname)))
  spec.syncOwn({})
  for (const level of spec.levels) assert.ok(level.tasks.length && level.tasks.every((t) => t.key && t.palette), level.id)
})

test('network constraints follow wires from named outputs', () => {
  const nodes = [{ id: 'in', type: 'input' }, { id: 'out', type: 'output' }]
  const encoded = {
    nodes: [...nodes, { id: 'e', type: 'dg_encode', params: { k: 2 } }],
    wires: [{ from: 'in', to: 'e', port: 'input' }, { from: 'e', to: 'out', port: 'r' }],
  }
  const bottleneck = constraintOf({ bottleneck: { max: 2 } })
  assert.equal(bottleneck({}, encoded), '')
  const bypass = { ...encoded, wires: [...encoded.wires, { from: 'in#b', to: 'out', port: 'b' }] }
  assert.match(bottleneck({}, bypass).en, /does not pass through the encoder/)

  const layers = {
    nodes: [...nodes, { id: 'a', type: 'learn3' }, { id: 'b', type: 'lrnConv' }],
    wires: [{ from: 'in#r', to: 'a', port: 'input' }, { from: 'a#result', to: 'b', port: 'input' }, { from: 'b#result', to: 'out', port: 'in' }],
  }
  assert.equal(depthOf(layers), 2)
})
