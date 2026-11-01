// node --test games/kit/engine/ops — the save migration generator: which save ops each kind of change needs, and
// what they do to a save (the shell's migrations, ../../shell/saves.js).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { migrations } from '../../shell/saves.js'
import { ancestors, idMoves, saveOps } from './migrate.js'

/** A course of one path: each level requires the one before it; `builds`: { level: [part] }. */
const path = (ids, builds = {}) => ({ levels: ids.map((id, k) => ({ id, requires: k ? [ids[k - 1]] : [] })), builds: (id) => builds[id] ?? [] })
const migrate = (ops, save) => migrations([{ version: 2, ops }]).migrate({ version: 1, ...save })

test('ancestors and id moves', () => {
  assert.deepEqual([...ancestors(path(['a', 'b', 'c']).levels).get('c')], ['b', 'a'])
  assert.deepEqual([...idMoves(['a', 'b'], [{ rename: { a: 'x' } }, { rename: { x: 'y', b: null } }])], [['a', ['y']], ['b', []]])
  assert.deepEqual([...idMoves(['a', 'b', 'c'], [{ merge: ['a', ['a', 'b']] }, { split: ['c', ['c1', 'c2']] }])], [['a', ['a']], ['b', ['a']], ['c', ['c1', 'c2']]])
})

test('a level put earlier is counted solved for whoever solved the level now after it', () => {
  const ops = saveOps({ before: path(['a', 'b', 'c', 'd']), after: path(['a', 'd', 'b', 'c']), idOps: [], placed: new Set(['d']) })
  assert.deepEqual(ops, [{ solve: ['b', ['d']] }])
  assert.deepEqual(migrate(ops, { solved: ['a', 'b', 'c'] }).solved, ['a', 'b', 'c', 'd'])
  assert.deepEqual(migrate(ops, { solved: ['a'] }).solved, ['a'])
})

test('a level put later hands nobody the levels it passed over', () => {
  assert.deepEqual(saveOps({ before: path(['a', 'b', 'c', 'd']), after: path(['a', 'c', 'd', 'b']), idOps: [], placed: new Set(['b']) }), [])
})

test('a new level before others is counted solved for whoever solved them', () => {
  assert.deepEqual(saveOps({ before: path(['a', 'b']), after: path(['a', 'n', 'b']), idOps: [], placed: new Set(['n']) }), [{ solve: ['b', ['n']] }])
})

test('a renamed level keeps its state; a removed one loses it; the step speaks of the new ids after them', () => {
  const idOps = [{ rename: { b: 'bee' } }, { rename: { c: null } }]
  const ops = saveOps({ before: path(['a', 'b', 'c', 'd']), after: path(['a', 'd', 'bee']), idOps, placed: new Set(['bee', 'd']) })
  assert.deepEqual(ops, [...idOps, { solve: ['bee', ['d']] }])
  const out = migrate(ops, { solved: ['a', 'b', 'c'], data: { b: 'board b', c: 'board c' } })
  assert.deepEqual(out.solved, ['a', 'bee', 'd'])
  assert.deepEqual(out.data, { bee: 'board b' })
})

test('a level that now builds a part makes the kept board the part’s', () => {
  const ops = saveOps({ before: path(['a', 'b']), after: path(['a', 'b'], { b: ['adder'] }), idOps: [] })
  assert.deepEqual(ops, [{ built: ['b'] }])
  assert.deepEqual(migrate(ops, { solved: ['a', 'b'], data: { b: 'board' } }).built, { b: 'board' })
})

test('a level whose kept state no longer applies drops it the domain’s way, and a domain without one refuses', () => {
  const drop = (ids) => [{ data: { drop: ids } }]
  assert.deepEqual(saveOps({ before: path(['a']), after: path(['a']), idOps: [], stale: ['a'], drop }), [{ data: { drop: ['a'] } }])
  assert.throws(() => saveOps({ before: path(['a']), after: path(['a']), idOps: [], stale: ['a'] }), /no way to drop it/)
})

test('with no course before (content that did not fit), only the ops’ own and the domain’s', () => {
  assert.deepEqual(saveOps({ before: null, after: path(['a']), idOps: [{ rename: { x: 'a' } }], placed: new Set(['a']) }), [{ rename: { x: 'a' } }])
})
