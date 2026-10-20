// Maths for chapter 6 (matching): window distances, Hough voting, RANSAC line fitting, and the
// direct linear transform (DLT) for a homography. Plain functions on plain numbers, no images API.

// ---------- appearance: window distance and the two nearest candidates ----------

// Euclidean distance between two (2r+1)² windows, the square root of their SSD.
// Images are { w, h, data } in row-major order; windows must lie inside both images.
export function windowDistance(a, ax, ay, b, bx, by, r) {
  let sum = 0
  for (let v = -r; v <= r; v++) {
    for (let u = -r; u <= r; u++) {
      const diff = a.data[(ay + v) * a.w + ax + u] - b.data[(by + v) * b.w + bx + u]
      sum += diff * diff
    }
  }
  return Math.sqrt(sum)
}

// Distances from one keypoint of A to every candidate of B, sorted nearest first.
export function rankCandidates(a, point, b, candidates, r) {
  return candidates
    .map((c, index) => ({ index, d: windowDistance(a, point[0], point[1], b, c[0], c[1], r) }))
    .sort((p, q) => p.d - q.d || p.index - q.index)
}

// ---------- Hough voting for lines: ρ = x cos θ + y sin θ ----------

export function houghAccumulate(points, dTheta, dRho, rhoMax) {
  const nT = Math.round(180 / dTheta)
  const nR = Math.ceil((2 * rhoMax) / dRho)
  const votes = new Float32Array(nT * nR)
  const cos = []
  const sin = []
  for (let t = 0; t < nT; t++) {
    const theta = (((t + 0.5) * dTheta) * Math.PI) / 180
    cos.push(Math.cos(theta))
    sin.push(Math.sin(theta))
  }
  for (const [x, y] of points) {
    for (let t = 0; t < nT; t++) {
      const r = Math.floor((x * cos[t] + y * sin[t] + rhoMax) / dRho)
      if (r >= 0 && r < nR) votes[r * nT + t] += 1
    }
  }
  return { votes, nT, nR, dTheta, dRho, rhoMax }
}

// Local maxima of the accumulator (a cell that no neighbour beats; a plateau keeps its first cell),
// strongest first. Each peak is returned as the line at the centre of its cell.
export function houghPeaks(acc, count = 2) {
  const { votes, nT, nR, dTheta, dRho, rhoMax } = acc
  const peaks = []
  for (let r = 0; r < nR; r++) {
    for (let t = 0; t < nT; t++) {
      const i = r * nT + t
      const v = votes[i]
      if (v < 2) continue
      let isPeak = true
      for (let dr = -1; dr <= 1 && isPeak; dr++) {
        for (let dt = -1; dt <= 1; dt++) {
          if (!dr && !dt) continue
          const rr = r + dr
          const tt = t + dt
          if (rr < 0 || rr >= nR || tt < 0 || tt >= nT) continue
          const j = rr * nT + tt
          if (votes[j] > v || (votes[j] === v && j < i)) {
            isPeak = false
            break
          }
        }
      }
      if (isPeak) peaks.push({ t, r, votes: v, theta: (t + 0.5) * dTheta, rho: (r + 0.5) * dRho - rhoMax })
    }
  }
  return peaks.sort((p, q) => q.votes - p.votes || p.r * nT + p.t - (q.r * nT + q.t)).slice(0, count)
}

// How far apart two lines given as (θ in degrees, ρ) are, treating (θ, ρ) and (θ ± 180, −ρ) as the same.
export function lineGap(a, b) {
  let dTheta = (((a.theta - b.theta) % 180) + 180) % 180
  let rho = b.rho
  if (dTheta > 90) {
    dTheta = 180 - dTheta
  }
  // When the angles wrap around 0/180 the normal flips, so ρ changes sign.
  if (Math.abs(a.theta - b.theta) > 90) rho = -rho
  return { dTheta, dRho: Math.abs(a.rho - rho) }
}

// ---------- RANSAC for a line ----------

