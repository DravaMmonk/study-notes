// Pure model for the pooling press: the 4 × 4 activation map from Lecture 7 (slide 11), pooled with
// 2 × 2 windows and stride 2. Pin heights, the press's stop, the readout and the caption come from here.

export const MAP = [
  [1, 1, 2, 4],
  [5, 6, 7, 8],
  [3, 2, 1, 0],
  [1, 2, 3, 4],
]

export const N = MAP.length
export const SIZE = 2 // window
export const STRIDE = 2
export const OUT = (N - SIZE) / STRIDE + 1 // 2

// The same response moved `shift` columns (−1: one to the left); zeros come in at the open edge.
export const mapOf = (shift) => MAP.map((row) => row.map((_, col) => row[col - shift] ?? 0))

// Window (i, j) covers rows 2i, 2i+1 and columns 2j, 2j+1, read row by row.
export function windowOf(map, i, j) {
  const values = []
  for (let u = 0; u < SIZE; u++) for (let v = 0; v < SIZE; v++) values.push(map[i * STRIDE + u][j * STRIDE + v])
  return values
}

export const POOLS = {
  max: { name: '最大池化', nameEn: 'Max pooling', short: 'max', shortEn: 'max', of: (values) => Math.max(...values) },
  avg: { name: '平均池化', nameEn: 'Average pooling', short: '均值', shortEn: 'avg', of: (values) => values.reduce((sum, value) => sum + value, 0) / values.length },
}

export function pooled(mode, shift) {
  const map = mapOf(shift)
  return Array.from({ length: OUT }, (_, i) => Array.from({ length: OUT }, (_, j) => POOLS[mode].of(windowOf(map, i, j))))
}

// Index of the pin that the max press stops on (the first of equal tallest).
export const winnerOf = (values) => values.indexOf(Math.max(...values))

export const format = (value) => (Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0$/, ''))
