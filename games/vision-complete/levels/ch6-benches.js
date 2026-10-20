// The three benches of chapter 6 · 认出同一个点 (lectures 11–12): Hough voting, RANSAC rounds, and the four corners
// that pin down a homography. What cannot be wired from parts is played on a bench, and each bench then unlocks a
// part the circuits use (levels/ch6.js). The benches' workings are in kit/domains/image/benches; here are their
// scenes and stages, and verify(), which proves each lesson holds (`npm run check`).
import { keyOf } from '../../kit/shell/i18n.js'
import { affineFit, homographyDLT, project } from '../../kit/domains/image/engine/match.js'
import { coverBench } from '../../kit/domains/image/benches/cover.js'
import { houghBench, houghScene } from '../../kit/domains/image/benches/hough.js'
import { ransacBench, ransacRounds } from '../../kit/domains/image/benches/ransac.js'

// =====================================================================================
// 6-6 投票: Hough accumulator; the bin size decides whether votes split or lines merge.
// =====================================================================================

const HOUGH_RHO_MAX = 34
// The bin-size dial: one step sets both Δθ (degrees) and Δρ (pixels).
const HOUGH_STEPS = [[1, 0.25], [1.5, 0.5], [2, 0.75], [3, 1], [4.5, 1.5], [6, 2], [9, 3], [12, 4], [18, 6]]
const HOUGH_TOL = { theta: 4, rho: 1.5 }
const scene = (label, seed, lines, outliers) => ({ label, lines, points: houghScene(seed, lines, outliers) })
const HOUGH = houghBench({
  scenes: [
    scene({ zh: '两条轨道', en: 'Two rails' }, 6, [{ theta: 60, rho: -2, n: 32 }, { theta: 63, rho: 3, n: 24 }], 16),
    scene({ zh: '一长一短', en: 'One long, one short' }, 22, [{ theta: 150, rho: 9, n: 34 }, { theta: 100, rho: -15, n: 20, from: -14, to: 14 }], 16),
    scene({ zh: '挨得很近', en: 'Close together' }, 4, [{ theta: 15, rho: 4, n: 30 }, { theta: 10, rho: 13, n: 22 }], 18),
  ],
  steps: HOUGH_STEPS,
  rhoMax: HOUGH_RHO_MAX,
  tol: HOUGH_TOL,
})

function verifyHough() {
  const pattern = HOUGH_STEPS.map((_, step) => HOUGH.passesAll(step))
  if (!pattern.some(Boolean)) return 'no bin size passes every scene'
  if (pattern[0] || pattern[1]) return 'the finest bins pass'
  if (pattern.at(-1) || pattern.at(-2)) return 'the coarsest bins pass'
  // Coarse bins must fail because the two rails fall into one cell or neighbouring cells: one peak.
  const [dTheta, dRho] = HOUGH_STEPS.at(-1)
  const [a, b] = HOUGH.scenes[0].lines
  const cell = (line) => [Math.floor(line.theta / dTheta), Math.floor((line.rho + HOUGH_RHO_MAX) / dRho)]
  const [ca, cb] = [cell(a), cell(b)]
  if (Math.abs(ca[0] - cb[0]) > 1 || Math.abs(ca[1] - cb[1]) > 1) return 'coarse bins still separate the two rails'
  if (HOUGH.run(HOUGH.scenes[0], HOUGH_STEPS.length - 1).found.filter((i) => i >= 0).length > 1) return 'coarse bins find both rails'
  return ''
}

// =====================================================================================
// 6-8 共识: RANSAC rounds k and inlier threshold δ, judged over 200 seeded trials.
// =====================================================================================

const RANSAC_STAGES = [
  { label: { zh: '外点 25%', en: 'Outliers 25%' }, outliers: 0.25, budget: 10 },
  { label: { zh: '外点 50%', en: 'Outliers 50%' }, outliers: 0.5, budget: 25 },
  { label: { zh: '外点 70%', en: 'Outliers 70%' }, outliers: 0.7, budget: 66 },
]
const RANSAC = ransacBench({ stages: RANSAC_STAGES, n: 80, sigma: 0.5, trials: 200, tol: { theta: 5, rho: 2 } })

const RANSAC_SOLUTION = { delta: 1, k: [10, 25, 66] }

