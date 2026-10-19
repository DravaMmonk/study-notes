import { correlate, downsample, fromFn, gaussianKernel, image, map, maxPool, shift, zip } from './image.js'
import { piText } from './pi.js'

// Every node the player can place. A node reads images on its input ports and writes one image on
// `out`. `cost` is arithmetic operations per output pixel, the game's efficiency score.
// `unlock` names the progress flag that makes a node, one of its settings, or (a third entry in `options`) one option
// of a choice available. A choice with `buttons` is a set of buttons rather than a menu: 'pad' lays four directions
// out as a cross, 'grid' two by two.

const DIRS = {
  '→': [1, 0],
  '←': [-1, 0],
  '↓': [0, 1],
  '↑': [0, -1],
}

const borderParam = { key: 'border', label: { zh: '边界', en: 'Border' }, kind: 'select', options: [['zero', { zh: '补 0', en: 'Pad with 0' }], ['edge', { zh: '复制边缘', en: 'Replicate edge' }]], default: 'zero', unlock: 'edge-filter' }
const borderOf = (params) => params.border ?? 'zero'
// Shift alone may also wrap round: what leaves one edge comes back in at the other.
// Shift learns to replicate the edge first (1-11); the filters learn it once the player has built a blur with it (1-12).
const shiftBorder = { ...borderParam, unlock: 'edge-pad', options: [...borderParam.options, ['wrap', { zh: '循环', en: 'Wrap round' }, 'wrap']] }

const ARITH = {
  add: ['+', (x, y) => x + y],
  sub: ['−', (x, y) => x - y],
  mul: ['×', (x, y) => x * y],
  div: ['÷', (x, y) => x / (Math.abs(y) < 1e-6 ? 1e-6 : y)],
}

const BOX3 = Array(9).fill(1 / 9)
const SOBEL_X = [-1, 0, 1, -2, 0, 2, -1, 0, 1].map((v) => v / 8)
const SOBEL_Y = [-1, -2, -1, 0, 0, 0, 1, 2, 1].map((v) => v / 8)

