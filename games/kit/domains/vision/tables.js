// Tables for attention and matching: a grey image read as a table, one row a thing (a patch, a token, a descriptor)
// and one column a number of it. Patches of a picture become rows and go back; tables multiply; each row's scores
// become probabilities. Also seeded noise, for models that sample. Each with its derivatives (grad.js uses them).
//
//   patches(image, size)        the picture cut into size × size patches, left to right then down, one row each
//   unpatch(table, shape, size) rows laid back as patches into a picture the size of `shape`
//   matmul(a, b)                the table product: a is n × k (n rows of k), b is k × m
//   softmaxRows(table)          each row's values made probabilities
//   noise(like, seed)           a grey image of standard normal numbers the size of `like`, the same for a seed
import { PartError } from '../../engine/circuit.js'
import { isImage, make } from './image.js'
import { T as t } from '../../shell/i18n.js'

const fail = (zh, en) => { throw new PartError(t(zh, en)) }
const grey = (v, what) => (isImage(v) && v.c === 1 ? v : fail(`${what}要一张灰度图（表）`, `${what} needs a grey image (a table)`))
const whole = (n, what) => (Number.isInteger(n) && n >= 1 ? n : fail(`${what}应当是正整数，得到 ${n}`, `${what} should be a positive whole number, got ${n}`))

/** Where cell k of patch row r sits in a w-wide picture cut into size × size patches. */
const cellOf = (w, size, r, k) => {
  const across = w / size
  const [py, px] = [Math.floor(r / across), r % across]
  const [dy, dx] = [Math.floor(k / size), k % size]
  return (py * size + dy) * w + px * size + dx
}

export function patches(image, size) {
  grey(image, '切块')
  whole(size, '块的边长')
  if (image.w % size || image.h % size) fail(`图的宽高要能被 ${size} 整除`, `the image’s sides must divide by ${size}`)
  const rows = (image.w / size) * (image.h / size)
  return make(size * size, rows, 1, (k, r) => image.data[cellOf(image.w, size, r, k)])
}

export function unpatch(table, shape, size) {
  grey(table, '拼回')
  if (!isImage(shape)) fail('拼回要一张图给出大小', 'unpatching needs an image to give the size')
  whole(size, '块的边长')
  if (table.w !== size * size || table.h !== (shape.w / size) * (shape.h / size)) fail('表的大小和图对不上', 'the table does not fit the image')
  const data = new Array(shape.w * shape.h).fill(0)
  for (let r = 0; r < table.h; r++) for (let k = 0; k < table.w; k++) data[cellOf(shape.w, size, r, k)] = table.data[r * table.w + k]
  return { w: shape.w, h: shape.h, c: 1, data }
}

export function matmul(a, b) {
  grey(a, '表乘法的左边')
  grey(b, '表乘法的右边')
  if (a.w !== b.h) fail(`左边每行 ${a.w} 个数，右边却有 ${b.h} 行`, `the left has ${a.w} columns but the right ${b.h} rows`)
  return make(b.w, a.h, 1, (j, i) => {
    let s = 0
    for (let k = 0; k < a.w; k++) s += a.data[i * a.w + k] * b.data[k * b.w + j]
    return s
  })
}

export function softmaxRows(table) {
  grey(table, '逐行 softmax')
  const data = new Array(table.data.length)
  for (let r = 0; r < table.h; r++) {
    const row = table.data.slice(r * table.w, (r + 1) * table.w)
    const top = Math.max(...row)
    const e = row.map((v) => Math.exp(v - top))
    const total = e.reduce((x, y) => x + y, 0)
    e.forEach((v, k) => { data[r * table.w + k] = v / total })
  }
  return { ...table, data }
}

/** Standard normal numbers (Box–Muller over a seeded generator), the size of `like`. */
export function noise(like, seed) {
  if (!isImage(like)) fail('噪声要一张图给出大小', 'noise needs an image to give the size')
  let a = (Number(seed) | 0) >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let r = Math.imul(a ^ (a >>> 15), 1 | a)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
  return make(like.w, like.h, 1, () => Math.sqrt(-2 * Math.log(1 - next())) * Math.cos(2 * Math.PI * next()))
}

/* ---------- derivatives ---------- */

const transposeOf = (m) => make(m.h, m.w, 1, (x, y) => m.data[x * m.w + y])

export const TABLE_GRADS = {
  patches: (g, [image, size]) => [unpatch(g, image, size), null],
  unpatch: (g, [table, shape, size]) => [patches(g, size), null, null],
  matmul: (g, [a, b]) => [matmul(g, transposeOf(b)), matmul(transposeOf(a), g)],
  softmaxRows: (g, _args, out) => {
    const data = new Array(out.data.length)
    for (let r = 0; r < out.h; r++) {
      let dot = 0
      for (let k = 0; k < out.w; k++) dot += out.data[r * out.w + k] * g.data[r * out.w + k]
      for (let k = 0; k < out.w; k++) data[r * out.w + k] = out.data[r * out.w + k] * (g.data[r * out.w + k] - dot)
    }
    return [{ ...out, data }]
  },
  noise: () => [null, null],
}
