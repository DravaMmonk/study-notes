// node --test (npm test) — what a task on the circuit base holds (circuit-domain.js over ../course.js holds): a part,
// one of its settings, one value of a setting, by the course's progress and by what the task gives or withholds.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assemble } from './content.js'
import { checkCircuitTasks, definedCourse, flowBoard, onceRun } from './circuit-domain.js'

const text = (zh) => ({ zh })
const OPS = {
  add: { about: text('a + b'), args: [{ name: 'a' }, { name: 'b' }], run: ([a, b]) => a + b },
  sub: { about: text('a − b'), args: [{ name: 'a' }, { name: 'b' }], run: ([a, b]) => a - b },
}
// One part of two ways: `how` picks adding or subtracting.
const partDefs = { parts: { calc: {
  name: text('算'), desc: text('算两个数'), icon: 'Plus', family: 'value', inputs: [{ name: 'a' }, { name: 'b' }],
  settings: [{ key: 'how', control: 'select', label: text('怎么算'), default: 'plus', options: [{ value: 'plus', label: text('加') }, { value: 'minus', label: text('减') }] }],
  compute: 'match $how { plus: add(a, b), minus: sub(a, b) }',
} } }
const ports = { inputs: [{ name: 'a', label: text('a') }, { name: 'b', label: text('b') }], outputs: [{ name: 'out', label: text('结果') }] }
const sums = [{ inputs: { a: 5, b: 3 }, expect: { out: 8 } }, { inputs: { a: 1, b: 1 }, expect: { out: 2 } }]
const differences = [{ inputs: { a: 5, b: 3 }, expect: { out: 2 } }, { inputs: { a: 1, b: 4 }, expect: { out: -3 } }]
const task = (id, tests, how, more = {}) => ({ id, brief: text(id), ...ports, tests, solution: [`c = calc[how=${how}](a, b)`, 'out <- c'], ...more })
const level = (id, tasks, more = {}) => [id, { title: text(id), tasks, ...more }]
const course = (levels) => definedCourse(assemble({
  id: 't',
  game: { domain: 't', vocabulary: 1, title: text('t'), kicker: text('t'), lede: text('t'), primitives: ['calc'], eras: [{ id: 1, title: text('一'), question: text('？'), foundation: levels.map(([id]) => id) }] },
  levels,
  glossary: { groups: [], entries: [] },
  partDefs,
}), { board: flowBoard(), ops: OPS })
const failures = (read) => {
  const { runLevel, entries } = onceRun({})
  return checkCircuitTasks(read, { run: runLevel, entries }).filter((l) => l.fail).map((l) => l.text)
}

test('a value a task opens is held from there on, and not before; a value nothing opens is held from the start', () => {
  const read = course([
    level('one', [task('one', sums, 'plus')], { adds: ['calc'] }),
    level('two', [task('two-a', sums, 'plus'), task('two-b', differences, 'minus', { opens: ['calc.how=minus'] })]),
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
    level('three', [three], { tasks: [{ ...three, opens: ['calc.how=minus'] }] }),
    level('four', [task('four', differences, 'minus')]),
  ]
  const read = course(levels(task('two', differences, 'minus', { grants: ['calc.how=minus'] }), task('three', differences, 'minus')))
  const has = (id) => read.holdsIn(read.played.get(id)[0], [])
  // Two is given the way to subtract before three brings it in; one has not got it.
  assert.deepEqual(['one', 'two', 'three', 'four'].map((id) => has(id)('calc', 'how', 'minus')), [false, true, true, true])
  assert.deepEqual(failures(read), [])
  // Without the gift, two's answer sets a value it does not hold; four cannot subtract once that is withheld.
  assert.match(failures(course(levels(task('two', differences, 'minus'), task('three', differences, 'minus')))).join('\n'), /two: .*sets calc’s how to minus, which the level does not hold/)
  const kept = course([...levels(task('two', sums, 'plus'), task('three', differences, 'minus')).slice(0, 3), level('four', [task('four', sums, 'plus', { withhold: ['calc.how=minus'] })])])
  assert.deepEqual([kept.holdsIn(kept.played.get('four')[0], [])('calc', 'how', 'minus'), kept.holdsIn(kept.played.get('four')[0], [])('calc', 'how', 'plus')], [false, true])
  assert.deepEqual(failures(kept), [])
})

test('an item a task names is one of the game’s: a part, a setting of several values, a value of it', () => {
  const read = course([level('one', [task('one', sums, 'plus', { withhold: ['gone'], grants: ['calc.speed'], opens: ['calc.how=times', 'calc'] })], { adds: ['calc'] })])
  assert.deepEqual(read.wrong, [
    'one: withhold names gone: gone is no part',
    'one: grants names calc.speed: calc has no setting speed of several values',
    'one: opens names calc.how=times: times is no value of calc’s how',
    'one: it opens calc, a part: a part is brought in by adds',
  ])
})
