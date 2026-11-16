// node --test games/kit/shell — a game's progress in the browser: kept task by task for the puzzle each was made on.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { completionUnlocks, createProgress, earnedUnlocks, firstTask, flagsIn, fresh, inheritedBoard, nextRequiredTask, passed, saved, skipOptionalTask, taskOpen, taskPassed } from './progress.js'
import { passedLevelIn, recordSolution } from './progress.js'
import { playedTask, taskContext } from './played-task.js'
import { addSlot, dropSlot } from './slots.js'

const storage = new Map()
globalThis.window = { localStorage: { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) } }

test('a task whose puzzle changed loses its save, its level is unsolved, and every other task keeps its own', () => {
  const tasks = { a: { level: 'one', stamp: 'aaaa' }, b: { level: 'one', stamp: 'bbbb' }, c: { level: 'two', stamp: 'cccc' } }
  const made = createProgress({ id: 'g', tasks })
  made.update((p) => ({ ...p, solved: ['one', 'two'], passed: ['a', 'b', 'c'], data: { a: 1, b: 2, c: 3 }, built: { b: 2, c: 3 }, best: { one: 5, two: 6 } }))
  assert.deepEqual(createProgress({ id: 'g', tasks }).load().solved, ['one', 'two'])
  // b's puzzle changes; a task that is gone from the content (and a new one) changes nothing else.
  const now = createProgress({ id: 'g', tasks: { a: tasks.a, b: { level: 'one', stamp: 'other' }, d: { level: 'two', stamp: 'dddd' } } }).load()
  assert.deepEqual([now.solved, now.passed, now.data, now.built, now.best], [['two'], ['a'], { a: 1 }, {}, { two: 6 }])
  assert.deepEqual(now.stamps, { a: 'aaaa', b: 'other', d: 'dddd' })
})

test('a save of another shape, or one that does not parse, reads as a fresh start', () => {
  const made = createProgress({ id: 'h', tasks: { a: { level: 'one', stamp: 'aaaa' } } })
  storage.set(made.key, JSON.stringify({ stamp: 'old', solved: ['one'] }))
  assert.deepEqual(made.load().solved, [])
  storage.set(made.key, '{ not json')
  assert.deepEqual(made.load().solved, [])
})

test('an open reader applies its next change to the latest saved progress', () => {
  const id = 'shared-progress'
  const page = createProgress({ id })
  const embed = createProgress({ id })
  const initial = embed.load()
  assert.equal(embed.load(), initial)

  page.update((p) => ({ ...p, passed: ['work'], built: { work: { nodes: [], wires: [] } } }))
  const both = embed.update((p) => ({ ...p, skippedTasks: ['extra'] }))
  assert.deepEqual(both.skippedTasks, ['extra'])
  assert.deepEqual(both.passed, ['work'])
  assert.deepEqual(page.load(), both)
  assert.equal(embed.load(), both)
})

test('a mounted task saves and passes its own slot after another reader opens a new one', () => {
  const id = 'shared-slot'
  const page = createProgress({ id })
  const other = createProgress({ id })
  const level = { id: 'level', keeps: true, tasks: [{ key: 'work' }] }
  const game = { byId: { level }, flagsOf: (p) => p.flags }
  const { screen: task } = playedTask(taskContext(game, page.load(), level, 0), { update: page.update })
  other.update((p) => addSlot(p, 'work'))
  other.update((p) => saved(p, level, 0, 'second draft'))

  task.save('first draft')
  const implicit = task.solve(null)
  assert.equal(implicit.built.work, 'first draft')
  const explicit = task.solve(null, 'judged work')
  assert.equal(explicit.built.work, 'judged work')
  assert.equal(explicit.slots.work.list[0].data, 'judged work')
  assert.equal(explicit.data.work, 'second draft')

  other.update((p) => dropSlot(p, 'work', 0))
  assert.equal(task.solve(null, 'removed work'), null)
  assert.equal(other.load().built.work, 'judged work')
})

test('a cross-game gate requires a recorded pass for the exact level', () => {
  const source = createProgress({ id: 'source' })
  source.update((p) => ({ ...p, solved: ['0-10'], all: true }))
  assert.equal(passedLevelIn('source', '0-10'), true)
  assert.equal(passedLevelIn('source', '0-1'), false)
  assert.equal(passedLevelIn('anotherGame', '0-10'), false)
  storage.set(source.key, JSON.stringify({ solved: '0-10' }))
  assert.equal(passedLevelIn('source', '0-10'), false)
})

const level = { id: 'level', tasks: [{ key: 'first' }, { key: 'second' }, { key: 'last' }], unlocks: ['part'] }
const game = { byId: { level }, better: () => true }

