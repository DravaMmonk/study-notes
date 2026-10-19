import { GLYPHS, addNoise, correlate, downsample, fromFn, gaussianKernel, image, map, patterns as P, random, zip } from '../engine/image.js'
import { applyGain, highpass, lowpass, magnitudeSpectrum } from '../engine/fourier.js'
import { NODE_TYPES } from '../engine/nodes.js'
import { aliasOf, cosine, maxDiff, sampleAt, throughSamples } from '../engine/waves.js'
import { build, test } from './util.js'

// Chapter 2 · 频率 (lecture 4 and assignment 1): an image as a sum of waves. Steps: build a wave and add waves into a
// square wave; build a probe that measures one frequency (the spectrum is that probe at every frequency) and use it
// to judge focus; filter in the frequency domain and use it to soften, remove stripes and mix two pictures; and see on
// the sampling bench how fast waves pose as slow ones. Challenge: a hybrid image with one transform. Series: a
// thumbnail service that shrinks photos without moiré and within a budget.

const N = 32
const TAU = 2 * Math.PI

// ---------------- new parts ----------------

export const nodes = {
  fqWave: {
    label: { zh: '波', en: 'Wave' },
    description: { zh: '一道 32 个点的波：cos 或 sin(2π·k·x/32)，在 −1 和 1 之间摆动', en: 'A wave of 32 points: cos or sin(2π·k·x/32), swinging between −1 and 1' },
    inputs: [],
    params: [
      { key: 'k', label: { zh: '频率 k', en: 'Frequency k' }, kind: 'number', min: 0, max: 16, step: 1, default: 1 },
      { key: 'form', label: { zh: '形状', en: 'Shape' }, kind: 'select', options: [['cos', 'cos'], ['sin', 'sin']], default: 'cos' },
    ],
    eval: (_, p) => {
      const k = Number(p.k ?? 1)
      const f = p.form === 'sin' ? Math.sin : Math.cos
      return fromFn(N, 1, (x) => f((TAU * k * x) / N))
    },
    cost: 2,
    unlock: 'wave',
  },
  fqSpectrum: {
    label: { zh: '频谱', en: 'Spectrum' },
    description: { zh: '中心化、取对数的幅度谱：中心是平均亮度，越往外变化越快', en: 'The centred, log-scaled magnitude spectrum: the centre is the average brightness, and further out means faster change' },
    inputs: ['in'],
    eval: ({ in: a }) => magnitudeSpectrum(a),
    // A forward 2-D FFT costs about 2·log2(N²) complex multiply-adds per pixel; 20 at 32×32.
    cost: 20,
    unlock: 'spectrum',
  },
  fqLowpass: {
    label: { zh: '频域低通', en: 'Frequency low-pass' },
    description: { zh: '变换到频域，乘一个以中心为圆心的掩膜，再变换回来', en: 'Transforms to the frequency domain, multiplies by a mask centred on the middle, and transforms back' },
    inputs: ['in'],
    params: [
      { key: 'shape', label: { zh: '掩膜', en: 'Mask' }, kind: 'select', options: [['disk', { zh: '硬圆盘', en: 'Hard disk' }], ['gauss', { zh: '高斯', en: 'Gaussian' }]], default: 'disk' },
      { key: 'R', label: { zh: '半径 R', en: 'Radius R' }, kind: 'number', min: 0.5, max: 16, step: 0.5, default: 8 },
    ],
    eval: ({ in: a }, p) => lowpass(a, p.shape ?? 'disk', Number(p.R ?? 8)),
    // Forward and inverse FFT plus the mask multiply.
    cost: 40,
    unlock: 'freq-filter',
  },
  fqApply: {
    label: { zh: '频域相乘', en: 'Multiply in frequency' },
    description: { zh: '把图变到频域，每个频率乘上增益图里对应格子的数，再变回来。增益图和频谱画法一样：中心是频率 (0, 0)', en: 'Takes the picture into the frequency domain, multiplies each frequency by the number in the matching cell of the gain picture, and comes back. The gain picture is laid out like a spectrum: its centre is frequency (0, 0)' },
    inputs: ['in', 'gain'],
    eval: ({ in: a, gain }) => applyGain(a, gain),
    // A forward and an inverse FFT plus the multiply.
    cost: 40,
  },
}
// The reference graphs below are built when this module loads and need these types registered first.
Object.assign(NODE_TYPES, nodes)

// ---------------- 32×32 scenes ----------------

const box = (x0, y0, w, h, lo = 0.1, hi = 0.9) => fromFn(N, N, (x, y) => (x >= x0 && x < x0 + w && y >= y0 && y < y0 + h ? hi : lo))
const disk = (cx, cy, r, lo = 0.1, hi = 0.9) => fromFn(N, N, (x, y) => ((x - cx) ** 2 + (y - cy) ** 2 <= r * r ? hi : lo))
const glyph = (rows, lo = 0.1, hi = 0.9, ox = 6, oy = 6, scale = 4) =>
  fromFn(N, N, (x, y) => (rows[Math.floor((y - oy) / scale)]?.[Math.floor((x - ox) / scale)] === '#' ? hi : lo))
const checker = (cell, lo, hi) => fromFn(N, N, (x, y) => ((Math.floor(x / cell) + Math.floor(y / cell)) % 2 ? hi : lo))
// A cosine grating with (fx, fy) whole cycles across the image: one pair of dots in its spectrum.
const grating = (fx, fy, amp = 0.4) => fromFn(N, N, (x, y) => 0.5 + amp * Math.cos((2 * Math.PI * (fx * x + fy * y)) / N))
const plus = (a, b) => zip(a, b, (p, q) => p + q)

// ---------------- 2-1 一道波 (bench) ----------------

// One knob per number of the wave; φ moves in quarters of π so the slider stops on exact values.
const WAVE_KNOBS = {
  c: { min: 0, max: 1, step: 0.05, label: { zh: '平均亮度 c', en: 'Average c' } },
  A: { min: 0, max: 0.5, step: 0.05, label: { zh: '振幅 A', en: 'Amplitude A' } },
  k: { min: 0, max: 12, step: 1, label: { zh: '频率 k', en: 'Frequency k' } },
  phi: { min: -4, max: 4, step: 1, label: { zh: '相位 φ', en: 'Phase φ' } },
}
const benchAt = (p, x) => p.c + p.A * Math.cos((TAU * p.k * x) / N + (p.phi * Math.PI) / 4)
const benchRow = (p) => Array.from({ length: N }, (_, x) => benchAt(p, x))
const sameWave = (a, b) => benchRow(a).every((v, x) => Math.abs(v - benchAt(b, x)) < 1e-6)
const WAVE_STAGES = [
  {
    knobs: ['c'], start: { c: 0.3, A: 0.25, k: 2, phi: 0 }, target: { c: 0.65, A: 0.25, k: 2, phi: 0 },
    title: { zh: '平均亮度 c', en: 'Average c' },
    note: { zh: '这一步只能转 c。把你的波（实线）调到和目标（虚线）重合，同时看下面两行像素怎么变。', en: 'Only c turns in this step. Lay your wave (solid) on the target (dashed), and watch how the two rows of pixels below change.' },
    win: { zh: 'c 把整道波上下平移：整行一起变亮或变暗，明暗差不变。', en: 'c moves the whole wave up or down: the row gets lighter or darker all at once, and the contrast stays the same.' },
  },
  {
    knobs: ['A'], start: { c: 0.5, A: 0.05, k: 2, phi: 0 }, target: { c: 0.5, A: 0.35, k: 2, phi: 0 },
    title: { zh: '振幅 A', en: 'Amplitude A' },
    note: { zh: '这一步只能转 A。', en: 'Only A turns in this step.' },
    win: { zh: 'A 是起伏的高度：A 越大，亮处越亮、暗处越暗，条纹越分明；A = 0 时只剩一片灰。', en: 'A is the height of the swing: the bigger A, the lighter the light parts and the darker the dark ones, and the clearer the stripes. At A = 0 only a flat grey is left.' },
  },
  {
    knobs: ['k'], start: { c: 0.5, A: 0.3, k: 1, phi: 0 }, target: { c: 0.5, A: 0.3, k: 5, phi: 0 },
    title: { zh: '频率 k', en: 'Frequency k' },
    note: { zh: '这一步只能转 k。', en: 'Only k turns in this step.' },
    win: { zh: 'k 是这一行里走了几个完整的周期：k = 5 就是五道亮条。k 越大，条纹越密。', en: 'k is how many whole cycles the row goes through: k = 5 makes five bright stripes. The bigger k, the denser the stripes.' },
  },
  {
    knobs: ['phi'], start: { c: 0.5, A: 0.3, k: 1, phi: 0 }, target: { c: 0.5, A: 0.3, k: 1, phi: 2 },
    title: { zh: '相位 φ', en: 'Phase φ' },
    note: { zh: '这一步只能转 φ。', en: 'Only φ turns in this step.' },
    win: { zh: 'φ 把整道波左右挪动：条纹换了位置，疏密和明暗都不变。挪满 2π 又回到原样。', en: 'φ slides the whole wave sideways: the stripes move, while their density and contrast stay the same. A shift of 2π brings it back to where it was.' },
  },
  {
    knobs: ['c', 'A', 'k', 'phi'], start: { c: 0.5, A: 0.1, k: 1, phi: 0 }, target: { c: 0.4, A: 0.3, k: 3, phi: -1 },
    title: { zh: '四个一起', en: 'All four' },
    note: { zh: '四个旋钮都开放了。先看两条线差在哪，再转对应的那个。', en: 'All four knobs are open. First see where the two lines differ, then turn the knob that matches.' },
    win: { zh: '四个数刚好定下一道波：c + A·cos(2π·k·x/32 + φ)。', en: 'Four numbers settle a wave exactly: c + A·cos(2π·k·x/32 + φ).' },
  },
]

