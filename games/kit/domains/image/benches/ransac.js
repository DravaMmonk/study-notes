// The RANSAC bench: fit a line to points with outliers by k rounds of drawing 2 points and counting those within δ;
// the player picks δ, and k per outlier ratio, and is judged over many seeded trials.
import { S } from '../../../engine/schema.js'
import { judge } from '../../../engine/bench.js'
import { keyOf, T as t } from '../../../shell/i18n.js'
import { random } from '../engine/image.js'
import { lineGap, lineThrough, ransacLine } from '../engine/match.js'


const gauss = (next) => {
  let s = 0
  for (let i = 0; i < 6; i++) s += next()
  return (s - 3) * Math.SQRT2
}

/** k ≥ log(1 − P) / log(1 − pⁿ), the lecture's formula: rounds for a chance P of drawing n inliers at least once. */
export const ransacRounds = (p, n = 2, P = 0.99) => Math.ceil(Math.log(1 - P) / Math.log(1 - p ** n))

/**
 * The trials. A stage is { label, outliers, budget }; n points per trial with noise `sigma`; `trials` seeded trials
 * per setting; tol: { theta, rho } how close the fit must come to the true line.
 */
export function ransacBench({ n, sigma, trials, tol }) {
  function data(stage, trial) {
    const next = random(trial * 7919 + Math.round(stage.outliers * 1000))
    const angle = next() * Math.PI
    const dx = Math.cos(angle)
    const dy = Math.sin(angle)
    const off = (next() - 0.5) * 10
    const inliers = Math.round(n * (1 - stage.outliers))
    const points = []
    const truth = lineThrough([-dy * off, dx * off], [-dy * off + dx, dx * off + dy])
    for (let i = 0; i < inliers; i++) {
      const s = (next() - 0.5) * 34
      const e = gauss(next) * sigma
      points.push([-dy * off + dx * s - dy * e, dx * off + dy * s + dx * e])
    }
    while (points.length < n) points.push([(next() - 0.5) * 44, (next() - 0.5) * 44])
    return { points, truth, inliers }
  }
  function trial(stage, t, k, delta) {
    const d = data(stage, t)
    const result = ransacLine(d.points, k, delta, random(1000 + t))
    const gap = result && lineGap(result.line, d.truth)
    return { ...d, result, ok: Boolean(gap && gap.dTheta <= tol.theta && gap.dRho <= tol.rho) }
  }
  function rate(stage, k, delta) {
    const outcomes = []
    for (let t = 0; t < trials; t++) outcomes.push(trial(stage, t + 1, k, delta).ok)
    const wins = outcomes.filter(Boolean).length
    return { outcomes, wins, rate: wins / trials, overBudget: k - stage.budget }
  }
  return { trials, rate, trial }
}

/** The bench model: knobs delta (the threshold, shared) and k (rounds, one per case); each case an outlier ratio. */
export const ransac = {
  about: t('共识：每轮随机抽两点连线、数支持它的点；旋钮 delta（门槛）和每个情形的 k（轮数）；每个情形是一种外点比例，算出几百次试验的成功率 rate 和超出预算的轮数 overBudget', 'consensus: each round joins two random points and counts the support; knobs delta (the threshold) and k per case (the rounds); each case is an outlier ratio, with the success rate over hundreds of trials and overBudget, the rounds over budget'),
  setup: S.obj({
    n: S.int(), sigma: S.num(), trials: S.int(), tol: S.obj({ theta: S.num(), rho: S.num() }),
    solution: S.obj({ delta: S.num(), k: S.list(S.int()) }, { about: t('一组能过的设定：门槛 δ 和每一种外点比例的轮数', 'settings that pass: the threshold δ and the rounds for each outlier ratio') }),
  }),
  case: S.obj({ outliers: S.num(), budget: S.int() }),
  make({ solution, ...p }, bench) {
    const m = ransacBench(p)
    const cache = new Map()
    const rate = (stage, k, delta) => {
      const key = `${stage.outliers}:${k}:${delta}`
      if (!cache.has(key)) {
        const r = m.rate(stage, k, delta)
        cache.set(key, { ...r, pass: judge(bench.goal, r).pass })
      }
      return cache.get(key)
    }
    return {
      ...m,
      rate,
      cases: bench.cases,
      solution,
      view: (v, { caseIndex }) => rate(bench.cases[caseIndex], v.k[caseIndex], v.delta),
    }
  },
  verify(model) {
    const stages = model.cases
    const { solution } = model
    const passAll = (delta, ks) => stages.every((stage, i) => model.rate(stage, ks[i], delta).pass)
    if (!passAll(solution.delta, solution.k)) return `reference δ=${solution.delta}, k=${solution.k} fails`
    for (const [i, stage] of stages.entries()) {
      const theory = ransacRounds(1 - stage.outliers)
      if (theory > stage.budget) return `${keyOf(stage.label)}: formula needs ${theory} rounds, budget ${stage.budget}`
      // Far fewer rounds than the formula asks for must fail.
      if (model.rate(stage, Math.ceil(theory / 3), solution.delta).pass) return `${keyOf(stage.label)}: k = ${Math.ceil(theory / 3)} already passes`
      if (i && model.rate(stage, stages[0].budget, solution.delta).pass) return `${keyOf(stage.label)}: the first stage's k passes, k needs no thought`
    }
    // δ too large lets outliers in; δ too small loses inliers; neither is rescued by the budget.
    if (passAll(6, stages.map((s) => s.budget))) return 'δ = 6 passes'
    if (passAll(0.25, stages.map((s) => s.budget))) return 'δ = 0.25 passes'
    if (passAll(2.5, stages.map((s) => s.budget))) return 'δ = 2.5 passes'
    return ''
  },
}
