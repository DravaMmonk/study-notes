// node --test (npm test) — what a task on the circuit preset holds (board-works.js over ../course.js holds): a part,
// one of its settings, one value of a setting, by the course's progress and by what the task gives or withholds.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkCircuitTasks } from './circuit-preset.js'
import { definedWorks } from './board-works.js'
import { flowBoard } from './board-cards.js'
import { S } from './schema.js'
import { onceRun } from './circuit-run.js'

const text = (zh) => ({ zh })
const OPS = {
  calc: { args: [{ name: 'a' }, { name: 'b' }], params: S.obj({ how: S.oneOf(['plus', 'minus'], { default: 'plus' }) }), run: ([a, b], { how }) => how === 'minus' ? a - b : a + b },
  add: { about: text('a + b'), args: [{ name: 'a' }, { name: 'b' }], run: ([a, b]) => a + b },
  sub: { about: text('a − b'), args: [{ name: 'a' }, { name: 'b' }], run: ([a, b]) => a - b },
}
// One part of two ways: `how` picks adding or subtracting.
const partDefs = { parts: { calc: {
  name: text('算'), desc: text('算两个数'), icon: 'Plus', family: 'value', inputs: [{ name: 'a' }, { name: 'b' }],
  settings: { 'how': { control: 'select', label: text('怎么算'), default: 'plus', options: [{ value: 'plus', label: text('加') }] } },
  op: 'calc',
  stages: [{ id: 'calc-minus', settings: { how: { options: [{ value: 'plus' }, { value: 'minus' }] } } }],
} } }
const ports = { inputs: [{ name: 'a', label: text('a') }, { name: 'b', label: text('b') }], outputs: [{ name: 'out', label: text('结果') }] }
const sums = [{ inputs: { a: 5, b: 3 }, expect: { out: 8 } }, { inputs: { a: 1, b: 1 }, expect: { out: 2 } }]
const differences = [{ inputs: { a: 5, b: 3 }, expect: { out: 2 } }, { inputs: { a: 1, b: 4 }, expect: { out: -3 } }]
const task = (id, tests, how, more = {}) => ({ id, brief: text(id), ...ports, tests, solution: [`c = calc[how=${how}](a, b)`, 'out <- c'], ...more })
const level = (id, tasks, more = {}) => [id, { title: text(id), tasks, ...more }]
const course = (levels, definitions = partDefs) => definedWorks({
  id: 't',
  ...{ vocabulary: 1, title: text('t'), kicker: text('t'), lede: text('t'), primitives: ['calc'], eras: [{ id: 1, title: text('一'), question: text('？'), levels: levels.map(([id]) => ({ id })), links: levels.slice(1).map(([to], i) => ({ from: levels[i][0], to })) }] },
  levels: levels.map(([id, value]) => ({ id, ...value })),
  glossary: { groups: [], entries: [] },
  partDefs: definitions,
}, { board: flowBoard(), ops: OPS })
const failures = (read) => {
  const { runLevel, entries } = onceRun({})
  return checkCircuitTasks(read, { run: runLevel, entries }).filter((l) => l.fail).map((l) => l.text)
}

test('a value a task opens is held from there on, and not before; a value nothing opens is held from the start', () => {
  const read = course([
    level('one', [task('one', sums, 'plus')], { adds: ['calc'] }),
    level('two', [task('two-a', sums, 'plus'), task('two-b', differences, 'minus', { opens: ['calc-minus'] })]),
    level('three', [task('three', differences, 'minus')]),
  ])
  assert.deepEqual(read.wrong, [])
  const has = (id, k) => read.holdsIn(read.played.get(id)[k], [])
  assert.deepEqual([has('one', 0), has('two', 0), has('two', 1), has('three', 0)].map((h) => [h('calc'), h('calc', 'how', 'plus'), h('calc', 'how', 'minus')]), [[true, true, false], [true, true, false], [true, true, true], [true, true, true]])
  assert.deepEqual(failures(read), [])
})

test('a task gives and withholds a value for itself alone, and its answer keeps to what it holds', () => {
  const levels = (two, three) => [
    level('one', [task('one', sums, 'plus')], { adds: ['calc'] }),
    level('two', [two]),
    level('three', [three], { tasks: [{ ...three, opens: ['calc-minus'] }] }),
    level('four', [task('four', differences, 'minus')]),
  ]
  const read = course(levels(task('two', differences, 'minus', { gives: ['calc-minus'] }), task('three', differences, 'minus')))
  const has = (id) => read.holdsIn(read.played.get(id)[0], [])
  // Two is given the way to subtract before three brings it in; one has not got it.
  assert.deepEqual(['one', 'two', 'three', 'four'].map((id) => has(id)('calc', 'how', 'minus')), [false, true, true, true])
  assert.deepEqual(failures(read), [])
  // A task cannot use a value opened by a later task of its own level.
  const premature = course([
    level('one', [task('one', sums, 'plus')], { adds: ['calc'] }),
    level('two', [task('two-a', differences, 'minus'), task('two-b', differences, 'minus', { opens: ['calc-minus'] })]),
  ])
  assert.match(failures(premature).join('\n'), /two: .*sets calc’s how to minus, which the level does not hold/)
  const kept = course([...levels(task('two', sums, 'plus'), task('three', differences, 'minus')).slice(0, 3), level('four', [task('four', sums, 'plus', { withholds: ['calc-minus'] })])])
  assert.deepEqual([kept.holdsIn(kept.played.get('four')[0], [])('calc', 'how', 'minus'), kept.holdsIn(kept.played.get('four')[0], [])('calc', 'how', 'plus')], [false, true])
  assert.deepEqual(failures(kept), [])
})

test('an item a task names is one of the game’s: a part, a setting of several values, a value of it', () => {
  const read = course([level('one', [task('one', sums, 'plus', { withholds: ['gone'], gives: ['calc-missing'], opens: ['calc-times', 'calc'] })], { adds: ['calc'] })])
  assert.deepEqual(read.wrong, [
    'one: withholds names gone: gone is no piece or stage',
    'one: gives names calc-missing: calc-missing is no piece or stage',
    'one: opens names calc-times: calc-times is no piece or stage',

  ])
})

test('a packaged circuit runs even when no task publishes it', () => {
  const reference = { ...ports, solution: ['c = calc[how=plus](a, b)', 'out <- c'] }
  const read = course([
    level('one', [task('one', sums, 'plus', { solution: ['w = wrapped(a, b)', 'out <- w'] })], { adds: ['calc', 'wrapped'] }),
  ], { ...partDefs, parts: { ...partDefs.parts, wrapped: { name: text('wrapped'), desc: text('wrapper'), inside: [{ id: 'base', reference }] } } })
  assert.deepEqual(read.wrong, [])
  assert.deepEqual(failures(read), [])
  assert.equal(read.builtBy('wrapped'), null)
})