const waveBench = {
  id: '2-1',
  kind: 'board',
  board: 'WaveBench',
  chapter: 2,
  title: { zh: '一道波', en: 'One wave' },
  brief: { zh: '一道波由四个数决定：c、A、k、φ。每一步只开放一个旋钮，把你的波调到和目标重合；最后一步四个一起。', en: 'A wave is set by four numbers: c, A, k and φ. Each step opens one knob: lay your wave on the target. In the last step all four are open.' },
  hint: { zh: '先比较两条线差在哪：是整体高低、起伏大小、起伏的次数，还是起伏的位置？', en: 'Compare the two lines first: do they differ in overall height, in the size of the swing, in how many swings there are, or in where the swings sit?' },
  after: { zh: 'c 定中线，也就是平均亮度；A 定起伏的高度，也就是明暗差；k 定一行里有几个周期，也就是条纹的疏密；φ 定条纹往哪边挪。写成式子就是 c + A·cos(2π·k·x/32 + φ)。从现在起，「波」元件归你了：设好 k，它就给出一道整行走 k 个周期的波。cos 元件也一起归你：它把每个数换成它的余弦。', en: 'c sets the middle line, the average brightness; A sets the height of the swing, the contrast; k sets how many cycles fit in the row, the density of the stripes; and φ sets which way the stripes are shifted. As a formula: c + A·cos(2π·k·x/32 + φ). From now on the "Wave" part is yours: set k and it gives a wave of k cycles across the row. So is the cos part, which replaces each number with its cosine.' },
  unlocks: ['wave'],
  wave: { N, knobs: WAVE_KNOBS, stages: WAVE_STAGES, at: benchAt, row: benchRow, same: sameWave },
  verify() {
    for (const [i, s] of WAVE_STAGES.entries()) {
      if (sameWave(s.start, s.target)) return `第 ${i + 1} 步一开始就算完成`
      for (const [knob, { min, max, step }] of Object.entries(WAVE_KNOBS)) {
        for (const v of [s.start[knob], s.target[knob]]) {
          if (v < min || v > max || Math.abs(min + Math.round((v - min) / step) * step - v) > 1e-9) return `第 ${i + 1} 步的 ${knob} = ${v} 不在刻度上`
        }
        if (!s.knobs.includes(knob) && s.start[knob] !== s.target[knob]) return `第 ${i + 1} 步的 ${knob} 不能转，却和目标不同`
      }
    }
    return ''
  },
}

// ---------------- 2-2 叠加 ----------------

const num = (v) => image(1, 1, v)

// The closest a sum of waves up to frequency 8 gets to a square wave: odd sines with amplitudes 4/(πk).
const SQUARE_K = [1, 3, 5, 7]
const squareish = (a) => fromFn(N, 1, (x) => 0.5 + a * (4 / Math.PI) * SQUARE_K.reduce((s, k) => s + Math.sin((TAU * k * x) / N) / k, 0))
const sumTest = (a) => test({ zh: `a = ${a}`, en: `a = ${a}` }, { in: num(a) }, { out: squareish(a) })
const sines = (ks) => {
  const nodes = {}
  const wires = []
  ks.forEach((k, i) => {
    nodes[`w${k}`] = ['fqWave', { k, form: 'sin' }]
    nodes[`k${k}`] = ['arith', { op: 'mul' }]
    nodes[`n${k}`] = ['const', { c: 4 / (Math.PI * k) }]
    wires.push(`w${k}>k${k}.a`, `n${k}>k${k}.b`)
    if (i) {
      nodes[`s${k}`] = ['arith', { op: 'add' }]
      wires.push(`${i === 1 ? `k${ks[0]}` : `s${ks[i - 1]}`}>s${k}.a`, `k${k}>s${k}.b`)
    }
  })
  const last = ks.length > 1 ? `s${ks.at(-1)}` : `k${ks[0]}`
  return build({ ...nodes, m: ['arith', { op: 'mul' }], o: ['arith', { op: 'add' }], oN: ['const', { c: 0.5 }] }, [...wires, `${last}>m.a`, 'in>m.b', 'm>o.a', 'o>out', 'oN>o.b'])
}

const superpose = {
  id: '2-2',
  chapter: 2,
  title: { zh: '叠加', en: 'Adding waves' },
  inputLabels: { in: { zh: '高度 a', en: 'Height a' } },
  brief: { zh: '输入是一个数 a。用几道频率不超过 8 的正弦波叠出期望里那条曲线：它是这些波能拼出的最像方波的样子，平均亮度 0.5，起伏的大小和 a 成正比。', en: 'The input is one number, a. Stack up sine waves of frequency 8 or less to make the curve in the expected output: the closest thing to a square wave these waves can make, with average brightness 0.5 and swings in proportion to a.' },
  hint: { zh: '先只放一道频率 1 的波，看误差曲线还剩哪些起伏，再一道道补上去。', en: 'Start with a single wave of frequency 1, see which wiggles are left in the error curve, then add waves one at a time.' },
  after: { zh: '方波只用到奇数频率，振幅按 1、1/3、1/5、1/7 递减。边越陡，需要的高频越多；只到频率 7 的话，陡边旁边总留着一圈小波纹。反过来看：模糊就是把高频调小。任何一条曲线都能这样拆成一组波，这就是傅里叶级数。', en: 'A square wave uses only odd frequencies, with amplitudes falling as 1, 1/3, 1/5, 1/7. The steeper an edge, the more high frequencies it needs; stop at frequency 7 and a ripple always remains beside the steep edge. Seen the other way round, blurring is turning the high frequencies down. Any curve can be split into waves like this: that is the Fourier series.' },
  unlocks: [],
  palette: ['fqWave', 'fqMean', 'arith', 'merge', 'const'],
  check: { tolerance: 0.03 },
  tests: [0.3, 0.4, 0.2].map(sumTest),
  hidden: [0.35, 0.25].map(sumTest),
  solution: sines(SQUARE_K),
  naive: sines([1]),
  alsoFails: [sines([1, 3])],
}

// ---------------- 2-3 频率探针 ----------------

