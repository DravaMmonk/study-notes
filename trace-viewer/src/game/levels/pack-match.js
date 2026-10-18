// Chapter 6 · 认出同一个点, levels 6-2 … 6-5 (lectures 11–12): appearance matching with the ratio test,
// Hough voting, RANSAC rounds, and the book-cover homography. All four are boards; the game logic
// lives here as plain functions (level.model) so `npm run levels` can prove every lesson.
import { random } from '../engine/image.js'
import { keyOf } from '../../../../games/kit/shell/i18n.js'
import { affineFit, homographyDLT, houghAccumulate, houghPeaks, invert3, lineGap, lineThrough, project, rankCandidates, ransacLine } from '../engine/match.js'

const gauss = (next) => {
  let s = 0
  for (let i = 0; i < 6; i++) s += next()
  return (s - 3) * Math.SQRT2
}

// =====================================================================================
// 6-2 找对应: windows compared by SSD; repeated texture makes the nearest one untrustworthy.
// =====================================================================================

const MW = 40 // image width
const MH = 28 // image height
const MR = 2 // window radius: 5×5 windows
const TILE = 6 // the fence repeats every 6 px

// A small world: a soft background, a few one-of-a-kind marks and a fence of identical tiles.
// Both photos are crops of it; the right one is moved by (tx, ty), noisier, maybe brighter.
function matchWorld(seed, marks, fence) {
  const W = MW + 16
  const H = MH + 8
  const next = random(seed)
  const data = new Float32Array(W * H)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) data[y * W + x] = 0.42 + 0.1 * Math.sin(x / 7 + seed) + 0.08 * Math.cos(y / 5) + (next() - 0.5) * 0.06
  for (const [mx, my] of marks) {
    for (let v = -MR; v <= MR; v++) for (let u = -MR; u <= MR; u++) data[(my + v) * W + mx + u] = 0.08 + 0.84 * next()
  }
  // Fence tile, 6 wide × 5 tall: two dark posts and a bright bolt; every tile is identical.
  const [fx, fy, count] = fence
  const tile = [
    [0.15, 0.15, 0.7, 0.75, 0.7, 0.3],
    [0.15, 0.15, 0.75, 0.95, 0.75, 0.3],
    [0.15, 0.15, 0.3, 0.75, 0.3, 0.3],
    [0.15, 0.15, 0.75, 0.95, 0.75, 0.3],
    [0.15, 0.15, 0.7, 0.75, 0.7, 0.3],
  ]
  for (let i = 0; i < count; i++) for (let v = 0; v < 5; v++) for (let u = 0; u < TILE; u++) data[(fy - 2 + v) * W + fx + i * TILE + u] = tile[v][u]
  const bolts = Array.from({ length: count }, (_, i) => [fx + i * TILE + 3, fy])
  return { W, H, data, bolts }
}

function crop(world, ox, oy, seed, noise, gain = 1, offset = 0) {
  const next = random(seed)
  const data = new Float32Array(MW * MH)
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) data[y * MW + x] = world.data[(y + oy) * world.W + x + ox] * gain + offset + gauss(next) * noise
  return { w: MW, h: MH, data }
}

const inside = ([x, y]) => x >= MR && y >= MR && x < MW - MR && y < MH - MR

function matchPair({ label, seed, marks, fence, shift: [tx, ty], noise, gain, offset, fenceKeys }) {
  const world = matchWorld(seed, marks, fence)
  const a = crop(world, 4, 4, seed + 1, 0.03)
  const b = crop(world, 4 + tx, 4 + ty, seed + 2, noise, gain, offset)
  const toA = ([x, y]) => [x - 4, y - 4]
  const toB = ([x, y]) => [x - 4 - tx, y - 4 - ty]
  // Candidates in B: every mark and fence bolt that the right photo sees.
  const worldCandidates = [...marks, ...world.bolts].filter((p) => inside(toB(p)))
  const candidates = worldCandidates.map(toB)
  const keyWorld = [...marks, ...fenceKeys.map((i) => world.bolts[i])].filter((p) => inside(toA(p)))
  const keypoints = keyWorld.map((p) => ({ at: toA(p), truth: worldCandidates.findIndex((q) => q[0] === p[0] && q[1] === p[1]), fence: !marks.includes(p) }))
  return { label, a, b, candidates, keypoints }
}

