// Pure model for the RANSAC peg board: 20 points, a true line, a seeded sample sequence.
// k ≥ log(1 − P) / log(1 − pⁿ) rounds for a line (n = 2) at confidence P = 0.99.

export const COUNT = 20
export const HALF = 50 // board coordinates run −HALF..HALF
export const CONFIDENCE = 0.99
export const MINIMAL = 2
export const TRUE_LINE = { slope: 0.42, intercept: -6 }

function random(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function makePoints(outliers, seed = 7) {
  const next = random(seed)
  const inliers = COUNT - outliers
  const points = []
  for (let index = 0; index < inliers; index++) {
    const x = -44 + (88 * (index + next() * 0.6)) / inliers
    const noise = (next() + next() - 1) * 2.2
    points.push({ x, y: TRUE_LINE.slope * x + TRUE_LINE.intercept + noise, inlier: true })
  }
  for (let index = 0; index < outliers; index++) {
    let point
    do point = { x: -46 + next() * 92, y: -46 + next() * 92, inlier: false }
    while (Math.abs(point.y - (TRUE_LINE.slope * point.x + TRUE_LINE.intercept)) < 9)
    points.push(point)
  }
  // Interleave so the board doesn't list inliers first.
  return points.map((point) => ({ point, key: next() })).sort((a, b) => a.key - b.key).map(({ point }) => point)
}

export function samples(rounds, seed) {
  const next = random(seed * 31 + 3)
  return Array.from({ length: rounds }, () => {
    const a = Math.floor(next() * COUNT)
    let b = Math.floor(next() * (COUNT - 1))
    if (b >= a) b += 1
    return [a, b]
  })
}

export const roundsNeeded = (inlierRatio) =>
  Math.ceil(Math.log(1 - CONFIDENCE) / Math.log(1 - inlierRatio ** MINIMAL))

// A line through two points as { cx, cy, angle } (a point on it and its direction).
export function lineThrough(a, b) {
  return { cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, angle: Math.atan2(b.y - a.y, b.x - a.x) }
}

export const distance = (line, point) =>
  Math.abs(-(point.x - line.cx) * Math.sin(line.angle) + (point.y - line.cy) * Math.cos(line.angle))

export const supporters = (line, points, threshold) => points.map((point, index) => (distance(line, point) < threshold ? index : -1)).filter((index) => index >= 0)

// Total least squares through the chosen points.
export function refit(points) {
  const n = points.length
  const cx = points.reduce((sum, p) => sum + p.x, 0) / n
  const cy = points.reduce((sum, p) => sum + p.y, 0) / n
  let sxx = 0
  let sxy = 0
  let syy = 0
  for (const p of points) {
    sxx += (p.x - cx) ** 2
    sxy += (p.x - cx) * (p.y - cy)
    syy += (p.y - cy) ** 2
  }
  return { cx, cy, angle: 0.5 * Math.atan2(2 * sxy, sxx - syy) }
}

// The whole run: every round's sample, line and votes, the best so far, and the refit.
export function run(outliers, threshold, seed) {
  const points = makePoints(outliers)
  const k = roundsNeeded((COUNT - outliers) / COUNT)
  const rounds = []
  let best = null
  for (const pair of samples(k, seed)) {
    const line = lineThrough(points[pair[0]], points[pair[1]])
    const votes = supporters(line, points, threshold)
    if (!best || votes.length > best.votes.length) best = { line, votes, round: rounds.length }
    rounds.push({ pair, line, votes, best })
  }
  const final = refit(best.votes.map((index) => points[index]))
  return { points, k, rounds, final, finalVotes: supporters(final, points, threshold) }
}
