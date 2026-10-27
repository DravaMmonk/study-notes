// The model's rules (model.js), the repository (world.js), the turn machine (run.js) and the hand sessions (hand.js).
import assert from 'node:assert/strict'
import test from 'node:test'
import { call, cut } from './model.js'
import { playHand } from './hand.js'
import { runEpisode, verdict } from './run.js'
import { actEntry, applyWrite, fileEntry, issueEntry, listEntry, runTests } from './world.js'

const repo = { files: { 'src/parse.js': { tokens: 300, segs: ['parse', 'split'] }, 'src/cart.js': { tokens: 400, segs: ['total'] } } }
const issue = (edits, extra = {}) => ({ id: 'i', repo: 'r', title: 'i', text: 'i', edits, ...extra })
const parse = { at: 'src/parse.js#parse', seen: 'file' }

test('a context is cut to the last entries that fit the window', () => {
  const entries = [{ tokens: 50 }, { tokens: 300 }, { tokens: 400 }]
  assert.deepEqual(cut(entries, 720).dropped, [{ tokens: 50 }])
  assert.equal(cut(entries, 720).seen.length, 2)
})

test('with no issue in view the model is done at once', () => {
  assert.deepEqual(call([fileEntry(repo, 'src/parse.js')]).action, { type: 'done', why: 'no-issue' })
  // The issue fell out of the window.
  assert.equal(call([issueEntry(issue([parse])), fileEntry(repo, 'src/cart.js')], { window: 420 }).action.why, 'no-issue')
})

test('only the context: a segment in view is written right, one out of view is made up', () => {
  const i = issue([parse])
  assert.deepEqual(call([issueEntry(i), fileEntry(repo, 'src/parse.js')], { mode: 'once' }).action, { type: 'write', edits: [{ at: 'src/parse.js#parse', how: 'right' }] })
  assert.deepEqual(call([issueEntry(i)], { mode: 'once' }).action.edits, [{ at: 'src/parse.js#parse', how: 'madeup' }])
  // Code pasted into the issue counts as seen.
  assert.equal(call([issueEntry({ ...i, pasted: ['src/parse.js'] })], { mode: 'once' }).action.edits[0].how, 'right')
})

test('in a loop it asks: to read a file it can name, to list when it cannot, to test a symptom', () => {
  assert.deepEqual(call([issueEntry(issue([parse]))]).action, { type: 'read', file: 'src/parse.js' })
  const bySeg = issue([{ at: 'src/parse.js#parse', seen: 'seg' }])
  assert.deepEqual(call([issueEntry(bySeg)]).action, { type: 'list' })
  assert.deepEqual(call([issueEntry(bySeg), actEntry({ type: 'list' }), listEntry(repo)]).action, { type: 'read', file: 'src/parse.js' })
  const symptom = issue([{ at: 'src/parse.js#parse', seen: 'none' }], { symptom: true })
  assert.deepEqual(call([issueEntry(symptom)]).action, { type: 'test' })
})

test('an ask nobody answered is not asked again: it tries the next way, then guesses', () => {
  const bySeg = issue([{ at: 'src/parse.js#parse', seen: 'seg' }])
  const asked = [issueEntry(bySeg), actEntry({ type: 'list' })]
  assert.deepEqual(call(asked).action, { type: 'test' })
  assert.deepEqual(call([...asked, actEntry({ type: 'test' })]).action, { type: 'write', edits: [{ at: 'src/parse.js#parse', how: 'madeup' }] })
})

test('a trap is written wrong first, and right with its failing test in view', () => {
  const i = issue([{ ...parse, trap: true }])
  const seen = [issueEntry(i), fileEntry(repo, 'src/parse.js')]
  const first = call(seen).action
  assert.equal(first.edits[0].how, 'wrong')
  const state = applyWrite({}, first)
  const report = runTests(i, state)
  assert.deepEqual(report.fails, [{ at: 'src/parse.js#parse', why: 'wrong' }])
  // Written and no report since: it believes it is done.
  assert.equal(call([...seen, actEntry(first)]).action.type, 'done')
  assert.equal(call([...seen, actEntry(first), report]).action.edits[0].how, 'right')
})

test('a failing report shows where a symptom lives', () => {
  const i = issue([{ at: 'src/cart.js#total', seen: 'none' }], { symptom: true })
  const report = runTests(i, {})
  assert.deepEqual(call([issueEntry(i), actEntry({ type: 'test' }), report]).action, { type: 'read', file: 'src/cart.js' })
})

test('the tests fail a made-up write anywhere', () => {
  const i = issue([parse])
  assert.deepEqual(runTests(i, { 'src/parse.js#parse': 'right', 'src/cart.js#total': 'madeup' }).fails, [{ at: 'src/cart.js#total', why: 'madeup' }])
})

// A loop board: the issue and the history to the model; reads, listings and test reports kept; a write to the
// repository; stop on passing tests.
const loopBoard = {
  nodes: ['issue', 'history', 'repo', 'out', 'stop'].map((t) => ({ id: t, type: t, params: { name: t } })).concat([
    { id: 'ctx', type: 'concat' }, { id: 'm', type: 'model' }, { id: 'r', type: 'read' }, { id: 'l', type: 'list' }, { id: 't', type: 'test' }, { id: 'keep', type: 'concat' },
  ]),
  wires: [
    { from: 'issue', to: 'ctx', port: 'a' }, { from: 'history', to: 'ctx', port: 'b' }, { from: 'ctx', to: 'm', port: 'in' },
    { from: 'm', to: 'repo', port: 'in' }, { from: 'm', to: 'r', port: 'ask' }, { from: 'm', to: 'l', port: 'ask' }, { from: 'm', to: 't', port: 'when' },
    { from: 'r', to: 'keep', port: 'a' }, { from: 'l', to: 'keep', port: 'b' }, { from: 't#out', to: 'keep', port: 'c' }, { from: 'keep', to: 'out', port: 'in' },
    { from: 't#green', to: 'stop', port: 'in' },
  ],
}
const loop = { machine: { mode: 'loop', window: 4000, turns: 12 } }

test('a loop board finds, reads, writes, tests, fixes a trap and stops', () => {
  const i = issue([{ at: 'src/parse.js#parse', seen: 'seg', trap: true }])
  const run = runEpisode(loop, loopBoard, { repo, issue: i })
  assert.deepEqual(run.turns.map((t) => t.calls[0].action.type), ['list', 'read', 'write', 'done', 'write', 'done'])
  assert.equal(run.report.green, true)
  assert.equal(run.stopped, true)
  assert.equal(verdict(loop, run), null)
})

test('stopping on done alone stops with a trap still wrong', () => {
  const board = { ...loopBoard, wires: [...loopBoard.wires.filter((w) => w.to !== 'stop'), { from: 'm', to: 'stop', port: 'in' }] }
  const run = runEpisode(loop, board, { repo, issue: issue([{ ...parse, trap: true }]) })
  assert.equal(run.stopped, true)
  assert.equal(run.report.green, false)
})

test('a hand session: the player adds the file, calls, tests and calls again', () => {
  const level = { machine: { mode: 'loop', window: 4000 }, test: { repo, issue: issue([{ ...parse, trap: true }]) } }
  const s = playHand(level, [['call'], ['add', 'src/parse.js'], ['call'], ['test'], ['call'], ['test']])
  assert.equal(s.log[0].action.type, 'read')
  assert.equal(s.green, true)
})
