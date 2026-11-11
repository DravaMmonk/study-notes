// The when-to-stop bench: a few noisy samples of a smooth curve, fitted by a polynomial. Trained by gradient descent
// the fit first follows the curve, then starts bending through the noise: the error on the training samples keeps
// falling while the error on new samples (validation) turns and rises. A penalty λ·Σw² (all but the constant) is the
// other way to stop it.
import { S } from '../../../engine/schema.js'
import { goalOf, judge } from '../../../engine/bench.js'
import { T as t } from '../../../shell/i18n.js'


// Solve A·x = b by Gauss–Jordan elimination with partial pivoting.
const solve = (A, b) => {
  const n = b.length
  const M = A.map((row, i) => [...row, b[i]])
  for (let c = 0; c < n; c++) {
    let p = c
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r
    ;[M[c], M[p]] = [M[p], M[c]]
    for (let r = 0; r < n; r++) {
      if (r === c) continue
      const f = M[r][c] / M[c][c]
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]
    }
  }
  return M.map((row, i) => row[n] / row[i])
}

/**
 * The fit. degree: how many weights (powers 0 … degree − 1); seed: the samples' noise; truth(x) on [−1, 1]; train: how
 * many noisy samples, noise their spread; valid: how many new samples; checkpoints: the training steps the bench
 * shows; rate: the descent's step.
 */
export function stopBench({ degree, seed, truth, train, noise, valid, checkpoints, rate }) {
  const data = (() => {
    let s = seed
    const next = () => {
      s = (s * 16807) % 2147483647
      return s / 2147483647
    }
    const tx = Array.from({ length: train }, (_, i) => -1 + (2 * i + next()) / train)
    const ty = tx.map((x) => truth(x) + (next() - 0.5) * noise)
    const vx = Array.from({ length: valid }, (_, i) => -0.98 + (1.96 * i) / (valid - 1))
    const vy = vx.map(truth)
    return { truth, tx, ty, vx, vy }
  })()
  const features = (x) => Array.from({ length: degree }, (_, k) => x ** k)
  const predict = (w, x) => features(x).reduce((sum, f, k) => sum + f * w[k], 0)
  const mse = (w, xs, ys) => xs.reduce((sum, x, i) => sum + (predict(w, x) - ys[i]) ** 2, 0) / xs.length
  // Checkpoints of gradient-descent training, computed on first use.
  let run = null
  const training = () => {
    if (run) return run
    let w = Array(degree).fill(0)
    const out = []
    let step = 0
    for (const target of checkpoints) {
      for (; step < target; step++) {
        const g = Array(degree).fill(0)
        data.tx.forEach((x, i) => {
          const e = predict(w, x) - data.ty[i]
          features(x).forEach((f, k) => (g[k] += (2 * e * f) / data.tx.length))
        })
        w = w.map((v, k) => v - rate * g[k])
      }
      out.push({ step: target, w, train: mse(w, data.tx, data.ty), valid: mse(w, data.vx, data.vy) })
    }
    run = out
    return out
  }
  // Trained to the end with the penalty: the ridge solution.
  const regularised = (lambda) => {
    const n = data.tx.length
    const A = Array.from({ length: degree }, (_, i) => Array.from({ length: degree }, (_, j) => data.tx.reduce((sum, x) => sum + x ** (i + j), 0) / n + (i === j && i > 0 ? lambda : 0)))
    const b = Array.from({ length: degree }, (_, i) => data.tx.reduce((sum, x, k) => sum + x ** i * data.ty[k], 0) / n)
    const w = solve(A, b)
    return { w, train: mse(w, data.tx, data.ty), valid: mse(w, data.vx, data.vy) }
  }
  return { data, predict, training, regularised }
}

// Losses span 0.005 … 2, so they are plotted as log10.
const logLoss = (v) => Math.log10(Math.max(1e-6, v))