const MATCH_PAIRS = [
  matchPair({ label: { zh: '第 1 组', en: 'Set 1' }, seed: 26, marks: [[9, 8], [22, 10], [33, 7], [44, 12], [14, 27], [40, 28]], fence: [8, 19, 7], shift: [3, 1], noise: 0.03, fenceKeys: [0, 1, 3, 5] }),
  matchPair({ label: { zh: '第 2 组', en: 'Set 2' }, seed: 36, marks: [[12, 9], [27, 6], [38, 11], [47, 8], [20, 28], [35, 29]], fence: [5, 20, 8], shift: [-2, 2], noise: 0.06, fenceKeys: [0, 2, 4, 6, 7] }),
  matchPair({ label: { zh: '第 3 组', en: 'Set 3' }, seed: 3, marks: [[10, 10], [24, 7], [36, 9], [45, 27], [15, 28], [30, 29]], fence: [12, 19, 6], shift: [4, -1], noise: 0.03, gain: 1.15, offset: 0.06, fenceKeys: [0, 2, 3, 5] }),
]

// For every keypoint of A: the candidates of B ranked by distance, d₁, d₂ and whether the nearest is right.
function matchRows(pair) {
  return pair.keypoints.map((kp) => {
    const ranking = rankCandidates(pair.a, kp.at, pair.b, pair.candidates, MR)
    const [first, second] = ranking
    return { ...kp, ranking, best: first.index, d1: first.d, d2: second?.d ?? Infinity, ratio: first.d / (second?.d ?? Infinity), right: first.index === kp.truth }
  })
}

const MATCH_ROWS = MATCH_PAIRS.map(matchRows)

const MATCH_NEED = (rows) => rows.filter((r) => !r.fence && r.truth >= 0).length

// rule: { mode: 'all' | 'dist' | 'ratio', t, r }
function acceptMatch(row, rule) {
  if (rule.mode === 'dist') return row.d1 < rule.t
  if (rule.mode === 'ratio') return row.ratio < rule.r
  return true
}

function judgeMatches(rows, rule) {
  const accepted = rows.filter((row) => acceptMatch(row, rule))
  const correct = accepted.filter((row) => row.right).length
  const wrong = accepted.length - correct
  const need = MATCH_NEED(rows)
  return { accepted: accepted.length, correct, wrong, need, pass: wrong === 0 && correct >= need }
}

const judgeAllMatches = (rule) => MATCH_ROWS.map((rows) => judgeMatches(rows, rule))

function verifyMatch() {
  const passes = (rule) => judgeAllMatches(rule).every((j) => j.pass)
  if (passes({ mode: 'all' })) return 'plain nearest neighbour passes'
  for (let t = 0; t <= 4; t += 0.01) if (passes({ mode: 'dist', t })) return `absolute threshold d1 < ${t.toFixed(2)} passes`
  if (!passes({ mode: 'ratio', r: 0.8 })) return 'ratio test r = 0.8 fails'
  if (passes({ mode: 'ratio', r: 0.99 })) return 'ratio 0.99 (no real test) passes'
  if (passes({ mode: 'ratio', r: 0.15 })) return 'ratio 0.15 (rejects everything) passes'
  // Every pair must show the trap: nearest-neighbour accepts at least one wrong fence match.
  for (const [i, rows] of MATCH_ROWS.entries()) if (!judgeMatches(rows, { mode: 'all' }).wrong) return `pair ${i + 1} has no wrong nearest match`
  return ''
}

// =====================================================================================
// 6-3 投票: Hough accumulator; the bin size decides whether votes split or lines merge.
// =====================================================================================

const HOUGH_RHO_MAX = 34
// The bin-size dial: one step sets both Δθ (degrees) and Δρ (pixels).
const HOUGH_STEPS = [[1, 0.25], [1.5, 0.5], [2, 0.75], [3, 1], [4.5, 1.5], [6, 2], [9, 3], [12, 4], [18, 6]]
const HOUGH_TOL = { theta: 4, rho: 1.5 }