// Signals are rows of 32 samples; the answer is a single number.
const wave = (k, A, phase = 0) => fromFn(N, 1, (x) => A * Math.cos((TAU * k * x) / N + (phase * Math.PI) / 180))
const sum = (...rows) => rows.reduce((a, b) => zip(a, b, (p, q) => p + q))
const flat = (v) => image(N, 1, v)
const PROBE_SCENES = [
  ['A', [flat(0.5), wave(3, 0.3), wave(1, 0.1)], 0.3],
  ['B', [flat(0.5), wave(3, 0.2, 90), wave(5, 0.15)], 0.2],
  ['C', [flat(0.45), wave(3, 0.25, 200), wave(2, 0.1)], 0.25],
  ['D', [flat(0.5), wave(5, 0.3), wave(1, 0.1, 60)], 0],
  ['E', [flat(0.5), wave(3, 0.15, 45), wave(6, 0.12), wave(4, 0.1)], 0.15],
]
// Held back: the k = 3 wave at phases no visible scene uses, next to its neighbour k = 4 and under
// louder waves, so a probe that only works near 0° or 90°, or reads the loudest wave, is caught.
const PROBE_HIDDEN = [
  ['F', [flat(0.6), wave(3, 0.35, 300), wave(4, 0.2), wave(7, 0.1, 20)], 0.35],
  ['G', [flat(0.3), wave(2, 0.3, 50), wave(3, 0.08, 135), wave(8, 0.2)], 0.08],
]
const probe = (nodes, wires) => build(nodes, wires)
const osc = (k, form = 'cos') => ['fqWave', { k, form }]
const fullProbe = (k) => probe(
  { c: osc(k), s: osc(k, 'sin'), mc: ['arith', { op: 'mul' }], ms: ['arith', { op: 'mul' }], ac: 'fqMean', as: 'fqMean', qc: ['arith', { op: 'mul' }], qs: ['arith', { op: 'mul' }], t: ['arith', { op: 'add' }], r: 'sqrt', g: ['arith', { op: 'mul' }], gN: ['const', { c: 2 }] },
  ['in>mc.a', 'c>mc.b', 'in>ms.a', 's>ms.b', 'mc>ac', 'ms>as', 'ac>qc.a', 'ac>qc.b', 'as>qs.a', 'as>qs.b', 'qc>t.a', 'qs>t.b', 't>r', 'r>g.a', 'g>out', 'gN>g.b'],
)

const probeLevel = {
  id: '2-3',
  chapter: 2,
  title: { zh: '频率探针', en: 'Frequency probe' },
  brief: { zh: '输入是一条 32 个点的波形，由几道波和一个平均亮度叠成。读出其中频率 k = 3 那道波的振幅 A，输出一个数。有一条波形里根本没有 k = 3。', en: 'The input is a waveform of 32 points, made of a few waves plus an average brightness. Read off the amplitude A of the wave with frequency k = 3, and output that one number. One of the waveforms has no k = 3 at all.' },
  hint: { zh: '你能自己造一道 k = 3 的波。怎样把它和输入放在一起算，才能让 k = 3 的部分留下、别的频率互相抵消？可藏着的波要是错开了位置呢？', en: 'You can make a k = 3 wave yourself. How can you combine it with the input so the k = 3 part stays and the other frequencies cancel out? But what if the hidden wave is shifted?' },
  after: { zh: '这就是傅里叶变换：拿每个频率的 cos 和 sin 去和信号逐点相乘、求平均。两个读数 a、b 合起来，振幅是 2·√(a² + b²)，和波错开多少无关；错开多少（相位）是 atan2(b, a)。只用 cos 的探针会把错开 90° 的波量成 0。图像也一样，只是波有两个方向：「频谱」元件对每一个 (kx, ky) 都做一次你刚搭的探针，把测到的振幅画在 (kx, ky) 那一格，中心是 (0, 0)，也就是平均亮度。', en: 'This is the Fourier transform: multiply the signal per-pixel by the cos and the sin of each frequency, and average. Together the two readings a and b give the amplitude 2·√(a² + b²), however far the wave is shifted; how far it is shifted (the phase) is atan2(b, a). A probe with only cos measures a wave shifted by 90° as 0. Images work the same way, except that waves have two directions: the "Spectrum" part runs the probe you just built once for every (kx, ky) and draws the amplitude it measures in cell (kx, ky). The centre is (0, 0), the average brightness.' },
  unlocks: ['spectrum'],
  palette: ['fqWave', 'arith', 'merge', 'fqMean', 'sqrt', 'const'],
  check: { tolerance: 0.01 },
  tests: PROBE_SCENES.map(([label, parts, A]) => test({ zh: `波形 ${label}`, en: `Waveform ${label}` }, { in: sum(...parts) }, { out: image(1, 1, A) })),
  hidden: PROBE_HIDDEN.map(([label, parts, A]) => test({ zh: `波形 ${label}`, en: `Waveform ${label}` }, { in: sum(...parts) }, { out: image(1, 1, A) })),
  solution: fullProbe(3),
  // The first probe everyone builds: multiply by a cosine, average, double. It misses shifted waves.
  naive: probe({ c: osc(3), m: ['arith', { op: 'mul' }], a: 'fqMean', g: ['arith', { op: 'mul' }], gN: ['const', { c: 2 }] }, ['in>m.a', 'c>m.b', 'm>a', 'a>g.a', 'g>out', 'gN>g.b']),
  alsoFails: [
    // Right idea, forgot that the average of cos² is ½.
    probe({ c: osc(3), s: osc(3, 'sin'), mc: ['arith', { op: 'mul' }], ms: ['arith', { op: 'mul' }], ac: 'fqMean', as: 'fqMean', qc: ['arith', { op: 'mul' }], qs: ['arith', { op: 'mul' }], t: ['arith', { op: 'add' }], r: 'sqrt' }, ['in>mc.a', 'c>mc.b', 'in>ms.a', 's>ms.b', 'mc>ac', 'ms>as', 'ac>qc.a', 'ac>qc.b', 'as>qs.a', 'as>qs.b', 'qc>t.a', 'qs>t.b', 't>r', 'r>out']),
    // Sine only.
    probe({ s: osc(3, 'sin'), m: ['arith', { op: 'mul' }], a: 'fqMean', g: ['arith', { op: 'mul' }], gN: ['const', { c: 2 }] }, ['in>m.a', 's>m.b', 'm>a', 'a>g.a', 'g>out', 'gN>g.b']),
    // The wrong frequency.
    fullProbe(5),
    // Just the average.
    probe({ a: 'fqMean' }, ['in>a', 'a>out']),
  ],
}

// ---------------- 2-4 对焦了吗 ----------------

// Distance of every cell of a spectrum picture from its centre, frequency (0, 0).
const radius = fromFn(N, N, (x, y) => Math.hypot(x - N / 2, y - N / 2))
const RADIUS = { inputs: ['in', 'r'], inputLabels: { in: { zh: '照片', en: 'Photo' }, r: { zh: '频率半径', en: 'Frequency radius' } } }
const blurred = (img, sigma) => (sigma ? correlate(img, gaussianKernel(sigma), 'edge') : img)
const FOCUS_R = 6
const sharpness = (img) => {
  const s = magnitudeSpectrum(img)
  return image(1, 1, s.data.reduce((sum, v, i) => sum + (radius.data[i] > FOCUS_R ? v : 0), 0) / s.data.length)
}
const rg = (nodes, wires) => build(nodes, wires, { inputs: ['in', 'r'] })

