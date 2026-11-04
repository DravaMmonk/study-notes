// Execution helpers expose samples and repetitions; learner circuits supply the visual algorithms.
import { PartError } from '../../engine/circuit.js'
import { isImage, isVector, make } from './image.js'

const fail = (zh, en) => { throw new PartError({ zh, en }) }
const imageOf = (v) => {
  if (!isImage(v)) fail('需要一张图', 'An image is required')
  return v
}
const integer = (v) => {
  if (!Number.isInteger(v)) fail('位移、尺寸或索引必须是整数', 'Offsets, sizes and indices must be integers')
  return v
}
export const BORDERS = ['zero', 'clamp', 'wrap', 'reflect']
const boundary = (x, n, mode) => {
  if (mode === 'wrap') return ((x % n) + n) % n
  if (mode === 'reflect') {
    const p = ((x % (2 * n)) + 2 * n) % (2 * n)
    return p < n ? p : 2 * n - 1 - p
  }
  return Math.min(n - 1, Math.max(0, x))
}
export function readOutside(image, x, y, ch, mode = 'zero') {
  if (mode === 'zero' && (x < 0 || y < 0 || x >= image.w || y >= image.h)) return 0
  return image.data[(boundary(y, image.h, mode) * image.w + boundary(x, image.w, mode)) * image.c + ch]
}
const integerVector = (v) => {
  if (!isVector(v)) fail('需要一个整数向量 (x, y)', 'An integer vector (x, y) is required')
  integer(v.x); integer(v.y)
  return v
}
const allocated = (w, h) => {
  if (w * h > 262144) fail('展开后的表过大，请缩小实验图像', 'The expanded table is too large; use a smaller experimental image')
}
export const CONSTRUCTION_DEFAULTS = { shift: { outside: 'zero' }, windowTable: { outside: 'zero', axis: 'x' }, reduceRows: { mode: 'mean' } }
const spatial = (inputs, evalFn, { outputs, axis = false } = {}) => ({ inputs, params: ['outside', ...(axis ? ['axis'] : [])], settings: { outside: BORDERS, ...(axis ? { axis: ['x', 'y'] } : {}) }, ...(outputs ? { outputs } : {}), eval: evalFn })
export const CONSTRUCTION_PARTS = {
  shift: spatial(['image', 'd'], ({ image, d }, node) => {
    imageOf(image); integerVector(d)
    return make(image.w, image.h, image.c, (x, y, ch) => readOutside(image, x + d.x, y + d.y, ch, node.params?.outside))
  }),
  transpose: { inputs: ['image'], eval: ({ image }) => {
    imageOf(image)
    return make(image.h, image.w, image.c, (x, y, ch) => image.data[(x * image.w + y) * image.c + ch])
  } },
  reverse: { inputs: ['image'], eval: ({ image }) => {
    imageOf(image)
    return make(image.w, image.h, image.c, (x, y, ch) => image.data[((image.h - 1 - y) * image.w + image.w - 1 - x) * image.c + ch])
  } },
  windowTable: spatial(['image', 'kernel'], ({ image, kernel }, node, _ctx, key) => {
    imageOf(image); imageOf(kernel)
    if (kernel.c !== 1 || kernel.w % 2 !== 1 || kernel.h % 2 !== 1) fail('邻域权重需要奇数宽高的单通道表', 'Neighbourhood weights need an odd-sized single-channel table')
    const count = kernel.w * kernel.h
    allocated(count, image.w * image.h)
    if (key === 'weights') return make(count, image.w * image.h, 1, (x) => kernel.data[x])
    return make(count, image.w * image.h, image.c, (x, y, ch) => {
      const dx = x % kernel.w - (kernel.w - 1) / 2, dy = Math.floor(x / kernel.w) - (kernel.h - 1) / 2
      return readOutside(image, y % image.w + (node.params?.axis === 'y' ? dy : dx), Math.floor(y / image.w) + (node.params?.axis === 'y' ? dx : dy), ch, node.params?.outside)
    })
  }, { outputs: () => ['samples', 'weights'], axis: true }),
  reduceRows: { inputs: ['image'], settings: { mode: ['mean', 'sum'] }, eval: ({ image }, node) => {
    imageOf(image)
    return make(1, image.h, image.c, (_x, y, ch) => {
      let sum = 0
      for (let x = 0; x < image.w; x++) sum += image.data[(y * image.w + x) * image.c + ch]
      return node.params?.mode === 'sum' ? sum : sum / image.w
    })
  } },
  restore: { inputs: ['values', 'shape'], eval: ({ values, shape }) => {
    imageOf(values); imageOf(shape)
    if (values.w !== 1 || values.h !== shape.w * shape.h) fail('需要每个输出位置一个结果，再还原为原图宽高', 'Provide one result per output position, then restore the original dimensions')
    return make(shape.w, shape.h, values.c, (x, y, ch) => values.data[(y * shape.w + x) * values.c + ch])
  } },
  trim: { inputs: ['image', 'r'], eval: ({ image, r }) => {
    imageOf(image); integerVector(r)
    if (r.x < 0 || r.y < 0 || 2 * r.x >= image.w || 2 * r.y >= image.h) fail('有效内部必须至少保留一行一列', 'The valid interior must retain at least one row and column')
    return make(image.w - 2 * r.x, image.h - 2 * r.y, image.c, (x, y, ch) => image.data[((y + r.y) * image.w + x + r.x) * image.c + ch])
  } },
  positions: { inputs: ['image'], eval: ({ image }) => {
    imageOf(image)
    return make(image.w, image.h, 1, (x) => x / image.w)
  } },
  expandRows: { inputs: ['image'], outputs: () => ['values', 'position', 'frequency'], eval: ({ image }, _node, _ctx, key) => {
    imageOf(image); allocated(image.w, image.w * image.h)
    return make(image.w, image.w * image.h, key === 'values' ? image.c : 1, (x, y, ch) => key === 'position' ? x / image.w : key === 'frequency' ? y % image.w : image.data[(Math.floor(y / image.w) * image.w + x) * image.c + ch])
  } },
}

/** Only explicitly exposed settings belong on a new packed node. */
export const builtDefaults = (build) => Object.fromEntries((build.settings ?? []).map((key) => [key, build.defaults?.[key] ?? (key === 'axis' ? 'x' : 'zero')]))
