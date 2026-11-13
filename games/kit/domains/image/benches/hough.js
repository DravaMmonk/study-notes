// The Hough voting bench: edge points vote for every line (θ, ρ) through them; the player picks a bin size and wins
// when, in every scene, the two strongest peaks are the scene's two lines.
import { S } from '../../../engine/schema.js'
import { judge } from '../../../engine/bench.js'
import { random } from '../engine/image.js'
import { houghAccumulate, houghPeaks, lineGap } from '../engine/match.js'
import { T as t } from '../../../shell/i18n.js'


const gauss = (next) => {
  let s = 0
  for (let i = 0; i < 6; i++) s += next()
  return (s - 3) * Math.SQRT2
}

/** Points along `lines` ({ theta°, rho, n, from?, to? }) with noise `sigma`, plus `outliers` scattered points. */
export function houghScene(seed, lines, outliers, sigma = 0.7) {
  const next = random(seed)
  const points = []
  for (const { theta, rho, n, from = -22, to = 22 } of lines) {
    const t = (theta * Math.PI) / 180
    const nx = Math.cos(t)
    const ny = Math.sin(t)
    for (let i = 0; i < n; i++) {
      const s = from + ((to - from) * (i + next())) / n
      const e = gauss(next) * sigma
      const x = nx * (rho + e) - ny * s
      const y = ny * (rho + e) + nx * s
      if (Math.abs(x) <= 24 && Math.abs(y) <= 24) points.push([x, y])
    }
  }
  for (let i = 0; i < outliers; i++) points.push([(next() - 0.5) * 48, (next() - 0.5) * 48])
  return points
}

// The peak's line is the vote-weighted centre of its 3×3 cells (a common sub-bin refinement).
function refinePeak(acc, peak) {
  const { votes, nT, nR, dTheta, dRho, rhoMax } = acc
  let sw = 0
  let st = 0
  let sr = 0
  for (let dr = -1; dr <= 1; dr++) {
    for (let dt = -1; dt <= 1; dt++) {
      const r = peak.r + dr
      const t = peak.t + dt
      if (r < 0 || r >= nR || t < 0 || t >= nT) continue
      const v = votes[r * nT + t]
      sw += v
      st += v * (t + 0.5) * dTheta
      sr += v * ((r + 0.5) * dRho - rhoMax)
    }
  }
  return { ...peak, theta: st / sw, rho: sr / sw }
}

/**
 * The bench's model. scenes: [{ label, lines, points }]; steps: the bin-size dial, [Δθ°, Δρ] per step; rhoMax: the
 * accumulator's reach; tol: { theta, rho } how close a peak must come to a line.
 */
export function houghBench({ scenes, steps, rhoMax, tol }) {
  function run(scene, step) {
    const [dTheta, dRho] = steps[step]
    const acc = houghAccumulate(scene.points, dTheta, dRho, rhoMax)
    const peaks = houghPeaks(acc, 3).map((p) => refinePeak(acc, p))
    const top = peaks.slice(0, 2)
    const used = new Set()
    const found = scene.lines.map((line) => {
      const index = top.findIndex((p, i) => {
        if (used.has(i)) return false
        const gap = lineGap(p, line)
        return gap.dTheta <= tol.theta && gap.dRho <= tol.rho
      })
      if (index >= 0) used.add(index)
      return index
    })
    return { acc, peaks, found, matched: found.filter((i) => i >= 0).length }
  }
  return { scenes, steps, run, rhoMax, tol }
}

const NAMES = ['A', 'B']

/** The bench model: knob `bin` (an index into [Δθ°, Δρ] bin sizes); each case a scene; matched: lines found. */
export const hough = {
  about: t('投票：边缘点给经过它的每条直线投票；旋钮 bin 选分箱大小；每个情形是一张图，matched 是前两个峰对上的线数'),
  setup: S.obj({ rhoMax: S.num(), tol: S.obj({ theta: S.num(), rho: S.num() }) }),
  case: S.obj({ seed: S.int(), lines: S.list(S.obj({ theta: S.num(), rho: S.num(), n: S.int(), from: S.opt(S.num()), to: S.opt(S.num()) })), outliers: S.int() }),
  make({ rhoMax, tol }, bench) {
    const scenes = bench.cases.map(({ label, seed, lines, outliers }) => ({ label, lines, points: houghScene(seed, lines, outliers) }))
    const steps = bench.knobs.bin.values
    const m = houghBench({ scenes, steps, rhoMax, tol })
    return {
      ...m,
      passesAll: (step) => scenes.every((scene) => judge(bench.goal, m.run(scene, step)).pass),
      view(v, { caseIndex }) {
        const scene = scenes[caseIndex]
        const run = m.run(scene, v.bin)
        const [dTheta, dRho] = steps[v.bin]
        return {
          matched: run.matched,
          scene,
          run,
          bin: [dTheta, dRho],
          dTheta: `${dTheta}°`,
          dRho: `${dRho} px`,
          cells: `${run.acc.nT}×${run.acc.nR}`,
          peaksTitle: [scene.label, ' · ', t('票数最高的峰')],
          peaks: {
            head: [t('峰'), 'θ', 'ρ', t('票数'), t('匹配')],
            rows: run.peaks.slice(0, 3).map((p, i) => {
              const hit = run.found.indexOf(i)
              return { dim: i >= 2, cells: [String(i + 1), `${p.theta.toFixed(1)}°`, p.rho.toFixed(1), String(p.votes), i < 2 ? { text: hit >= 0 ? NAMES[hit] : '—', tone: hit >= 0 ? 'pass' : 'fail' } : ''] }
            }),
          },
          tolerance: t(`容差 ${tol.theta}°、${tol.rho} px。`, `Tolerance ${tol.theta}°, ${tol.rho} px.`),
        }
      },
    }
  },
  verify(model) {
    const { steps, rhoMax } = model
    const pattern = steps.map((_, step) => model.passesAll(step))
    if (!pattern.some(Boolean)) return 'no bin size passes every scene'
    if (pattern[0] || pattern[1]) return 'the finest bins pass'
    if (pattern.at(-1) || pattern.at(-2)) return 'the coarsest bins pass'
    // Coarse bins must fail because the two rails fall into one cell or neighbouring cells: one peak.
    const [dTheta, dRho] = steps.at(-1)
    const [a, b] = model.scenes[0].lines
    const cell = (line) => [Math.floor(line.theta / dTheta), Math.floor((line.rho + rhoMax) / dRho)]
    const [ca, cb] = [cell(a), cell(b)]
    if (Math.abs(ca[0] - cb[0]) > 1 || Math.abs(ca[1] - cb[1]) > 1) return 'coarse bins still separate the two rails'
    if (model.run(model.scenes[0], steps.length - 1).matched > 1) return 'coarse bins find both rails'
    return ''
  },
}