const focus = {
  id: '2-4',
  chapter: 2,
  ...RADIUS,
  title: { zh: '对焦了吗', en: 'In focus?' },
  brief: { zh: '相机自动对焦时，要给每一张试拍打一个清晰度分。输出这个分：照片的频谱里，离中心超过 6 的那些格子加起来，再除以频谱的格子总数。「频率半径」告诉你频谱每一格离中心多远。', en: 'When a camera focuses itself, it scores every trial shot for sharpness. Output that score: the sum of the spectrum cells more than 6 from the centre, divided by the total number of spectrum cells. "Frequency radius" tells you how far each spectrum cell is from the centre.' },
  hint: { zh: '先做一张只在半径 6 以外为 1 的图，用它把频谱的内圈遮住。', en: 'First make a picture that is 1 only beyond radius 6, and use it to mask out the inner part of the spectrum.' },
  after: { zh: '离焦就是模糊，模糊压低了高频。所以频谱外圈越亮，照片越清楚。手机相机对焦时，一边挪镜头一边算这样的分数，停在分数最高的位置。', en: 'Out of focus means blurred, and blurring turns the high frequencies down. So the brighter the outer part of the spectrum, the sharper the photo. A phone camera computes a score like this while it moves the lens, and stops where the score is highest.' },
  unlocks: [],
  palette: ['fqSpectrum', 'threshold', 'arith', 'merge', 'fqMean', 'const', 'invert'],
  check: { tolerance: 0.005 },
  tests: [
    [{ zh: '字母 T · 清楚', en: 'Letter T · sharp' }, glyph(GLYPHS.T, 0.2, 0.8), 0],
    [{ zh: '字母 T · 有点糊', en: 'Letter T · a little blurred' }, glyph(GLYPHS.T, 0.2, 0.8), 1],
    [{ zh: '棋盘 · 很糊', en: 'Checkerboard · very blurred' }, checker(4, 0.2, 0.8), 2],
    [{ zh: '圆盘 · 清楚', en: 'Disc · sharp' }, disk(15.5, 15.5, 9, 0.2, 0.8), 0],
  ].map(([label, img, sigma]) => test(label, { in: blurred(img, sigma), r: radius }, { out: sharpness(blurred(img, sigma)) })),
  hidden: [
    [{ zh: '方块 · 有点糊', en: 'Square · a little blurred' }, box(8, 8, 16, 16, 0.2, 0.8), 1.5],
    [{ zh: '字母 L · 清楚', en: 'Letter L · sharp' }, glyph(GLYPHS.L, 0.2, 0.8, 8, 5), 0],
  ].map(([label, img, sigma]) => test(label, { in: blurred(img, sigma), r: radius }, { out: sharpness(blurred(img, sigma)) })),
  solution: rg({ s: 'fqSpectrum', t: ['threshold', { t: FOCUS_R }], m: ['arith', { op: 'mul' }], a: 'fqMean' }, ['in>s', 'r>t', 's>m.a', 't>m.b', 'm>a', 'a>out']),
  naive: rg({ s: 'fqSpectrum', a: 'fqMean' }, ['in>s', 's>a', 'a>out']),
}

// ---------------- 2-5 两条路 ----------------

// Two roads to the same blur: a spatial Gaussian of σ = 1, or its gain in the frequency domain. The target is the
// frequency-domain one (the picture wraps round at its edges). A hard-edged gain rings; a smooth fall from 1 to 0 of
// about the right width passes.
const softTarget = (img) => lowpass(img, 'gauss', N / TAU)
const ROADS = [
  [{ zh: '方块', en: 'Square' }, box(8, 8, 16, 16, 0.2, 0.8), 3],
  [{ zh: '圆盘', en: 'Disc' }, disk(15, 16, 8, 0.15, 0.85), 4],
  [{ zh: '半边亮', en: 'Half bright' }, box(16, 0, 16, 32, 0.25, 0.75), 5],
]
const ROADS_HIDDEN = [
  [{ zh: '字母 T', en: 'Letter T' }, glyph(GLYPHS.T, 0.2, 0.8), 6],
  [{ zh: '两个圆点', en: 'Two dots' }, fromFn(N, N, (x, y) => ((x - 10) ** 2 + (y - 11) ** 2 <= 25 || (x - 21) ** 2 + (y - 20) ** 2 <= 25 ? 0.8 : 0.2)), 7],
]
const roadTest = ([label, img, seed]) => {
  const noisy = addNoise(img, seed, 0.15)
  return test(label, { in: noisy, r: radius }, { out: softTarget(noisy) })
}
// A gain of 1 inside radius R, 0 outside; and a raised cosine that falls smoothly from 1 at the centre to 0 at R.
const diskGain = (R) => ({ nodes: { n: ['arith', { op: 'mul' }], nN: ['const', { c: -1 }], o: ['arith', { op: 'add' }], oN: ['const', { c: R }], t: ['threshold', { t: 0 }] }, wires: ['r>n.a', 'n>o.a', 'o>t', 'nN>n.b', 'oN>o.b'], out: 't' })
const hannGain = (R) => ({
  nodes: { ...diskGain(R).nodes, sc: ['arith', { op: 'mul' }], scN: ['const', { c: Math.PI / R }], cs: 'cos', hf: ['arith', { op: 'mul' }], hfN: ['const', { c: 0.5 }], up: ['arith', { op: 'add' }], upN: ['const', { c: 0.5 }], g: ['arith', { op: 'mul' }] },
  wires: [...diskGain(R).wires, 'r>sc.a', 'sc>cs', 'cs>hf.a', 'hf>up.a', 'up>g.a', 't>g.b', 'scN>sc.b', 'hfN>hf.b', 'upN>up.b'],
  out: 'g',
})
const filtered = (gain) => rg({ ...gain.nodes, f: 'fqApply' }, [...gain.wires, 'in>f.in', `${gain.out}>f.gain`, 'f>out'])

const roads = {
  id: '2-5',
  chapter: 2,
  ...RADIUS,
  title: { zh: '两条路', en: 'Two roads' },
  brief: { zh: '期望的输出是一种柔和的模糊，没有任何波纹。这次不在图上模糊，而是到频域里去：给每个频率一个增益，用「频域相乘」处理照片。增益图要你自己用「频率半径」做出来。', en: 'The expected output is a soft blur with no ripples at all. This time you do not blur on the picture; you go to the frequency domain instead: give each frequency a gain and process the photo with "Multiply in frequency". You make the gain picture yourself, from "Frequency radius".' },
  hint: { zh: '低频留下、高频压掉。一刀切的增益会在边旁边留下一圈圈波纹，看误差图。', en: 'Keep the low frequencies, press down the high ones. A gain that cuts off sharply leaves rings beside the edges: look at the error map.' },
  after: { zh: '空间里的模糊，等于频域里给每个频率乘一个增益，这叫卷积定理。一刀切的增益变回空间，是一个两侧带负瓣的核，边上冒出一圈圈波纹（振铃）；平滑下降的增益几乎没有。你搭的东西成了「频域低通」元件：形状选硬圆盘或高斯，半径 R 可调。高斯增益变回空间还是高斯，期望里的模糊就是它。', en: 'A blur in space equals multiplying every frequency by a gain in the frequency domain: the convolution theorem. A sharp cut-off gain, turned back into space, is a kernel with negative side lobes, so rings appear beside edges (ringing); a gain that falls smoothly has hardly any. What you built is now the "Frequency low-pass" part: choose a hard disc or a Gaussian shape, with an adjustable radius R. A Gaussian gain turned back into space is still a Gaussian, and that is the blur the expected output used.' },
  unlocks: ['freq-filter'],
  palette: ['fqApply', 'fqSpectrum', 'cos', 'threshold', 'arith', 'merge', 'const', 'invert'],
  check: { tolerance: 0.03, mismatches: 8 },
  tests: ROADS.map(roadTest),
  hidden: ROADS_HIDDEN.map(roadTest),
  solution: filtered(hannGain(12)),
  naive: filtered(diskGain(6)),
  alsoFails: [filtered(diskGain(4)), filtered(diskGain(8)), filtered(hannGain(8))],
}

// ---------------- 2-6 低通 ----------------

