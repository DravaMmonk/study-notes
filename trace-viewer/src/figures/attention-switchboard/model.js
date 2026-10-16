// Pure model for the attention switchboard: a 4 × 4 image cut into 16 patch tokens, one attention
// layer with two heads. Every token is x_i = z_i + p_i in D = 8: the patch embedding z_i fills the
// first four dimensions (what the patch shows), the positional encoding p_i the last four (where it
// sits). Each head has d_k = D / h = 4 and scores a_j = softmax(q·k_j / √d_k). Values are one-hot
// content, so the output y = Σ a_j v_j says what the query token read, class by class.

export const SIZE = 4
export const D_MODEL = 8
export const HEADS = 2
export const D_K = D_MODEL / HEADS

export const CLASSES = [
  { id: 'sky', name: '天空', nameEn: 'sky', z: [1, 0, 0, 0] },
  { id: 'sun', name: '太阳', nameEn: 'sun', z: [0.6, 0.8, 0, 0] },
  { id: 'tree', name: '树', nameEn: 'tree', z: [0, 0, 1, 0] },
  { id: 'grass', name: '草地', nameEn: 'grass', z: [0, 0, 0.6, 0.8] },
]

// The picture, row by row from the top: sky with a sun, two trees each side, grass below.
export const IMAGE = [
  ['sky', 'sky', 'sky', 'sun'],
  ['tree', 'sky', 'sky', 'tree'],
  ['tree', 'grass', 'grass', 'tree'],
  ['grass', 'grass', 'grass', 'grass'],
]

export const classOf = (row, col) => CLASSES.findIndex((c) => c.id === IMAGE[row][col])

// Sinusoidal position code: p·p' = cos θΔr + cos θΔc, largest for the same patch, falling with distance.
const THETA = Math.PI / 3
const positionOf = (row, col) => [Math.cos(THETA * row), Math.sin(THETA * row), Math.cos(THETA * col), Math.sin(THETA * col)]

export const tokens = (withPosition) =>
  IMAGE.flatMap((line, row) =>
    line.map((_, col) => {
      const content = CLASSES[classOf(row, col)].z
      const position = withPosition ? positionOf(row, col) : [0, 0, 0, 0]
      return { row, col, cls: classOf(row, col), x: [...content, ...position] }
    }),
  )

// W_Q = W_K = g·(projection onto one half of x). Head 1 reads the content half, head 2 the address half.
const HEAD = [
  { name: '头 1 · 内容', nameEn: 'Head 1 · content', from: 0, gain: Math.sqrt(6) },
  { name: '头 2 · 位置', nameEn: 'Head 2 · position', from: 4, gain: Math.sqrt(4) },
]
export const headName = (head) => HEAD[head].name
export const headNameEn = (head) => HEAD[head].nameEn

const project = (x, head) => x.slice(HEAD[head].from, HEAD[head].from + D_K).map((value) => value * HEAD[head].gain)
const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0)

export function attend(query, head, withPosition) {
  const list = tokens(withPosition)
  const q = project(list[query].x, head)
  const scores = list.map((token) => dot(q, project(token.x, head)) / Math.sqrt(D_K))
  const top = Math.max(...scores)
  const exps = scores.map((score) => Math.exp(score - top))
  const total = exps.reduce((sum, value) => sum + value, 0)
  const weights = exps.map((value) => value / total)
  const output = CLASSES.map((_, cls) => weights.reduce((sum, weight, index) => sum + (list[index].cls === cls ? weight : 0), 0))
  const best = weights.indexOf(Math.max(...weights))
  return { scores, weights, output, best, sum: weights.reduce((sum, value) => sum + value, 0) }
}

export const indexOf = (row, col) => row * SIZE + col
