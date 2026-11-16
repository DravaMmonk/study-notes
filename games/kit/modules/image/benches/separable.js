// Compare one-input, two-output convolution kernels. A separable layer has one shared spatial kernel;
// pointwise weights are fixed at one in this experiment, while the ordinary layer has two independent kernels.
import { S } from '../../../engine/schema.js'
import { T as t } from '../../../shell/i18n.js'

const kernels = {
  horizontal: [0, 0, 0, 1, 1, 1, 0, 0, 0],
  vertical: [0, 1, 0, 0, 1, 0, 0, 1, 0],
  cross: [0, 0.5, 0, 0.5, 1, 0.5, 0, 0.5, 0],
}
const difference = (a, b) => a.reduce((sum, x, i) => sum + Math.abs(x - b[i]), 0)

export const separable = {
  about: t('比较普通卷积与单输入通道的深度可分离卷积'),
  stage: S.obj({ target: S.oneOf(['shared', 'different']) }),
  make() {
    return {
      view(v, { stage }) {
        const first = kernels[v.first] ?? kernels.cross
        const second = v.mode === 'separable' ? first : (kernels[v.second] ?? kernels.cross)
        const wanted1 = kernels.horizontal
        const wanted2 = stage.target === 'shared' ? kernels.horizontal : kernels.vertical
        const rows = (prefix, data) => Object.fromEntries([0, 1, 2].map((i) => [`${prefix}${i}`, data.slice(i * 3, i * 3 + 3)]))
        return {
          ...rows('want1', wanted1), ...rows('want2', wanted2), ...rows('out1', first), ...rows('out2', second),
          error: difference(first, wanted1) + difference(second, wanted2),
          cost: v.mode === 'separable' ? 11 : 18,
        }
      },
    }
  },
  verify(model, bench) {
    if (bench.stages?.length !== 2 || bench.stages[0].target !== 'shared' || bench.stages[1].target !== 'different') return '需要共享与不同目标两步'
    const view = (mode, first, second, stage) => model.view({ mode, first, second }, { stage })
    if (view('separable', 'horizontal', 'vertical', bench.stages[0]).error !== 0) return '共享目标应能用分离结构完成'
    for (const first of Object.keys(kernels)) if (view('separable', first, 'vertical', bench.stages[1]).error === 0) return '不同目标不能用一个共享空间核完成'
    if (view('ordinary', 'horizontal', 'vertical', bench.stages[1]).error !== 0) return '不同目标应能用普通结构完成'
    return ''
  },
}