// Fine-grained noise: random values with everything below 10 cycles per image removed, std 0.07.
const fineNoise = (seed, std = 0.07) => {
  const next = random(seed)
  const raw = highpass(fromFn(N, N, () => next() - 0.5), 'disk', 10)
  const rms = Math.sqrt(raw.data.reduce((sum, v) => sum + v * v, 0) / raw.data.length)
  return map(raw, (v) => (v * std) / rms)
}
// The target is the clean scene through the familiar spatial blur (σ = 1, copy-edge border).
const softened = (img) => correlate(img, gaussianKernel(1), 'edge')
// Grey levels 0.2…0.8 so the noisy photos stay inside 0…1.
const LOWPASS_SCENES = [
  [{ zh: '方块', en: 'Square' }, box(8, 8, 16, 16, 0.2, 0.8)],
  [{ zh: '圆盘', en: 'Disk' }, disk(15.5, 15.5, 10, 0.2, 0.8)],
  [{ zh: '字母 T', en: 'Letter T' }, glyph(GLYPHS.T, 0.2, 0.8)],
  [{ zh: '横条', en: 'Horizontal bar' }, box(6, 12, 20, 8, 0.25, 0.75)],
]
// Held back: new shapes under new noise, one of them dark on a light ground.
const LOWPASS_HIDDEN = [
  [{ zh: '字母 L', en: 'Letter L' }, glyph(GLYPHS.L, 0.2, 0.8, 8, 5)],
  [{ zh: '两个圆点', en: 'Two dots' }, fromFn(N, N, (x, y) => ((x - 10) ** 2 + (y - 11) ** 2 <= 25 || (x - 21) ** 2 + (y - 20) ** 2 <= 25 ? 0.8 : 0.2))],
  [{ zh: '亮底暗块', en: 'Dark block on light ground' }, box(10, 6, 12, 18, 0.75, 0.25)],
]
const filter = (shape, R) => build({ f: ['fqLowpass', { shape, R }] }, ['in>f', 'f>out'])

const lowpassLevel = {
  id: '2-6',
  chapter: 2,
  title: { zh: '低通', en: 'Low-pass' },
  brief: { zh: '照片里混进了细密的噪点。用「频域低通」去掉它们，输出要和期望一样干净、柔和。', en: 'Fine noise has crept into the photos. Remove it with "Frequency low-pass": the output must be as clean and soft as the expected image.' },
  hint: { zh: '离频谱中心 R 以内的频率留下，以外压掉。两种掩膜形状，哪种不起波纹？盯住误差图里边缘两侧出现的东西。', en: 'Frequencies within R of the spectrum\'s centre stay, and the rest are pressed down. Of the two mask shapes, which makes no ripples? Watch what appears on both sides of the edges in the error map.' },
  after: { zh: '和「两条路」里一样：硬圆盘一刀切，等于用一个带负瓣的核做卷积，边缘两侧冒出一圈圈亮暗波纹（振铃）；高斯掩膜平滑过渡，对应的核还是高斯，没有波纹。期望图其实是 σ = 1 的空间高斯模糊，对应的掩膜宽度 R = N/(2πσ) = 32/(2π) ≈ 5。空间里卷积，等于频域里相乘，这就是卷积定理。', en: 'Just as in "Two roads": a hard disk cuts sharply, which is the same as a convolution with a kernel that has negative lobes, so rings of light and dark ripple out on both sides of an edge (ringing). A Gaussian mask falls off smoothly; its kernel is still a Gaussian, with no ripples. The expected image is in fact a spatial Gaussian blur with σ = 1, which matches a mask width of R = N/(2πσ) = 32/(2π) ≈ 5. Convolution in space equals multiplication in the frequency domain: this is the convolution theorem.' },
  unlocks: [],
  palette: ['fqLowpass', 'fqSpectrum', 'arith', 'merge', 'const'],
  check: { tolerance: 0.03, mismatches: 8 },
  tests: LOWPASS_SCENES.map(([label, img], index) => test(label, { in: plus(img, fineNoise(index + 31)) }, { out: softened(img) })),
  hidden: LOWPASS_HIDDEN.map(([label, img], index) => test(label, { in: plus(img, fineNoise(index + 41)) }, { out: softened(img) })),
  solution: filter('gauss', 5),
  // The first idea: cut the spectrum off sharply. No radius works: small ones ring and over-blur,
  // large ones let the noise back in.
  naive: filter('disk', 7),
  alsoFails: [filter('disk', 4), filter('disk', 5), filter('disk', 10), filter('disk', 14), filter('gauss', 4), filter('gauss', 6.5), build({}, ['in>out'])],
}

// ---------------- 2-7 去网纹 ----------------

// A photo of a printed picture picks up a regular screen: one stripe pattern, a pair of bright dots in the spectrum.
// The target removes every spectrum cell beyond radius 3 brighter than 0.6, the dots, and keeps the rest.
const SCREEN_T = 0.6
const SCREEN_R = 3
const descreen = (img) => {
  const s = magnitudeSpectrum(img)
  return applyGain(img, fromFn(N, N, (x, y) => (s.data[y * N + x] > SCREEN_T && radius.data[y * N + x] > SCREEN_R ? 0 : 1)))
}
const screened = (img, fx, fy) => zip(img, grating(fx, fy, 0.12), (p, q) => p + q - 0.5)
const screenTest = ([label, img, fx, fy]) => {
  const photo = screened(img, fx, fy)
  return test(label, { in: photo, r: radius }, { out: descreen(photo) })
}

const descreenLevel = {
  id: '2-7',
  chapter: 2,
  ...RADIUS,
  title: { zh: '去网纹', en: 'Remove the screen' },
  brief: { zh: '翻拍印刷的照片，常常带上一层规则的网纹。在频谱里，网纹是一对很亮的点。去掉频谱里半径 3 以外、比 0.6 还亮的格子，其余保持不变，输出去掉网纹的照片。每张照片的网纹方向和疏密都不一样。', en: 'A photo of a printed picture often picks up a regular screen pattern. In the spectrum the screen is a pair of very bright dots. Remove the spectrum cells beyond radius 3 that are brighter than 0.6, keep everything else, and output the photo without its screen. Each photo\'s screen has a different direction and spacing.' },
  hint: { zh: '网纹在哪，得从这张照片自己的频谱里找。找到的地方增益为 0，其余为 1。', en: 'Where the screen is has to be found from this photo\'s own spectrum. Make the gain 0 where you find it and 1 everywhere else.' },
  after: { zh: '一组规则的条纹，在频谱里只占一对点；照片本身的内容散在各处。把那对点挖掉，条纹就没了，照片几乎不受影响。修图软件的「去网纹」、去掉扫描件上的摩尔纹，都是这个办法。', en: 'A regular stripe pattern takes up just one pair of dots in the spectrum, while the photo\'s own content is spread all over. Dig out that pair and the stripes are gone, with the photo hardly touched. "Descreen" in photo editors, and removing moiré from scans, work this way.' },
  unlocks: [],
  palette: ['fqApply', 'fqSpectrum', 'fqLowpass', 'threshold', 'arith', 'merge', 'const', 'invert'],
  check: { tolerance: 0.02, mismatches: 4 },
  tests: [
    [{ zh: '竖网纹', en: 'Vertical screen' }, disk(15.5, 15.5, 9, 0.25, 0.75), 6, 0],
    [{ zh: '横网纹', en: 'Horizontal screen' }, glyph(GLYPHS.T, 0.25, 0.75), 0, 5],
    [{ zh: '斜网纹', en: 'Slanted screen' }, box(8, 8, 16, 16, 0.25, 0.75), 4, 4],
  ].map(screenTest),
  hidden: [
    [{ zh: '另一种斜网纹', en: 'Another slanted screen' }, glyph(GLYPHS.L, 0.25, 0.75, 8, 5), 7, -3],
    [{ zh: '细网纹', en: 'Fine screen' }, disk(12, 18, 7, 0.75, 0.25), 9, 0],
  ].map(screenTest),
  solution: rg({ s: 'fqSpectrum', p: ['threshold', { t: SCREEN_T }], o: ['threshold', { t: SCREEN_R }], m: ['arith', { op: 'mul' }], g: 'invert', f: 'fqApply' }, ['in>s', 's>p', 'r>o', 'p>m.a', 'o>m.b', 'm>g', 'in>f.in', 'g>f.gain', 'f>out']),
  naive: rg({}, ['in>out']),
  alsoFails: [rg({ f: ['fqLowpass', { shape: 'gauss', R: 4 }] }, ['in>f', 'f>out'])],
}

// ---------------- 2-8 混合图像 ----------------

