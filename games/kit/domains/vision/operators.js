// Semantic image operators keep indexing and arithmetic outside theory assessments.
import { PartError } from '../../engine/circuit.js'
import { isImage, make } from './image.js'

const fail = (zh, en) => { throw new PartError({ zh, en }) }
const imageOf = (image) => {
  if (!isImage(image)) fail('需要一张图', 'An image is required')
  return image
}
const numberOf = (value) => {
  const n = Number(value)
  if (!Number.isFinite(n)) fail('参数需要有限数值', 'A finite numeric parameter is required')
  return n
}

/** Boundary assumptions apply to each contributing sample, including interpolation neighbours. */
function read(image, x, y, ch, outside) {
  if (x < 0 || x >= image.w || y < 0 || y >= image.h) {
    if (outside === 'zero') return 0
    if (outside === 'error') fail(`(${x}, ${y}) 在图像范围外`, `(${x}, ${y}) is outside the image`)
    x = Math.max(0, Math.min(image.w - 1, x))
    y = Math.max(0, Math.min(image.h - 1, y))
  }
  return image.data[(y * image.w + x) * image.c + ch]
}

/** Scalar coordinates read a scalar/RGB pixel; coordinate images determine the output shape. */
export function sampleImage(image, x, y, { method = 'nearest', outside = 'clamp' } = {}) {
  imageOf(image)
  const coords = [x, y].filter(isImage)
  if (coords.some((v) => v.c !== 1 || v.w !== coords[0].w || v.h !== coords[0].h)) fail('坐标图需要同尺寸、单通道', 'Coordinate images must be single-channel and have matching sizes')
  const at = (v, px, py) => numberOf(isImage(v) ? v.data[py * v.w + px] : v)
  const sample = (sx, sy, ch) => {
    if (method === 'nearest') return read(image, Math.floor(sx + 0.5), Math.floor(sy + 0.5), ch, outside)
    const x0 = Math.floor(sx), y0 = Math.floor(sy), tx = sx - x0, ty = sy - y0
    const neighbours = [[x0, y0, (1 - tx) * (1 - ty)], [x0 + 1, y0, tx * (1 - ty)], [x0, y0 + 1, (1 - tx) * ty], [x0 + 1, y0 + 1, tx * ty]]
    return neighbours.reduce((sum, [px, py, weight]) => weight === 0 ? sum : sum + weight * read(image, px, py, ch, outside), 0)
  }
  if (!coords.length && image.c === 1) return sample(at(x), at(y), 0)
  return make(coords[0]?.w ?? 1, coords[0]?.h ?? 1, image.c, (px, py, ch) => sample(at(x, px, py), at(y, px, py), ch))
}

/** Written kernels use convolution reversal; positional weights use correlation. */
export function filterImage(image, kernel, { outside = 'clamp', convention = 'correlation' } = {}) {
  imageOf(image); imageOf(kernel)
  if (kernel.c !== 1 || kernel.w % 2 !== 1 || kernel.h % 2 !== 1) fail('核需要奇数宽高的单通道图', 'A kernel must be single-channel with odd dimensions')
  const direction = convention === 'convolution' ? -1 : 1
  return make(image.w, image.h, image.c, (x, y, ch) => {
    let sum = 0
    for (let ky = 0; ky < kernel.h; ky++) for (let kx = 0; kx < kernel.w; kx++) {
      const weight = kernel.data[ky * kernel.w + kx]
      if (weight) sum += weight * read(image, x + direction * (kx - (kernel.w - 1) / 2), y + direction * (ky - (kernel.h - 1) / 2), ch, outside)
    }
    return sum
  })
}

export const OPERATOR_DEFAULTS = {
  sample: { method: 'nearest', outside: 'clamp' },
  stencil: { axis: 'x', a: '0', b: '1', c: '0', outside: 'clamp' },
  kernelFilter: { convention: 'correlation', outside: 'clamp' },
}

export const IMAGE_OPERATORS = {
  sample: { inputs: ['image', 'x', 'y'], settings: { method: ['nearest', 'bilinear'], outside: ['error', 'zero', 'clamp'] }, eval: ({ image, x, y }, node) => sampleImage(image, x, y, node.params) },
  stencil: {
    inputs: ['image'], settings: { axis: ['x', 'y'], outside: ['zero', 'clamp'] },
    eval: ({ image }, node) => {
      const p = { ...OPERATOR_DEFAULTS.stencil, ...node.params }
      const weights = ['a', 'b', 'c'].map((key) => numberOf(p[key]))
      const kernel = make(p.axis === 'x' ? 3 : 1, p.axis === 'y' ? 3 : 1, 1, (x, y) => weights[p.axis === 'x' ? x : y])
      return filterImage(image, kernel, p)
    },
  },
  kernelFilter: { inputs: ['image', 'kernel'], settings: { convention: ['correlation', 'convolution'], outside: ['zero', 'clamp'] }, eval: ({ image, kernel }, node) => filterImage(image, kernel, node.params) },
  colourMix: {
    inputs: ['image', 'wr', 'wg', 'wb'],
    eval: ({ image, wr, wg, wb }) => {
      imageOf(image)
      if (image.c !== 3) fail('颜色组合需要 RGB 图', 'Colour mixing requires an RGB image')
      const weights = [wr, wg, wb].map(numberOf)
      return make(image.w, image.h, 1, (x, y) => weights.reduce((sum, weight, ch) => sum + weight * image.data[(y * image.w + x) * 3 + ch], 0))
    },
  },
}
