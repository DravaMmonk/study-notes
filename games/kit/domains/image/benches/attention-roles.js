import { S } from '../../../engine/schema.js'
import { T as t } from '../../../shell/i18n.js'
import { attentionWeights } from '../engine/attention.js'

const cross = [1,0,0,1, 0,1,1,0, 0,1,1,0, 1,0,0,1]
const ring = [1,1,1,1, 1,0,0,1, 1,0,0,1, 1,1,1,1]
const vertical = [0,1,1,0, 0,1,1,0, 0,1,1,0, 0,1,1,0]
const horizontal = [0,0,0,0, 1,1,1,1, 1,1,1,1, 0,0,0,0]

export const attentionRoles = {
  about: t('观察查询、键和值对图块注意力的影响', 'observe how queries, keys and values affect patch attention'),
  setup: S.obj({ role: S.oneOf(['query', 'key', 'value']) }),
  make({ role }) {
    return {
      view(v) {
        const query = v.query === 'ring' ? ring : cross
        const keys = v.keys === 'swapped' ? [ring, cross] : [cross, ring]
        const values = v.values === 'swapped' ? [horizontal, vertical] : [vertical, horizontal]
        const weights = attentionWeights(query, keys)
        const output = values[0].map((a, i) => weights[0] * a + weights[1] * values[1][i])
        const correct = role === 'query' ? v.query === 'ring' && v.pick === 'b'
          : role === 'key' ? v.keys === 'swapped' && v.pick === 'b'
            : v.values === 'swapped' && v.pick === 'horizontal'
        return { query, keys, values, weights, output, correct }
      },
    }
  },
  verify(model, bench) {
    const base = { query: 'cross', keys: 'normal', values: 'normal' }
    const a = model.view(base), b = model.view({ ...base, query: 'ring' })
    const k = model.view({ ...base, keys: 'swapped' }), v = model.view({ ...base, values: 'swapped' })
    if (!(a.weights[0] > a.weights[1] && b.weights[1] > b.weights[0] && k.weights[1] > k.weights[0])) return '查询或键没有改变权重的偏向'
    if (a.weights.some((w, i) => w !== v.weights[i]) || a.output.every((x, i) => x === v.output[i])) return '值应改变输出而不改变权重'
    if (!bench.knobs?.pick) return '需要选择结果'
    return ''
  },
}