// A line as a unit normal (nx, ny) and offset c: nx·x + ny·y = c. Also given as θ (degrees, 0…180) and ρ.
function normalForm(nx, ny, c) {
  let theta = (Math.atan2(ny, nx) * 180) / Math.PI
  let rho = c
  if (theta < 0) {
    theta += 180
    rho = -rho
  }
  if (theta >= 180) {
    theta -= 180
    rho = -rho
  }
  return { nx: Math.cos((theta * Math.PI) / 180), ny: Math.sin((theta * Math.PI) / 180), c: rho, theta, rho }
}

export function lineThrough([x1, y1], [x2, y2]) {
  const dx = x2 - x1
  const dy = y2 - y1
  const length = Math.hypot(dx, dy)
  if (length < 1e-9) return null
  const nx = -dy / length
  const ny = dx / length
  return normalForm(nx, ny, nx * x1 + ny * y1)
}

// Total least squares: the line through the centroid along the points' main direction.
export function fitLine(points) {
  if (points.length < 2) return null
  let mx = 0
  let my = 0
  for (const [x, y] of points) {
    mx += x
    my += y
  }
  mx /= points.length
  my /= points.length
  let sxx = 0
  let syy = 0
  let sxy = 0
  for (const [x, y] of points) {
    sxx += (x - mx) ** 2
    syy += (y - my) ** 2
    sxy += (x - mx) * (y - my)
  }
  // The normal is the eigenvector of the smaller eigenvalue of the scatter matrix.
  const angle = 0.5 * Math.atan2(2 * sxy, sxx - syy) + Math.PI / 2
  const nx = Math.cos(angle)
  const ny = Math.sin(angle)
  return normalForm(nx, ny, nx * mx + ny * my)
}

export const distanceToLine = (line, [x, y]) => Math.abs(line.nx * x + line.ny * y - line.c)

// k rounds: sample 2 points, count points within δ, keep the best, then refit on its inliers.
export function ransacLine(points, k, delta, next) {
  let best = null
  let bestCount = -1
  let bestSample = null
  for (let round = 0; round < k; round++) {
    const i = Math.floor(next() * points.length)
    let j = Math.floor(next() * (points.length - 1))
    if (j >= i) j += 1
    const line = lineThrough(points[i], points[j])
    if (!line) continue
    let count = 0
    for (const p of points) if (distanceToLine(line, p) < delta) count += 1
    if (count > bestCount) {
      best = line
      bestCount = count
      bestSample = [i, j]
    }
  }
  if (!best) return null
  const inliers = points.filter((p) => distanceToLine(best, p) < delta)
  return { sample: best, sampleIndex: bestSample, line: fitLine(inliers) ?? best, inliers: inliers.length }
}

// ---------- homography by the DLT, and the affine model for comparison ----------

export function project(H, x, y) {
  const w = H[6] * x + H[7] * y + H[8]
  return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w]
}

const mul3 = (A, B) => {
  const C = Array(9).fill(0)
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) C[i * 3 + j] += A[i * 3 + k] * B[k * 3 + j]
  return C
}

export function invert3(m) {
  const [a, b, c, d, e, f, g, h, i] = m
  const A = e * i - f * h
  const B = -(d * i - f * g)
  const C = d * h - e * g
  const det = a * A + b * B + c * C
  if (Math.abs(det) < 1e-12) return null
  return [A, -(b * i - c * h), b * f - c * e, B, a * i - c * g, -(a * f - c * d), C, -(a * h - b * g), a * e - b * d].map((v) => v / det)
}

// Hartley normalisation: move the points' centroid to the origin and scale their mean distance to √2.
function normaliser(points) {
  const mx = points.reduce((s, p) => s + p[0], 0) / points.length
  const my = points.reduce((s, p) => s + p[1], 0) / points.length
  const mean = points.reduce((s, p) => s + Math.hypot(p[0] - mx, p[1] - my), 0) / points.length || 1
  const s = Math.SQRT2 / mean
  return [s, 0, -s * mx, 0, s, -s * my, 0, 0, 1]
}

