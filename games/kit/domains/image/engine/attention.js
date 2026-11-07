import { image } from './image.js'

// Patch tokens for the attention chapter. An image is cut into non-overlapping P×P patches; each patch,
// read row by row, is one token (a vector of P² numbers). Tokens are numbered in reading order.

export const PATCH = 4

export function tokens(img, P = PATCH) {
  const cols = Math.floor(img.w / P)
  const rows = Math.floor(img.h / P)
  const list = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const vector = new Float64Array(P * P)
      for (let v = 0; v < P; v++) for (let u = 0; u < P; u++) vector[v * P + u] = img.data[(r * P + v) * img.w + c * P + u]
      list.push(vector)
    }
  }
  return { list, cols, rows }
}

export function untokens(list, cols, rows, P = PATCH) {
  const out = image(cols * P, rows * P)
  list.forEach((vector, i) => {
    const r = Math.floor(i / cols)
    const c = i % cols
    for (let v = 0; v < P; v++) for (let u = 0; u < P; u++) out.data[(r * P + v) * out.w + c * P + u] = vector[v * P + u]
  })
  return out
}

// Weights of one query over all keys: softmax(s·q·k / √d). They are positive and sum to 1.
export function attentionWeights(q, keys, s = 1) {
  const d = q.length
  const scores = keys.map((k) => {
    let dot = 0
    for (let i = 0; i < d; i++) dot += q[i] * k[i]
    return (s * dot) / Math.sqrt(d)
  })
  const top = Math.max(...scores)
  const e = scores.map((x) => Math.exp(x - top))
  const total = e.reduce((a, b) => a + b, 0)
  return e.map((x) => x / total)
}

// Scaled dot-product attention over P×P patch tokens. q_i = s·(patch i of Q), k_j = patch j of K,
// v_j = patch j of V; output patch i = Σ_j softmax_j(q_i·k_j / √d) v_j. K defaults to Q and V to K,
// so wiring one image into Q is plain self-attention.
export function attention(Q, K = Q, V = K, s = 1, P = PATCH) {
  const q = tokens(Q, P)
  const k = tokens(K, P).list
  const v = tokens(V, P).list
  const out = q.list.map((query) => {
    const weights = attentionWeights(query, k, s)
    const mixed = new Float64Array(query.length)
    weights.forEach((w, j) => {
      for (let i = 0; i < mixed.length; i++) mixed[i] += w * v[j][i]
    })
    return mixed
  })
  return untokens(out, q.cols, q.rows, P)
}
