import test from 'node:test'
import assert from 'node:assert/strict'
import { attentionTraining } from './benches/attention-training.js'

test('training updates Q, K and V projections and reduces loss on the shared examples', () => {
  const model = attentionTraining.make()
  const initial = model.start()
  let trained = initial
  for (let i = 0; i < 25; i++) trained = model.act(trained, 'train')
  assert.ok(model.view({ sample: 0 }, { process: trained }).loss < model.view({ sample: 0 }, { process: initial }).loss)
  trained.weights.forEach((w, i) => assert.ok(Math.abs(w - initial.weights[i]) > 1e-5))
  const sample = model.view({ sample: 1 }, { process: trained })
  assert.equal(sample.query[0], sample.sources[0][0] * trained.weights[0])
  assert.equal(sample.values[1][0], sample.sources[1][0] * trained.weights[2])
  assert.deepEqual(model.act(trained, 'reset'), initial)
})
