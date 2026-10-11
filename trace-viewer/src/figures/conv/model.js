// Pure model for the filter press: one 7 × 7 image, four 3 × 3 kernels, padding and stride.
// Everything the figure shows (pin heights, washer stacks, readout, caption numbers) comes from here.

export const IMAGE = [
  [1, 1, 1, 1, 7, 8, 8],
  [1, 1, 1, 2, 8, 9, 8],
  [1, 1, 2, 6, 9, 9, 8],
  [1, 2, 6, 9, 9, 8, 8],
  [2, 6, 9, 9, 8, 8, 7],
  [1, 2, 6, 9, 9, 8, 8],
  [1, 1, 2, 6, 9, 9, 8],
]

export const N = IMAGE.length
export const K = 3

export const KERNELS = {
  box: { name: '均值', short: 'box', weights: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], divisor: 9 },
  gauss: { name: '高斯', short: 'gauss', weights: [[1, 2, 1], [2, 4, 2], [1, 2, 1]], divisor: 16 },
  sobel: { name: 'Sobel x', short: 'sobel', weights: [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], divisor: 1 },
  sharpen: { name: '锐化', short: 'sharpen', weights: [[0, -1, 0], [-1, 5, -1], [0, -1, 0]], divisor: 1 },
}

export const outputSize = (padding, stride) => Math.floor((N - K + 2 * padding) / stride) + 1

// Input value with zero padding outside the image.
export const pixel = (row, col) => (row < 0 || col < 0 || row >= N || col >= N ? 0 : IMAGE[row][col])

// The kernel as the stamp applies it. Convolution flips it 180°, cross-correlation uses it as written.
export function appliedWeights(kernel, flip) {
  const w = KERNELS[kernel].weights
  return flip ? w.map((_, u) => w[K - 1 - u].map((_, v) => w[K - 1 - u][K - 1 - v])) : w
}

// Top-left input cell of the window for output (i, j).
export const windowOrigin = (i, j, padding, stride) => [i * stride - padding, j * stride - padding]

export function respond(kernel, flip, padding, stride, i, j) {
  const w = appliedWeights(kernel, flip)
  const [r0, c0] = windowOrigin(i, j, padding, stride)
  const terms = []
  let sum = 0
  for (let u = 0; u < K; u++) {
    for (let v = 0; v < K; v++) {
      const f = pixel(r0 + u, c0 + v)
      terms.push([f, w[u][v]])
      sum += f * w[u][v]
    }
  }
  return { value: sum / KERNELS[kernel].divisor, terms }
}

export function responseMap(kernel, flip, padding, stride) {
  const size = outputSize(padding, stride)
  return Array.from({ length: size }, (_, i) => Array.from({ length: size }, (_, j) => respond(kernel, flip, padding, stride, i, j).value))
}

export const format = (value) => {
  const text = Math.abs(value) < 0.005 ? '0' : value.toFixed(Number.isInteger(Math.round(value * 100) / 100) ? 0 : 2)
  return text.replace('-', '−')
}
