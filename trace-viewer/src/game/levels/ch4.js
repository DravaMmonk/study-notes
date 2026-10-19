import { GLYPHS, addNoise, correlate, downsample, fromFn, image, map, maxPool, patterns as P, random, shift, zip } from '../engine/image.js'
import { order } from '../engine/graph.js'
import { NODE_TYPES } from '../engine/nodes.js'
import { build, test } from './util.js'

// Chapter 4 · 学会看 (lectures 6–8): let the machine set the numbers. Steps: one knob and two (gradient descent,
// the learning rate, the dense layer), a learnable kernel and a camera's shake learned from examples, one neuron and
// a hidden layer, ReLU and the larger-of-two built by hand, strides, receptive fields, max pooling built by hand and
// the smallest CNN, many channels, and residual connections. Challenge: a depthwise separable convolution. Series:
// a sorting machine for three kinds of part, from overfitting and softmax to the whole network.
// Training claims are checked with the game's own trainer (finite differences + backtracking).

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
  [{ zh: '新的 X', en: 'New X' }, ['X', 3, 2, 0.85, 0]],
  [{ zh: '新的 O', en: 'New O' }, ['O', 4, 1, 0.78, 0]],
  [{ zh: '新的 X 带噪点', en: 'New X with noise' }, ['X', 5, 4, 0.89, 160]],
]
// Numbered per letter, so sixteen labels stay distinct: X 1, O 1, X 2 …
const xoLabel = ([name, , , , seed], i) => ({ zh: `${name} ${Math.floor(i / 2) + 1}${seed ? ' 噪点' : ''}`, en: `${name} ${Math.floor(i / 2) + 1}${seed ? ' noisy' : ''}` })

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
    nodes.g = 'fqMean'
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
      nodes[`a${i}`] = ['arith', { op: 'add' }]
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


const HIDDEN = [0.1, -0.3, 0.2, 0.4, 0.15, -0.2, -0.1, 0.35, 0.05]
const noiseScene = (seed) => map(P.noise(seed, 1), (v) => v - 0.5)

const learnKernel = {
  id: '4-3',
  chapter: 4,
  title: { zh: '让机器调旋钮', en: 'Let the machine turn the knobs' },
  brief: { zh: '上一关你用一个、两个旋钮下过山。这次是一个未知的 3×3 核：九个旋钮，数字很乱，凭眼睛猜不出来。接上可学习核，按「训练」。', en: 'Last level you walked downhill with one knob, then two. This time it is an unknown 3×3 kernel: nine knobs with messy numbers you can\'t guess by eye. Wire up a learnable kernel and press "Train".' },
  hint: { zh: '每按一次，九个旋钮一起往下坡挪一步（和前两关一样，只是旋钮多了）。看损失曲线往下走。', en: 'Each press moves all nine knobs one step downhill together (just as in the last two levels, only with more knobs). Watch the loss curve go down.' },
  after: { zh: '你没有设计这个核，它是从例子里学出来的。手工设计的特征，就这样被学到的特征取代了。', en: 'You didn\'t design this kernel; it was learned from examples. This is how learned features replace hand-designed ones.' },
  unlocks: ['learn3'],
  palette: ['learn3'],
  check: { tolerance: 0.02 },
  tests: [1, 2, 3, 4].map((seed) => test({ zh: `样本 ${seed}`, en: `Sample ${seed}` }, { in: noiseScene(seed) }, { out: correlate(noiseScene(seed), HIDDEN) })),
  hidden: [7, 8].map((seed) => test({ zh: `新样本 ${seed}`, en: `New sample ${seed}` },{ in: noiseScene(seed) }, { out: correlate(noiseScene(seed), HIDDEN) })),
  solution: build({ k: ['learn3', { w: HIDDEN }] }, ['in>k', 'k>out']),
  naive: build({ k: 'learn3' }, ['in>k', 'k>out']),
}

// ---------------- 4-1 一个旋钮, 4-2 两个旋钮 ----------------

// Eight samples of a brightness rule; each test is one sample: a number in, a number out.
const num = (v) => image(1, 1, v)
const XS = Array.from({ length: 8 }, (_, i) => 0.2 + 0.1 * i)
const samples = (rule) => XS.map((x) => test({ zh: `x = ${x.toFixed(1)}`, en: `x = ${x.toFixed(1)}` }, { in: num(x) }, { out: num(rule(x)) }))
const SAMPLE_INPUT = { inputLabels: { in: { zh: '输入亮度', en: 'Input brightness' } } }

const oneKnob = {
  id: '4-1',
  chapter: 4,
  ...SAMPLE_INPUT,
  title: { zh: '一个旋钮', en: 'One knob' },
  brief: { zh: '每组测试是一个样本：输入一个亮度，期望一个亮度，规律是 输出 = w × 输入，w 不知道。用「可学习常数」当 w，按训练让机器自己找它。选一个学习率。', en: 'Each test is one sample: a brightness in, a brightness expected out, following output = w × input with w unknown. Use a "Learnable constant" as w and press Train to let the machine find it. Choose a learning rate.' },
  hint: { zh: '学习率是每一步迈多大。太小要走很多步；太大会怎样？看误差曲线。', en: 'The learning rate is how big each step is. Too small takes many steps; what happens if it is too big? Watch the error curve.' },
  after: { zh: '训练就是下山：把误差（差的平方的平均）看成地形，w 是你站的位置。每一步沿坡往下挪「学习率 × 坡度」。学习率太小，要走很多步；太大，会冲过谷底，越冲越远。一个网络有上百万个旋钮，原理完全一样。', en: 'Training is walking downhill: think of the error (the mean of the squared differences) as a landscape, with w as where you stand. Each step moves down the slope by "learning rate × slope". Too small a learning rate takes many steps; too large overshoots the bottom and flies further away each time. A network has millions of knobs, and the principle is exactly the same.' },
  unlocks: [],
  palette: ['arith', 'merge', 'lrnConst'],
  trainRates: [0.3, 1, 3],
  check: { tolerance: 0.01 },
  tests: samples((x) => 0.6 * x),
  hidden: [0.15, 1.1].map((x) => test({ zh: `新样本 x = ${x}`, en: `New sample x = ${x}` }, { in: num(x) }, { out: num(0.6 * x) })),
  solution: build({ s: ['arith', { op: 'mul' }], w: ['lrnConst', { p: [0.6] }] }, ['in>s.a', 'w>s.b', 's>out']),
  naive: build({ s: ['arith', { op: 'mul' }], w: 'lrnConst' }, ['in>s.a', 'w>s.b', 's>out']),
}

const twoKnobs = {
  id: '4-2',
  chapter: 4,
  ...SAMPLE_INPUT,
  title: { zh: '两个旋钮', en: 'Two knobs' },
  brief: { zh: '规律变成 输出 = w × 输入 + b。两个旋钮都要机器自己找。', en: 'The rule becomes output = w × input + b. The machine has to find both knobs itself.' },
  hint: { zh: '两个旋钮一起下山。山谷又窄又长时，学习率大了会在两侧来回冲，小了又走得很慢。', en: 'Both knobs walk downhill together. When the valley is long and narrow, a large learning rate bounces from side to side, and a small one crawls.' },
  after: { zh: '两个旋钮时，误差是一片地形，梯度是一个箭头，指向上坡最陡的方向。这片山谷又窄又长，梯度总指着谷壁，路线就走成了之字形。w × 输入 + b 有一个名字：全连接层（这里只有一个输入）。你搭的这个现在是「全连接」元件。', en: 'With two knobs the error is a landscape, and the gradient is an arrow pointing up the steepest slope. This valley is long and narrow, so the gradient keeps pointing at the valley walls and the path zig-zags. w × input + b has a name: a dense layer (here with a single input). What you built is now the "Dense" part.' },
  unlocks: ['dense'],
  palette: ['arith', 'merge', 'lrnConst'],
  trainRates: [0.1, 0.3, 0.7, 1.5],
  check: { tolerance: 0.01 },
  tests: samples((x) => 0.5 * x + 0.2),
  hidden: [0.1, 1.2].map((x) => test({ zh: `新样本 x = ${x}`, en: `New sample x = ${x}` }, { in: num(x) }, { out: num(0.5 * x + 0.2) })),
  solution: build({ s: ['arith', { op: 'mul' }], w: ['lrnConst', { p: [0.5] }], o: ['arith', { op: 'add' }], b: ['lrnConst', { p: [0.2] }] }, ['in>s.a', 'w>s.b', 's>o.a', 'b>o.b', 'o>out']),
  naive: build({ s: ['arith', { op: 'mul' }], w: ['lrnConst', { p: [0.8] }] }, ['in>s.a', 'w>s.b', 's>out']),
}

// ---------------- 4-4 相机抖了 ----------------

// A camera that shakes diagonally: each pixel smears into the one up-left and down-right. Learn the smear from pairs of
// sharp and shaken photos; the new photos at the end are kept back from training and only checked.
const SHAKE = [0.3, 0, 0, 0, 0.4, 0, 0, 0, 0.3]
const shaken = (img) => correlate(img, SHAKE)
const shakeTest = (label, img, train = true) => ({ ...test(label, { in: img }, { out: shaken(img) }), train })