test('unlocking all opens later tasks without passing them', () => {
  const p = fresh()
  assert.equal(taskOpen(game, p, level.id, 0), true)
  assert.equal(taskOpen(game, p, level.id, 2), false)
  assert.equal(taskOpen(game, { ...p, all: true }, level.id, 2), true)
  assert.equal(taskPassed(game, { ...p, all: true }, level.id, 2), false)
})

test('passing the last task early completes an all-unlocked level without passing earlier tasks', () => {
  const last = passed(game, { ...fresh(), all: true }, level, 2, { count: 4 })
  assert.deepEqual(last.passed, ['last'])
  assert.deepEqual(last.solved, [level.id])
  assert.equal(taskPassed(game, last, level.id, 0), false)
  assert.equal(firstTask(game, last, level.id), 2)
  assert.deepEqual(last.flags, ['part'])
  assert.deepEqual(last.best[level.id], { count: 4 })
  const normal = passed(game, fresh(), level, 2)
  assert.deepEqual(normal.solved, [])
})

test('next required task prefers later tasks and revisits earlier ones only when needed', () => {
  const start = { ...fresh(), all: true }
  assert.equal(nextRequiredTask(game, start, level.id, 1), 2)
  assert.equal(nextRequiredTask(game, start, level.id, 2), -1)
  assert.equal(nextRequiredTask(game, fresh(), level.id, 2), 0)
  const earlier = passed(game, passed(game, start, level, 0), level, 1)
  assert.equal(nextRequiredTask(game, earlier, level.id, 2), -1)
})

test('all-unlocked inheritance uses the reference until the prerequisite is passed', () => {
  const reference = { nodes: [{ id: 'reference' }], wires: [] }
  const attempted = { nodes: [{ id: 'attempt' }], wires: [] }
  const passedBoard = { nodes: [{ id: 'passed' }], wires: [] }
  const task = { id: 'earlier', key: 'earlier-task', source: { solution: reference } }
  const start = { ...fresh(), all: true, data: { 'earlier-task': attempted } }
  assert.deepEqual(inheritedBoard(start, task), reference)
  const completed = { ...start, passed: ['earlier-task'], built: { 'earlier-task': passedBoard } }
  const inherited = inheritedBoard(completed, task)
  assert.deepEqual(inherited, passedBoard)
  assert.notEqual(inherited, passedBoard)
  assert.equal(inheritedBoard({ ...fresh(), data: start.data }, task), undefined)
})

test('inheritance uses only judged work and never a skipped optional task in a solved level', () => {
  const graph = { nodes: [{ id: 'ungraded' }], wires: [] }
  const progress = { ...fresh(), solved: ['mixed'], data: { extra: graph, required: graph } }
  assert.equal(inheritedBoard(progress, { id: 'mixed', key: 'required' }), undefined)
  assert.equal(inheritedBoard({ ...progress, built: { extra: graph } }, { id: 'mixed', key: 'extra', optional: true }), undefined)
})

test('passing a carried task retains its passing circuit when the working board changes later', () => {
  const source = { id: 'source', tasks: [{ key: 'source-task' }], unlocks: [] }
  const target = { id: 'target', tasks: [{ key: 'target-task', source: { carry: 'source' } }], unlocks: [] }
  const g = { byId: { source, target }, better: () => true }
  const board = { nodes: [{ id: 'passed' }], wires: [] }
  const done = passed(g, { ...fresh(), data: { 'source-task': board } }, source, 0)
  assert.deepEqual(done.built['source-task'], board)
  assert.deepEqual(inheritedBoard({ ...done, data: { 'source-task': { nodes: [], wires: [] } } }, { id: 'source', ...source.tasks[0] }), board)
})

test('passing records the circuit that ran even when the task has never saved it or has a different draft', () => {
  const work = { nodes: [{ id: 'passing' }], wires: [] }
  const draft = { nodes: [{ id: 'draft' }], wires: [] }
  const key = level.tasks[0].key
  for (const start of [fresh(), saved(fresh(), level, 0, draft)]) {
    const result = passed(game, start, level, 0, null, work)
    assert.deepEqual(result.data[key], work)
    assert.deepEqual(result.built[key], work)
    assert.deepEqual(result.solutions[key].works.find((entry) => entry.key === key).work.nodes.map(({ id }) => id), ['passing'])
    const edited = saved(result, level, 0, draft)
    assert.deepEqual(edited.built[key], work)
  }
})