function verifyRansac() {
  const passAll = (delta, ks) => RANSAC_STAGES.every((stage, i) => RANSAC.rate(stage, ks[i], delta).pass)
  if (!passAll(RANSAC_SOLUTION.delta, RANSAC_SOLUTION.k)) return `reference δ=${RANSAC_SOLUTION.delta}, k=${RANSAC_SOLUTION.k} fails`
  for (const [i, stage] of RANSAC_STAGES.entries()) {
    const theory = ransacRounds(1 - stage.outliers)
    if (theory > stage.budget) return `${keyOf(stage.label)}: formula needs ${theory} rounds, budget ${stage.budget}`
    // Far fewer rounds than the formula asks for must fail.
    if (RANSAC.rate(stage, Math.ceil(theory / 3), RANSAC_SOLUTION.delta).pass) return `${keyOf(stage.label)}: k = ${Math.ceil(theory / 3)} already passes`
    if (i && RANSAC.rate(stage, RANSAC_STAGES[0].budget, RANSAC_SOLUTION.delta).pass) return `${keyOf(stage.label)}: the first stage's k passes, k needs no thought`
  }
  // δ too large lets outliers in; δ too small loses inliers; neither is rescued by the budget.
  if (passAll(6, RANSAC_STAGES.map((s) => s.budget))) return 'δ = 6 passes'
  if (passAll(0.25, RANSAC_STAGES.map((s) => s.budget))) return 'δ = 0.25 passes'
  if (passAll(2.5, RANSAC_STAGES.map((s) => s.budget))) return 'δ = 2.5 passes'
  return ''
}

// =====================================================================================
// 6-11 四个角: pairs of points → homography by DLT; three pairs only give an affine map.
// =====================================================================================

// The true pose puts the cover's corners on a trapezoid, the far (top) edge clearly shorter; the desk has a sticky
// note and a sheet of paper whose corners are decoys.
const CORNERS = coverBench({
  cover: { w: 60, h: 84 },
  photo: { w: 200, h: 150 },
  title: [8, 10, 52, 30],
  logo: [22, 50, 38, 66],
  quad: [[78, 24], [140, 30], [166, 128], [48, 120]],
  clutter: { note: [[14, 14], [34, 12], [36, 32], [16, 34]], paper: [[176, 70], [206, 64], [210, 160], [186, 148]] },
  seed: 65,
  tol: 1.5,
})

function verifyCover() {
  const { trueH, coverPoints, photoPoints, fit, overlayError, photoIndexOf, tol } = CORNERS
  if (!trueH) return 'no true pose'
  // The DLT must recover a known homography exactly from 4 noise-free pairs.
  const exact = homographyDLT(coverPoints.slice(0, 4).map((from) => ({ from, to: project(trueH, ...from) })))
  if (!(overlayError(exact) < 1e-6)) return 'DLT does not recover the true H'
  const goal = fit([0, 1, 2, 3].map((c) => ({ cover: c, photo: photoIndexOf(c) })))
  if (!(goal.error < tol)) return `4 corner pairs give error ${goal.error.toFixed(2)}`
  const other = fit([4, 5, 10, 11].map((c) => ({ cover: c, photo: photoIndexOf(c) })))
  if (!(other.error < tol)) return `title + logo pairs give error ${other.error.toFixed(2)}`
  // No three correct pairs, and not even the best affine fit to all twelve, can reach the goal.
  let bestAffine = Infinity
  for (let i = 0; i < 12; i++) {
    for (let j = i + 1; j < 12; j++) {
      for (let k = j + 1; k < 12; k++) {
        const three = fit([i, j, k].map((c) => ({ cover: c, photo: photoIndexOf(c) })))
        if (three.model) bestAffine = Math.min(bestAffine, three.error)
      }
    }
  }
  if (bestAffine < 3 * tol) return `three pairs reach error ${bestAffine.toFixed(2)}`
  const lsq = affineFit(coverPoints.map((from, c) => ({ from, to: photoPoints[photoIndexOf(c)].at })))
  if (overlayError(lsq) < 3 * tol) return 'least-squares affine fits'
  // One wrong pair (title corner matched to the cover corner) must fail.
  const wrong = fit([0, 1, 2, 7].map((c, i) => ({ cover: i === 3 ? 3 : c, photo: photoIndexOf(c) })))
  if (wrong.error < tol) return 'a wrong pair passes'
  return ''
}

