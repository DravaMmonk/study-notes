import { test } from 'node:test'
import { deepStrictEqual } from 'node:assert'
import { renameSavedObjects } from './saveObjects.js'

test('renames saved formulas, terms and world assignments without changing structure', () => {
  const saved = { nodes: [{ params: { t: 'hesp', formula: 'Parent(ann, bo)' } }], consts: { soc: 0, ann: 1 }, tree: ['p', 'ann'], unchanged: 'announce' }
  deepStrictEqual(renameSavedObjects(saved, 'other'), { nodes: [{ params: { t: 'j', formula: 'Parent(i, j)' } }], consts: { h: 0, i: 1 }, tree: ['p', 'i'], unchanged: 'announce' })
  deepStrictEqual(renameSavedObjects({ params: { t: 'hesp', equation: 'phos = hesp' } }, 'q-eq'), { params: { t: 'b', equation: 'a = b' } })
})

test('the save migration updates all stored boards and keeps progress', async () => {
  const { default: spec } = await import('./spec.js')
  const { migrations } = await import('../kit/shell/saves.js')
  const old = { version: 77, solved: ['q-eq'], data: { 'q-eq': { nodes: [{ params: { t: 'hesp' } }] } }, built: { 'q-sym': { nodes: [{ params: { t: 'phos' } }] } }, slots: { 'q-eq': { list: [{ data: { nodes: [{ params: { t: 'phos' } }] } }] } } }
  const saved = migrations(spec.saves).migrate(old)
  deepStrictEqual(saved.solved, ['q-eq'])
  deepStrictEqual(saved.data['q-eq'].nodes[0].params.t, 'b')
  deepStrictEqual(saved.built['q-sym'].nodes[0].params.t, 'i')
  deepStrictEqual(saved.slots['q-eq'].list[0].data.nodes[0].params.t, 'a')
})