const HYBRID_R = 3
const hybrid = (a, b) => plus(lowpass(a, 'gauss', HYBRID_R), highpass(b, 'gauss', HYBRID_R))
const HYBRID_PAIRS = [
  [{ zh: '圆盘 + X', en: 'Disk + X' }, disk(15.5, 15.5, 9, 0.15, 0.85), glyph(GLYPHS.X, 0.35, 0.65)],
  [{ zh: '方块 + T', en: 'Square + T' }, box(6, 6, 20, 20, 0.15, 0.85), glyph(GLYPHS.T, 0.35, 0.65)],
  [{ zh: '小圆 + 棋盘', en: 'Small disk + checkerboard' }, disk(11, 12, 7, 0.15, 0.85), checker(2, 0.4, 0.6)],
]
// Held back: B at full contrast with big shapes of its own, and the roles of letter and shape swapped,
// so a high-pass of B with the wrong mask or radius, or B let through whole, shows.
const HYBRID_HIDDEN = [
  [{ zh: '横条 + O', en: 'Horizontal bar + O' }, box(4, 10, 24, 12, 0.2, 0.8), glyph(GLYPHS.O, 0.1, 0.9)],
  [{ zh: 'X + 圆盘', en: 'X + disk' }, glyph(GLYPHS.X, 0.15, 0.85), disk(18, 14, 8, 0.2, 0.8)],
  [{ zh: '暗圆 + 粗棋盘', en: 'Dark disk + coarse checkerboard' }, disk(19, 17, 8, 0.85, 0.15), checker(4, 0.25, 0.75)],
]
const hybridGraph = (nodes, wires) => build(nodes, wires, { inputs: ['a', 'b'] })
const gaussLow = (R = HYBRID_R) => ['fqLowpass', { shape: 'gauss', R }]

const hybridLevel = {
  id: '2-8',
  chapter: 2,
  title: { zh: '混合图像', en: 'Hybrid images' },
  inputs: ['a', 'b'],
  inputLabels: { a: 'A', b: 'B' },
  brief: { zh: '输出 = A 的低频 + B 的高频，两处都用半径 3 的高斯掩膜。近看是 B，远看是 A。', en: 'Output = the low frequencies of A + the high frequencies of B, both with a Gaussian mask of radius 3. Up close you see B; from afar, A.' },
  hint: { zh: '你只有低通。原图里去掉低频，还剩下什么？', en: 'You only have a low-pass. Take the low frequencies out of an image: what is left?' },
  after: { zh: '高通 = 原图 − 低通，也就是掩膜 1 − H。A 只留下大轮廓，B 只留下边缘和细纹，叠在一起：近看细节占上风，远看或眯起眼时细节消失，只剩 A。滤波是线性的，所以 低通(A − B) + B 也是同一个结果，只用一次变换。', en: 'High-pass = image − low-pass, that is, the mask 1 − H. A keeps only its broad outline and B only its edges and fine texture. Added together, the detail wins up close; from afar, or with squinted eyes, the detail disappears and only A is left. Filtering is linear, so low-pass(A − B) + B gives the same result with a single transform.' },
  unlocks: [],
  palette: ['fqLowpass', 'fqSpectrum', 'arith', 'merge', 'const'],
  check: { tolerance: 0.02 },
  tests: HYBRID_PAIRS.map(([label, a, b]) => test(label, { a, b }, { out: hybrid(a, b) })),
  hidden: HYBRID_HIDDEN.map(([label, a, b]) => test(label, { a, b }, { out: hybrid(a, b) })),
  solution: hybridGraph({ la: gaussLow(), lb: gaussLow(), hb: ['arith', { op: 'sub' }], sum: ['arith', { op: 'add' }] }, ['a>la', 'b>lb', 'b>hb.a', 'lb>hb.b', 'la>sum.a', 'hb>sum.b', 'sum>out']),
  naive: hybridGraph({ sum: ['arith', { op: 'add' }] }, ['a>sum.a', 'b>sum.b', 'sum>out']),
  alsoFails: [
    // Low-pass A, but B added whole: its low frequencies (its average, its big shapes) come along.
    hybridGraph({ la: gaussLow(), sum: ['arith', { op: 'add' }] }, ['a>la', 'la>sum.a', 'b>sum.b', 'sum>out']),
    // Both low-passed.
    hybridGraph({ la: gaussLow(), lb: gaussLow(), sum: ['arith', { op: 'add' }] }, ['a>la', 'b>lb', 'la>sum.a', 'lb>sum.b', 'sum>out']),
    // Right wiring, hard masks: ringing again.
    hybridGraph({ la: ['fqLowpass', { shape: 'disk', R: HYBRID_R }], lb: ['fqLowpass', { shape: 'disk', R: HYBRID_R }], hb: ['arith', { op: 'sub' }], sum: ['arith', { op: 'add' }] }, ['a>la', 'b>lb', 'b>hb.a', 'lb>hb.b', 'la>sum.a', 'hb>sum.b', 'sum>out']),
    // Roles swapped: B's outline and A's detail.
    hybridGraph({ lb: gaussLow(), la: gaussLow(), ha: ['arith', { op: 'sub' }], sum: ['arith', { op: 'add' }] }, ['b>lb', 'a>la', 'a>ha.a', 'la>ha.b', 'lb>sum.a', 'ha>sum.b', 'sum>out']),
  ],
}

// ---------------- 2-9 采样 ----------------

const ALIAS_FINE = 256
const aliasWave = { c: 0.5, A: 0.4 }
const ALIAS_STAGES = [
  {
    title: { zh: '冒名顶替', en: 'Impostor' },
    note: { zh: '只采 16 个点。空心圈是 k = 3 的波采到的值。找一个别的频率，采到的点和它一模一样。', en: 'Only 16 samples. The hollow rings are the values sampled from the k = 3 wave. Find another frequency whose samples are exactly the same.' },
    control: 'k',
    samples: 16,
    reference: { ...aliasWave, k: 3, phase: 0 },
    start: 4,
  },
  {
    title: { zh: '最少几个点', en: 'Fewest points' },
    note: { zh: '一道 k = 5 的波。减少采样点数，直到从点上再也看不出原来的波。能看对的最少是几个点？', en: 'A k = 5 wave. Reduce the number of samples until the points no longer show the original wave. What is the fewest that still reads it correctly?' },
    control: 'M',
    wave: { ...aliasWave, k: 5, phase: 30 },
    start: 16,
  },
  {
    title: { zh: '先滤再采', en: 'Filter, then sample' },
    note: { zh: '这条线由四道波组成，要采 16 个点。采之前先把太快的波滤掉：保留哪些频率，采出来才和「应有的样子」一致？', en: 'This line is made of four waves and will be sampled at 16 points. Filter out the waves that are too fast before sampling: which frequencies should you keep so the samples match "how it should look"?' },
    control: 'K',
    samples: 16,
    parts: [
      { k: 2, A: 0.22, phase: 0 },
      { k: 7, A: 0.1, phase: 40 },
      { k: 9, A: 0.1, phase: 0 },
      { k: 12, A: 0.08, phase: 70 },
    ],
    start: 16,
  },
]
const ALIAS_RANGES = { k: [0, 24], M: [4, 24], K: [0, 16] }
const signalOf = (parts, keep = Infinity) => (u) => parts.filter((p) => p.k <= keep).reduce((s, p) => s + cosine({ ...p, c: 0 })(u), 0.5)
// Can the wave be read back from M samples? The smoothest curve through them must be the wave.
const faithful = (w, M) => {
  const back = throughSamples(sampleAt(cosine(w), M))
  return maxDiff(sampleAt(back, ALIAS_FINE), sampleAt(cosine(w), ALIAS_FINE)) < 1e-6
}
// What each stage counts as solved, given its one control's value.
const aliasSolved = (stage, v) => {
  if (stage.control === 'k') return v !== stage.reference.k && maxDiff(sampleAt(cosine({ ...stage.reference, k: v }), stage.samples), sampleAt(cosine(stage.reference), stage.samples)) < 1e-6
  if (stage.control === 'M') return faithful(stage.wave, v) && !faithful(stage.wave, v - 1)
  const truth = sampleAt(signalOf(stage.parts, stage.samples / 2), stage.samples)
  const got = sampleAt(signalOf(stage.parts, v), stage.samples)
  return maxDiff(got, truth) < 1e-6 && v >= Math.max(...stage.parts.filter((p) => 2 * p.k <= stage.samples).map((p) => p.k))
}