export const NODE_TYPES = {
  input: { label: { zh: '输入', en: 'Input' }, inputs: [], fixed: true, eval: () => null, cost: 0 },
  output: { label: { zh: '输出', en: 'Output' }, inputs: ['in'], outputs: [], fixed: true, eval: () => null, cost: 0 },

  // ---- primitives (chapter 0) ----
  mystery: { label: '？？？', inputs: ['in'], eval: ({ in: a }) => shift(a, 1, 0), cost: 0 },
  shift: {
    label: { zh: '平移', en: 'Shift' },
    inputs: ['in'],
    params: [
      { key: 'dir', label: { zh: '方向', en: 'Direction' }, kind: 'select', buttons: 'pad', options: Object.keys(DIRS).map((d) => [d, d]), default: '→' },
      { key: 'n', label: { zh: '格数', en: 'Steps' }, kind: 'number', min: 1, max: 16, step: 1, default: 1, unlock: 'long-shift' },
      shiftBorder,
    ],
    eval: ({ in: a }, p) => shift(a, DIRS[p.dir ?? '→'][0] * (p.n ?? 1), DIRS[p.dir ?? '→'][1] * (p.n ?? 1), borderOf(p)),
    cost: 0,
    unlock: 'shift',
  },
  add: { label: { zh: '相加', en: 'Add' }, inputs: ['a', 'b'], eval: ({ a, b }) => zip(a, b, (x, y) => x + y), cost: 1 },
  sub: { label: { zh: '相减', en: 'Subtract' }, inputs: ['a', 'b'], eval: ({ a, b }) => zip(a, b, (x, y) => x - y), cost: 1 },
  mul: { label: { zh: '相乘', en: 'Multiply' }, inputs: ['a', 'b'], eval: ({ a, b }) => zip(a, b, (x, y) => x * y), cost: 1 },
  // From chapter 1 the four kinds of arithmetic are one part with a choice of operation.
  arith: {
    label: { zh: '四则运算', en: 'Arithmetic' },
    inputs: ['a', 'b'],
    params: [{ key: 'op', label: { zh: '运算', en: 'Operation' }, kind: 'select', buttons: 'grid', options: Object.keys(ARITH).map((op) => [op, ARITH[op][0]]), default: 'add' }],
    eval: ({ a, b }, p) => zip(a, b, ARITH[p.op ?? 'add'][1]),
    cost: 1,
  },
  // Adds whatever is wired into its three inputs; an empty input is skipped.
  merge: {
    label: { zh: '汇合器', en: 'Merger' },
    inputs: ['a', 'b', 'c'],
    optional: ['a', 'b', 'c'],
    eval: (ins) => Object.values(ins).reduce((sum, img) => zip(sum, img, (x, y) => x + y)),
    cost: 2,
  },
  // A single number: added to or multiplied with a picture, it applies to every cell (the engine spreads a 1×1 value).
  const: {
    label: { zh: '常数', en: 'Constant' },
    inputs: [],
    params: [{ key: 'c', label: '=', kind: 'number', min: -100, max: 100, step: 0.01, default: 1, pi: true }],
    eval: (_, p) => image(1, 1, p.c ?? 1),
    cost: 0,
  },
  threshold: {
    label: { zh: '阈值', en: 'Threshold' },
    inputs: ['in'],
    params: [{ key: 't', label: '>', kind: 'number', min: -10, max: 10, step: 0.01, default: 0.5 }],
    eval: ({ in: a }, p) => map(a, (v) => (v > (p.t ?? 0.5) ? 1 : 0)),
    cost: 1,
    unlock: 'threshold',
  },
  invert: { label: { zh: '反相', en: 'Invert' }, inputs: ['in'], eval: ({ in: a }) => map(a, (v) => 1 - v), cost: 1, unlock: 'invert' },
  // Comes with the Wave part, from the bench where the player tunes a cosine wave (2-1).
  cos: { label: 'cos', inputs: ['in'], eval: ({ in: a }) => map(a, Math.cos), cost: 1, unlock: 'wave' },
  exp: { label: 'exp', inputs: ['in'], eval: ({ in: a }) => map(a, Math.exp), cost: 1 },
  square: { label: { zh: '平方', en: 'Square' }, inputs: ['in'], eval: ({ in: a }) => map(a, (v) => v * v), cost: 1, unlock: 'square' },
  sqrt: { label: { zh: '开方', en: 'Square root' }, inputs: ['in'], eval: ({ in: a }) => map(a, (v) => Math.sqrt(Math.max(0, v))), cost: 1, unlock: 'square' },
  relu: { label: 'ReLU', inputs: ['in'], eval: ({ in: a }) => map(a, (v) => Math.max(0, v)), cost: 1, unlock: 'relu' },
  // Each pixel becomes a 2×2 block with the pixel in its top left and 0 elsewhere: twice the size, nothing invented.
  zeroUp: {
    label: { zh: '补零放大', en: 'Zero upsample' },
    inputs: ['in'],
    eval: ({ in: a }) => fromFn(a.w * 2, a.h * 2, (x, y) => (x % 2 || y % 2 ? 0 : a.data[(y / 2) * a.w + x / 2])),
    cost: 0,
  },
  fqMean: {
    label: { zh: '求平均', en: 'Average' },
    description: { zh: '把一列数平均成一个数', en: 'Averages a row of numbers into a single number' },
    inputs: ['in'],
    eval: ({ in: a }) => image(1, 1, a.data.reduce((sum, v) => sum + v, 0) / a.data.length),
    cost: 1,
    // From the stacking bench (2-2), where the row's average stays on the middle line however the waves are stacked.
    unlock: 'mean',
  },
  globalMax: {
    label: { zh: '全图最大值', en: 'Global max' },
    inputs: ['in'],
    eval: ({ in: a }) => image(a.w, a.h, Math.max(...a.data)),
    cost: 1,
  },

  // ---- components earned by solving levels ----
  blur3h: { label: { zh: '横向三点平均', en: '3-point horizontal average' }, inputs: ['in'], params: [borderParam], eval: ({ in: a }, p) => correlate(a, [0, 0, 0, 1 / 3, 1 / 3, 1 / 3, 0, 0, 0], borderOf(p)), cost: 3, unlock: 'blur3h' },
  box3: { label: { zh: '3×3 平均', en: '3×3 average' }, inputs: ['in'], params: [borderParam], eval: ({ in: a }, p) => correlate(a, BOX3, borderOf(p)), cost: 6, unlock: 'box3' },
  gauss: {
    label: { zh: '高斯模糊', en: 'Gaussian blur' },
    inputs: ['in'],
    params: [{ key: 'sigma', label: 'σ', kind: 'number', min: 0.5, max: 2.5, step: 0.1, default: 1 }, borderParam],
    eval: ({ in: a }, p) => correlate(a, gaussianKernel(p.sigma ?? 1), borderOf(p)),
    // Done separably: a row of 2r + 1 weights, then a column, with r = ⌈2.5σ⌉.
    cost: (p) => 2 * (2 * Math.ceil(2.5 * (p.sigma ?? 1)) + 1),
    unlock: 'gauss',
  },
  diffx: { label: { zh: '横向差分', en: 'Horizontal difference' }, inputs: ['in'], eval: ({ in: a }) => zip(shift(a, -1, 0), a, (x, y) => x - y), cost: 1, unlock: 'diffx' },
  diffy: { label: { zh: '纵向差分', en: 'Vertical difference' }, inputs: ['in'], eval: ({ in: a }) => zip(shift(a, 0, -1), a, (x, y) => x - y), cost: 1, unlock: 'diffy' },
  sobelx: { label: 'Sobel x', inputs: ['in'], params: [borderParam], eval: ({ in: a }, p) => correlate(a, SOBEL_X, borderOf(p)), cost: 6, unlock: 'sobel' },
  sobely: { label: 'Sobel y', inputs: ['in'], params: [borderParam], eval: ({ in: a }, p) => correlate(a, SOBEL_Y, borderOf(p)), cost: 6, unlock: 'sobel' },
  kernel3: {
    label: { zh: '3×3 核', en: '3×3 kernel' },
    inputs: ['in'],
    params: [{ key: 'w', label: { zh: '权重', en: 'Weights' }, kind: 'kernel', default: [0, 0, 0, 0, 1, 0, 0, 0, 0] }, borderParam],
    eval: ({ in: a }, p) => correlate(a, p.w ?? [0, 0, 0, 0, 1, 0, 0, 0, 0], borderOf(p)),
    cost: 9,
    unlock: 'kernel3',
  },
  learn3: {
    label: { zh: '可学习 3×3 核', en: 'Learnable 3×3 kernel' },
    inputs: ['in'],
    params: [{ key: 'w', label: { zh: '权重', en: 'Weights' }, kind: 'kernel', learnable: true, hidden: true, default: [0, 0, 0, 0, 0, 0, 0, 0, 0] }],
    eval: ({ in: a }, p) => correlate(a, p.w ?? Array(9).fill(0)),
    cost: 9,
    unlock: 'learn3',
  },
  sharpen: {
    label: { zh: '锐化', en: 'Sharpen' },
    inputs: ['in'],
    params: [{ key: 'k', label: { zh: '强度', en: 'Strength' }, kind: 'number', min: 0, max: 3, step: 0.1, default: 1 }, borderParam],
    eval: ({ in: a }, p) => zip(a, correlate(a, gaussianKernel(1), borderOf(p)), (x, b) => x + (p.k ?? 1) * (x - b)),
    cost: 12,
    unlock: 'sharpen',
  },
  downsample: { label: { zh: '隔点取样', en: 'Downsample' }, inputs: ['in'], eval: ({ in: a }) => downsample(a, 2), cost: 0, unlock: 'downsample' },
  maxpool: { label: { zh: '2×2 最大池化', en: '2×2 max pool' }, inputs: ['in'], eval: ({ in: a }) => maxPool(a, 2), cost: 3, unlock: 'maxpool' },
  gradmag: {
    label: { zh: '梯度幅值', en: 'Gradient magnitude' },
    inputs: ['in'],
    params: [borderParam],
    eval: ({ in: a }, p) => zip(correlate(a, SOBEL_X, borderOf(p)), correlate(a, SOBEL_Y, borderOf(p)), (gx, gy) => Math.hypot(gx, gy)),
    cost: 15,
    unlock: 'gradmag',
  },
  harris: {
    label: { zh: 'Harris 响应', en: 'Harris response' },
    inputs: ['in'],
    params: [{ key: 'k', label: 'k', kind: 'number', min: 0.01, max: 0.2, step: 0.01, default: 0.05 }],
    eval: ({ in: a }, p) => harrisResponse(a, p.k ?? 0.05),
    cost: 30,
    unlock: 'harris',
  },
  argmin4: {
    label: { zh: '取最小者编号', en: 'Index of minimum' },
    inputs: ['c0', 'c1', 'c2', 'c3'],
    eval: (ins) =>
      fromFn(ins.c0.w, ins.c0.h, (x, y) => {
        let best = 0
        for (let d = 1; d < 4; d++) {
          const cost = ins[`c${d}`]
          if (cost && cost.data[y * cost.w + x] < ins[`c${best}`].data[y * cost.w + x] - 1e-9) best = d
        }
        return best
      }),
    cost: 3,
    unlock: 'argmin',
    optional: ['c2', 'c3'],
  },
  disparity: {
    label: { zh: '视差搜索', en: 'Disparity search' },
    inputs: ['left', 'right'],
    params: [{ key: 'window', label: { zh: '窗口', en: 'Window' }, kind: 'select', options: [[1, '1×1'], [3, '3×3'], [5, '5×5'], [7, '7×7']], default: 3 }],
    eval: ({ left, right }, p) => disparityMap(left, right, Number(p.window ?? 3)),
    cost: 40,
    unlock: 'disparity',
  },
}

