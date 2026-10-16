// Pure model for the Hough voting machine: twelve edge points on a board (nine near one line, three
// outliers), each voting once per θ column for the ρ bin it satisfies, ρ = x cos θ + y sin θ.
// The tallest stack in the (θ, ρ) accumulator is the detected line.

export const HALF = 18 // board coordinates run −HALF..HALF, one unit per pixel
export const LINE = { theta: 30, rho: 12 } // degrees, pixels
export const RHO_LIMIT = 27
export const BINS = {
  coarse: { name: 'coarse', label: '粗 15° × 6', labelEn: 'Coarse 15° × 6', dTheta: 15, dRho: 6 },
  fine: { name: 'fine', label: '细 7.5° × 3', labelEn: 'Fine 7.5° × 3', dTheta: 7.5, dRho: 3 },
}

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

const RAD = Math.PI / 180

export function makePoints(seed = 1) {
  const next = random(seed)
  const c = Math.cos(LINE.theta * RAD)
  const s = Math.sin(LINE.theta * RAD)
  const points = []
  for (let index = 0; index < 9; index++) {
    const t = -13 + (26 * index) / 8
    const off = (next() - 0.5) * 4 // edge noise across the line, ±2 px
    points.push({ x: LINE.rho * c - t * s + off * c, y: LINE.rho * s + t * c + off * s, inlier: true })
  }
  for (const [x, y] of [[-12, -9], [-8, 13], [14, -15]]) points.push({ x, y, inlier: false })
  // Shuffle, so the outliers vote among the edge points.
  return points.map((point) => ({ point, key: next() })).sort((a, b) => a.key - b.key).map(({ point }) => point)
}

export const rhoOf = (point, theta) => point.x * Math.cos(theta * RAD) + point.y * Math.sin(theta * RAD)

export function grid(bins) {
  const columns = Array.from({ length: Math.round(180 / bins.dTheta) }, (_, j) => j * bins.dTheta)
  const reach = Math.floor(RHO_LIMIT / bins.dRho)
  const rows = Array.from({ length: reach * 2 + 1 }, (_, i) => (i - reach) * bins.dRho)
  return { columns, rows, reach, edge: (reach + 0.5) * bins.dRho }
}

export const rowOf = (rho, bins) => {
  const { reach } = grid(bins)
  return Math.max(0, Math.min(reach * 2, Math.round(rho / bins.dRho) + reach))
}

// Every vote in order: point k, column j → row i.
export function ballots(points, bins) {
  const { columns } = grid(bins)
  return points.map((point) => columns.map((theta) => rowOf(rhoOf(point, theta), bins)))
}

export function tally(points, bins, upto = points.length) {
  const { columns, rows } = grid(bins)
  const counts = columns.map(() => rows.map(() => 0))
  ballots(points.slice(0, upto), bins).forEach((votes) => votes.forEach((i, j) => (counts[j][i] += 1)))
  return counts
}

export function peakOf(counts, bins) {
  const { columns, rows } = grid(bins)
  let best = { j: 0, i: 0, votes: -1 }
  counts.forEach((column, j) => column.forEach((votes, i) => {
    if (votes > best.votes) best = { j, i, votes }
  }))
  return { ...best, theta: columns[best.j], rho: rows[best.i] }
}