function houghScene(seed, lines, outliers, sigma = 0.7) {
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

const HOUGH_SCENES = [
  { label: { zh: '两条轨道', en: 'Two rails' }, lines: [{ theta: 60, rho: -2, n: 32 }, { theta: 63, rho: 3, n: 24 }], points: houghScene(6, [{ theta: 60, rho: -2, n: 32 }, { theta: 63, rho: 3, n: 24 }], 16) },
  { label: { zh: '一长一短', en: 'One long, one short' }, lines: [{ theta: 150, rho: 9, n: 34 }, { theta: 100, rho: -15, n: 20, from: -14, to: 14 }], points: houghScene(22, [{ theta: 150, rho: 9, n: 34 }, { theta: 100, rho: -15, n: 20, from: -14, to: 14 }], 16) },
  { label: { zh: '挨得很近', en: 'Close together' }, lines: [{ theta: 15, rho: 4, n: 30 }, { theta: 10, rho: 13, n: 22 }], points: houghScene(4, [{ theta: 15, rho: 4, n: 30 }, { theta: 10, rho: 13, n: 22 }], 18) },
]

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

function houghRun(scene, step) {
  const [dTheta, dRho] = HOUGH_STEPS[step]
  const acc = houghAccumulate(scene.points, dTheta, dRho, HOUGH_RHO_MAX)
  const peaks = houghPeaks(acc, 3).map((p) => refinePeak(acc, p))
  const top = peaks.slice(0, 2)
  const used = new Set()
  const found = scene.lines.map((line) => {
    const index = top.findIndex((p, i) => {
      if (used.has(i)) return false
      const gap = lineGap(p, line)
      return gap.dTheta <= HOUGH_TOL.theta && gap.dRho <= HOUGH_TOL.rho
    })
    if (index >= 0) used.add(index)
    return index
  })
  return { acc, peaks, found, pass: found.every((i) => i >= 0) }
}

const houghPassesAll = (step) => HOUGH_SCENES.every((scene) => houghRun(scene, step).pass)

function verifyHough() {
  const pattern = HOUGH_STEPS.map((_, step) => houghPassesAll(step))
  if (!pattern.some(Boolean)) return 'no bin size passes every scene'
  if (pattern[0] || pattern[1]) return 'the finest bins pass'
  if (pattern.at(-1) || pattern.at(-2)) return 'the coarsest bins pass'
  // Coarse bins must fail because the two rails fall into one cell or neighbouring cells: one peak.
  const [dTheta, dRho] = HOUGH_STEPS.at(-1)
  const [a, b] = HOUGH_SCENES[0].lines
  const cell = (line) => [Math.floor(line.theta / dTheta), Math.floor((line.rho + HOUGH_RHO_MAX) / dRho)]
  const [ca, cb] = [cell(a), cell(b)]
  if (Math.abs(ca[0] - cb[0]) > 1 || Math.abs(ca[1] - cb[1]) > 1) return 'coarse bins still separate the two rails'
  if (houghRun(HOUGH_SCENES[0], HOUGH_STEPS.length - 1).found.filter((i) => i >= 0).length > 1) return 'coarse bins find both rails'
  return ''
}

// =====================================================================================
// 6-4 共识: RANSAC rounds k and inlier threshold δ, judged over 200 seeded trials.
// =====================================================================================

const RANSAC_N = 80
const RANSAC_SIGMA = 0.5
const RANSAC_TRIALS = 200
const RANSAC_TOL = { theta: 5, rho: 2 }
const RANSAC_STAGES = [
  { label: { zh: '外点 25%', en: 'Outliers 25%' }, outliers: 0.25, budget: 10 },
  { label: { zh: '外点 50%', en: 'Outliers 50%' }, outliers: 0.5, budget: 25 },
  { label: { zh: '外点 70%', en: 'Outliers 70%' }, outliers: 0.7, budget: 66 },
]

function ransacData(stage, trial) {
  const next = random(trial * 7919 + Math.round(stage.outliers * 1000))
  const angle = next() * Math.PI
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  const off = (next() - 0.5) * 10
  const inliers = Math.round(RANSAC_N * (1 - stage.outliers))
  const points = []
  const truth = lineThrough([-dy * off, dx * off], [-dy * off + dx, dx * off + dy])
  for (let i = 0; i < inliers; i++) {
    const s = (next() - 0.5) * 34
    const e = gauss(next) * RANSAC_SIGMA
    points.push([-dy * off + dx * s - dy * e, dx * off + dy * s + dx * e])
  }
  while (points.length < RANSAC_N) points.push([(next() - 0.5) * 44, (next() - 0.5) * 44])
  return { points, truth, inliers }
}

function ransacTrial(stage, trial, k, delta) {
  const data = ransacData(stage, trial)
  const result = ransacLine(data.points, k, delta, random(1000 + trial))
  const gap = result && lineGap(result.line, data.truth)
  return { ...data, result, ok: Boolean(gap && gap.dTheta <= RANSAC_TOL.theta && gap.dRho <= RANSAC_TOL.rho) }
}

function ransacRate(stage, k, delta) {
  const outcomes = []
  for (let t = 0; t < RANSAC_TRIALS; t++) outcomes.push(ransacTrial(stage, t + 1, k, delta).ok)
  const wins = outcomes.filter(Boolean).length
  return { outcomes, wins, rate: wins / RANSAC_TRIALS, pass: wins >= 0.99 * RANSAC_TRIALS && k <= stage.budget }
}

// k ≥ log(1 − P) / log(1 − pⁿ), the lecture's formula, for showing after the level.
const ransacRounds = (p, n = 2, P = 0.99) => Math.ceil(Math.log(1 - P) / Math.log(1 - p ** n))

const RANSAC_SOLUTION = { delta: 1, k: [10, 25, 66] }

function verifyRansac() {
  const passAll = (delta, ks) => RANSAC_STAGES.every((stage, i) => ransacRate(stage, ks[i], delta).pass)
  if (!passAll(RANSAC_SOLUTION.delta, RANSAC_SOLUTION.k)) return `reference δ=${RANSAC_SOLUTION.delta}, k=${RANSAC_SOLUTION.k} fails`
  for (const [i, stage] of RANSAC_STAGES.entries()) {
    const theory = ransacRounds(1 - stage.outliers)
    if (theory > stage.budget) return `${keyOf(stage.label)}: formula needs ${theory} rounds, budget ${stage.budget}`
    // Far fewer rounds than the formula asks for must fail.
    if (ransacRate(stage, Math.ceil(theory / 3), RANSAC_SOLUTION.delta).pass) return `${keyOf(stage.label)}: k = ${Math.ceil(theory / 3)} already passes`
    if (i && ransacRate(stage, RANSAC_STAGES[0].budget, RANSAC_SOLUTION.delta).pass) return `${keyOf(stage.label)}: the first stage's k passes, k needs no thought`
  }
  // δ too large lets outliers in; δ too small loses inliers; neither is rescued by the budget.
  if (passAll(6, RANSAC_STAGES.map((s) => s.budget))) return 'δ = 6 passes'
  if (passAll(0.25, RANSAC_STAGES.map((s) => s.budget))) return 'δ = 0.25 passes'
  if (passAll(2.5, RANSAC_STAGES.map((s) => s.budget))) return 'δ = 2.5 passes'
  return ''
}

// =====================================================================================
// 6-5 书封面: pairs of points → homography by DLT; three pairs only give an affine map.
// =====================================================================================

const COVER = { w: 60, h: 84 }
const PHOTO = { w: 200, h: 150 }
const TITLE = [8, 10, 52, 30]
const LOGO = [22, 50, 38, 66]
const rectCorners = ([x0, y0, x1, y1]) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]

