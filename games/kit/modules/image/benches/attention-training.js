import { T as t } from '../../../shell/i18n.js'
import { attentionWeights } from '../engine/attention.js'

const cross = [1,0,0,1, 0,1,1,0, 0,1,1,0, 1,0,0,1]
const ring = [1,1,1,1, 1,0,0,1, 1,0,0,1, 1,1,1,1]
const bar = [0,1,1,0, 0,1,1,0, 0,1,1,0, 0,1,1,0]
const pairs = [[cross, ring], [ring, bar], [bar, cross]]
const targetWeights = [1.8, 1.2, 0.9]
const scale = (image, weight) => image.map(x => x * weight)

function predict(patches, weights) {
  const query = scale(patches[0], weights[0])
  const keys = patches.map(p => scale(p, weights[1]))
  const values = patches.map(p => scale(p, weights[2]))
  const attention = attentionWeights(query, keys)
  const output = values[0].map((x, i) => x * attention[0] + values[1][i] * attention[1])
  return { query, keys, values, weights: attention, output }
}

const targets = pairs.map(p => predict(p, targetWeights).output)
function loss(weights) {
  return pairs.reduce((sum, pair, i) => {
    const output = predict(pair, weights).output
    return sum + output.reduce((acc, x, j) => acc + (x - targets[i][j]) ** 2, 0) / output.length
  }, 0) / pairs.length
}

// Finite-difference gradient descent trains all three shared scalar projections on the same examples.
function step(weights) {
  const epsilon = 0.001
  const gradient = weights.map((_, i) => {
    const plus = weights.slice(), minus = weights.slice()
    plus[i] += epsilon; minus[i] -= epsilon
    return (loss(plus) - loss(minus)) / (2 * epsilon)
  })
  return weights.map((w, i) => w - 1.5 * gradient[i])
}

export const attentionTraining = {
  about: t('训练同一组图块产生 Q、K、V 的简化线性投影'),
  make() {
    const start = () => ({ weights: [0.55, 0.75, 0.45], steps: 0 })
    return {
      start,
      act(state, action) {
        if (action === 'reset') return start()
        if (action !== 'train') return state
        let weights = state.weights
        for (let i = 0; i < 20; i++) weights = step(weights)
        return { weights, steps: state.steps + 20 }
      },
      view(v, { process }) {
        const state = process ?? start()
        const index = Number(v.sample) || 0
        return { ...predict(pairs[index], state.weights), sources: pairs[index], target: targets[index], projection: state.weights, loss: loss(state.weights), steps: state.steps }
      },
    }
  },
  verify(model, bench) {
    let state = model.start()
    const initial = model.view({ sample: 0 }, { process: state }).loss
    for (let i = 0; i < 25; i++) state = model.act(state, 'train')
    const end = model.view({ sample: 0 }, { process: state }).loss
    if (!(end < initial && end <= (bench.goal?.[0]?.atMost ?? 0))) return '训练不能达到给定的误差目标'
    if (state.weights.some((w, i) => Math.abs(w - model.start().weights[i]) < 1e-5)) return '训练应更新三个投影参数'
    return ''
  },
}