test('completion reports newly opened branches and their pieces, and waits for every gate at a join', () => {
  const level = { id: 'start', tasks: [{ key: 'start' }], unlocks: ['built', 'mode'] }
  const left = { id: 'left', requires: ['start'] }
  const right = { id: 'right', requires: ['start'] }
  const join = { id: 'join', requires: ['start', 'other'] }
  const game = {
    levels: [level, left, right, join],
    isOpen: (entry, solved) => (entry.requires ?? []).every((id) => solved.has(id)),
    unlocked: (entry) => entry.unlocks.map((flag) => flag === 'built' ? { piece: 'gate', label: 'Gate' } : { label: 'Mode' }),
    earnedPieces: ({ solved }) => solved.includes('start') ? [{ piece: 'gate', name: 'Gate' }, { piece: 'symbol', name: 'Symbol' }] : [],
  }
  const before = { ...fresh(), all: true }
  const after = { ...before, solved: ['start'] }
  const rewards = completionUnlocks(game, level, before, after)
  assert.deepEqual(rewards.pieces.map(({ piece }) => piece), ['gate', 'symbol'])
  assert.deepEqual(rewards.levels, [left, right])
  assert.deepEqual(completionUnlocks(game, level, after, after), { pieces: [], levels: [] })
  assert.deepEqual(completionUnlocks(game, level, { ...before, solved: ['other'] }, { ...after, solved: ['other', 'start'] }).levels, [left, right, join])
})

test('optional tasks can be skipped without granting their rewards or appearing passed', () => {
  const l = { id: 'mixed', tasks: [{ key: 'extra', optional: true, opens: ['extra-part'] }, { key: 'required' }], unlocks: ['level-part', 'extra-part'] }
  const g = { byId: { mixed: l }, better: () => true, flagsOf: (p) => p.flags, unlocksBefore: () => [] }
  const start = fresh()
  assert.equal(taskOpen(g, start, 'mixed', 1), true)
  assert.equal(taskPassed(g, start, 'mixed', 0), false)
  assert.equal(flagsIn(g, start, l, 1).has('extra-part'), false)
  const onlyExtra = passed(g, start, l, 0)
  assert.deepEqual(onlyExtra.solved, [])
  assert.deepEqual(onlyExtra.flags, ['extra-part'])
  const skipped = skipOptionalTask(start, l, 0)
  assert.equal(skipOptionalTask(skipped, l, 0), skipped)
  assert.equal(skipOptionalTask(start, l, 1), start)
  assert.equal(firstTask(g, skipped, 'mixed'), 1)
  const done = passed(g, skipped, l, 1)
  assert.deepEqual(done.solved, ['mixed'])
  assert.deepEqual(done.flags, ['level-part'])
  assert.deepEqual(earnedUnlocks(l, done), ['level-part'])
  assert.equal(taskPassed(g, done, 'mixed', 0), false)
  assert.equal(taskContext(g, done, l, 0).solved, false)
  const extraDone = passed(g, done, l, 0)
  assert.equal(taskPassed(g, extraDone, 'mixed', 0), true)
  assert.equal(taskContext(g, extraDone, l, 0).solved, true)
  assert.equal(flagsIn(g, extraDone, l, 1).has('extra-part'), true)
  assert.deepEqual(extraDone.flags, ['level-part', 'extra-part'])
  assert.deepEqual(extraDone.skippedTasks, [])
})

test('passing only an optional task does not complete the required tasks in all-unlocked mode', () => {
  const l = { id: 'mixed', tasks: [{ key: 'required' }, { key: 'extra', optional: true }], unlocks: [] }
  const g = { byId: { mixed: l }, better: () => true }
  const p = passed(g, { ...fresh(), all: true }, l, 1)
  assert.deepEqual(p.solved, [])
  assert.deepEqual(p.passed, ['extra'])
})

test('recorded solutions preserve the selected packed works when a later pass changes them', () => {
  const task = (taskId) => ({ taskId })
  const board = (type, params) => ({ nodes: [{ id: 'n', type, params }], wires: [] })
  const outer = task('outer')
  const middle = task('middle')
  const inner = task('inner')
  const level = { id: 'two', tasks: [{ key: 'outer', source: outer }] }
  const graph = board('stage')
  const packed = board('part', { form: 'second' })
  const first = board('number', { value: 1 })
  const second = board('number', { value: 2 })
  let kept
  const syncOwn = (built) => { kept = built }
  const view = (BUILT) => ({ BUILT, syncOwn })
  const views = new Map([
    [outer, view({ stage: { opens: () => ({ level: middle, circuit: packed }) } })],
    [middle, view({ part: { opens: ({ form }) => {
      assert.equal(form, 'second')
      return { level: inner, circuit: kept.inner }
    } } })],
    [inner, view({})],
  ])
  const game = { circuit: { forTask: (source) => views.get(source) } }
  const progress = { stamps: { outer: 'o', middle: 'm', inner: 'i' }, built: { inner: first } }
  const before = recordSolution(game, progress, level, 0, graph)
  const after = recordSolution(game, { ...progress, built: { inner: second } }, level, 0, graph)
  const earlier = before.works.find(({ key }) => key === 'inner')
  assert.notEqual(before.stamp, after.stamp)
  assert.deepEqual(earlier.work.nodes[0].params, { value: 1 })
  assert.equal(earlier.puzzle, 'i')
  assert.deepEqual(before.works.find(({ key }) => key === 'middle').uses, [earlier.id])
})
