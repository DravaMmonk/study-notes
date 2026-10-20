// The RANSAC bench (RansacTrials.jsx): fit a line to points with outliers by k rounds of drawing 2 points and counting
// those within δ; the player picks k and δ per stage and is judged over many seeded trials.
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
 * The bench's model. stages: [{ label, outliers, budget }]; n points per trial with noise `sigma`; `trials` seeded
 * trials per setting; tol: { theta, rho } how close the fit must come to the true line. A stage passes when at least
 * 99% of trials succeed with k within its budget.
 */
export function ransacBench({ stages, n, sigma, trials, tol }) {
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
    return { outcomes, wins, rate: wins / trials, pass: wins >= 0.99 * trials && k <= stage.budget }
  }
  return { stages, trials, rate, trial, rounds: ransacRounds, tol, n }
}