/** The bench model: knobs `step` (an index into the checkpoints) and `lambda` (an index into the penalties). */
export const stop = {
  about: t('什么时候停：多项式拟合几个带噪声的样本；旋钮 step（训练到第几个检查点）、lambda（第几个惩罚）；ratio 是新样本误差和它的最低值之比'),
  setup: S.obj({
    degree: S.int({ min: 1 }), seed: S.int(), wave: S.num({ about: t('真实的曲线是 sin(wave·x)') }),
    train: S.int({ min: 1 }), noise: S.num(), valid: S.int({ min: 2 }), rate: S.num(),
  }),
  make({ wave, ...p }, bench) {
    const lambdas = bench.knobs.lambda.values
    const fit = stopBench({ ...p, checkpoints: bench.knobs.step.values, truth: (x) => Math.sin(wave * x) })
    const run = () => fit.training()
    const ridge = lambdas.map((l) => fit.regularised(l))
    const x = (u) => -1 + 2 * u
    return {
      fit,
      view(v, { open }) {
        const byStep = open.includes('step')
        const current = byStep ? run()[v.step] : ridge[v.lambda]
        const history = byStep ? run() : ridge
        const best = Math.min(...history.map((r) => r.valid))
        const upTo = byStep ? v.step : history.length - 1
        const at = byStep ? v.step : v.lambda
        return {
          train: current.train,
          valid: current.valid,
          ratio: current.valid / best,
          curve: {
            lines: [{ curve: (u) => fit.predict(current.w, x(u)), kind: 'yours', label: t('模型', 'model') }, { curve: (u) => fit.data.truth(x(u)), kind: 'faint', label: t('真实规律') }],
            dots: [
              ...fit.data.tx.map((tx, i) => ({ u: (tx + 1) / 2, v: fit.data.ty[i], kind: 'point', label: t('训练样本', 'training sample') })),
              ...fit.data.vx.filter((_, i) => i % 3 === 0).map((vx, i) => ({ u: (vx + 1) / 2, v: fit.data.vy[i * 3], kind: 'ring', label: t('新样本', 'new sample') })),
            ],
            legend: [{ kind: 'yours', label: t('模型', 'Model') }, { kind: 'faint', label: t('真实规律（模型不可见）') }, { kind: 'ring', label: t('新样本', 'New samples') }, { kind: 'point', label: t('训练样本', 'Training samples') }],
          },
          errors: {
            lines: [
              { curve: history.map((h, i) => (i <= upTo ? logLoss(h.train) : NaN)), kind: 'yours', label: t('训练误差', 'training error') },
              { curve: history.map((h, i) => (i <= upTo ? logLoss(h.valid) : NaN)), kind: 'error', label: t('新样本误差', 'new-sample error') },
            ],
            legend: [{ kind: 'yours', label: t('训练误差', 'Training error') }, { kind: 'error', label: t('新样本误差', 'New-sample error') }],
          },
          errorsTitle: byStep ? t('误差随训练步数（对数刻度）') : t('误差随 λ（对数刻度）'),
          now: (at + 0.5) / history.length,
        }
      },
    }
  },
  verify(model, bench) {
    const { fit } = model
    const run = fit.training()
    const valid = run.map((r) => r.valid)
    const bottom = valid.indexOf(Math.min(...valid))
    if (bottom === 0 || bottom === run.length - 1) return '验证误差没有先降后升'
    if (run.at(-1).train >= run[bottom].train) return '训练误差没有一直下降'
    const [byStep, byLambda] = bench.stages
    const passes = (stage, v) => judge(goalOf(bench, stage), model.view({ step: 0, lambda: 0, ...v }, { open: stage.opens })).pass
    if (passes(byStep, { step: 0 }) || passes(byStep, { step: run.length - 1 })) return '一开始或训练到底也能过'
    const lambdas = bench.knobs.lambda.values
    const good = lambdas.map((_, i) => i).filter((i) => passes(byLambda, { lambda: i }))
    if (!good.length || good.includes(0) || good.includes(lambdas.length - 1)) return 'λ 的两端也能过，或者都不能过'
    return ''
  },
}