export function harrisResponse(a, k = 0.05) {
  const gx = correlate(a, SOBEL_X)
  const gy = correlate(a, SOBEL_Y)
  const xx = correlate(zip(gx, gx, (p, q) => p * q), BOX3)
  const yy = correlate(zip(gy, gy, (p, q) => p * q), BOX3)
  const xy = correlate(zip(gx, gy, (p, q) => p * q), BOX3)
  return fromFn(a.w, a.h, (x, y) => {
    const i = y * a.w + x
    const det = xx.data[i] * yy.data[i] - xy.data[i] * xy.data[i]
    const trace = xx.data[i] + yy.data[i]
    return (det - k * trace * trace) * 100
  })
}

export function disparityMap(left, right, window = 3, maxD = 4) {
  const box = Array(window * window).fill(1 / (window * window))
  const costs = Array.from({ length: maxD }, (_, d) => correlate(zip(left, shift(right, d, 0), (p, q) => (p - q) ** 2), box))
  return fromFn(left.w, left.h, (x, y) => {
    let best = 0
    for (let d = 1; d < maxD; d++) if (costs[d].data[y * left.w + x] < costs[best].data[y * left.w + x] - 1e-9) best = d
    return best
  })
}

export const outputsOf = (type) => NODE_TYPES[type].outputs ?? ['out']
export const inputsOf = (type) => NODE_TYPES[type].inputs ?? []