// The true pose: the cover's corners land on a trapezoid, the far (top) edge clearly shorter.
const COVER_QUAD = [[78, 24], [140, 30], [166, 128], [48, 120]]
const TRUE_H = homographyDLT(rectCorners([0, 0, COVER.w, COVER.h]).map((from, i) => ({ from, to: COVER_QUAD[i] })))

const COVER_POINTS = [...rectCorners([0, 0, COVER.w, COVER.h]), ...rectCorners(TITLE), ...rectCorners(LOGO)]
// The photo's sticky note and paper are drawn from these outlines.
const CLUTTER_SHAPES = {
  note: [[14, 14], [34, 12], [36, 32], [16, 34]],
  paper: [[176, 70], [206, 64], [210, 160], [186, 148]],
}

const PHOTO_POINTS = (() => {
  const next = random(65)
  const cover = COVER_POINTS.map(([x, y]) => {
    const [u, v] = project(TRUE_H, x, y)
    return { at: [u + (next() - 0.5) * 0.4, v + (next() - 0.5) * 0.4], truth: true }
  })
  // Corners of other things on the desk: a sticky note and a sheet of paper.
  const clutter = [...CLUTTER_SHAPES.note, CLUTTER_SHAPES.paper[0], CLUTTER_SHAPES.paper[3]].map((at) => ({ at, truth: false }))
  // Shuffle so the list order gives nothing away.
  return [...cover, ...clutter].map((p, i) => ({ ...p, cover: p.truth ? i : -1, key: (i * 7) % 18 })).sort((a, b) => a.key - b.key)
})()

const GRID = (() => {
  const points = []
  for (let i = 0; i <= 6; i++) for (let j = 0; j <= 8; j++) points.push([(i / 6) * COVER.w, (j / 8) * COVER.h])
  return points
})()

