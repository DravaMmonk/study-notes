import { test } from 'node:test'
import assert from 'node:assert/strict'
import { S } from '../engine/schema.js'
import { newStageId, pieceAtStage, stageChain, stageChanges, stageId } from './stage-chain.js'

const operations = { 'demo:blur': { params: S.obj({ sigma: S.num({ min: 0, max: 5, default: 1 }), border: S.oneOf(['zero', 'edge']) }) } }
const raw = {
  op: 'demo:blur', name: 'Blur',
  settings: { sigma: { min: 0.5, max: 2.5 }, border: { fixed: true } },
  stages: [{ id: 'blur-border', settings: { border: { fixed: false } } }, { id: 'blur-free', settings: { sigma: {} }, desc: 'Free' }],
}

test('a piece’s stages: what each changes, and every setting declared, narrowed and in effect', () => {
  assert.equal(stageId('p/blur', 'blur-border'), 'p/blur-border')
  assert.deepEqual(stageChanges(raw.stages[1]), [{ path: ['settings', 'sigma'], value: {} }, { path: ['desc'], value: 'Free' }])
  const chain = stageChain('p/blur', raw, operations)
  assert.deepEqual(chain.map((step) => step.id), ['p/blur', 'p/blur-border', 'p/blur-free'])
  const [base, border, free] = chain
  const sigma = (step) => step.settings.find((s) => s.key === 'sigma')
  const borderOf = (step) => step.settings.find((s) => s.key === 'border')
  assert.equal(sigma(base).declared.max, 5)
  assert.deepEqual(sigma(base).narrowed, { min: 0.5, max: 2.5 })
  assert.equal(sigma(base).effective.max, 2.5)
  assert.equal(borderOf(base).effective.fixed, true)
  // A stage changes what it names; the rest goes on as before.
  assert.equal(borderOf(border).changed, true)
  assert.equal(borderOf(border).effective.fixed, false)
  assert.equal(sigma(border).changed, false)
  assert.equal(sigma(border).effective.max, 2.5)
  // An empty setting goes back to the operation's declaration.
  assert.equal(sigma(free).narrowed, null)
  assert.equal(sigma(free).effective.max, 5)
  assert.equal(free.definition.desc, 'Free')
  // The piece as a stage has it, with the stages still to come.
  assert.deepEqual(pieceAtStage('p/blur', raw, 'p/blur-border').stages.map((s) => s.id), ['blur-free'])
  assert.equal(pieceAtStage('p/blur', raw, 'p/blur-border').settings.border.fixed, false)
  assert.equal(newStageId('p/blur', ['p/blur-2']), 'blur-3')
})
