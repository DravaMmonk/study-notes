// Parts that learn (视觉完备 chapter 4): learnable kernels, dense layers and constants, the sigmoid, the larger of
// two, many channels and residual blocks. The trainer finds their numbers by finite differences (engine/graph.js).
import { image, map, random, zip } from '../image.js'

// 3×3 correlation with zero padding, written as one loop because training evaluates it thousands of
// times per step. Same maths as correlate(img, w).
export function conv3(a, w, bias = 0) {
  const { w: W, h: H, data } = a
  const out = new Float32Array(W * H)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let sum = bias
      for (let v = -1; v <= 1; v++) {
        const yy = y + v
        if (yy < 0 || yy >= H) continue
        for (let u = -1; u <= 1; u++) {
          const xx = x + u
          if (xx >= 0 && xx < W) sum += w[(v + 1) * 3 + u + 1] * data[yy * W + xx]
        }
      }
      out[y * W + x] = sum
    }
  }
  return { w: W, h: H, data: out }
}

// A trained layer starts from small random numbers (seeded, so every new layer starts the same way).
export const CONV_INIT = (() => {
  const next = random(5)
  return Array.from({ length: 9 }, () => Math.round((next() * 2 - 1) * 0.02 * 1e4) / 1e4)
})()


export const LEARNING = {
  lrnConv: {
    label: { zh: '卷积层', en: 'Conv layer' },
    description: { zh: '可学习 3×3 核，从一组很小的随机数开始', en: 'Learnable 3×3 kernel, starting from a set of very small random numbers' },
    inputs: ['in'],
    params: [{ key: 'w', label: { zh: '权重', en: 'Weights' }, kind: 'kernel', learnable: true, default: CONV_INIT }],
    eval: ({ in: a }, p) => conv3(a, p.w ?? CONV_INIT),
    cost: 9,
  },
  lrnDense: {
    label: { zh: '全连接 w·x + b', en: 'Dense w·x + b' },
    description: { zh: '可学习的权重 w 和偏置 b', en: 'Learnable weight w and bias b' },
    inputs: ['in'],
    params: [{ key: 'p', label: 'w, b', kind: 'kernel', learnable: true, default: [1, 0] }],
    eval: ({ in: a }, p) => map(a, (v) => (p.p?.[0] ?? 1) * v + (p.p?.[1] ?? 0)),
    cost: 2,
    unlock: 'dense',
  },
  lrnSigmoid: {
    label: 'Sigmoid',
    description: { zh: '1 / (1 + e⁻ˣ)，把任意数压到 0…1', en: '1 / (1 + e⁻ˣ): squashes any number into 0…1' },
    inputs: ['in'],
    eval: ({ in: a }) => map(a, (v) => 1 / (1 + Math.exp(-v))),
    cost: 2,
    unlock: 'sigmoid',
  },
  lrnConst: {
    label: { zh: '可学习常数', en: 'Learnable constant' },
    description: { zh: '一个由训练决定的数。和一张图相加、相乘时，它用在每一格上', en: 'A number that training sets. Added to or multiplied with a picture, it applies to every cell' },
    inputs: [],
    params: [{ key: 'p', label: { zh: '值', en: 'Value' }, kind: 'kernel', learnable: true, default: [1] }],
    eval: (_, p) => image(1, 1, p.p?.[0] ?? 1),
    cost: 0,
  },
  max: {
    label: { zh: '取较大', en: 'Larger' },
    description: { zh: '两张图逐格取较大的那个', en: 'Takes the larger of two pictures, cell by cell' },
    inputs: ['a', 'b'],
    eval: ({ a, b }) => zip(a, b, Math.max),
    cost: 1,
    unlock: 'max',
  },
  // Earned by solving 4-5 and 4-7.
  lrnRgb: {
    label: { zh: '多通道 3×3 核', en: 'Multichannel 3×3 kernel' },
    description: { zh: '一个核横跨 R、G、B：3×3×3 个可学习权重', en: 'One kernel spans R, G and B: 3×3×3 learnable weights' },
    inputs: ['r', 'g', 'b'],
    params: [{ key: 'w', label: { zh: '权重', en: 'Weights' }, kind: 'kernel', learnable: true, default: Array(27).fill(0) }],
    eval: ({ r, g, b }, p) => {
      const w = p.w ?? Array(27).fill(0)
      const [R, G, B] = [conv3(r, w.slice(0, 9)), conv3(g, w.slice(9, 18)), conv3(b, w.slice(18, 27))]
      return { w: r.w, h: r.h, data: R.data.map((v, i) => v + G.data[i] + B.data[i]) }
    },
    cost: 29,
    unlock: 'lrn-rgb',
  },
  lrnRes: {
    label: { zh: '残差块', en: 'Residual block' },
    description: { zh: '输出 = 输入 + 卷积层(输入)', en: 'output = input + conv layer(input)' },
    inputs: ['in'],
    params: [{ key: 'w', label: { zh: '权重', en: 'Weights' }, kind: 'kernel', learnable: true, default: CONV_INIT }],
    eval: ({ in: a }, p) => {
      const f = conv3(a, p.w ?? CONV_INIT)
      return { w: a.w, h: a.h, data: f.data.map((v, i) => v + a.data[i]) }
    },
    cost: 10,
    unlock: 'lrn-res',
  },
}

