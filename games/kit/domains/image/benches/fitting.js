// The when-to-stop bench (EarlyStop.jsx): a few noisy samples of a smooth curve, fitted by a polynomial. Trained by
// gradient descent the fit first follows the curve, then starts bending through the noise: the error on the training
// samples keeps falling while the error on new samples (validation) turns and rises. A penalty λ·Σw² (all but the
// constant) is the other way to stop it.

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
 * The bench's model. degree: how many weights (powers 0 … degree − 1); seed: the samples' noise; truth(x) on [−1, 1];
 * train: how many noisy samples, noise their spread; valid: how many new samples; checkpoints: the training steps the
 * bench shows; rate: the descent's step; lambdas: the penalties to choose from; slack: how close to the best
 * validation error counts as stopping at the bottom; stages: [{ control: 'step' | 'lambda', … }].
 */
export function stopBench({ degree, seed, truth, train, noise, valid, checkpoints, rate, lambdas, slack, stages }) {
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
  const passes = (stage, s) => {
    if (stage.control === 'step') {
      const r = training()
      const best = Math.min(...r.map((c) => c.valid))
      return r[s.step].valid <= best * slack
    }
    const best = Math.min(...lambdas.map((l) => regularised(l).valid))
    return regularised(lambdas[s.lambda]).valid <= best * slack
  }
  return { data, predict, training, checkpoints, regularised, lambdas, stages, passes, start: { step: 0, lambda: 0 } }
}