// Eigen-decomposition of a symmetric matrix by cyclic Jacobi rotations. Returns eigenvalues and
// eigenvectors (columns of V, row-major n×n).
function jacobiEigen(S, n) {
  const A = [...S]
  const V = Array.from({ length: n * n }, (_, i) => (i % (n + 1) === 0 ? 1 : 0))
  for (let sweep = 0; sweep < 60; sweep++) {
    let off = 0
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += A[p * n + q] ** 2
    if (off < 1e-22) break
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        const apq = A[p * n + q]
        if (Math.abs(apq) < 1e-30) continue
        const theta = (A[q * n + q] - A[p * n + p]) / (2 * apq)
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1))
        const c = 1 / Math.sqrt(t * t + 1)
        const s = t * c
        for (let k = 0; k < n; k++) {
          const akp = A[k * n + p]
          const akq = A[k * n + q]
          A[k * n + p] = c * akp - s * akq
          A[k * n + q] = s * akp + c * akq
        }
        for (let k = 0; k < n; k++) {
          const apk = A[p * n + k]
          const aqk = A[q * n + k]
          A[p * n + k] = c * apk - s * aqk
          A[q * n + k] = s * apk + c * aqk
        }
        for (let k = 0; k < n; k++) {
          const vkp = V[k * n + p]
          const vkq = V[k * n + q]
          V[k * n + p] = c * vkp - s * vkq
          V[k * n + q] = s * vkp + c * vkq
        }
      }
    }
  }
  return { values: Array.from({ length: n }, (_, i) => A[i * n + i]), V }
}

// DLT: every pair (x, y) → (u, v) gives two rows of A h = 0; h is the right singular vector of A with
// the smallest singular value, i.e. the eigenvector of AᵀA with the smallest eigenvalue.
// Needs at least 4 pairs; returns null when the pairs do not pin H down (e.g. three in a line).
export function homographyDLT(pairs) {
  if (pairs.length < 4) return null
  const T1 = normaliser(pairs.map((p) => p.from))
  const T2 = normaliser(pairs.map((p) => p.to))
  const rows = []
  for (const { from, to } of pairs) {
    const [x, y] = project(T1, ...from)
    const [u, v] = project(T2, ...to)
    rows.push([-x, -y, -1, 0, 0, 0, u * x, u * y, u])
    rows.push([0, 0, 0, -x, -y, -1, v * x, v * y, v])
  }
  const AtA = Array(81).fill(0)
  for (const row of rows) for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) AtA[i * 9 + j] += row[i] * row[j]
  const { values, V } = jacobiEigen(AtA, 9)
  const order = values.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0])
  // Two (near-)zero eigenvalues mean a whole family of H fits: the pairs are degenerate.
  if (order[1][0] < 1e-9 * Math.max(1, order[8][0])) return null
  const h = Array.from({ length: 9 }, (_, i) => V[i * 9 + order[0][1]])
  const inverse = invert3(T2)
  if (!inverse) return null
  const H = mul3(mul3(inverse, h), T1)
  const scale = Math.abs(H[8]) > 1e-12 ? H[8] : 1
  return H.map((v) => v / scale)
}

// Affine: u = a x + b y + c, v = d x + e y + f. Three pairs fix it exactly (least squares for more).
export function affineFit(pairs) {
  if (pairs.length < 3) return null
  const N = Array(9).fill(0)
  const bu = [0, 0, 0]
  const bv = [0, 0, 0]
  for (const { from, to } of pairs) {
    const row = [from[0], from[1], 1]
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) N[i * 3 + j] += row[i] * row[j]
      bu[i] += row[i] * to[0]
      bv[i] += row[i] * to[1]
    }
  }
  const inverse = invert3(N)
  if (!inverse) return null
  const solve = (b) => [0, 1, 2].map((i) => inverse[i * 3] * b[0] + inverse[i * 3 + 1] * b[1] + inverse[i * 3 + 2] * b[2])
  return [...solve(bu), ...solve(bv), 0, 0, 1]
}
