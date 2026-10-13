import { correlate, downsample, fromFn, gaussianKernel, image, map, maxPool, shift, zip } from './image.js'

// Every node the player can place. A node reads images on its input ports and writes one image on
// `out`. `cost` is arithmetic operations per output pixel, the game's efficiency score.
// `unlock` names the progress flag that makes a node (or one of its options) available.

const DIRS = {
  '→': [1, 0],
  '←': [-1, 0],
  '↓': [0, 1],
  '↑': [0, -1],
}

const borderParam = { key: 'border', label: '边界', kind: 'select', options: [['zero', '补 0'], ['edge', '复制边缘']], default: 'zero', unlock: 'edge-pad' }
const borderOf = (params) => params.border ?? 'zero'

const BOX3 = Array(9).fill(1 / 9)
const SOBEL_X = [-1, 0, 1, -2, 0, 2, -1, 0, 1].map((v) => v / 8)
const SOBEL_Y = [-1, -2, -1, 0, 0, 0, 1, 2, 1].map((v) => v / 8)

export const NODE_TYPES = {
  input: { label: '输入', inputs: [], fixed: true, eval: () => null, cost: 0 },
  output: { label: '输出', inputs: ['in'], outputs: [], fixed: true, eval: () => null, cost: 0 },

  // ---- primitives (chapter 0) ----
  mystery: { label: '？？？', inputs: ['in'], eval: ({ in: a }) => shift(a, 1, 0), cost: 0 },
  shift: {
    label: '平移',
    inputs: ['in'],
    params: [{ key: 'dir', label: '方向', kind: 'select', options: Object.keys(DIRS).map((d) => [d, d]), default: '→' }, borderParam],
    eval: ({ in: a }, p) => shift(a, ...DIRS[p.dir ?? '→'], borderOf(p)),
    cost: 0,
  },
  add: { label: '相加', inputs: ['a', 'b'], eval: ({ a, b }) => zip(a, b, (x, y) => x + y), cost: 1 },
  sub: { label: '相减 a−b', inputs: ['a', 'b'], eval: ({ a, b }) => zip(a, b, (x, y) => x - y), cost: 1 },
  mul: { label: '相乘', inputs: ['a', 'b'], eval: ({ a, b }) => zip(a, b, (x, y) => x * y), cost: 1, unlock: 'mul' },
  scale: {
    label: '乘系数',
    inputs: ['in'],
    params: [{ key: 'k', label: '×', kind: 'number', min: -4, max: 4, step: 0.05, default: 1 }],
    eval: ({ in: a }, p) => map(a, (v) => v * (p.k ?? 1)),
    cost: 1,
  },
  offset: {
    label: '加常数',
    inputs: ['in'],
    params: [{ key: 'c', label: '+', kind: 'number', min: -2, max: 2, step: 0.05, default: 0 }],
    eval: ({ in: a }, p) => map(a, (v) => v + (p.c ?? 0)),
    cost: 1,
  },
  threshold: {
    label: '阈值',
    inputs: ['in'],
    params: [{ key: 't', label: '>', kind: 'number', min: -1, max: 2, step: 0.05, default: 0.5 }],
    eval: ({ in: a }, p) => map(a, (v) => (v > (p.t ?? 0.5) ? 1 : 0)),
    cost: 1,
    unlock: 'threshold',
  },
  invert: { label: '反相', inputs: ['in'], eval: ({ in: a }) => map(a, (v) => 1 - v), cost: 1, unlock: 'invert' },
  square: { label: '平方', inputs: ['in'], eval: ({ in: a }) => map(a, (v) => v * v), cost: 1, unlock: 'square' },
  sqrt: { label: '开方', inputs: ['in'], eval: ({ in: a }) => map(a, (v) => Math.sqrt(Math.max(0, v))), cost: 1, unlock: 'square' },
  abs: { label: '绝对值', inputs: ['in'], eval: ({ in: a }) => map(a, Math.abs), cost: 1, unlock: 'relu' },
  relu: { label: 'ReLU', inputs: ['in'], eval: ({ in: a }) => map(a, (v) => Math.max(0, v)), cost: 1, unlock: 'relu' },
  divide: { label: '相除 a÷b', inputs: ['a', 'b'], eval: ({ a, b }) => zip(a, b, (x, y) => x / (Math.abs(y) < 1e-6 ? 1e-6 : y)), cost: 1, unlock: 'normalize' },
  globalMax: {
    label: '全图最大值',
    inputs: ['in'],
    eval: ({ in: a }) => image(a.w, a.h, Math.max(...a.data)),
    cost: 1,
    unlock: 'normalize',
  },

  // ---- components earned by solving levels ----
  blur3h: { label: '横向三点平均', inputs: ['in'], params: [borderParam], eval: ({ in: a }, p) => correlate(a, [0, 0, 0, 1 / 3, 1 / 3, 1 / 3, 0, 0, 0], borderOf(p)), cost: 3, unlock: 'blur3h' },
  box3: { label: '3×3 平均', inputs: ['in'], params: [borderParam], eval: ({ in: a }, p) => correlate(a, BOX3, borderOf(p)), cost: 6, unlock: 'box3' },
  gauss: {
    label: '高斯模糊',
    inputs: ['in'],
    params: [{ key: 'sigma', label: 'σ', kind: 'number', min: 0.5, max: 2.5, step: 0.1, default: 1 }, borderParam],
    eval: ({ in: a }, p) => correlate(a, gaussianKernel(p.sigma ?? 1), borderOf(p)),
    cost: 10,
    unlock: 'gauss',
  },
  diffx: { label: '横向差分', inputs: ['in'], eval: ({ in: a }) => zip(shift(a, -1, 0), a, (x, y) => x - y), cost: 1, unlock: 'diffx' },
  diffy: { label: '纵向差分', inputs: ['in'], eval: ({ in: a }) => zip(shift(a, 0, -1), a, (x, y) => x - y), cost: 1, unlock: 'diffx' },
  sobelx: { label: 'Sobel x', inputs: ['in'], params: [borderParam], eval: ({ in: a }, p) => correlate(a, SOBEL_X, borderOf(p)), cost: 6, unlock: 'sobel' },
  sobely: { label: 'Sobel y', inputs: ['in'], params: [borderParam], eval: ({ in: a }, p) => correlate(a, SOBEL_Y, borderOf(p)), cost: 6, unlock: 'sobel' },
  kernel3: {
    label: '3×3 核',
    inputs: ['in'],
    params: [{ key: 'w', label: '权重', kind: 'kernel', default: [0, 0, 0, 0, 1, 0, 0, 0, 0] }, borderParam],
    eval: ({ in: a }, p) => correlate(a, p.w ?? [0, 0, 0, 0, 1, 0, 0, 0, 0], borderOf(p)),
    cost: 9,
    unlock: 'kernel3',
  },
  learn3: {
    label: '可学习 3×3 核',
    inputs: ['in'],
    params: [{ key: 'w', label: '权重', kind: 'kernel', learnable: true, hidden: true, default: [0, 0, 0, 0, 0, 0, 0, 0, 0] }],
    eval: ({ in: a }, p) => correlate(a, p.w ?? Array(9).fill(0)),
    cost: 9,
    unlock: 'learn3',
  },
  sharpen: {
    label: '锐化',
    inputs: ['in'],
    params: [{ key: 'k', label: '强度', kind: 'number', min: 0, max: 3, step: 0.1, default: 1 }],
    eval: ({ in: a }, p) => zip(a, correlate(a, gaussianKernel(1), 'edge'), (x, b) => x + (p.k ?? 1) * (x - b)),
    cost: 12,
    unlock: 'sharpen',
  },
  downsample: { label: '隔点取样', inputs: ['in'], eval: ({ in: a }) => downsample(a, 2), cost: 0, unlock: 'downsample' },
  maxpool: { label: '2×2 最大池化', inputs: ['in'], eval: ({ in: a }) => maxPool(a, 2), cost: 3, unlock: 'maxpool' },
  gradmag: {
    label: '梯度幅值',
    inputs: ['in'],
    params: [borderParam],
    eval: ({ in: a }, p) => zip(correlate(a, SOBEL_X, borderOf(p)), correlate(a, SOBEL_Y, borderOf(p)), (gx, gy) => Math.hypot(gx, gy)),
    cost: 15,
    unlock: 'gradmag',
  },
  harris: {
    label: 'Harris 响应',
    inputs: ['in'],
    params: [{ key: 'k', label: 'k', kind: 'number', min: 0.01, max: 0.2, step: 0.01, default: 0.05 }],
    eval: ({ in: a }, p) => harrisResponse(a, p.k ?? 0.05),
    cost: 30,
    unlock: 'harris',
  },
  argmin4: {
    label: '取最小者编号',
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
    label: '视差搜索',
    inputs: ['left', 'right'],
    params: [{ key: 'window', label: '窗口', kind: 'select', options: [[1, '1×1'], [3, '3×3'], [5, '5×5'], [7, '7×7']], default: 3 }],
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

export function defaultParams(type) {
  return Object.fromEntries((NODE_TYPES[type].params ?? []).map((param) => [param.key, Array.isArray(param.default) ? [...param.default] : param.default]))
}