// Every number a player sets lands on its setting's step (typed, slid or nudged), so a level's answer is a value the
// player can actually reach and never needs finer tuning than the step. Hand-set kernel weights go in hundredths.
const decimalsOf = (step) => (String(step).split('.')[1] ?? '').length
export function snapSetting(type, key, value) {
  const param = (NODE_TYPES[type]?.params ?? []).find((p) => p.key === key)
  if (!param || typeof value === 'object' && !Array.isArray(value)) return value
  if (param.kind === 'number') {
    // A setting that takes π (the Constant) keeps an exact multiple of π as it is.
    if (param.pi && piText(value)) return value
    const step = param.step ?? 0.1
    const v = Math.min(param.max ?? Infinity, Math.max(param.min ?? -Infinity, Math.round(value / step) * step))
    return Number(v.toFixed(decimalsOf(step)))
  }
  if (param.kind === 'kernel' && !param.learnable && Array.isArray(value)) return value.map((w) => Math.round(w * 100) / 100)
  return value
}

/** A part's settings a player holding `flags` can see, each choice cut to the options they hold. */
export const settingsOf = (type, flags) =>
  (NODE_TYPES[type].params ?? [])
    .filter((p) => !p.unlock || flags.has(p.unlock))
    .map((p) => (p.options?.some((o) => o[2]) ? { ...p, options: p.options.filter((o) => !o[2] || flags.has(o[2])) } : p))

export function defaultParams(type) {
  return Object.fromEntries((NODE_TYPES[type].params ?? []).map((param) => [param.key, Array.isArray(param.default) ? [...param.default] : param.default]))
}
