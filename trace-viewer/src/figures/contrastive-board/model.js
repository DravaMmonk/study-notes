// Pure model for the contrastive board: four images, a tiny linear encoder and normalised 2-D embeddings,
// trained by plain gradient descent on the contrastive (InfoNCE) loss of Lecture 10:
//   ℓ_i = −log( exp(sim(z_i, z′_i)/τ) / Σ_j exp(sim(z_i, z′_j)/τ) ),  sim = cosine.
// Each input is x = [content₁, content₂, nuisance]. Augmentation (crop, colour, flip) only changes the
// nuisance, so a good encoder must learn to ignore it. z = W x / ‖W x‖ lies on the unit circle.
// SimCLR mode compares first views z_i with second views z′_j; CLIP mode compares images with captions,
// each through its own encoder, and averages both directions. No labels are used: the pairing is known
// because both sides of a pair came from the same image (or the same image–caption pair).

export const N = 4
export const TAU = 0.25
export const STEPS = 16
const RATE = 0.08

const deg = (d) => (d * Math.PI) / 180
const IMAGE_ANGLE = [deg(20), deg(115), deg(200), deg(290)]
const TEXT_ANGLE = IMAGE_ANGLE.map((a) => a + deg(48)) // captions live in their own feature coordinates
const NUISANCE_A = [1.0, 0.8, 1.2, 0.9]
const NUISANCE_B = [-0.9, -1.1, -0.8, -1.0]
const WORDING = [0.5, -0.4, 0.3, -0.6]

const feature = (angle, nuisance) => [Math.cos(angle), Math.sin(angle), nuisance]

export const INPUTS = {
  simclr: {
    left: IMAGE_ANGLE.map((a, i) => feature(a, NUISANCE_A[i])),
    right: IMAGE_ANGLE.map((a, i) => feature(a, NUISANCE_B[i])),
    shared: true,
  },
  clip: {
    left: IMAGE_ANGLE.map((a, i) => feature(a, NUISANCE_A[i])),
    right: TEXT_ANGLE.map((a, i) => feature(a, WORDING[i])),
    shared: false,
  },
}

// A new photo of image 2's kind, never seen in training: the zero-shot probe.
export const PROBE = { cls: 1, x: feature(IMAGE_ANGLE[1] + deg(14), 1.4) }

// Encoders: z = normalise(g·R(ψ)·content + w·nuisance). An untrained encoder leans on the nuisance
// (w large, g small), so every first view lands near every other first view. Parameters:
// [g, w₁, w₂] for images (shared by both views in SimCLR), [g, ψ, w₁, w₂] for captions in CLIP.
const START = [1, 0.62, 0.55, 1, 0, 0.35, -0.5]

const embedWith = (g, psi, w1, w2, x) => {
  const [c, s] = [Math.cos(psi), Math.sin(psi)]
  const u = g * (c * x[0] - s * x[1]) + w1 * x[2]
  const v = g * (s * x[0] + c * x[1]) + w2 * x[2]
  const length = Math.hypot(u, v) || 1
  return [u / length, v / length]
}
const imageEncoder = (p) => (x) => embedWith(p[0], 0, p[1], p[2], x)
const textEncoder = (p) => (x) => embedWith(p[3], p[4], p[5], p[6], x)
export const angleOf = (z) => Math.atan2(z[1], z[0])
const cosine = (a, b) => a[0] * b[0] + a[1] * b[1]

function softmaxRows(sims) {
  return sims.map((row) => {
    const top = Math.max(...row)
    const exps = row.map((s) => Math.exp((s - top) / TAU))
    const total = exps.reduce((sum, e) => sum + e, 0)
    return exps.map((e) => e / total)
  })
}

const transpose = (m) => m[0].map((_, j) => m.map((row) => row[j]))

// Everything the figure reads at one set of weights.
export function evaluate(mode, params) {
  const input = INPUTS[mode]
  const encodeLeft = imageEncoder(params)
  const encodeRight = input.shared ? encodeLeft : textEncoder(params)
  const left = input.left.map(encodeLeft)
  const right = input.right.map(encodeRight)
  const sims = left.map((a) => right.map((b) => cosine(a, b)))
  const rows = softmaxRows(sims)
  const rowLoss = rows.reduce((sum, row, i) => sum - Math.log(row[i]), 0) / N
  let loss = rowLoss
  if (!input.shared) {
    const cols = softmaxRows(transpose(sims))
    loss = (rowLoss + cols.reduce((sum, row, i) => sum - Math.log(row[i]), 0) / N) / 2
  }
  const positive = sims.reduce((sum, row, i) => sum + row[i], 0) / N
  const probe = encodeLeft(PROBE.x)
  const probeSims = right.map((b) => cosine(probe, b))
  const pick = probeSims.indexOf(Math.max(...probeSims))
  return { left, right, sims, rows, loss, positive, probe, pick }
}

const lossOf = (mode, params) => evaluate(mode, params).loss

// Gradient descent with central differences: 3 or 7 numbers, cheap enough to run the whole course.
export function train(mode, steps = STEPS) {
  let params = [...START]
  const size = INPUTS[mode].shared ? 3 : 7
  const course = [evaluate(mode, params)]
  for (let step = 0; step < steps; step++) {
    const grad = params.map((_, index) => {
      if (index >= size) return 0
      const up = [...params]
      const down = [...params]
      up[index] += 1e-4
      down[index] -= 1e-4
      return (lossOf(mode, up) - lossOf(mode, down)) / 2e-4
    })
    const norm = Math.hypot(...grad)
    const scale = RATE / Math.max(1, norm) // clip the step so the pucks glide rather than jump
    params = params.map((value, index) => value - scale * grad[index])
    course.push(evaluate(mode, params))
  }
  return course
}