const aliasLevel = {
  id: '2-9',
  kind: 'board',
  board: 'AliasProbe',
  chapter: 2,
  title: { zh: '采样', en: 'Sampling' },
  brief: { zh: '把一条连续的波变成一排点，只保留采到的值。三个小实验，看看采样会把什么弄丢、又会凭空造出什么。', en: 'Turn a continuous wave into a row of points, keeping only the sampled values. Three small experiments show what sampling loses, and what it makes up out of nothing.' },
  hint: { zh: '点之间发生了什么，采样后谁也不知道。一个周期里至少要有几个点，才认得出这道波？', en: 'Once sampled, nobody knows what happened between the points. How many points per cycle, at least, does it take to recognise the wave?' },
  after: { zh: '采 M 个点，只能分辨 M/2 以下的频率（奈奎斯特频率）。更快的波不会消失，而是折回来，冒充成一道慢波（k 冒充成 M − k），这就是混叠，采完以后无法再分开。所以要在采样之前把高于 M/2 的频率去掉，也就是先低通、再采样。', en: 'With M samples you can only tell apart frequencies below M/2 (the Nyquist frequency). Faster waves do not vanish: they fold back and pose as a slower wave (k poses as M − k). This is aliasing, and once sampled the two can no longer be separated. So frequencies above M/2 must be removed before sampling: low-pass first, then sample.' },
  unlocks: ['downsample'],
  alias: { stages: ALIAS_STAGES, ranges: ALIAS_RANGES, fine: ALIAS_FINE, signalOf, solved: aliasSolved, aliasOf, faithful },
  verify() {
    const answers = ALIAS_STAGES.map((stage) => {
      const [lo, hi] = ALIAS_RANGES[stage.control]
      if (aliasSolved(stage, stage.start)) return null
      return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).filter((v) => aliasSolved(stage, v))
    })
    if (answers.some((a) => a === null)) return '有一步一开始就算完成'
    const [impostors, fewest, keep] = answers
    if (impostors.join() !== '13,19') return `冒名顶替的答案是 ${impostors.join('、')}`
    if (fewest.join() !== '11') return `最少点数的答案是 ${fewest.join('、')}`
    if (keep.join() !== '7,8') return `先滤再采的答案是 ${keep.join('、')}`
    // With no filter, the k = 9 and 12 waves land on 7 and 4.
    if (aliasOf(9, 16) !== 7 || aliasOf(12, 16) !== 4) return '折回的频率不对'
    return ''
  },
}

// ---------------- 2-10 一次就够 (challenge) ----------------

const TRANSFORMS = new Set(['fqLowpass', 'fqApply'])
const once = {
  ...hybridLevel,
  id: '2-10',
  title: { zh: '一次就够', en: 'Once is enough' },
  brief: { zh: '还是混合图像：A 的低频 + B 的高频，两处都用半径 3 的高斯掩膜。这次频域的元件（频域低通、频域相乘）一共只准用一个。', en: 'A hybrid image again: the low frequencies of A + the high frequencies of B, both with a Gaussian mask of radius 3. This time you may use only one frequency-domain part (Frequency low-pass or Multiply in frequency) in all.' },
  hint: { zh: '把混合图像写成式子看看。', en: 'Write the hybrid image out as a formula.' },
  after: { zh: '滤波是线性的：低通(A) − 低通(B) = 低通(A − B)。先合起来再滤，和分别滤完再合，结果一样，变换只做一次就够了。很多看起来要算两遍的事，都能这样合成一遍。', en: 'Filtering is linear: low-pass(A) − low-pass(B) = low-pass(A − B). Combining first and then filtering gives the same as filtering each and then combining, so one transform is enough. Many things that look as if they need computing twice can be merged into once like this.' },
  constraint: (_, graph) => {
    const used = graph.nodes.filter((node) => TRANSFORMS.has(node.type)).length
    return used > 1 ? { zh: `用了 ${used} 个频域元件，最多 1 个`, en: `${used} frequency-domain parts used, at most 1` } : ''
  },
  solution: hybridGraph({ d: ['arith', { op: 'sub' }], l: gaussLow(), s: ['arith', { op: 'add' }] }, ['a>d.a', 'b>d.b', 'd>l', 'l>s.a', 'b>s.b', 's>out']),
  naive: hybridLevel.solution,
  alsoFails: [],
}

// ---------------- 2-11 … 2-14 缩略图服务 (series) ----------------

const prefiltered = (img) => downsample(correlate(img, gaussianKernel(1), 'edge'), 2)

const half = {
  id: '2-11',
  chapter: 2,
  title: { zh: '缩小一半', en: 'Half the size' },
  brief: { zh: '把 32×32 的图缩成 16×16，看起来要和原图一样（只是变小）。', en: 'Shrink a 32×32 image to 16×16. It should look like the original, only smaller.' },
  hint: { zh: '隔点取样把每行 32 个点变成 16 个。采样台上看过：16 个点能分辨到哪个频率？更快的纹会怎样？在扔掉点之前，先做点什么。', en: 'Downsampling turns the 32 pixels in each row into 16. As the sampling bench showed: up to what frequency can 16 samples tell apart? What happens to faster stripes? Do something before you throw pixels away.' },
  after: { zh: '直接隔点取样，频率高于 8 的细纹会折回来，冒充成原图里没有的粗纹（莫尔纹），这就是混叠。先用高斯模糊把这些频率压下去，再取样：抗混叠必须发生在采样之前。拍照、缩略图都会遇到同一个问题。', en: 'Downsample directly and fine stripes above frequency 8 fold back, posing as coarse stripes the original never had (moiré). That is aliasing. Suppress those frequencies with a Gaussian blur first, then sample: anti-aliasing must happen before sampling. Cameras and thumbnails both face the same problem.' },
  unlocks: [],
  palette: ['downsample', 'gauss', 'box3'],
  check: { tolerance: 0.12, mismatches: 6 },
  tests: [
    [{ zh: '斑马板', en: 'Zone plate' }, P.zonePlate(32, 32, 0.06)],
    [{ zh: '细条纹', en: 'Fine stripes' }, P.stripes(2.5, 0.1, 0.9, 32, 32)],
    [{ zh: '大圆盘', en: 'Large disc' }, fromFn(32, 32, (x, y) => ((x - 15.5) ** 2 + (y - 15.5) ** 2 < 100 ? 0.9 : 0.1))],
  ].map(([label, img]) => test(label, { in: img }, { out: prefiltered(img) })),
  hidden: [
    [{ zh: '横向细条纹', en: 'Fine horizontal stripes' }, fromFn(32, 32, (x, y) => (Math.floor((y * 2) / 2.5) % 2 ? 0.9 : 0.1))],
    [{ zh: '细棋盘', en: 'Fine checkerboard' }, fromFn(32, 32, (x, y) => ((x + y) % 2 ? 0.85 : 0.15))],
    [{ zh: '偏心斑马板', en: 'Off-centre zone plate' }, fromFn(32, 32, (x, y) => 0.5 + 0.4 * Math.cos(0.05 * ((x - 10) ** 2 + (y - 20) ** 2)))],
  ].map(([label, img]) => test(label, { in: img }, { out: prefiltered(img) })),
  solution: build({ g: ['gauss', { sigma: 1, border: 'edge' }], d: 'downsample' }, ['in>g', 'g>d', 'd>out']),
  naive: build({ d: 'downsample' }, ['in>d', 'd>out']),
}