export const benches = {
  hough: {
    id: '6-6',
    kind: 'board',
    board: 'HoughVote',
    chapter: 6,
    title: { zh: '投票', en: 'Voting' },
    brief: {
      zh: '每个边缘点给所有经过它的直线 (θ, ρ) 各投一票。调分箱大小，让三张图里票数最高的两个峰正好是那两条线。',
      en: 'Each edge point casts one vote for every line (θ, ρ) that passes through it. Adjust the bin size so that in all three images the two peaks with the most votes are exactly the two lines.',
    },
    hint: {
      zh: '格子太细，同一条线带噪声的票落不进同一格；太粗，两条相近的线挤进同一个峰。',
      en: "With cells too fine, one line's noisy votes do not land in the same cell; too coarse, and two nearby lines squeeze into one peak.",
    },
    after: {
      zh: 'Hough 把“找一条线”变成“在累加器里找峰”。分箱太细，噪声把一条线的票拆成许多小峰；太粗，相近的两条线合成一个峰。合适的分箱取决于噪声和线的间距。',
      en: 'Hough turns "find a line" into "find a peak in the accumulator". With bins too fine, noise splits one line\'s votes into many small peaks; too coarse, and two nearby lines merge into one peak. The right bin size depends on the noise and on how far apart the lines are.',
    },
    unlocks: ['hough'],
    model: HOUGH,
    verify: verifyHough,
  },
  ransac: {
    id: '6-8',
    kind: 'board',
    board: 'RansacTrials',
    chapter: 6,
    title: { zh: '共识', en: 'Consensus' },
    brief: {
      zh: '每轮随机抽 2 个点连成直线，数离它不到 δ 的点，k 轮后留下支持最多的一条。三种外点比例下，各用不超过预算的 k，让 200 次试验的成功率都 ≥ 99%。',
      en: 'Each round draws 2 random points, joins them into a line and counts the points closer than δ to it; after k rounds the line with the most support is kept. For each of the three outlier ratios, use a k within the budget so that the success rate over 200 trials is ≥ 99%.',
    },
    hint: {
      zh: '外点越多，一轮抽中两个内点的机会越小。δ 只和噪声有关：太小漏掉真内点，太大把外点也算进来。',
      en: 'The more outliers, the smaller the chance that a round draws two inliers. δ depends only on the noise: too small misses true inliers, too large counts outliers in as well.',
    },
    after: {
      zh: '一轮两点都是内点的概率是 p²，k 轮全落空的概率是 (1 − p²)ᵏ。要成功率达到 P，就要 k ≥ log(1 − P) / log(1 − pⁿ)：p = 0.5、n = 2、P = 0.99 时是 17 轮，内点只剩 30% 时要 49 轮。轮数由内点比例决定，δ 由噪声决定，两者不能互相代替。',
      en: 'The chance that both points of a round are inliers is p², and the chance that all k rounds miss is (1 − p²)ᵏ. To reach a success rate P you need k ≥ log(1 − P) / log(1 − pⁿ): with p = 0.5, n = 2 and P = 0.99 that is 17 rounds, and with only 30% inliers it takes 49. The number of rounds is set by the inlier ratio and δ by the noise; neither can stand in for the other.',
    },
    unlocks: ['ransac'],
    model: RANSAC,
    verify: verifyRansac,
  },
  corners: {
    id: '6-11',
    kind: 'board',
    board: 'BookCover',
    chapter: 6,
    title: { zh: '四个角', en: 'Four corners' },
    brief: {
      zh: '从封面上的点拖到照片里同一个点，连出对应点对。把封面贴回照片，平均误差小于 1.5 像素即通过。',
      en: 'Drag from a point on the cover to the same point in the photo to make a pair of corresponding points. The cover is pasted back onto the photo; you pass when the mean error is under 1.5 pixels.',
    },
    hint: {
      zh: '贴回去的封面哪里对不上？斜着拍的书，远的一边更短。',
      en: 'Where does the pasted cover fail to line up? In a book photographed at an angle, the far edge is shorter.',
    },
    after: {
      zh: '单应矩阵 H 有 8 个自由度，每对点给 2 个方程，所以至少要 4 对点，游戏用 DLT 从你的点对解出了 H。3 对点只能定出仿射（6 个自由度），它保持平行，贴不上透视下的书。实际流水线里，这些点对来自距离比检验后的候选，再由 RANSAC 反复抽 4 对、数内点选出来。',
      en: 'The homography H has 8 degrees of freedom and each pair of points gives 2 equations, so it needs at least 4 pairs; the game solved H from your pairs with DLT. Three pairs only fix an affine map (6 degrees of freedom), which keeps lines parallel and cannot fit a book seen in perspective. In a real pipeline the pairs come from candidates that passed the ratio test, and RANSAC picks them by repeatedly drawing 4 pairs and counting inliers.',
    },
    unlocks: ['homography'],
    model: CORNERS,
    verify: verifyCover,
  },
}