const shake = {
  id: '4-4',
  chapter: 4,
  title: { zh: '相机抖了', en: 'A shaky camera' },
  brief: { zh: '一台相机拍照时总会抖一下。给你几对照片：清楚的原图和这台相机拍出的样子。训练一个可学习核学会这种抖，最后几张「新照片」不参加训练，只用来检查学到的核对新照片也对。', en: 'A camera always shakes a little as it takes a photo. Here are a few pairs: the sharp original and how this camera captures it. Train a learnable kernel to learn the shake. The last few "new photos" take no part in training and are only used to check that the learned kernel works on new photos too.' },
  hint: { zh: '和上一关一样，只是这次的图是真实的照片。看训练面板里的两条误差线。', en: 'The same as the last level, only this time the pictures are real photos. Watch the two error lines in the training panel.' },
  after: { zh: '从几对例子里学到的核，换成没见过的照片照样对：这才是学会了，而不是背下了。训练面板里，训练误差是在用来学的样本上算的，新样本误差是在没给它看过的样本上算的。后面判断一个模型好不好，看的都是后者。', en: 'A kernel learned from a few example pairs works just as well on photos it has never seen: that is learning, not memorising. In the training panel, the training error is measured on the samples it learns from, and the new-sample error on samples it was never shown. From now on, a model is judged by the second.' },
  unlocks: [],
  palette: ['learn3', 'kernel3', 'arith', 'merge', 'const'],
  trainRate: 8,
  tests: [
    shakeTest({ zh: '字母 F', en: 'Letter F' }, P.glyph(GLYPHS.F)),
    shakeTest({ zh: '圆盘', en: 'Disc' }, P.disk()),
    shakeTest({ zh: '随机纹理', en: 'Random texture' }, P.noise(41)),
    shakeTest({ zh: '新照片：字母 T', en: 'New photo: letter T' }, P.glyph(GLYPHS.T, 0.1, 0.9, 5, 4), false),
    shakeTest({ zh: '新照片：棋盘', en: 'New photo: checkerboard' }, P.checker(3), false),
  ],
  hidden: [shakeTest({ zh: '方块', en: 'Square' }, P.square(3, 6, 7), false), shakeTest({ zh: '另一片纹理', en: 'Another texture' }, P.noise(42), false)],
  solution: build({ k: ['learn3', { w: SHAKE }] }, ['in>k', 'k>out']),
  naive: build({ k: 'learn3' }, ['in>k', 'k>out']),
}

// ---------------- 4-5 一个神经元, 4-6 异或 ----------------

// Each letter picture reduced to two numbers: how much diagonal stroke, how much curved stroke.
const LETTERS = {
  xo: [['X', 0.8, 0.2], ['X', 0.7, 0.35], ['X', 0.9, 0.4], ['X', 0.6, 0.15], ['X', 0.75, 0.05], ['O', 0.2, 0.8], ['O', 0.3, 0.65], ['O', 0.15, 0.5], ['O', 0.4, 0.9], ['O', 0.35, 0.7]],
  // X here means "one kind of stroke, not both": the two features disagree. O: they agree.
  xor: [['X', 0.85, 0.15], ['X', 0.15, 0.85], ['X', 0.8, 0.25], ['X', 0.25, 0.8], ['X', 0.9, 0.3], ['X', 0.3, 0.9], ['O', 0.15, 0.15], ['O', 0.85, 0.85], ['O', 0.2, 0.3], ['O', 0.8, 0.75], ['O', 0.5, 0.45], ['O', 0.55, 0.6]],
}
const letterTest = ([c, f1, f2]) => test({ zh: `${c} (${f1}, ${f2})`, en: `${c} (${f1}, ${f2})` }, { f1: num(f1), f2: num(f2) }, { out: num(c === 'X' ? 1 : 0) })
const FEATURES = { inputs: ['f1', 'f2'], inputLabels: { f1: { zh: '斜笔画', en: 'Diagonal strokes' }, f2: { zh: '弯笔画', en: 'Curved strokes' } } }
const fg = (nodes, wires) => build(nodes, wires, { inputs: ['f1', 'f2'] })
// A neuron on two inputs: w1·a + w2·b + bias, then a squash. `squash` is a sigmoid made of parts, or the Sigmoid part.
const neuron = (p, a, b, [w1, w2, bias], squash = 'parts') => {
  const nodes = { [`${p}1`]: ['arith', { op: 'mul' }], [`${p}w1`]: ['lrnConst', { p: [w1] }], [`${p}2`]: ['arith', { op: 'mul' }], [`${p}w2`]: ['lrnConst', { p: [w2] }], [`${p}s`]: ['arith', { op: 'add' }], [`${p}b`]: ['arith', { op: 'add' }], [`${p}c`]: ['lrnConst', { p: [bias] }] }
  const wires = [`${a}>${p}1.a`, `${p}w1>${p}1.b`, `${b}>${p}2.a`, `${p}w2>${p}2.b`, `${p}1>${p}s.a`, `${p}2>${p}s.b`, `${p}s>${p}b.a`, `${p}c>${p}b.b`]
  if (squash === 'part') return { nodes: { ...nodes, [`${p}q`]: 'lrnSigmoid' }, wires: [...wires, `${p}b>${p}q`], out: `${p}q` }
  // 1 / (1 + e^(−z)).
  Object.assign(nodes, { [`${p}n`]: ['arith', { op: 'mul' }], [`${p}m`]: ['const', { c: -1 }], [`${p}e`]: 'exp', [`${p}d`]: ['arith', { op: 'add' }], [`${p}u`]: ['const', { c: 1 }], [`${p}q`]: ['arith', { op: 'div' }] })
  wires.push(`${p}b>${p}n.a`, `${p}m>${p}n.b`, `${p}n>${p}e`, `${p}e>${p}d.a`, `${p}u>${p}d.b`, `${p}u>${p}q.a`, `${p}d>${p}q.b`)
  return { nodes, wires, out: `${p}q` }
}
const net = (...units) => fg(Object.assign({}, ...units.map((u) => u.nodes)), [...units.flatMap((u) => u.wires), `${units.at(-1).out}>out`])

// Weights the game's trainer reaches from the default start (every learnable constant at 1) at rate 4; it passes,
// held-back letters included, after 15 steps.
const XO_NEURON_W = [2.5611, -1.3987, -0.3669]
const XO_NEURON = neuron('n', 'f1', 'f2', XO_NEURON_W)
const singleNeuron = {
  id: '4-5',
  chapter: 4,
  ...FEATURES,
  title: { zh: '一个神经元', en: 'One neuron' },
  brief: { zh: '每组测试是一张字母图，已经缩成两个数：斜笔画多少、弯笔画多少。搭一个神经元：两个数各乘一个可学习的权重，加起来再加一个可学习的偏置 z，最后用 1 / (1 + e^(−z)) 把它压到 0 和 1 之间。训练它：X 输出大于 0.6，O 小于 0.4。', en: 'Each test is a letter picture already reduced to two numbers: how much diagonal stroke and how much curved stroke. Build a neuron: multiply each number by a learnable weight, add them up and add a learnable bias z, then squash it between 0 and 1 with 1 / (1 + e^(−z)). Train it: above 0.6 for X, below 0.4 for O.' },
  hint: { zh: '新元件 exp 算 e 的几次方。', en: 'The new part exp raises e to a power.' },
  after: { zh: '加权和再压一下，就是一个神经元。w1·斜 + w2·弯 + b = 0 是平面上的一条直线，神经元在它的一侧说「是」，另一侧说「不是」：一个神经元就是一条分界线。你搭的 1 / (1 + e^(−z)) 叫 Sigmoid，现在是现成的元件了。', en: 'A weighted sum and then a squash: that is a neuron. w1·diagonal + w2·curved + b = 0 is a straight line in the plane, and the neuron says "yes" on one side and "no" on the other: one neuron is one dividing line. The 1 / (1 + e^(−z)) you built is called the sigmoid, and it is now a ready-made part.' },
  unlocks: ['sigmoid'],
  palette: ['lrnConst', 'exp', 'arith', 'merge', 'const'],
  trainRate: 4,
  check: { tolerance: 0.4 },
  tests: LETTERS.xo.slice(0, 8).map(letterTest),
  hidden: LETTERS.xo.slice(8).map(letterTest),
  solution: net(XO_NEURON),
  naive: net(neuron('n', 'f1', 'f2', [1, 1, 0])),
}