const shrinkTo = (img, steps, sigma) => {
  let out = correlate(img, gaussianKernel(sigma), 'edge')
  for (let i = 0; i < steps; i++) out = downsample(out, 2)
  return out
}
// A pyramid: blur a little and halve, again and again.
const pyramid = (img, levels) => {
  let out = img
  for (let i = 0; i < levels; i++) out = downsample(correlate(out, gaussianKernel(1), 'edge'), 2)
  return out
}
const zone = (k, cx = 16, cy = 16) => fromFn(N, N, (x, y) => 0.5 + 0.4 * Math.cos(k * ((x - cx) ** 2 + (y - cy) ** 2)))
const fabric = (period, angle) => {
  const t = (angle * Math.PI) / 180
  return fromFn(N, N, (x, y) => 0.5 + 0.35 * Math.cos((TAU * (x * Math.cos(t) + y * Math.sin(t))) / period))
}
const bigText = glyph(GLYPHS.F, 0.15, 0.85, 4, 4, 5)
const chain = (stages) => {
  const nodes = {}
  const wires = []
  let last = 'in'
  stages.forEach(([type, params], i) => {
    nodes[`n${i}`] = [type, params]
    wires.push(`${last}>n${i}`)
    last = `n${i}`
  })
  wires.push(`${last}>out`)
  return build(nodes, wires)
}
const blurThenDrop = (sigma, drops) => chain([['gauss', { sigma, border: 'edge' }], ...Array.from({ length: drops }, () => ['downsample', {}])])
const pyramidGraph = (levels) => chain(Array.from({ length: levels }, () => [['gauss', { sigma: 1, border: 'edge' }], ['downsample', {}]]).flat())
const costCap = (cap) => (score) => (score.cost > cap ? { zh: `计算量 ${score.cost}，超过 ${cap}`, en: `Cost ${score.cost}, over ${cap}` } : '')
const THUMB_PALETTE = ['downsample', 'gauss', 'box3', 'fqLowpass']

const quarter = {
  id: '2-12',
  chapter: 2,
  title: { zh: '缩小四倍', en: 'A quarter of the size' },
  brief: { zh: '把 32×32 缩成 8×8，看起来要和原图一样，只是小了。', en: 'Shrink 32×32 to 8×8. It should look like the original, only smaller.' },
  hint: { zh: '缩小一半时先模糊了一下。缩小四倍，要糊多少？', en: 'Halving the size needed a blur first. How much blur for a quarter?' },
  after: { zh: '缩得越狠，能留下的频率越低，采样前就要糊得越厉害：缩小 4 倍，σ 大约要翻一倍。', en: 'The more you shrink, the lower the frequencies that can survive, so the harder you must blur before sampling: shrinking 4 times needs about twice the σ.' },
  unlocks: [],
  palette: THUMB_PALETTE,
  check: { tolerance: 0.1, mismatches: 3 },
  tests: [[{ zh: '斑马板', en: 'Zone plate' }, zone(0.06)], [{ zh: '布纹', en: 'Fabric' }, fabric(3, 30)], [{ zh: '字母 F', en: 'Letter F' }, bigText]].map(([label, img]) => test(label, { in: img }, { out: shrinkTo(img, 2, 2) })),
  hidden: [[{ zh: '偏心斑马板', en: 'Off-centre zone plate' }, zone(0.05, 10, 20)], [{ zh: '细布纹', en: 'Fine fabric' }, fabric(2.5, 75)]].map(([label, img]) => test(label, { in: img }, { out: shrinkTo(img, 2, 2) })),
  solution: blurThenDrop(2, 2),
  naive: blurThenDrop(1, 2),
  alsoFails: [chain([['downsample', {}], ['downsample', {}]])],
}

const steps = {
  id: '2-13',
  chapter: 2,
  title: { zh: '分两次缩', en: 'Shrink in two steps' },
  brief: { zh: '还是 32×32 缩成 8×8，但计算量不能超过 18。在小图上做事比在大图上便宜：图只有四分之一大时，同样的元件只花四分之一。', en: 'Again shrink 32×32 to 8×8, but the cost must not exceed 18. Working on a small picture is cheaper than on a big one: on a picture a quarter of the size, the same part costs a quarter as much.' },
  hint: { zh: '大的模糊很贵。缩小一半以后，图上的一格相当于原来的两格。', en: 'A big blur is expensive. After halving, one pixel of the picture stands for two of the original.' },
  after: { zh: '小模糊、减半，再小模糊、减半：每一层都只做便宜的事，越往下越便宜。这样一层层缩小的图叫图像金字塔，缩略图、多尺度的特征检测都靠它。', en: 'A small blur and a halving, then a small blur and a halving again: each level does only cheap work, and each is cheaper than the last. A picture shrunk level by level like this is an image pyramid; thumbnails and multi-scale feature detection rely on it.' },
  unlocks: [],
  palette: THUMB_PALETTE,
  constraint: costCap(18),
  check: { tolerance: 0.1, mismatches: 3 },
  tests: [[{ zh: '斑马板', en: 'Zone plate' }, zone(0.06)], [{ zh: '布纹', en: 'Fabric' }, fabric(3, 30)], [{ zh: '字母 F', en: 'Letter F' }, bigText]].map(([label, img]) => test(label, { in: img }, { out: pyramid(img, 2) })),
  hidden: [[{ zh: '偏心斑马板', en: 'Off-centre zone plate' }, zone(0.05, 10, 20)], [{ zh: '细布纹', en: 'Fine fabric' }, fabric(2.5, 75)]].map(([label, img]) => test(label, { in: img }, { out: pyramid(img, 2) })),
  solution: pyramidGraph(2),
  naive: blurThenDrop(2, 2),
}

const thumbnails = {
  id: '2-14',
  chapter: 2,
  title: { zh: '缩略图服务', en: 'Thumbnail service' },
  brief: { zh: '相册要给每张照片做 4×4 的小图标：从 32×32 缩成 4×4，斑马板、布纹、文字都不能出莫尔纹，计算量不能超过 19。', en: 'The photo album wants a 4×4 icon for every photo: shrink 32×32 to 4×4 with no moiré on zone plates, fabric or text, and a cost of no more than 19.' },
  hint: { zh: '前三关各管一件事：先模糊再取样、糊多少、在小图上做事更便宜。', en: 'Each of the last three levels settled one thing: blur before sampling, how much to blur, and working on small pictures being cheaper.' },
  after: { zh: '缩略图服务每天要处理成千上万张照片：先低通再采样防止混叠，一层层缩小省下计算量。作业 1 比较直接卷积、可分离卷积和 FFT 的速度，比的也是同一笔账。', en: 'A thumbnail service handles thousands of photos a day: low-pass before sampling against aliasing, and shrinking level by level to save work. Assignment 1, comparing the speed of direct convolution, separable convolution and the FFT, does the same accounting.' },
  unlocks: [],
  palette: THUMB_PALETTE,
  constraint: costCap(19),
  check: { tolerance: 0.1, mismatches: 1 },
  tests: [[{ zh: '斑马板', en: 'Zone plate' }, zone(0.08)], [{ zh: '布纹', en: 'Fabric' }, fabric(2.5, 20)], [{ zh: '字母 F', en: 'Letter F' }, bigText], [{ zh: '细条纹', en: 'Fine stripes' }, P.stripes(2.5, 0.1, 0.9, 32, 32)]].map(([label, img]) => test(label, { in: img }, { out: pyramid(img, 3) })),
  hidden: [[{ zh: '偏心斑马板', en: 'Off-centre zone plate' }, zone(0.07, 20, 12)], [{ zh: '细棋盘', en: 'Fine checkerboard' }, fromFn(N, N, (x, y) => ((x + y) % 2 ? 0.85 : 0.15))]].map(([label, img]) => test(label, { in: img }, { out: pyramid(img, 3) })),
  solution: pyramidGraph(3),
  naive: blurThenDrop(4, 3),
  alsoFails: [chain([['downsample', {}], ['downsample', {}], ['downsample', {}]])],
}

export const levels = [waveBench, superpose, probeLevel, focus, roads, lowpassLevel, descreenLevel, hybridLevel, aliasLevel, once, half, quarter, steps, thumbnails]
