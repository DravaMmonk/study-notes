// Pure model for the Harris probe: a stepped test plate is the image (height = brightness), a square
// window with Gaussian weights sums Ix², IxIy, Iy² into M, and R = det M − k (tr M)² sorts the window.
// Units are plate units, one per pixel. Values are scaled so a straight edge through the centre has λ1 = 1.

export const K = 0.05
export const STEP = { x: 2, y: 10 } // the raised block covers x < STEP.x and y < STEP.y
export const RAMP = 2 // the step's edge is softened over two pixels
export const HALF = 8 // window half-size: 17 × 17 pixels
export const SIGMA = 4
export const CORNER_AT = 0.02 // R above this is a corner
export const EDGE_AT = -0.005 // R below this is an edge
export const STATIONS = [
  { name: 'flat', label: '平坦', x: 24, y: 32 },
  { name: 'edge', label: '边缘', x: STEP.x, y: -22 },
  { name: 'corner', label: '角点', x: STEP.x, y: STEP.y },
]

const smooth = (t) => {
  const s = Math.min(1, Math.max(0, t / RAMP + 0.5))
  return s * s * (3 - 2 * s)
}

// Brightness 0..1: 1 on the raised block.
export const intensity = (x, y) => smooth(STEP.x - x) * smooth(STEP.y - y)

function raw(cx, cy) {
  let a = 0
  let b = 0
  let c = 0
  for (let dy = -HALF; dy <= HALF; dy++) {
    for (let dx = -HALF; dx <= HALF; dx++) {
      const x = cx + dx
      const y = cy + dy
      const ix = (intensity(x + 1, y) - intensity(x - 1, y)) / 2
      const iy = (intensity(x, y + 1) - intensity(x, y - 1)) / 2
      const w = Math.exp(-(dx * dx + dy * dy) / (2 * SIGMA * SIGMA))
      a += w * ix * ix
      b += w * ix * iy
      c += w * iy * iy
    }
  }
  return { a, b, c }
}

const REF = raw(STEP.x, STEP.y - 40).a

export function measure(cx, cy) {
  const m = raw(cx, cy)
  const A = m.a / REF
  const B = m.b / REF
  const C = m.c / REF
  const mean = (A + C) / 2
  const spread = Math.sqrt(((A - C) / 2) ** 2 + B * B)
  const l1 = mean + spread
  const l2 = Math.max(0, mean - spread)
  const det = A * C - B * B
  const trace = A + C
  const R = det - K * trace * trace
  const kind = R > CORNER_AT ? 'corner' : R < EDGE_AT ? 'edge' : 'flat'
  return { A, B, C, l1, l2, det, trace, R, kind, angle: 0.5 * Math.atan2(2 * B, A - C) }
}

// E(u, v) ≈ [u v] M [u v]ᵀ for a unit shift in direction phi.
export const cost = (m, phi) => {
  const u = Math.cos(phi)
  const v = Math.sin(phi)
  return m.A * u * u + 2 * m.B * u * v + m.C * v * v
}

export const KIND_LABEL = { flat: '平坦', edge: '边缘', corner: '角点' }
