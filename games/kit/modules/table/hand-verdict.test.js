import { test } from 'node:test'
import assert from 'node:assert/strict'
import { handExamples, judgeHand } from './model/hand-verdict.js'

const street = { cells: [{ id: 's' }, { id: 'a' }, { id: 'b' }, { id: 'e' }], edges: [['s', 'a'], ['s', 'b'], ['a', 'e'], ['b', 'e']], start: 's', end: 'e' }
const fixtures = {
  trace: street, fill: street,
  link: { tests: [{ a: 'aba', b: 'baa' }] },
  pack: { tests: [{ W: 4, items: [{ w: 3, v: 4 }, { w: 2, v: 3 }, { w: 2, v: 3 }] }] },
  breach: { maze: { R: 3, C: 3, key: [1, 0], doors: [[1, 2]] } },
  policy: { map: { R: 2, C: 3, gold: [0, 2], walls: [[0, 1]] }, starts: [[0, 0], [1, 0]] },
  seam: { img: [[1, 1, 3, 1], [1, 1, 3, 1], [1, 1, 3, 1]], cuts: 2 },
}
for (const [mode, data] of Object.entries(fixtures)) test(`${mode}: reference passes, naive fails, deterministic and immutable`, () => {
  const L = { ...data, mode: `table:${mode}` }, before = JSON.stringify(L)
  const { reference, naive } = handExamples(L)
  const work = JSON.stringify(reference)
  assert.equal(judgeHand(L, reference).pass, true)
  assert.equal(judgeHand(L, naive).pass, false)
  assert.deepEqual(judgeHand(L, reference), judgeHand(L, reference))
  assert.equal(JSON.stringify(L), before)
  assert.equal(JSON.stringify(reference), work)
})
test('forged works cannot bypass action guards or repeat an achievement', () => {
  const judge = (mode, work) => judgeHand({ ...fixtures[mode], mode: `table:${mode}` }, work)
  assert.equal(judge('trace', { found: [['s', 'a', 'e'], ['s', 'a', 'e']] }).pass, false)
  assert.equal(judge('link', { links: [[[0, 1], [2, 1]]] }).pass, false)
  assert.equal(judge('link', { links: [[[0, 2], [1, 0]]] }).pass, false)
  assert.equal(judge('pack', { bags: [[1, 1]] }).pass, false)
  assert.equal(judge('pack', { bags: [[0, 1]] }).pass, false)
  assert.equal(judge('breach', { routes: { A: ['0,0', '1,0', '1,1'], B: ['0,0', '1,1'] } }).pass, false)
  assert.equal(judge('policy', { walks: [['0,0', '0,2'], ['1,0', '1,1', '1,2', '0,2']] }).pass, false)
  const L = { ...fixtures.seam, mode: 'table:seam' }, example = handExamples(L).reference
  assert.equal(judgeHand(L, { ...example, img: L.img }).pass, false)
  assert.equal(judgeHand(L, { ...example, firstSeam: example.firstSeam.slice(1) }).pass, false)
})