// Weights the trainer reaches at rate 10 from hidden units started apart, (1, −1, 0) and (−1, 1, 0), with the output at
// (1, 1, −1); it passes after 63 steps. Started identical, the two hidden units stay identical and it never passes.
const XOR_W = { h: [4.0805, -4.3363, -1.8815], k: [-3.8893, 4.0587, -2.0048], o: [4.496, 4.3862, -1.9479] }
const xorNet = (w) => {
  const h = neuron('h', 'f1', 'f2', w.h, 'part')
  const k = neuron('k', 'f1', 'f2', w.k, 'part')
  return net(h, k, neuron('o', h.out, k.out, w.o, 'part'))
}
const xor = {
  id: '4-6',
  chapter: 4,
  ...FEATURES,
  title: { zh: '异或', en: 'Exclusive or' },
  brief: { zh: '换了一批字母：X 是「只有一种笔画」（斜多弯少，或弯多斜少），O 是「两种都多，或者都少」。X 输出大于 0.6，O 小于 0.4。', en: 'A new batch of letters: X means "only one kind of stroke" (more diagonal than curved, or the other way round), O means "both kinds a lot, or both a little". Above 0.6 for X, below 0.4 for O.' },
  hint: { zh: '先试一个神经元，在纸上画画这些点：一条直线分得开吗？神经元的输出，也可以交给另一个神经元。几个神经元一开始的权重一模一样的话，训练能让它们变得不一样吗？', en: 'Try one neuron first, and sketch the points on paper: can a straight line separate them? A neuron\'s output can be fed to another neuron. If several neurons start with exactly the same weights, can training ever make them differ?' },
  after: { zh: '一条直线怎么摆都分不开异或。两个神经元先各画一条线，把每个点变成两个新的数，输出神经元在新的坐标里一条线就够了：这就是隐藏层。还有一件事：几个神经元一开始完全一样，训练时每一步的变化也一样，永远学不出不同的东西，所以网络的权重要从不同的随机数开始。', en: 'However you place one straight line, it cannot separate exclusive-or. Let two neurons each draw a line first, turning every point into two new numbers, and in these new coordinates the output neuron needs just one line: that is a hidden layer. One more thing: if several neurons start out identical, every training step changes them identically and they can never learn different things. That is why a network\'s weights start from different random numbers.' },
  unlocks: [],
  palette: ['lrnConst', 'lrnSigmoid', 'arith', 'merge', 'const'],
  trainRate: 10,
  check: { tolerance: 0.4 },
  tests: LETTERS.xor.slice(0, 10).map(letterTest),
  hidden: LETTERS.xor.slice(10).map(letterTest),
  solution: xorNet(XOR_W),
  naive: net(neuron('o', 'f1', 'f2', XO_NEURON_W, 'part')),
}

// ---------------- 4-7 两种边都要, 4-8 取较大 ----------------

const absdiff = (img) => map(zip(shift(img, -1, 0), img, (a, b) => a - b), Math.abs)
// max(0, x) out of parts: x times "is x above 0".
const reluOf = (p, from) => ({ nodes: { [`${p}t`]: ['threshold', { t: 0 }], [`${p}m`]: ['arith', { op: 'mul' }] }, wires: [`${from}>${p}t`, `${from}>${p}m.a`, `${p}t>${p}m.b`], out: `${p}m` })

const bothEdges = (() => {
  const p = reluOf('p', 'd')
  const q = reluOf('q', 'n')
  return {
    id: '4-7',
    chapter: 4,
    title: { zh: '两种边都要', en: 'Both kinds of edge' },
    brief: { zh: '暗→亮的边和亮→暗的边都要输出正的强度（输出 = |右边 − 自己|）。', en: 'Both dark→light and light→dark edges must give a positive strength (output = |right − self|).' },
    hint: { zh: '只用加、减和乘常数，无论怎么组合，暗→亮和亮→暗都会得到相反的符号。有没有办法只留下正的部分？', en: 'With only adding, subtracting and multiplying by constants, however you combine them, dark→light and light→dark get opposite signs. Is there a way to keep only the positive part?' },
    after: { zh: '任何只含加、减和乘常数的组合都是线性的，正负号必然对称。你用阈值和相乘拼出的「负数变 0、正数不变」叫 ReLU，现在是现成的元件了。中间插一个非线性，网络才能表达「两种都要」。这就是神经网络需要激活函数的原因。', en: 'Any combination of adding, subtracting and multiplying by constants is linear, so the signs are bound to be symmetric. The "negatives become 0, positives stay" that you made from a threshold and a multiply is called ReLU, and it is now a ready-made part. Only with a nonlinearity in between can a network express "I want both". This is why neural networks need activation functions.' },
    unlocks: ['relu'],
    palette: ['diffx', 'arith', 'merge', 'threshold', 'const'],
    tests: [[{ zh: '方块', en: 'Square' }, P.square()], [{ zh: '亮底暗块', en: 'Dark square on light' }, P.square(4, 4, 8, 0.9, 0.1)], [{ zh: '字母 O', en: 'Letter O' }, P.glyph(GLYPHS.O)], [{ zh: '棋盘', en: 'Checkerboard' }, P.checker()]].map(([label, img]) => test(label, { in: img }, { out: absdiff(img) })),
    hidden: [
      [{ zh: '往右变暗的坡', en: 'Ramp darkening to the right' }, fromFn(16, 16, (x) => 0.85 - 0.04 * x)],
      [{ zh: '挪开的低对比圆盘', en: 'Shifted low-contrast disc' }, P.disk(10, 6, 3.5, 0.35, 0.6)],
      [{ zh: '字母 X', en: 'Letter X' }, P.glyph(GLYPHS.X, 0.8, 0.2, 4, 4)],
    ].map(([label, img]) => test(label, { in: img }, { out: absdiff(img) })),
    solution: build({ d: 'diffx', n: ['arith', { op: 'mul' }], nN: ['const', { c: -1 }], ...p.nodes, ...q.nodes, a: ['arith', { op: 'add' }] }, ['in>d', 'd>n.a', ...p.wires, ...q.wires, `${p.out}>a.a`, `${q.out}>a.b`, 'a>out', 'nN>n.b']),
    naive: build({ d: 'diffx' }, ['in>d', 'd>out']),
  }
})()

const pairs = (cases) => cases.map(([label, a, b]) => test(label, { a, b }, { out: zip(a, b, Math.max) }))
const larger = {
  id: '4-8',
  chapter: 4,
  title: { zh: '取较大', en: 'The larger one' },
  inputs: ['a', 'b'],
  inputLabels: { a: 'a', b: 'b' },
  brief: { zh: '两张图逐格比较，每格输出较大的那个：max(a, b)。', en: 'Compare two pictures cell by cell and output the larger value in each: max(a, b).' },
  hint: { zh: 'ReLU 留下正的部分。a 比 b 大多少？', en: 'ReLU keeps the positive part. How much bigger is a than b?' },
  after: { zh: 'max(a, b) = b + ReLU(a − b)：a 大就补上多出的那一截，b 大就什么也不补。这个「取较大」现在是现成的元件了。', en: 'max(a, b) = b + ReLU(a − b): if a is bigger, add the amount it is bigger by; if b is bigger, add nothing. This "larger one" is now a ready-made part.' },
  unlocks: ['max'],
  palette: ['relu', 'arith', 'merge', 'const', 'threshold'],
  tests: pairs([
    [{ zh: '方块和圆盘', en: 'Square and disc' }, P.square(), P.disk(9, 9, 5)],
    [{ zh: '横条和竖条', en: 'Bars across and down' }, P.stepY(8), P.stepX(8)],
    [{ zh: '两片纹理', en: 'Two textures' }, P.noise(51), P.noise(52)],
  ]),
  hidden: pairs([[{ zh: '字母和棋盘', en: 'Letter and checkerboard' }, P.glyph(GLYPHS.T), P.checker(4, 0.2, 0.6)], [{ zh: '斜坡和纹理', en: 'Ramp and texture' }, P.rampX(), P.noise(53)]]),
  solution: build({ d: ['arith', { op: 'sub' }], r: 'relu', s: ['arith', { op: 'add' }] }, ['a>d.a', 'b>d.b', 'd>r', 'r>s.a', 'b>s.b', 's>out'], { inputs: ['a', 'b'] }),
  naive: build({ s: ['arith', { op: 'add' }], h: ['arith', { op: 'mul' }], hN: ['const', { c: 0.5 }] }, ['a>s.a', 'b>s.b', 's>h.a', 'h>out', 'hN>h.b'], { inputs: ['a', 'b'] }),
}

// ---------------- 4-9 跳着走 ----------------

// A layer that moves its 3×3 window two pixels at a time. Pictures of two sizes, one circuit.
const STRIDE_K = [0, 0.25, 0, 0.25, -1, 0.25, 0, 0.25, 0]
const strided = (img) => downsample(correlate(img, STRIDE_K), 2)
const scaled = (img, w) => fromFn(w, w, (x, y) => img.data[Math.floor((y * 16) / w) * 16 + Math.floor((x * 16) / w)])

const stride = {
  id: '4-9',
  chapter: 4,
  title: { zh: '跳着走', en: 'Taking strides' },
  brief: { zh: '一层卷积的窗口每次挪两格，输出边长只有输入的一半。窗口里的 3×3 权重不知道，要训练出来。测试图有 16×16 的，也有 12×12 的：同一个电路都要对。', en: 'A convolution layer whose window moves two pixels at a time, so the output is half the input\'s width. The 3×3 weights in the window are unknown and have to be trained. Some test pictures are 16×16 and some 12×12: the same circuit must be right for both.' },
  hint: { zh: '窗口每次挪两格，等于先在每个位置都算一遍，再隔一个留一个。', en: 'Moving the window two pixels at a time is the same as computing at every position and then keeping every other one.' },
  after: { zh: '步幅为 2，输出就隔一个取一个。一般地，输出边长 = ⌊(N + 2p − k) / s⌋ + 1：N 是输入边长，k 是窗口大小，p 是补边宽度，s 是步幅。这一层只有 9 个要学的数，图变大变小都一样，因为同一组权重在每个位置都用：这叫权重共享。看评分里的「参数」。', en: 'With a stride of 2, the output keeps every other position. In general, output width = ⌊(N + 2p − k) / s⌋ + 1, with N the input width, k the window size, p the padding and s the stride. This layer has only 9 numbers to learn, however big or small the picture, because the same weights are used at every position: this is called weight sharing. See "Parameters" in the score.' },
  unlocks: [],
  palette: ['learn3', 'kernel3', 'downsample', 'arith', 'merge', 'const'],
  trainRate: 8,
  tests: [
    [{ zh: '字母 F', en: 'Letter F' }, P.glyph(GLYPHS.F)],
    [{ zh: '圆盘', en: 'Disc' }, P.disk()],
    [{ zh: '随机纹理', en: 'Random texture' }, P.noise(61)],
    [{ zh: '12×12 的纹理', en: 'Texture at 12×12' }, scaled(P.noise(62), 12)],
  ].map(([label, img]) => test(label, { in: img }, { out: strided(img) })),
  hidden: [[{ zh: '12×12 的字母 T', en: 'Letter T at 12×12' }, scaled(P.glyph(GLYPHS.T), 12)], [{ zh: '棋盘', en: 'Checkerboard' }, P.checker(3)]].map(([label, img]) => test(label, { in: img }, { out: strided(img) })),
  solution: build({ k: ['learn3', { w: STRIDE_K }], d: 'downsample' }, ['in>k', 'k>d', 'd>out']),
  naive: build({ d: 'downsample', k: ['learn3', { w: STRIDE_K }] }, ['in>d', 'd>k', 'k>out']),
}