// Mean distance (photo px) between where a model and the true pose put the cover's grid points.
function overlayError(M) {
  if (!M) return Infinity
  let sum = 0
  for (const [x, y] of GRID) {
    const [u, v] = project(M, x, y)
    const [tu, tv] = project(TRUE_H, x, y)
    const d = Math.hypot(u - tu, v - tv)
    if (!Number.isFinite(d)) return Infinity
    sum += d
  }
  return sum / GRID.length
}

// pairs: [{ cover: index into COVER_POINTS, photo: index into PHOTO_POINTS }]
function fitCover(pairs) {
  const data = pairs.map((p) => ({ from: COVER_POINTS[p.cover], to: PHOTO_POINTS[p.photo].at }))
  if (data.length < 3) return { model: null, kind: '', error: Infinity }
  if (data.length === 3) {
    const A = affineFit(data)
    return { model: A, kind: 'affine', error: overlayError(A) }
  }
  const H = homographyDLT(data)
  return { model: H, kind: 'homography', error: overlayError(H) }
}

const COVER_TOL = 1.5

const photoIndexOf = (coverIndex) => PHOTO_POINTS.findIndex((p) => p.cover === coverIndex)

function verifyCover() {
  if (!TRUE_H) return 'no true pose'
  // The DLT must recover a known homography exactly from 4 noise-free pairs.
  const exact = homographyDLT(COVER_POINTS.slice(0, 4).map((from) => ({ from, to: project(TRUE_H, ...from) })))
  if (!(overlayError(exact) < 1e-6)) return 'DLT does not recover the true H'
  const goal = fitCover([0, 1, 2, 3].map((c) => ({ cover: c, photo: photoIndexOf(c) })))
  if (!(goal.error < COVER_TOL)) return `4 corner pairs give error ${goal.error.toFixed(2)}`
  const other = fitCover([4, 5, 10, 11].map((c) => ({ cover: c, photo: photoIndexOf(c) })))
  if (!(other.error < COVER_TOL)) return `title + logo pairs give error ${other.error.toFixed(2)}`
  // No three correct pairs, and not even the best affine fit to all twelve, can reach the goal.
  let bestAffine = Infinity
  for (let i = 0; i < 12; i++) {
    for (let j = i + 1; j < 12; j++) {
      for (let k = j + 1; k < 12; k++) {
        const fit = fitCover([i, j, k].map((c) => ({ cover: c, photo: photoIndexOf(c) })))
        if (fit.model) bestAffine = Math.min(bestAffine, fit.error)
      }
    }
  }
  if (bestAffine < 3 * COVER_TOL) return `three pairs reach error ${bestAffine.toFixed(2)}`
  const lsq = affineFit(COVER_POINTS.map((from, c) => ({ from, to: PHOTO_POINTS[photoIndexOf(c)].at })))
  if (overlayError(lsq) < 3 * COVER_TOL) return 'least-squares affine fits'
  // One wrong pair (title corner matched to the cover corner) must fail.
  const wrong = fitCover([0, 1, 2, 7].map((c, i) => ({ cover: i === 3 ? 3 : c, photo: photoIndexOf(c) })))
  if (wrong.error < COVER_TOL) return 'a wrong pair passes'
  return ''
}

// Cover artwork in cover units → [r, g, b]. Fixed colours: it is a photograph, not UI.
function coverColour(x, y) {
  const [tx0, ty0, tx1, ty1] = TITLE
  const [lx0, ly0, lx1, ly1] = LOGO
  if (x >= tx0 && x < tx1 && y >= ty0 && y < ty1) {
    const line = (y > 14 && y < 17 && x > 12 && x < 48) || (y > 21 && y < 24 && x > 12 && x < 40)
    return line ? [44, 52, 70] : [236, 226, 198]
  }
  if (x >= lx0 && x < lx1 && y >= ly0 && y < ly1) return (x - lx0 + y - ly0) % 8 < 4 ? [214, 146, 44] : [232, 176, 80]
  if (y > 72 && y < 77 && x > 12 && x < 48) return [196, 200, 214]
  return [36, 66, 104]
}

function deskColour(u, v) {
  const grain = 0.5 + 0.5 * Math.sin(v * 0.35 + Math.sin(u * 0.05) * 3)
  let c = [178 + grain * 16, 160 + grain * 14, 132 + grain * 10]
  const inPoly = (poly) => {
    let hit = false
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i]
      const [xj, yj] = poly[j]
      if (yi > v !== yj > v && u < ((xj - xi) * (v - yi)) / (yj - yi) + xi) hit = !hit
    }
    return hit
  }
  if (inPoly(CLUTTER_SHAPES.paper)) c = [238, 236, 228]
  if (inPoly(CLUTTER_SHAPES.note)) c = [236, 206, 96]
  return c
}

