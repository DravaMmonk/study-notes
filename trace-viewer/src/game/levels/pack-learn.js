// Learn pack: chapter 4's second half (lectures 6–8), from stacking small kernels to residual nets.
//   4-7 看得更大   — three stacked 3×3 layers see 7×7 (receptive field), one layer cannot.
//   4-8 多通道     — one filter spans R, G and B; a greyscale pipeline cannot see a red↔green edge.
//   4-9 分辨 X 和 O — the smallest CNN: conv → ReLU → pool → global average → dense → sigmoid, trained.
//   4-11 训不动的深网 — six plain layers from small random weights never move; skip connections train.
// The training claims are checked with the game's own trainer (finite differences + backtracking):
// see the numbers next to each level.
import { GLYPHS, addNoise, correlate, fromFn, image, map, patterns as P, random, zip } from '../engine/image.js'
import { order } from '../engine/graph.js'
import { NODE_TYPES } from '../engine/nodes.js'
import { build, test } from './util.js'

// ---------------- parts ----------------

// 3×3 correlation with zero padding, written as one loop because training evaluates it thousands of
// times per step. Same maths as correlate(img, w).
function conv3(a, w, bias = 0) {
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
const CONV_INIT = (() => {
  const next = random(5)
  return Array.from({ length: 9 }, () => Math.round((next() * 2 - 1) * 0.02 * 1e4) / 1e4)
})()

export const nodes = {
  lrnConv: {
    label: '卷积层',
    description: '可学习 3×3 核，从一组很小的随机数开始',
    inputs: ['in'],
    params: [{ key: 'w', label: '权重', kind: 'kernel', learnable: true, default: CONV_INIT }],
    eval: ({ in: a }, p) => conv3(a, p.w ?? CONV_INIT),
    cost: 9,
  },
  lrnGap: {
    label: '全局平均',
    description: '整张图求平均，变成 1×1',
    inputs: ['in'],
    eval: ({ in: a }) => image(1, 1, a.data.reduce((sum, v) => sum + v, 0) / a.data.length),
    cost: 1,
  },
  lrnDense: {
    label: '全连接 w·x + b',
    description: '可学习的权重 w 和偏置 b',
    inputs: ['in'],
    params: [{ key: 'p', label: 'w, b', kind: 'kernel', learnable: true, default: [1, 0] }],
    eval: ({ in: a }, p) => map(a, (v) => (p.p?.[0] ?? 1) * v + (p.p?.[1] ?? 0)),
    cost: 2,
  },
  lrnSigmoid: {
    label: 'Sigmoid',
    description: '1 / (1 + e⁻ˣ)，把任意数压到 0…1',
    inputs: ['in'],
    eval: ({ in: a }) => map(a, (v) => 1 / (1 + Math.exp(-v))),
    cost: 2,
  },
  // Earned by solving 4-5 and 4-7.
  lrnRgb: {
    label: '多通道 3×3 核',
    description: '一个核横跨 R、G、B：3×3×3 个可学习权重',
    inputs: ['r', 'g', 'b'],
    params: [{ key: 'w', label: '权重', kind: 'kernel', learnable: true, default: Array(27).fill(0) }],
    eval: ({ r, g, b }, p) => {
      const w = p.w ?? Array(27).fill(0)
      const [R, G, B] = [conv3(r, w.slice(0, 9)), conv3(g, w.slice(9, 18)), conv3(b, w.slice(18, 27))]
      return { w: r.w, h: r.h, data: R.data.map((v, i) => v + G.data[i] + B.data[i]) }
    },
    cost: 29,
    unlock: 'lrn-rgb',
  },
  lrnRes: {
    label: '残差块',
    description: '输出 = 输入 + 卷积层(输入)',
    inputs: ['in'],
    params: [{ key: 'w', label: '权重', kind: 'kernel', learnable: true, default: CONV_INIT }],
    eval: ({ in: a }, p) => {
      const f = conv3(a, p.w ?? CONV_INIT)
      return { w: a.w, h: a.h, data: f.data.map((v, i) => v + a.data[i]) }
    },
    cost: 10,
    unlock: 'lrn-res',
  },
}
// Registered now because the reference graphs below are built when this module loads.
Object.assign(NODE_TYPES, nodes)

const LAYERS = new Set(['lrnConv', 'lrnRes', 'learn3', 'kernel3'])

// The most trainable layers met on any one path from an input to the output.
export function depthOf(graph) {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  const depth = new Map()
  for (const id of order(graph)) {
    const before = graph.wires.filter((w) => w.to === id).map((w) => depth.get(w.from) ?? 0)
    depth.set(id, Math.max(0, ...before) + (LAYERS.has(byId.get(id).type) ? 1 : 0))
  }
  return Math.max(0, ...graph.nodes.filter((n) => n.type === 'output').map((n) => depth.get(n.id) ?? 0))
}

// ---------------- 4-4 · 看得更大 ----------------
// Bright blocks on a dark, slightly noisy ground. The answer is 1 wherever the whole 7×7 window
// around a pixel is bright. A 5×5 block's centre and a 7×7 block's centre look identical through
// any 3×3 (or 5×5) window, so one or two 3×3 layers cannot tell them apart; three can. A 7×7 block
// missing one corner pixel needs the full 7×7 view, and the corner must still count, so a single
// threshold after three plain blurs (where that corner weighs 1/729) fails too.

function blocks(rects, notches = [], seed = 1) {
  const bright = (x, y) => rects.some(([x0, y0, w, h]) => x >= x0 && x < x0 + w && y >= y0 && y < y0 + h) && !notches.some(([nx, ny]) => nx === x && ny === y)
  const mask = fromFn(16, 16, (x, y) => (bright(x, y) ? 1 : 0))
  const scene = addNoise(map(mask, (v) => (v ? 0.9 : 0.1)), seed, 0.03)
  const fits = fromFn(16, 16, (x, y) => {
    for (let v = -3; v <= 3; v++) for (let u = -3; u <= 3; u++) if (!bright(x + u, y + v) || x + u < 0 || y + v < 0 || x + u > 15 || y + v > 15) return 0
    return 1
  })
  return { scene, fits }
}

const erode = (stages) => {
  const nodes = {}
  const wires = []
  let last = 'in'
  stages.forEach((t, i) => {
    nodes[`b${i}`] = 'box3'
    nodes[`t${i}`] = ['threshold', { t }]
    wires.push(`${last}>b${i}`, `b${i}>t${i}`)
    last = `t${i}`
  })
  wires.push(`${last}>out`)
  return build(nodes, wires)
}

// ---------------- 4-5 · 多通道 ----------------
// Three 16×16 channels, each already centred (minus 0.5) as network inputs usually are; without
// that the shared brightness swamps the gradient and the per-channel kernels crawl. The answer is
// "centre minus the mean of its four neighbours" of R − G: it marks red↔green borders and ignores
// changes that add the same amount to every channel or that touch only blue. The two colour-noise
// scenes give every weight something to learn from.

const LAP = [0, -0.25, 0, -0.25, 1, -0.25, 0, -0.25, 0]
const NEG_LAP = LAP.map((v) => -v)
const ZERO9 = Array(9).fill(0)

function colourScene(paint) {
  const [r, g, b] = [0, 1, 2].map((c) => fromFn(16, 16, (x, y) => paint(x, y)[c] - 0.5))
  return { inputs: { r, g, b }, expected: { out: correlate(zip(r, g, (p, q) => p - q), LAP) } }
}
const RED = [0.7, 0.3, 0.3]
const GREEN = [0.3, 0.7, 0.3]
const colourNoise = (seed) => {
  const next = random(seed)
  const values = Array.from({ length: 3 * 256 }, () => 0.1 + 0.8 * next())
  return colourScene((x, y) => [0, 1, 2].map((c) => values[c * 256 + y * 16 + x]))
}

const rgbInputs = { inputs: ['r', 'g', 'b'] }

// ---------------- 4-6 · 分辨 X 和 O ----------------
// Six glyphs on a 0.1 ground: X and O, moved around, at different ink strengths, some with noise
// (inside the frame only, so the border rows stay identical across tests). The ink strengths make
// the mean brightness interleave (see XO_CASES). With the frame identical, every shifted copy inside
// a 3×3 conv has the same mean up to a constant, so a network without any nonlinearity reduces to
// a·mean(image) + b and cannot separate them.

function glyphAt(name, ox, oy, hi, seed) {
  const clean = P.glyph(GLYPHS[name], 0.1, hi, ox, oy)
  if (!seed) return clean
  const noisy = addNoise(clean, seed, 0.08)
  return fromFn(16, 16, (x, y) => (x === 0 || y === 0 || x === 15 || y === 15 ? clean.data[y * 16 + x] : noisy.data[y * 16 + x]))
}
// [glyph, x offset, y offset, ink, noise seed]: sixteen glyphs at every offset 1–5, inks 0.7–0.95, two with
// noise. Six used to be too few: a trained network got only about half of new glyphs right; with these the
// reference network passes after 59 steps, holds from step 69, and by then gets nearly every new glyph right. Inks stay at 0.7 or more, because a one-kernel network
// cannot tell a fainter X from a strong O. Mean brightness interleaves (the brightest X, 0.2195, outshines the
// dimmest O, 0.2125), so no single brightness cut separates them and a network with no ReLU or max pooling fails.
const XO_CASES = [
  ['O', 1, 4, 0.89, 0], ['X', 4, 1, 0.76, 0], ['O', 2, 4, 0.85, 239], ['X', 1, 2, 0.86, 0],
  ['O', 1, 5, 0.78, 0], ['X', 3, 5, 0.86, 0], ['O', 4, 3, 0.7, 0], ['X', 3, 3, 0.9, 0],
  ['O', 2, 4, 0.86, 0], ['X', 4, 5, 0.91, 0], ['O', 5, 4, 0.89, 0], ['X', 2, 1, 0.81, 0],
  ['O', 1, 5, 0.8, 0], ['X', 2, 4, 0.95, 0], ['O', 3, 3, 0.78, 570], ['X', 3, 3, 0.93, 0],
]
// Held back, drawn the same way: glyphs the network has not seen. The reference network, and the variants with
// two poolings or pooling before ReLU, all get them right from the step their visible tests first pass.
const XO_HIDDEN = [
  ['新的 X', ['X', 3, 2, 0.85, 0]],
  ['新的 O', ['O', 4, 1, 0.78, 0]],
  ['新的 X 带噪点', ['X', 5, 4, 0.89, 160]],
]
// Numbered per letter, so sixteen labels stay distinct: X 1, O 1, X 2 …
const xoLabel = ([name, , , , seed], i) => `${name} ${Math.floor(i / 2) + 1}${seed ? ' 噪点' : ''}`

// Weights the game's trainer reaches from CONV_INIT on the reference network after 80 steps (it first passes
// after 59 and holds from 69). The linear weights are where 400 steps leave a network with no ReLU or pooling,
// still wrong on 4 of the 16.
const XO_SOLUTION = {
  w: [2.1414, 1.9876, -3.8059, -2.6066, -1.9976, 2.9058, -0.944, -1.5222, 0.9997],
  p: [6.6784, -4.1486],
}
const XO_LINEAR = {
  w: [1.4764, 1.5599, 1.4452, 1.5596, 1.7468, 1.5528, 1.4841, 1.5482, 1.4974],
  p: [-4.8973, 14.4896],
}
const xoNet = ({ relu = true, pool = 'max', w = CONV_INIT, p = [1, 0] } = {}) => {
  const nodes = { c: ['lrnConv', { w: [...w] }] }
  const wires = ['in>c']
  let last = 'c'
  if (relu) {
    nodes.r = 'relu'
    wires.push('c>r')
    last = 'r'
  }
  if (pool === 'max') {
    nodes.m = 'maxpool'
    wires.push(`${last}>m`)
    last = 'm'
  }
  if (pool === 'sample') {
    for (const id of ['s0', 's1', 's2', 's3']) {
      nodes[id] = 'downsample'
      wires.push(`${last}>${id}`)
      last = id
    }
  } else {
    nodes.g = 'lrnGap'
    wires.push(`${last}>g`)
    last = 'g'
  }
  nodes.d = ['lrnDense', { p }]
  nodes.s = 'lrnSigmoid'
  wires.push(`${last}>d`, 'd>s', 's>out')
  return build(nodes, wires)
}

// ---------------- 4-7 · 训不动的深网 ----------------
// Target: a light sharpen, H(x) = x + 0.25·(x − 3×3 mean), i.e. "almost the input". Six conv layers
// in a row, all starting from CONV_INIT (≈ ±0.02): the signal shrinks ~50× per layer, so every
// layer's gradient is a product of five tiny numbers and the loss stays flat. With x + F(x) around
// every layer the network starts as the identity and the trainer reaches the tolerance in ~30 steps.

const BOX3 = Array(9).fill(1 / 9)
const sharpen = (img) => zip(img, correlate(img, BOX3), (a, b) => a + 0.25 * (a - b))
const DEEP = 6
const deepNet = (residual, layers = DEEP, weights = () => CONV_INIT) => {
  const nodes = {}
  const wires = []
  let last = 'in'
  for (let i = 0; i < layers; i++) {
    nodes[`k${i}`] = ['lrnConv', { w: [...weights(i)] }]
    wires.push(`${last}>k${i}`)
    if (residual) {
      nodes[`a${i}`] = 'add'
      wires.push(`${last}>a${i}.a`, `k${i}>a${i}.b`)
      last = `a${i}`
    } else {
      last = `k${i}`
    }
  }
  wires.push(`${last}>out`)
  return build(nodes, wires)
}
// One residual branch carries the whole change, the others learn F ≈ 0.
const SHARPEN_RESIDUAL = BOX3.map((v, i) => 0.25 * ((i === 4 ? 1 : 0) - v))

// ---------------- levels ----------------

export const levels = [
  (() => {
    const cases = [
      ['7×7 方块', blocks([[4, 5, 7, 7]], [], 1)],
      ['5×5 和 3×3', blocks([[1, 1, 5, 5], [10, 9, 3, 3]], [], 2)],
      ['9×7 方块和长条', blocks([[1, 1, 9, 7], [2, 11, 12, 3]], [], 3)],
      ['缺一角的 7×7', blocks([[1, 1, 7, 7], [8, 8, 7, 7]], [[7, 7]], 4)],
    ]
    // Held back: a shape that is not a rectangle, a missing pixel in the middle of an edge rather than
    // at a corner, and a one-pixel dark seam, each of which a loose threshold lets through.
    const hiddenCases = [
      ['L 形', blocks([[1, 1, 7, 13], [1, 7, 14, 7]], [], 5)],
      ['边上缺一点的 9×9', blocks([[3, 3, 9, 9]], [[7, 3]], 6)],
      ['中间一道缝', blocks([[1, 4, 14, 8]], Array.from({ length: 8 }, (_, i) => [8, 4 + i]), 7)],
    ]
    return {
      id: '4-7',
      chapter: 4,
      title: '看得更大',
      brief: '只在“周围 7×7 全是亮的”格子输出 1，其余输出 0。手里只有 3×3 的元件。',
      hint: '一个 3×3 只看得到身边一圈。如果第二层看的是第一层的结果，它其实看到了多大？',
      after: '每层只看 3×3，可第二层看的是第一层的输出，等于看到了 5×5；第三层看到 7×7。这叫感受野：叠 L 层 3×3，感受野是 (2L+1)×(2L+1)。VGG 就靠堆小核看大范围，而且三层 3×3 只有 27 个权重，一个 7×7 核要 49 个。',
      requires: ['4-6'],
      unlocks: [],
      palette: ['box3', 'kernel3', 'threshold', 'relu', 'add', 'scale', 'offset'],
      check: { tolerance: 0.02 },
      tests: cases.map(([label, { scene, fits }]) => test(label, { in: scene }, { out: fits })),
      hidden: hiddenCases.map(([label, { scene, fits }]) => test(label, { in: scene }, { out: fits })),
      solution: erode([0.85, 0.95, 0.95]),
      naive: erode([0.85]),
      alsoFails: [
        erode([0.85, 0.95]),
        build({ a: 'box3', b: 'box3', c: 'box3', t: ['threshold', { t: 0.895 }] }, ['in>a', 'a>b', 'b>c', 'c>t', 't>out']),
      ],
    }
  })(),
  (() => {
    const cases = [
      ['红绿对半，一样亮', colourScene((x) => (x < 8 ? RED : GREEN))],
      ['只有明暗', colourScene((x, y) => (x >= 4 && x < 12 && y >= 4 && y < 12 ? [0.8, 0.8, 0.8] : [0.2, 0.2, 0.2]))],
      ['绿底红点，旁边一块蓝', colourScene((x, y) => {
        if ((x - 5.5) ** 2 + (y - 6.5) ** 2 <= 12) return RED
        if (x >= 11 && y >= 9 && y < 14) return [0.3, 0.7, 0.9]
        return GREEN
      })],
      ['彩色噪点 A', colourNoise(9)],
      ['彩色噪点 B', colourNoise(11)],
    ]
    // Held back: a slanted red↔green border under a brightness ramp, fresh colour noise, and a scene
    // where only blue and the overall brightness change.
    const hiddenCases = [
      ['红绿斜分，上暗下亮', colourScene((x, y) => (x + y < 15 ? RED : GREEN).map((v) => v + (y - 7.5) * 0.02))],
      ['彩色噪点 C', colourNoise(13)],
      ['灰色渐变上的蓝条', colourScene((x, y) => {
        const grey = 0.25 + 0.03 * x
        return [grey, grey, y >= 5 && y < 10 ? 0.9 : grey]
      })],
    ]
    const perChannel = (wr, wg, wb) =>
      build({ r3: ['learn3', { w: wr }], g3: ['learn3', { w: wg }], b3: ['learn3', { w: wb }], s1: 'add', s2: 'add' }, ['r>r3', 'g>g3', 'b>b3', 'r3>s1.a', 'g3>s1.b', 's1>s2.a', 'b3>s2.b', 's2>out'], rgbInputs)
    return {
      id: '4-8',
      chapter: 4,
      title: '多通道',
      inputs: ['r', 'g', 'b'],
      inputLabels: { r: '红 R', g: '绿 G', b: '蓝 B' },
      brief: '输入把红、绿、蓝分成三张图送来（都已减去 0.5）。只描出红与绿交界处的边，只是变亮变暗、或只有蓝色在变的地方输出 0。',
      hint: '加成灰度图试试：红和绿一样亮时，交界就消失了。给每个通道各接一个可学习核，加起来，再训练。',
      after: '一个卷积核要同时覆盖所有输入通道：这里是 3×3×3 = 27 个权重，三份乘积加成一张激活图。训练出的红通道核和绿通道核正好相反，蓝通道的是 0，于是同时变亮的部分互相抵消，只剩颜色对比。CNN 第一层学到的颜色对比滤波器就是这样来的。',
      requires: ['4-7'],
      unlocks: ['lrn-rgb'],
      palette: ['learn3', 'kernel3', 'add', 'sub', 'scale'],
      trainRate: 8,
      tests: cases.map(([label, { inputs, expected }]) => test(label, inputs, expected)),
      hidden: hiddenCases.map(([label, { inputs, expected }]) => test(label, inputs, expected)),
      solution: perChannel(LAP, NEG_LAP, ZERO9),
      naive: build({ s1: 'add', s2: 'add', k: ['scale', { k: 1 / 3 }], l: ['learn3', { w: LAP.map((v) => v * 3) }] }, ['r>s1.a', 'g>s1.b', 's1>s2.a', 'b>s2.b', 's2>k', 'k>l', 'l>out'], rgbInputs),
      alsoFails: [
        build({ l: ['learn3', { w: LAP }] }, ['r>l', 'l>out'], rgbInputs),
        perChannel(LAP, ZERO9, NEG_LAP),
      ],
    }
  })(),
  {
    id: '4-9',
    chapter: 4,
    title: '分辨 X 和 O',
    brief: '输出一个数：是 X 就大于 0.6，是 O 就小于 0.4。字母会挪位置、变深浅、带噪点。',
    hint: '卷积层找笔画，ReLU 只留下“找到了”的地方，池化和全局平均把“在哪里”扔掉，最后的全连接加 Sigmoid 就是 4-3 里那个神经元，把特征变成分数。搭好后按训练。',
    after: '这是一个最小的卷积网络：卷积找局部笔画，ReLU 把“有”和“没有”分开，池化和全局平均让答案不管字母在哪，全连接加 Sigmoid 把特征变成分数。要是一路全是线性运算（没有 ReLU，也没有最大池化），最后只剩“整张图有多亮”，而淡的 X 和浓的 O 一样亮。',
    requires: ['4-8'],
    unlocks: [],
    palette: ['lrnConv', 'relu', 'maxpool', 'downsample', 'lrnGap', 'lrnDense', 'lrnSigmoid'],
    // Smaller than it was: at 200 the steps zig-zag, so a passing network kept failing again for a while.
    trainRate: 80,
    check: { tolerance: 0.4 },
    tests: XO_CASES.map((c, i) => test(xoLabel(c, i), { in: glyphAt(c[0], c[1], c[2], c[3], c[4]) }, { out: image(1, 1, c[0] === 'X' ? 1 : 0) })),
    hidden: XO_HIDDEN.map(([label, c]) => test(label, { in: glyphAt(c[0], c[1], c[2], c[3], c[4]) }, { out: image(1, 1, c[0] === 'X' ? 1 : 0) })),
    solution: xoNet(XO_SOLUTION),
    naive: xoNet({ relu: false, pool: 'none', ...XO_LINEAR }),
    alsoFails: [xoNet({ pool: 'sample', ...XO_SOLUTION })],
  },
  {
    id: '4-11',
    chapter: 4,
    title: '训不动的深网',
    brief: '把至少 6 个卷积层串成一条路，训练它做一次轻微的锐化：输出 = 原图 + 0.25 ×（原图 − 3×3 平均）。',
    hint: '每层都从很小的随机数开始，图每过一层就缩小几十倍。能不能让每一层默认“原样通过”，只去学要改的那一点？',
    after: '直接堆叠时，每层的梯度都要乘上其余各层的权重，层一多就乘得几乎为 0（梯度消失），损失纹丝不动。把每层的输入加到它的输出上，y = F(x) + x，每块一开始就是“原样通过”，只需学残差 F(x) = H(x) − x，梯度也沿捷径直达每一层。这就是 ResNet 的残差连接。',
    requires: ['4-10'],
    unlocks: ['lrn-res'],
    palette: ['lrnConv', 'add'],
    trainRate: 1,
    check: { tolerance: 0.04 },
    constraint: (_, graph) => {
      const depth = depthOf(graph)
      return depth < DEEP ? `最深的一条路上只有 ${depth} 个卷积层，至少要 ${DEEP} 个` : ''
    },
    tests: [
      ['字母 X', P.glyph(GLYPHS.X)],
      ['圆盘', P.disk()],
      ['带噪方块', addNoise(P.square(3, 5, 7), 3, 0.2)],
      ['棋盘', P.checker(3)],
    ].map(([label, img]) => test(label, { in: img }, { out: sharpen(img) })),
    hidden: [
      ['字母 L', P.glyph(GLYPHS.L, 0.2, 0.8, 4, 3)],
      ['竖条纹', P.stripes(6, 0.2, 0.8)],
    ].map(([label, img]) => test(label, { in: img }, { out: sharpen(img) })),
    solution: deepNet(true, DEEP, (i) => (i === 0 ? SHARPEN_RESIDUAL : ZERO9)),
    naive: deepNet(false),
    alsoFails: [
      deepNet(true, 1, () => SHARPEN_RESIDUAL),
      deepNet(true),
    ],
  },
]

export const trainingNets = { xoNet, deepNet, CONV_INIT }