const seeFurther = (() => {
    const cases = [
      [{ zh: '7×7 方块', en: '7×7 block' }, blocks([[4, 5, 7, 7]], [], 1)],
      [{ zh: '5×5 和 3×3', en: '5×5 and 3×3' }, blocks([[1, 1, 5, 5], [10, 9, 3, 3]], [], 2)],
      [{ zh: '9×7 方块和长条', en: '9×7 block and a long bar' }, blocks([[1, 1, 9, 7], [2, 11, 12, 3]], [], 3)],
      [{ zh: '缺一角的 7×7', en: '7×7 missing a corner' }, blocks([[1, 1, 7, 7], [8, 8, 7, 7]], [[7, 7]], 4)],
    ]
    // Held back: a shape that is not a rectangle, a missing pixel in the middle of an edge rather than
    // at a corner, and a one-pixel dark seam, each of which a loose threshold lets through.
    const hiddenCases = [
      [{ zh: 'L 形', en: 'L shape' }, blocks([[1, 1, 7, 13], [1, 7, 14, 7]], [], 5)],
      [{ zh: '边上缺一点的 9×9', en: '9×9 missing a pixel on one edge' }, blocks([[3, 3, 9, 9]], [[7, 3]], 6)],
      [{ zh: '中间一道缝', en: 'Seam down the middle' }, blocks([[1, 4, 14, 8]], Array.from({ length: 8 }, (_, i) => [8, 4 + i]), 7)],
    ]
    return {
      id: '4-10',
      chapter: 4,
      title: { zh: '看得更大', en: 'Seeing further' },
      brief: { zh: '只在“周围 7×7 全是亮的”格子输出 1，其余输出 0。手里只有 3×3 的元件。', en: 'Output 1 only at pixels where "the whole 7×7 around it is bright", and 0 everywhere else. You only have 3×3 parts.' },
      hint: { zh: '一个 3×3 只看得到身边一圈。如果第二层看的是第一层的结果，它其实看到了多大？', en: 'A 3×3 sees only the ring of pixels right around it. If a second layer looks at the first layer\'s result, how much does it really see?' },
      after: { zh: '每层只看 3×3，可第二层看的是第一层的输出，等于看到了 5×5；第三层看到 7×7。这叫感受野：叠 L 层 3×3，感受野是 (2L+1)×(2L+1)。VGG 就靠堆小核看大范围，而且三层 3×3 只有 27 个权重，一个 7×7 核要 49 个。', en: 'Each layer looks at only 3×3, but the second layer looks at the first layer\'s output, so in effect it sees 5×5; the third sees 7×7. This is the receptive field: stack L layers of 3×3 and the receptive field is (2L+1)×(2L+1). VGG sees large areas by stacking small kernels, and three 3×3 layers have only 27 weights, while a single 7×7 kernel needs 49.' },
      unlocks: [],
      palette: ['box3', 'kernel3', 'threshold', 'relu', 'arith', 'merge', 'const'],
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
  })()

const channels = (() => {
    const cases = [
      [{ zh: '红绿对半，一样亮', en: 'Half red, half green, equally bright' }, colourScene((x) => (x < 8 ? RED : GREEN))],
      [{ zh: '只有明暗', en: 'Only light and dark' }, colourScene((x, y) => (x >= 4 && x < 12 && y >= 4 && y < 12 ? [0.8, 0.8, 0.8] : [0.2, 0.2, 0.2]))],
      [{ zh: '绿底红点，旁边一块蓝', en: 'Red spot on green, with a blue patch beside it' }, colourScene((x, y) => {
        if ((x - 5.5) ** 2 + (y - 6.5) ** 2 <= 12) return RED
        if (x >= 11 && y >= 9 && y < 14) return [0.3, 0.7, 0.9]
        return GREEN
      })],
      [{ zh: '彩色噪点 A', en: 'Colour noise A' }, colourNoise(9)],
      [{ zh: '彩色噪点 B', en: 'Colour noise B' }, colourNoise(11)],
    ]
    // Held back: a slanted red↔green border under a brightness ramp, fresh colour noise, and a scene
    // where only blue and the overall brightness change.
    const hiddenCases = [
      [{ zh: '红绿斜分，上暗下亮', en: 'Red and green split diagonally, darker at the top' }, colourScene((x, y) => (x + y < 15 ? RED : GREEN).map((v) => v + (y - 7.5) * 0.02))],
      [{ zh: '彩色噪点 C', en: 'Colour noise C' }, colourNoise(13)],
      [{ zh: '灰色渐变上的蓝条', en: 'Blue bar on a grey gradient' }, colourScene((x, y) => {
        const grey = 0.25 + 0.03 * x
        return [grey, grey, y >= 5 && y < 10 ? 0.9 : grey]
      })],
    ]
    const perChannel = (wr, wg, wb) =>
      build({ r3: ['learn3', { w: wr }], g3: ['learn3', { w: wg }], b3: ['learn3', { w: wb }], s1: ['arith', { op: 'add' }], s2: ['arith', { op: 'add' }] }, ['r>r3', 'g>g3', 'b>b3', 'r3>s1.a', 'g3>s1.b', 's1>s2.a', 'b3>s2.b', 's2>out'], rgbInputs)
    return {
      id: '4-13',
      chapter: 4,
      title: { zh: '多通道', en: 'Multiple channels' },
      inputs: ['r', 'g', 'b'],
      inputLabels: { r: { zh: '红 R', en: 'Red R' }, g: { zh: '绿 G', en: 'Green G' }, b: { zh: '蓝 B', en: 'Blue B' } },
      brief: { zh: '输入把红、绿、蓝分成三张图送来（都已减去 0.5）。只描出红与绿交界处的边，只是变亮变暗、或只有蓝色在变的地方输出 0。', en: 'The input arrives as three images, red, green and blue (each with 0.5 already subtracted). Trace only the edges where red meets green; output 0 where things only get brighter or darker, or where only blue changes.' },
      hint: { zh: '加成灰度图试试：红和绿一样亮时，交界就消失了。那三个通道该怎样处理，才不会丢掉这条边？', en: 'Try adding them into a greyscale image: when red and green are equally bright, the border disappears. So how should the three channels be handled so this edge is not lost?' },
      after: { zh: '一个卷积核要同时覆盖所有输入通道：这里是 3×3×3 = 27 个权重，三份乘积加成一张激活图。训练出的红通道核和绿通道核正好相反，蓝通道的是 0，于是同时变亮的部分互相抵消，只剩颜色对比。CNN 第一层学到的颜色对比滤波器就是这样来的。', en: 'A convolution kernel has to cover all the input channels at once: here that is 3×3×3 = 27 weights, and the three sets of products add up to one activation map. The trained red-channel and green-channel kernels come out exactly opposite and the blue one is 0, so whatever brightens in every channel cancels out and only the colour contrast is left. This is where the colour-contrast filters in a CNN\'s first layer come from.' },
      unlocks: ['lrn-rgb'],
      palette: ['learn3', 'kernel3', 'arith', 'merge', 'const'],
      trainRate: 8,
      tests: cases.map(([label, { inputs, expected }]) => test(label, inputs, expected)),
      hidden: hiddenCases.map(([label, { inputs, expected }]) => test(label, inputs, expected)),
      solution: perChannel(LAP, NEG_LAP, ZERO9),
      naive: build({ s1: ['arith', { op: 'add' }], s2: ['arith', { op: 'add' }], k: ['arith', { op: 'mul' }], kN: ['const', { c: 1 / 3 }], l: ['learn3', { w: LAP.map((v) => v * 3) }] }, ['r>s1.a', 'g>s1.b', 's1>s2.a', 'b>s2.b', 's2>k.a', 'k>l', 'l>out', 'kN>k.b'], rgbInputs),
      alsoFails: [
        build({ l: ['learn3', { w: LAP }] }, ['r>l', 'l>out'], rgbInputs),
        perChannel(LAP, ZERO9, NEG_LAP),
      ],
    }
  })()

const xoLevel = {
    id: '4-12',
    chapter: 4,
    title: { zh: '分辨 X 和 O', en: 'Tell X from O' },
    brief: { zh: '输出一个数：是 X 就大于 0.6，是 O 就小于 0.4。字母会挪位置、变深浅、带噪点。', en: 'Output one number: above 0.6 for an X, below 0.4 for an O. The letters move around, vary in strength and carry noise.' },
    hint: { zh: '最后的全连接加 Sigmoid 就是「一个神经元」里那个神经元，把特征变成分数。字母会挪位置、会变深浅，前面要怎样把图变成这样的特征？搭好后按训练。', en: 'The final dense layer plus sigmoid is the neuron from "One neuron", turning features into a score. The letters move around and vary in strength: how should the parts before it turn the image into such features? Once it is built, press Train.' },
    after: { zh: '这是一个最小的卷积网络：卷积找局部笔画，ReLU 把“有”和“没有”分开，池化和全局平均让答案不管字母在哪，全连接加 Sigmoid 把特征变成分数。要是一路全是线性运算（没有 ReLU，也没有最大池化），最后只剩“整张图有多亮”，而淡的 X 和浓的 O 一样亮。', en: 'This is the smallest convolutional network: the convolution finds local strokes, ReLU separates "there" from "not there", pooling and global average make the answer the same wherever the letter is, and the dense layer plus sigmoid turns features into a score. If every operation along the way were linear (no ReLU and no max pooling), all that would be left is "how bright the whole image is", and a faint X is as bright as a strong O.' },
    unlocks: [],
    palette: ['lrnConv', 'relu', 'maxpool', 'downsample', 'fqMean', 'lrnDense', 'lrnSigmoid'],
    // Smaller than it was: at 200 the steps zig-zag, so a passing network kept failing again for a while.
    trainRate: 80,
    check: { tolerance: 0.4 },
    tests: XO_CASES.map((c, i) => test(xoLabel(c, i), { in: glyphAt(c[0], c[1], c[2], c[3], c[4]) }, { out: image(1, 1, c[0] === 'X' ? 1 : 0) })),
    hidden: XO_HIDDEN.map(([label, c]) => test(label, { in: glyphAt(c[0], c[1], c[2], c[3], c[4]) }, { out: image(1, 1, c[0] === 'X' ? 1 : 0) })),
    solution: xoNet(XO_SOLUTION),
    naive: xoNet({ relu: false, pool: 'none', ...XO_LINEAR }),
    alsoFails: [xoNet({ pool: 'sample', ...XO_SOLUTION })],
  }

const deepLevel = {
    id: '4-15',
    chapter: 4,
    title: { zh: '训不动的深网', en: 'The deep net that will not train' },
    brief: { zh: '把至少 6 个卷积层串成一条路，训练它做一次轻微的锐化：输出 = 原图 + 0.25 ×（原图 − 3×3 平均）。', en: 'Chain at least 6 conv layers into one path and train it to do a light sharpen: output = image + 0.25 × (image − 3×3 average).' },
    hint: { zh: '每层都从很小的随机数开始，图每过一层就缩小几十倍。有没有办法让一层的权重哪怕很小，图也不至于缩没？', en: 'Every layer starts from very small random numbers, so the image shrinks tens of times over at each layer. Is there a way for a layer to keep the image from shrinking away even when its weights are tiny?' },
    after: { zh: '直接堆叠时，每层的梯度都要乘上其余各层的权重，层一多就乘得几乎为 0（梯度消失），损失纹丝不动。把每层的输入加到它的输出上，y = F(x) + x，每块一开始就是“原样通过”，只需学残差 F(x) = H(x) − x，梯度也沿捷径直达每一层。这就是 ResNet 的残差连接。', en: 'When layers are simply stacked, each layer\'s gradient is multiplied by the weights of all the other layers; with many layers the product is almost 0 (vanishing gradients) and the loss does not budge. Add each layer\'s input to its output, y = F(x) + x, and every block starts out "passing its input straight through": it only has to learn the residual F(x) = H(x) − x, and the gradient reaches every layer directly along the shortcut. This is ResNet\'s residual connection.' },
    unlocks: ['lrn-res'],
    palette: ['lrnConv', 'arith', 'merge'],
    trainRate: 1,
    check: { tolerance: 0.04 },
    constraint: (_, graph) => {
      const depth = depthOf(graph)
      return depth < DEEP ? { zh: `最深的一条路上只有 ${depth} 个卷积层，至少要 ${DEEP} 个`, en: `The deepest path has only ${depth} conv ${depth === 1 ? 'layer' : 'layers'}; it needs at least ${DEEP}` } : ''
    },
    tests: [
      [{ zh: '字母 X', en: 'Letter X' }, P.glyph(GLYPHS.X)],
      [{ zh: '圆盘', en: 'Disc' }, P.disk()],
      [{ zh: '带噪方块', en: 'Noisy square' }, addNoise(P.square(3, 5, 7), 3, 0.2)],
      [{ zh: '棋盘', en: 'Checkerboard' }, P.checker(3)],
    ].map(([label, img]) => test(label, { in: img }, { out: sharpen(img) })),
    hidden: [
      [{ zh: '字母 L', en: 'Letter L' }, P.glyph(GLYPHS.L, 0.2, 0.8, 4, 3)],
      [{ zh: '竖条纹', en: 'Vertical stripes' }, P.stripes(6, 0.2, 0.8)],
    ].map(([label, img]) => test(label, { in: img }, { out: sharpen(img) })),
    solution: deepNet(true, DEEP, (i) => (i === 0 ? SHARPEN_RESIDUAL : ZERO9)),
    naive: deepNet(false),
    alsoFails: [
      deepNet(true, 1, () => SHARPEN_RESIDUAL),
      deepNet(true),
    ],
  }

// ---------------- 4-11 挪一格也不变 ----------------

const dotsAt = (points) => fromFn(16, 16, (x, y) => (points.some(([px, py]) => px === x && py === y) ? 1 : 0.05))

const pooling = {
  id: '4-11',
  chapter: 4,
  title: { zh: '挪一格也不变', en: 'Unchanged by a one-pixel shift' },
  brief: { zh: '同一组特征点有时会偏一格。把 16×16 缩成 8×8，偏一格时结果必须完全一样。', en: 'The same set of keypoints is sometimes off by one pixel. Shrink 16×16 to 8×8; when they shift by one pixel, the result must be exactly the same.' },
  hint: { zh: '隔点取样会因为偏一格而错过亮点。能不能在扔掉点之前，让每个点先「知道」它旁边有没有亮点？', en: 'Downsampling misses bright points when they shift by one pixel. Before throwing pixels away, can each one first "know" whether there is a bright point beside it?' },
  after: { zh: '先让每格和右边、下边的邻居比一比，留下最大的，再隔点取样：每个 2×2 块只留下块里最强的那个数，点在块内挪动，答案不变。这就是最大池化，现在是现成的元件了。代价是丢掉了块内的精确位置。', en: 'First let each pixel compare itself with its neighbours to the right and below and keep the largest, then downsample: each 2×2 block keeps only its strongest value, and a point moving within its block does not change the answer. This is max pooling, and it is now a ready-made part. The price is losing the exact position inside the block.' },
  unlocks: ['maxpool'],
  palette: ['max', 'shift', 'downsample', 'box3', 'relu'],
  tests: [
    [{ zh: '原位', en: 'In place' }, [[4, 4], [10, 6], [6, 12]]],
    [{ zh: '偏右下', en: 'Shifted down-right' }, [[5, 5], [11, 7], [7, 13]]],
    [{ zh: '偏右', en: 'Shifted right' }, [[5, 4], [11, 6], [7, 12]]],
    [{ zh: '偏下', en: 'Shifted down' }, [[4, 5], [10, 7], [6, 13]]],
  ].map(([label, points]) => test(label, { in: dotsAt(points) }, { out: maxPool(dotsAt([[4, 4], [10, 6], [6, 12]]), 2) })),
  hidden: [
    [{ zh: '另一组 · 原位', en: 'Another set · in place' }, [0, 0]],
    [{ zh: '另一组 · 偏右下', en: 'Another set · shifted down-right' }, [1, 1]],
    [{ zh: '另一组 · 偏下', en: 'Another set · shifted down' }, [0, 1]],
  ].map(([label, [dx, dy]]) => {
    const base = [[2, 2], [12, 4], [8, 8], [14, 10], [4, 14]]
    return test(label, { in: dotsAt(base.map(([x, y]) => [x + dx, y + dy])) }, { out: maxPool(dotsAt(base), 2) })
  }),
  solution: build({ l: ['shift', { dir: '←' }], m1: 'max', u: ['shift', { dir: '↑' }], m2: 'max', d: 'downsample' }, ['in>l', 'in>m1.a', 'l>m1.b', 'm1>u', 'm1>m2.a', 'u>m2.b', 'm2>d', 'd>out']),
  naive: build({ d: 'downsample' }, ['in>d', 'd>out']),
}

// ---------------- 4-14 红灯在哪 ----------------

// Street scenes in three channels: red lights (bright and red), red cars in shade (red but dark), white street lamps
// (bright but not red), and green lights.
const STREET = {
  light: [0.95, 0.15, 0.1], car: [0.45, 0.08, 0.08], lamp: [0.95, 0.92, 0.85], green: [0.15, 0.9, 0.3], sky: [0.3, 0.35, 0.5], road: [0.25, 0.25, 0.25],
}
const street = (layout) => {
  const at = (x, y) => STREET[layout(x, y)]
  return { inputs: { r: fromFn(16, 16, (x, y) => at(x, y)[0]), g: fromFn(16, 16, (x, y) => at(x, y)[1]), b: fromFn(16, 16, (x, y) => at(x, y)[2]) }, out: fromFn(16, 16, (x, y) => (layout(x, y) === 'light' ? 1 : 0)) }
}
const spot2 = (cx, cy) => (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= 2
const STREETS = [
  [{ zh: '路口', en: 'A crossing' }, (x, y) => (spot2(4, 3)(x, y) ? 'light' : spot2(11, 3)(x, y) ? 'green' : y > 10 ? (x > 3 && x < 9 && y > 11 ? 'car' : 'road') : 'sky')],
  [{ zh: '夜里的路灯', en: 'Street lamps at night' }, (x, y) => (spot2(3, 4)(x, y) || spot2(12, 4)(x, y) ? 'lamp' : spot2(8, 6)(x, y) ? 'light' : y > 11 ? 'road' : 'sky')],
  [{ zh: '两盏红灯', en: 'Two red lights' }, (x, y) => (spot2(5, 5)(x, y) || spot2(10, 9)(x, y) ? 'light' : x < 4 && y > 11 ? 'car' : 'road')],
]
const STREETS_HIDDEN = [
  [{ zh: '车流', en: 'Traffic' }, (x, y) => (y > 9 && (x % 6) < 4 ? 'car' : spot2(13, 3)(x, y) ? 'light' : spot2(2, 3)(x, y) ? 'lamp' : 'sky')],
  [{ zh: '绿灯', en: 'Green light' }, (x, y) => (spot2(7, 7)(x, y) ? 'green' : 'road')],
]
const streetTest = ([label, layout]) => {
  const s = street(layout)
  return test(label, s.inputs, { out: s.out })
}
const rgb = (nodes, wires) => build(nodes, wires, { inputs: ['r', 'g', 'b'] })

const redLights = {
  id: '4-14',
  chapter: 4,
  inputs: ['r', 'g', 'b'],
  inputLabels: { r: { zh: '红 R', en: 'Red R' }, g: { zh: '绿 G', en: 'Green G' }, b: { zh: '蓝 B', en: 'Blue B' } },
  title: { zh: '红灯在哪', en: 'Where is the red light?' },
  brief: { zh: '街景的 R、G、B 三张图。只标出红灯：又亮又红的地方。暗处的红车、白色的路灯、绿灯都不算。', en: 'The R, G and B images of a street scene. Mark only the red lights: places both bright and red. Red cars in the shade, white street lamps and green lights do not count.' },
  hint: { zh: '一个通道只能回答一个问题。「红」和「亮」各要看哪些通道？', en: 'One channel can only answer one question. Which channels does "red" need, and which does "bright"?' },
  after: { zh: '「亮」看 R 本身，「红」看 R 比 G、B 多出多少，两个条件都满足才是红灯。只看一个通道，路灯和红车总有一个会混进来。网络的第一层要同时看所有通道，就是这个原因。', en: '"Bright" looks at R itself; "red" looks at how much R exceeds G and B; a red light needs both. Looking at a single channel, either the street lamps or the red cars always get in. That is why a network\'s first layer looks at every channel at once.' },
  unlocks: [],
  palette: ['lrnRgb', 'kernel3', 'arith', 'merge', 'const', 'threshold'],
  tests: STREETS.map(streetTest),
  hidden: STREETS_HIDDEN.map(streetTest),
  solution: rgb({ s: ['arith', { op: 'add' }], h: ['arith', { op: 'mul' }], hN: ['const', { c: 0.5 }], d: ['arith', { op: 'sub' }], red: ['threshold', { t: 0.4 }], lit: ['threshold', { t: 0.7 }], m: ['arith', { op: 'mul' }] }, ['g>s.a', 'b>s.b', 's>h.a', 'r>d.a', 'h>d.b', 'd>red', 'r>lit', 'red>m.a', 'lit>m.b', 'm>out', 'hN>h.b']),
  naive: rgb({ lit: ['threshold', { t: 0.7 }] }, ['r>lit', 'lit>out']),
  alsoFails: [rgb({ s: ['arith', { op: 'add' }], h: ['arith', { op: 'mul' }], hN: ['const', { c: 0.5 }], d: ['arith', { op: 'sub' }], red: ['threshold', { t: 0.25 }] }, ['g>s.a', 'b>s.b', 's>h.a', 'r>d.a', 'h>d.b', 'd>red', 'red>out', 'hN>h.b'])],
}

// ---------------- 4-16 省一点算 (challenge) ----------------

// Two output maps from a colour picture, both made of the same blurred channels: R − G, and R + G − 2B.
const blur3 = (img) => correlate(img, Array(9).fill(1 / 9))
const mixes = (r, g, b) => {
  const [R, G, B] = [blur3(r), blur3(g), blur3(b)]
  return { o1: zip(R, G, (p, q) => p - q), o2: fromFn(r.w, r.h, (x, y) => { const i = y * r.w + x; return R.data[i] + G.data[i] - 2 * B.data[i] }) }
}
const colourTest = (label, paint) => {
  const [r, g, b] = [0, 1, 2].map((c) => fromFn(16, 16, (x, y) => paint(x, y)[c]))
  return test(label, { r, g, b }, mixes(r, g, b))
}
const BOX_W = Array(9).fill(1 / 9)
const ZERO = Array(9).fill(0)
const mixGraph = (nodes, wires) => build(nodes, wires, { inputs: ['r', 'g', 'b'], outputs: ['o1', 'o2'] })

const cheaper = {
  id: '4-16',
  chapter: 4,
  inputs: ['r', 'g', 'b'],
  inputLabels: { r: { zh: '红 R', en: 'Red R' }, g: { zh: '绿 G', en: 'Green G' }, b: { zh: '蓝 B', en: 'Blue B' } },
  outputs: ['o1', 'o2'],
  outputLabels: { o1: { zh: '输出 1', en: 'Output 1' }, o2: { zh: '输出 2', en: 'Output 2' } },
  title: { zh: '省一点算', en: 'A little cheaper' },
  brief: { zh: '两张输出：输出 1 = R − G，输出 2 = R + G − 2B，其中每个通道都先做 3×3 平均。计算量不能超过 30。', en: 'Two outputs: output 1 = R − G and output 2 = R + G − 2B, where every channel is first given a 3×3 average. The cost must not exceed 30.' },
  hint: { zh: '多通道核每张输出都要把三个通道各卷一遍。', en: 'A multichannel kernel convolves all three channels again for every output.' },
  after: { zh: '先把每个通道单独卷一次，再按每张输出要的比例混起来（1×1 的混合，几乎不花计算量）。这叫深度可分离卷积：MobileNet 靠它在手机上跑得动。输出通道越多，省得越多。', en: 'Convolve each channel once on its own, then mix them in the proportions each output needs (a 1×1 mix, which costs almost nothing). This is a depthwise separable convolution: it is what lets MobileNet run on a phone. The more output channels, the more it saves.' },
  unlocks: [],
  palette: ['lrnRgb', 'box3', 'kernel3', 'arith', 'merge', 'const'],
  constraint: (score) => (score.cost > 30 ? { zh: `计算量 ${score.cost}，超过 30`, en: `Cost ${score.cost}, over 30` } : ''),
  tests: [
    colourTest({ zh: '红绿对半', en: 'Half red, half green' }, (x) => (x < 8 ? [0.8, 0.2, 0.2] : [0.2, 0.8, 0.2])),
    colourTest({ zh: '蓝色方块', en: 'A blue square' }, (x, y) => (x > 4 && x < 11 && y > 4 && y < 11 ? [0.2, 0.2, 0.9] : [0.5, 0.5, 0.5])),
    colourTest({ zh: '彩色纹理', en: 'Colour texture' }, (x, y) => [((x * 7 + y * 3) % 10) / 10, ((x * 3 + y * 5) % 10) / 10, ((x + y * 7) % 10) / 10]),
  ],
  hidden: [colourTest({ zh: '黄色圆盘', en: 'A yellow disc' }, (x, y) => ((x - 8) ** 2 + (y - 8) ** 2 < 20 ? [0.9, 0.85, 0.1] : [0.2, 0.3, 0.6]))],
  solution: mixGraph({ R: 'box3', G: 'box3', B: 'box3', d1: ['arith', { op: 'sub' }], s: ['arith', { op: 'add' }], b2: ['arith', { op: 'mul' }], b2N: ['const', { c: 2 }], d2: ['arith', { op: 'sub' }] }, ['r>R', 'g>G', 'b>B', 'R>d1.a', 'G>d1.b', 'd1>o1', 'R>s.a', 'G>s.b', 'B>b2.a', 's>d2.a', 'b2>d2.b', 'd2>o2', 'b2N>b2.b']),
  naive: mixGraph({ k1: ['lrnRgb', { w: [...BOX_W, ...BOX_W.map((v) => -v), ...ZERO] }], k2: ['lrnRgb', { w: [...BOX_W, ...BOX_W, ...BOX_W.map((v) => -2 * v)] }] }, ['r>k1.r', 'g>k1.g', 'b>k1.b', 'r>k2.r', 'g>k2.g', 'b>k2.b', 'k1>o1', 'k2>o2']),
}

// ---------------- 4-18 三选一, 4-20 分拣机 (series) ----------------

// Three scores in, three probabilities out: e^s ÷ the sum of all three e^s.
const SCORES = { inputs: ['sx', 'so', 'sp'], inputLabels: { sx: { zh: 'X 的分', en: 'Score X' }, so: { zh: 'O 的分', en: 'Score O' }, sp: { zh: '+ 的分', en: 'Score +' } } }
const CLASSES = { outputs: ['px', 'po', 'pp'], outputLabels: { px: { zh: '是 X', en: 'Is X' }, po: { zh: '是 O', en: 'Is O' }, pp: { zh: '是 +', en: 'Is +' } } }
const softmax = (s) => {
  const e = s.map(Math.exp)
  const total = e.reduce((a, b) => a + b, 0)
  return e.map((v) => v / total)
}
const scoreTest = (s) => {
  const [px, po, pp] = softmax(s)
  return test({ zh: `(${s.join(', ')})`, en: `(${s.join(', ')})` }, { sx: num(s[0]), so: num(s[1]), sp: num(s[2]) }, { px: num(px), po: num(po), pp: num(pp) })
}
const softmaxParts = (x, o, p) => ({
  nodes: { ex: 'exp', eo: 'exp', ep: 'exp', s1: ['arith', { op: 'add' }], s2: ['arith', { op: 'add' }], qx: ['arith', { op: 'div' }], qo: ['arith', { op: 'div' }], qp: ['arith', { op: 'div' }] },
  wires: [`${x}>ex`, `${o}>eo`, `${p}>ep`, 'ex>s1.a', 'eo>s1.b', 's1>s2.a', 'ep>s2.b', 'ex>qx.a', 's2>qx.b', 'eo>qo.a', 's2>qo.b', 'ep>qp.a', 's2>qp.b', 'qx>px', 'qo>po', 'qp>pp'],
})

const pickOne = (() => {
  const s = softmaxParts('sx', 'so', 'sp')
  return {
    id: '4-18',
    chapter: 4,
    ...SCORES,
    ...CLASSES,
    title: { zh: '三选一', en: 'One of three' },
    brief: { zh: '分拣机要把零件分成三类：X、O 和 +。网络先给每类打一个分，分可正可负。把三个分变成三个概率：每个都在 0 到 1 之间，加起来是 1，分越高的概率越大。期望用的是 e^分 ÷ 三个 e^分 之和。', en: 'The sorting machine has to put parts into three classes: X, O and +. The network first gives each class a score, which may be positive or negative. Turn the three scores into three probabilities, each between 0 and 1, adding up to 1, with a higher score getting a higher probability. The expected output uses e^score ÷ the sum of the three e^score.' },
    hint: { zh: '分可能是负数，直接除以总和会出错。exp 把任何数变成正数。', en: 'Scores can be negative, so dividing by their sum goes wrong. exp turns any number positive.' },
    after: { zh: '这叫 Softmax：先用 e 的几次方把分变成正数，再除以总和。分差 1，概率就差 e 倍，最高分会被放大。分类网络的最后一步几乎都是它。', en: 'This is the softmax: first make the scores positive with e to the power of each, then divide by the total. A difference of 1 in score is a factor of e in probability, so the top score is magnified. Almost every classification network ends with it.' },
    unlocks: [],
    palette: ['exp', 'arith', 'merge', 'const'],
    check: { tolerance: 0.01 },
    tests: [[2, 0, -1], [0.5, 0.5, 0.5], [-1, 3, 1], [1, -2, 2]].map(scoreTest),
    hidden: [[5, -3, 0], [-2, -2, -1]].map(scoreTest),
    solution: build(s.nodes, s.wires, { inputs: ['sx', 'so', 'sp'], outputs: ['px', 'po', 'pp'] }),
    naive: build({ s1: ['arith', { op: 'add' }], s2: ['arith', { op: 'add' }], qx: ['arith', { op: 'div' }], qo: ['arith', { op: 'div' }], qp: ['arith', { op: 'div' }] }, ['sx>s1.a', 'so>s1.b', 's1>s2.a', 'sp>s2.b', 'sx>qx.a', 's2>qx.b', 'so>qo.a', 's2>qo.b', 'sp>qp.a', 's2>qp.b', 'qx>px', 'qo>po', 'qp>pp'], { inputs: ['sx', 'so', 'sp'], outputs: ['px', 'po', 'pp'] }),
  }
})()

// Parts on the belt: X, O and + glyphs at different places and ink strengths, a few with sensor noise. The parts at the
// end of the list are new: kept back from training, and only checked.
const SORT_GLYPHS = { X: GLYPHS.X, O: GLYPHS.O, P: ['..#..', '..#..', '#####', '..#..', '..#..'] }
const NAMES = { X: 'X', O: 'O', P: '+' }
const part = (c, ox, oy, ink, seed) => {
  const clean = P.glyph(SORT_GLYPHS[c], 0.1, ink, ox, oy)
  return seed ? addNoise(clean, seed, 0.06) : clean
}
const sortTest = ([c, ox, oy, ink, seed], i, prefix) => ({
  ...test({ zh: `${prefix.zh}${NAMES[c]} ${i + 1}`, en: `${prefix.en}${NAMES[c]} ${i + 1}` }, { in: part(c, ox, oy, ink, seed) }, { px: num(c === 'X' ? 1 : 0), po: num(c === 'O' ? 1 : 0), pp: num(c === 'P' ? 1 : 0) }),
  train: !prefix.zh,
})
const SORT_POSITIONS = [[1, 2], [4, 3], [2, 5], [3, 1], [5, 4], [2, 2]]
const SORT_TRAIN = ['X', 'O', 'P'].flatMap((c, k) => SORT_POSITIONS.slice(0, 4).map(([x, y], i) => [c, (x + k) % 6, (y + 2 * k) % 6, 0.75 + 0.05 * i, i === 3 ? 10 + k : 0]))
const SORT_NEW = ['X', 'O', 'P'].flatMap((c, k) => SORT_POSITIONS.slice(4).map(([x, y], i) => [c, (x + k) % 6, (y + k) % 6, 0.8, i ? 20 + k : 0]))
const SORT_HIDDEN = [['X', 3, 4, 0.85, 0], ['O', 4, 2, 0.9, 31], ['P', 1, 1, 0.8, 0]]
const SORT_INITS = [CONV_INIT, [0.015, -0.01, 0.02, -0.02, 0.01, 0.005, -0.015, 0.02, -0.005]]
// Weights the trainer reaches from SORT_INITS (and every dense layer at 1, −1 or 0.5 with bias 0) at rate 80; it passes
// after 253 steps, new parts and held-back parts included.
const SORTER_W = {
  conv: [[-0.0236, -0.0048, -0.0633, -0.018, -0.0454, -0.003, -0.0706, -0.0325, 0.0007], [5.1546, -4.7263, -5.2868, -4.453, 1.752, 1.256, -5.5956, 2.773, 1.3697]],
  dense: [[[1.0007, -2.7474], [7.9509, -2.7457]], [[-0.9993, 0.292], [1.3535, 0.2911]], [[0.4991, 2.4436], [-8.7984, 2.444]]],
}
// Two feature channels (conv → ReLU → max pool → average), each class's score a dense layer on each channel, then softmax.
const sorterNet = (w = { conv: SORT_INITS, dense: null }) => {
  const nodes = {}
  const wires = []
  w.conv.forEach((k, c) => {
    Object.assign(nodes, { [`c${c}`]: ['lrnConv', { w: [...k] }], [`r${c}`]: 'relu', [`m${c}`]: 'maxpool', [`g${c}`]: 'fqMean' })
    wires.push(`in>c${c}`, `c${c}>r${c}`, `r${c}>m${c}`, `m${c}>g${c}`)
  })
  ;['x', 'o', 'p'].forEach((k, j) => {
    Object.assign(nodes, { [`d${k}0`]: ['lrnDense', { p: w.dense?.[j][0] ?? [[1, -1, 0.5][j], 0] }], [`d${k}1`]: ['lrnDense', { p: w.dense?.[j][1] ?? [[1, -1, 0.5][j], 0] }], [`s${k}`]: ['arith', { op: 'add' }] })
    wires.push(`g0>d${k}0`, `g1>d${k}1`, `d${k}0>s${k}.a`, `d${k}1>s${k}.b`)
  })
  const s = softmaxParts('sx', 'so', 'sp')
  return build({ ...nodes, ...s.nodes }, [...wires, ...s.wires], { outputs: ['px', 'po', 'pp'] })
}

const sorter = {
  id: '4-19',
  chapter: 4,
  ...CLASSES,
  title: { zh: '分拣机', en: 'Sorting machine' },
  brief: { zh: '传送带上的零件有三种：X、O 和 +，位置、深浅都不一样，有的带噪点。输出三个概率，正确那一类要大于 0.55，另两类小于 0.45。列表最后的「新零件」不参加训练，只用来检查。', en: 'The parts on the belt come in three kinds, X, O and +, at different places and strengths, some with noise. Output three probabilities: above 0.55 for the right class, below 0.45 for the other two. The "new parts" at the end of the list take no part in training and are only checked.' },
  hint: { zh: '一个卷积通道只能看出一种笔画，三类至少要几种？每一类的分，可以由每个通道的特征各给一点。搭好后多按几次训练，看两条误差线。', en: 'One convolution channel can pick out only one kind of stroke; how many do three classes need at least? Each class\'s score can take a share from every channel\'s feature. Once built, train for a while and watch the two error lines.' },
  after: { zh: '这台分拣机就是一个完整的分类网络：几个卷积通道找不同的笔画，ReLU 和池化让答案不怕挪位置，平均把每个通道变成一个特征，全连接给每类打分，Softmax 把分变成概率。它在没见过的新零件上也对，说明学到的是笔画，而不是背下了那几张图。', en: 'This sorting machine is a complete classification network: a few convolution channels find different strokes, ReLU and pooling make the answer indifferent to position, averaging turns each channel into one feature, dense layers score each class, and the softmax turns scores into probabilities. It is right on new parts it has never seen, which shows it learned strokes rather than memorising a handful of pictures.' },
  unlocks: [],
  palette: ['lrnConv', 'relu', 'maxpool', 'downsample', 'fqMean', 'lrnDense', 'lrnSigmoid', 'lrnRes', 'exp', 'arith', 'merge', 'const'],
  trainRate: 80,
  check: { tolerance: 0.45 },
  tests: [...SORT_TRAIN.map((c, i) => sortTest(c, i % 4, { zh: '', en: '' })), ...SORT_NEW.map((c, i) => sortTest(c, i % 2, { zh: '新零件 ', en: 'New part ' }))],
  hidden: SORT_HIDDEN.map((c, i) => sortTest(c, i, { zh: '另一批 ', en: 'Another batch ' })),
  solution: sorterNet(SORTER_W),
  naive: sorterNet(),
}

// ---------------- 4-17 什么时候停 (bench) ----------------

// Ten noisy samples of a smooth curve, fitted by a degree-9 polynomial. Trained by gradient descent
// the fit first follows the curve, then starts bending through the noise: the error on the training
// samples keeps falling while the error on new samples (validation) turns and rises.
const STOP_D = 10
const STOP = (() => {
  let seed = 7
  const next = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  const truth = (x) => Math.sin(2.2 * x)
  const tx = Array.from({ length: 10 }, (_, i) => -1 + (2 * i + next()) / 10)
  const ty = tx.map((x) => truth(x) + (next() - 0.5) * 0.6)
  const vx = Array.from({ length: 40 }, (_, i) => -0.98 + (1.96 * i) / 39)
  const vy = vx.map(truth)
  return { truth, tx, ty, vx, vy }
})()
const features = (x) => Array.from({ length: STOP_D }, (_, k) => x ** k)
const predict = (w, x) => features(x).reduce((sum, f, k) => sum + f * w[k], 0)
const mse = (w, xs, ys) => xs.reduce((sum, x, i) => sum + (predict(w, x) - ys[i]) ** 2, 0) / xs.length
// Checkpoints of gradient-descent training, log-spaced from step 0 to 40 000, computed on first use.
const CHECKPOINTS = [0, ...Array.from({ length: 48 }, (_, i) => Math.round(10 ** (0.5 + (i * 4.1) / 47)))]
let trainingRun = null
const training = () => {
  if (trainingRun) return trainingRun
  let w = Array(STOP_D).fill(0)
  const out = []
  let step = 0
  for (const target of CHECKPOINTS) {
    for (; step < target; step++) {
      const g = Array(STOP_D).fill(0)
      STOP.tx.forEach((x, i) => {
        const e = predict(w, x) - STOP.ty[i]
        features(x).forEach((f, k) => (g[k] += (2 * e * f) / STOP.tx.length))
      })
      w = w.map((v, k) => v - 0.5 * g[k])
    }
    out.push({ step: target, w, train: mse(w, STOP.tx, STOP.ty), valid: mse(w, STOP.vx, STOP.vy) })
  }
  trainingRun = out
  return out
}
// Training run to the end with a penalty λ·Σw² (all but the constant): the ridge solution.
const solve = (A, b) => {
  const n = b.length
  const M = A.map((row, i) => [...row, b[i]])
  for (let c = 0; c < n; c++) {
    let p = c
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r
    ;[M[c], M[p]] = [M[p], M[c]]
    for (let r = 0; r < n; r++) {
      if (r === c) continue
      const f = M[r][c] / M[c][c]
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]
    }
  }
  return M.map((row, i) => row[n] / row[i])
}
const regularised = (lambda) => {
  const n = STOP.tx.length
  const A = Array.from({ length: STOP_D }, (_, i) => Array.from({ length: STOP_D }, (_, j) => STOP.tx.reduce((sum, x) => sum + x ** (i + j), 0) / n + (i === j && i > 0 ? lambda : 0)))
  const b = Array.from({ length: STOP_D }, (_, i) => STOP.tx.reduce((sum, x, k) => sum + x ** i * STOP.ty[k], 0) / n)
  const w = solve(A, b)
  return { w, train: mse(w, STOP.tx, STOP.ty), valid: mse(w, STOP.vx, STOP.vy) }
}
const LAMBDAS = Array.from({ length: 25 }, (_, i) => 10 ** (-6 + i * 0.25))
const STOP_SLACK = 1.2 // within 20 % of the best validation error counts as stopping at the bottom
const STOP_STAGES = [
  {
    title: { zh: '停在哪一步', en: 'Which step to stop at' },
    note: { zh: '实心点是训练用的 10 个样本（带噪声），空心点是没给模型看过的新样本。拖动「训练了多少步」，看曲线怎样变，下面两条误差线怎样走。停在新样本误差最低的那一步。', en: 'The filled dots are the 10 training samples (with noise); the hollow dots are new samples the model has never been shown. Drag "Steps trained" and watch how the curve changes and how the two error lines below move. Stop at the step where the error on new samples is lowest.' },
    control: 'step',
  },
  {
    title: { zh: '给弯曲加点代价', en: 'Make bending cost something' },
    note: { zh: '这次一直训练到底，但误差里多加一项：权重越大越受罚（λ × 所有权重的平方和）。调 λ，让新样本的误差尽量低。', en: 'This time training runs to the end, but the error gets an extra term: the larger the weights, the bigger the penalty (λ × the sum of all the squared weights). Tune λ to make the error on new samples as low as you can.' },
    control: 'lambda',
  },
]
const stopPasses = (stage, s) => {
  if (stage.control === 'step') {
    const run = training()
    const best = Math.min(...run.map((r) => r.valid))
    return run[s.step].valid <= best * STOP_SLACK
  }
  const best = Math.min(...LAMBDAS.map((l) => regularised(l).valid))
  return regularised(LAMBDAS[s.lambda]).valid <= best * STOP_SLACK
}

const stopLevel = {
  id: '4-17',
  kind: 'board',
  board: 'EarlyStop',
  chapter: 4,
  title: { zh: '什么时候停', en: 'When to stop' },
  brief: { zh: '训练越久，模型在训练样本上越准。可我们要的是它在没见过的新样本上也准。一个灵活的模型训练太久，会把样本里的噪声也背下来。', en: 'The longer you train, the more accurate the model gets on the training samples. But what we want is for it to be accurate on new samples it has never seen as well. A flexible model trained too long memorises the noise in the samples too.' },
  hint: { zh: '盯住两条误差线：训练误差一直往下走，新样本的误差先下降、后上升。上升的时候，模型在学什么？', en: 'Keep your eye on the two error lines: the training error keeps going down, while the error on new samples first falls, then rises. While it rises, what is the model learning?' },
  after: { zh: '训练误差一直降，新样本（验证集）的误差却先降后升：后半段模型在背噪声，这叫过拟合。办法一是提前停止，在验证误差最低时停下；办法二是正则化，给大权重加代价（L2），让模型不愿意为了几个点把曲线拧得很弯。λ 太小拦不住过拟合，太大又让模型连真规律都学不会（欠拟合）。真正训练网络时，留一部分数据只用来验证，就是为了看到这条先降后升的线。', en: 'The training error keeps falling, but the error on new samples (the validation set) falls and then rises: in the second half the model is memorising noise. This is called overfitting. One fix is early stopping: stop where the validation error is lowest. The other is regularisation: put a cost on large weights (L2), so the model will not bend the curve sharply just to hit a few points. Too small a λ cannot hold off overfitting; too large and the model cannot learn even the true rule (underfitting). When training real networks, part of the data is kept back for validation only, precisely so you can see this falls-then-rises line.' },
  unlocks: [],
  stop: { data: STOP, predict, training, checkpoints: CHECKPOINTS, regularised, lambdas: LAMBDAS, stages: STOP_STAGES, passes: stopPasses, start: { step: 0, lambda: 0 } },
  verify() {
    const run = training()
    const valid = run.map((r) => r.valid)
    const bottom = valid.indexOf(Math.min(...valid))
    if (bottom === 0 || bottom === run.length - 1) return '验证误差没有先降后升'
    if (run.at(-1).train >= run[bottom].train) return '训练误差没有一直下降'
    if (stopPasses(STOP_STAGES[0], { step: 0 }) || stopPasses(STOP_STAGES[0], { step: run.length - 1 })) return '一开始或训练到底也能过'
    const good = LAMBDAS.map((_, i) => i).filter((i) => stopPasses(STOP_STAGES[1], { lambda: i }))
    if (!good.length || good.includes(0) || good.includes(LAMBDAS.length - 1)) return 'λ 的两端也能过，或者都不能过'
    return ''
  },
}

export const levels = [oneKnob, twoKnobs, learnKernel, shake, singleNeuron, xor, bothEdges, larger, stride, seeFurther, pooling, xoLevel, channels, redLights, deepLevel, cheaper, stopLevel, pickOne, sorter]