// Render the photo (desk + cover under the true pose) and, for a model, the cover warped by it.
function renderPhoto(target, M = TRUE_H, { desk = true } = {}) {
  const inverse = M && invert3(M)
  for (let v = 0; v < PHOTO.h; v++) {
    for (let u = 0; u < PHOTO.w; u++) {
      const i = (v * PHOTO.w + u) * 4
      let colour = desk ? deskColour(u + 0.5, v + 0.5) : null
      if (inverse) {
        const [x, y] = project(inverse, u + 0.5, v + 0.5)
        if (x >= 0 && y >= 0 && x < COVER.w && y < COVER.h) colour = coverColour(x, y)
      }
      if (colour) {
        target[i] = colour[0]
        target[i + 1] = colour[1]
        target[i + 2] = colour[2]
        target[i + 3] = 255
      } else {
        target[i + 3] = 0
      }
    }
  }
}

function renderCover(target) {
  for (let y = 0; y < COVER.h; y++) {
    for (let x = 0; x < COVER.w; x++) {
      const i = (y * COVER.w + x) * 4
      const c = coverColour(x + 0.5, y + 0.5)
      target.set([c[0], c[1], c[2], 255], i)
    }
  }
}

// =====================================================================================

export const levels = [
  {
    id: '6-2',
    kind: 'board',
    board: 'MatchRatio',
    chapter: 6,
    title: { zh: '找对应', en: 'Find correspondences' },
    brief: {
      zh: '左图每个关键点，取右图里 5×5 窗口最像的候选（距离 d = √SSD 最小）。定一条接受规则：三组图里接受的匹配不能有错，独特的点都要找回。',
      en: 'Each keypoint in the left image takes the candidate in the right image whose 5×5 window is most alike (smallest distance d = √SSD). Set a rule for which matches to accept: in all three sets, no accepted match may be wrong, and every distinctive point must be found.',
    },
    hint: {
      zh: '点开一个连错的点，看看排在它前面的几个候选。重复的纹理里，最像的不一定是对的。',
      en: 'Open a point that is matched wrongly and look at its top few candidates. In repeated texture, the most alike is not always the right one.',
    },
    after: {
      zh: '栅栏一格格完全一样，第一名和第二名几乎一样近：这种匹配再“像”也不可信，而且 d₁ 本身可以很小，所以只看距离挡不住它。距离比检验 d₁ / d₂ < r 只接受第一名明显领先的匹配，整体变亮也不影响比值。课上取 r = 0.8。',
      en: 'Every tile of the fence is identical, so the first and second places are almost equally close: however "alike" such a match is, it cannot be trusted, and d₁ itself can be very small, so a distance threshold alone cannot stop it. The ratio test d₁ / d₂ < r only accepts a match whose first place is clearly ahead, and a brighter image does not change the ratio. The lecture uses r = 0.8.',
    },
    requires: ['6-1'],
    unlocks: [],
    model: { pairs: MATCH_PAIRS, rows: MATCH_ROWS, judge: judgeMatches, accept: acceptMatch, W: MW, H: MH, R: MR },
    verify: verifyMatch,
  },
  {
    id: '6-3',
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
    requires: ['6-2'],
    unlocks: [],
    model: { scenes: HOUGH_SCENES, steps: HOUGH_STEPS, run: houghRun, rhoMax: HOUGH_RHO_MAX, tol: HOUGH_TOL },
    verify: verifyHough,
  },
  {
    id: '6-4',
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
    requires: ['6-3'],
    unlocks: [],
    model: { stages: RANSAC_STAGES, trials: RANSAC_TRIALS, rate: ransacRate, trial: ransacTrial, rounds: ransacRounds, tol: RANSAC_TOL, n: RANSAC_N },
    verify: verifyRansac,
  },
  {
    id: '6-5',
    kind: 'board',
    board: 'BookCover',
    chapter: 6,
    title: { zh: '书封面', en: 'Book cover' },
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
    requires: ['6-4'],
    unlocks: [],
    model: { COVER, PHOTO, coverPoints: COVER_POINTS, photoPoints: PHOTO_POINTS, fit: fitCover, tol: COVER_TOL, renderPhoto, renderCover, project, trueQuad: COVER_QUAD },
    verify: verifyCover,
  },
]
