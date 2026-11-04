// Images and vectors, the values a vision board computes with besides numbers (games/DESIGN.md 6.8):
//
//   { w, h, c, data }   c: 1 (grey) or 3 (R, G, B); data row by row, a pixel's channels side by side:
//                       the value of channel ch at (x, y) is data[(y * w + x) * c + ch]
//
//   { x, y }            a two-dimensional vector: an offset, per-axis radii, a coordinate pair
//
// Coordinates are zero-based, x to the right and y down; content writes an image as its rows, numbers for grey and
// [R, G, B] triples for colour. Values are real numbers and nothing here clips them: only drawing an image maps [0, 1]
// onto black to white (display). Every function returns a new image and leaves its inputs as they were.

const T = (zh, en) => ({ zh, en })

export const isImage = (v) => v !== null && typeof v === 'object' && Number.isInteger(v.w) && Number.isInteger(v.h) && Array.isArray(v.data)
export const isVector = (v) => v !== null && typeof v === 'object' && !Array.isArray(v) && Number.isFinite(v.x) && Number.isFinite(v.y)

/** An image w × h of c channels, every value `value` (or each from fill(x, y, ch)). */
export function make(w, h, c = 1, fill = 0) {
  const data = new Array(w * h * c)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let ch = 0; ch < c; ch++) data[(y * w + x) * c + ch] = typeof fill === 'function' ? fill(x, y, ch) : fill
  return { w, h, c, data }
}

/** An image from content's rows: rows of numbers (grey) or of [R, G, B] triples (colour); null when they are no image. */
export function fromRows(rows) {
  if (!Array.isArray(rows) || !rows.length || !rows.every((r) => Array.isArray(r) && r.length === rows[0].length && r.length)) return null
  const colour = Array.isArray(rows[0][0])
  const c = colour ? rows[0][0].length : 1
  if (colour ? c !== 3 || !rows.every((r) => r.every((p) => Array.isArray(p) && p.length === 3 && p.every(Number.isFinite))) : !rows.every((r) => r.every(Number.isFinite))) return null
  return make(rows[0].length, rows.length, c, (x, y, ch) => (colour ? rows[y][x][ch] : rows[y][x]))
}

/** An image's rows, as content writes it. */
export const toRows = (img) => Array.from({ length: img.h }, (_, y) => Array.from({ length: img.w }, (_, x) => pixel(img, x, y)))

/** The value at (x, y): a number for grey, [R, G, B] for colour. */
export function pixel(img, x, y) {
  const at = (y * img.w + x) * img.c
  return img.c === 1 ? img.data[at] : img.data.slice(at, at + img.c)
}

/** A content value read: a number, 「—」 (null), or rows read into an image. */
export const valueOf = (v) => (v === null || v === undefined || typeof v === 'number' ? v ?? null : isVector(v) ? { x: v.x, y: v.y } : fromRows(v))

/** What a value is, in words: 「3 × 2 灰度图」, 「a number」. */
export const kindOf = (v) => (v === null || v === undefined ? T('「—」', '「—」') : isVector(v) ? T('一个向量', 'a vector') : isImage(v) ? T(`${v.w} × ${v.h} ${v.c === 3 ? '彩色图' : '灰度图'}`, `a ${v.w} × ${v.h} ${v.c === 3 ? 'colour' : 'grey'} image`) : T('一个数', 'a number'))

const close = (a, b, tol) => Math.abs(a - b) <= tol

/**
 * How `got` differs from `want`, or null when they agree within `tol`: { zh, en } saying the first difference — the
 * kind of value, the size, the channels, or the first pixel (x, y) and its two values.
 */
export function differs(want, got, tol = 1e-5) {
  const show = (v) => (Array.isArray(v) ? `(${v.map(fmt).join(', ')})` : fmt(v))
  if (want === null || want === undefined) return got === null || got === undefined ? null : T(`应当是「—」，得到${kindOf(got).zh}`, `should be 「—」, got ${kindOf(got).en}`)
  if (isVector(want)) return isVector(got) && close(want.x, got.x, tol) && close(want.y, got.y, tol) ? null : T(`应当是向量 (${fmt(want.x)}, ${fmt(want.y)})，得到${isVector(got) ? ` (${fmt(got.x)}, ${fmt(got.y)})` : kindOf(got).zh}`, `should be the vector (${fmt(want.x)}, ${fmt(want.y)}), got ${isVector(got) ? `(${fmt(got.x)}, ${fmt(got.y)})` : kindOf(got).en}`)
  if (!isImage(want)) {
    if (typeof got !== 'number') return T(`应当是一个数，得到${kindOf(got).zh}`, `should be a number, got ${kindOf(got).en}`)
    return close(want, got, tol) ? null : T(`应当是 ${fmt(want)}，得到 ${fmt(got)}`, `should be ${fmt(want)}, got ${fmt(got)}`)
  }
  if (!isImage(got)) return T(`应当是${kindOf(want).zh}，得到${kindOf(got).zh}`, `should be ${kindOf(want).en}, got ${kindOf(got).en}`)
  if (got.w !== want.w || got.h !== want.h) return T(`尺寸应当是 ${want.w} × ${want.h}，得到 ${got.w} × ${got.h}`, `the size should be ${want.w} × ${want.h}, got ${got.w} × ${got.h}`)
  if (got.c !== want.c) return T(`应当是${want.c === 3 ? '彩色' : '灰度'}图，得到${got.c === 3 ? '彩色' : '灰度'}图`, `should be a ${want.c === 3 ? 'colour' : 'grey'} image, got a ${got.c === 3 ? 'colour' : 'grey'} one`)
  for (let y = 0; y < want.h; y++) {
    for (let x = 0; x < want.w; x++) {
      const [a, b] = [pixel(want, x, y), pixel(got, x, y)]
      const same = Array.isArray(a) ? a.every((v, k) => close(v, b[k], tol)) : close(a, b, tol)
      if (!same) return T(`(${x}, ${y}) 应当是 ${show(a)}，得到 ${show(b)}`, `(${x}, ${y}) should be ${show(a)}, got ${show(b)}`)
    }
  }
  return null
}

/** A number as a card or a grid writes it: up to four decimals, trailing zeros dropped. */
export function fmt(v) {
  if (v === null || v === undefined) return '—'
  if (!Number.isFinite(v)) return String(v)
  return String(Number(v.toFixed(4)))
}

/** A value in a line of text: a number, or an image's rows. */
export const show = (v) => (isVector(v) ? `(${fmt(v.x)}, ${fmt(v.y)})` : isImage(v) ? `[${toRows(v).map((r) => `[${r.map((p) => (Array.isArray(p) ? `(${p.map(fmt).join(',')})` : fmt(p))).join(', ')}]`).join(', ')}]` : fmt(v))

/** What a stored value looks like on screen: clipped to [0, 1] for drawing only. */
export const display = (v) => Math.min(1, Math.max(0, v))
