// Chapter 2 (frequency, lecture 4), the hands-on half: before any spectrum or frequency filter is
// handed over, the player tunes one wave (2-1), builds shapes out of waves (2-2), measures how much
// of one wave a picture holds (2-3), filters by turning frequencies up and down (2-5) and watches
// fast waves fold back when sampled (2-7). Each board's maths lives in engine/waves.js.
import { fromFn, image, zip } from '../engine/image.js'
import { NODE_TYPES } from '../engine/nodes.js'
import { aliasOf, amplitudes, applyGains, blur, cosine, kernelOf, maxDiff, rms, sampleAt, sineSum, throughSamples } from '../engine/waves.js'
import { build, test } from './util.js'

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
  fqMean: {
    label: { zh: '求平均', en: 'Average' },
    description: { zh: '把一列数平均成一个数', en: 'Averages a row of numbers into a single number' },
    inputs: ['in'],
    eval: ({ in: a }) => image(1, 1, a.data.reduce((sum, v) => sum + v, 0) / a.data.length),
    cost: 1,
  },
}
// The reference graphs below are built at load time and need these types registered first.
Object.assign(NODE_TYPES, nodes)

// ---------------- 2-1 一道波 ----------------

// Every knob moves in steps, so each target is hit exactly; matching means the curves coincide.
const KNOBS = {
  k: { label: { zh: '频率 k', en: 'Frequency k' }, min: 0, max: 10, step: 1, unit: { zh: '个周期', en: 'cycles' } },
  A: { label: { zh: '振幅 A', en: 'Amplitude A' }, min: 0, max: 0.5, step: 0.05 },
  c: { label: { zh: '平均亮度 c', en: 'Average brightness c' }, min: 0, max: 1, step: 0.05 },
  phase: { label: { zh: '相位 φ', en: 'Phase φ' }, min: 0, max: 330, step: 30, unit: '°' },
  kx: { label: { zh: '横向 kx', en: 'Across kx' }, min: 0, max: 8, step: 1 },
  ky: { label: { zh: '纵向 ky', en: 'Down ky' }, min: -8, max: 8, step: 1 },
}
const TUNER_START = { c: 0.5, A: 0.4, k: 1, phase: 0, kx: 1, ky: 0 }
const TUNER_STAGES = [
  {
    title: { zh: '数波峰', en: 'Count the peaks' },
    note: { zh: '只有频率能动。让你的条纹和目标一样密：数一数整幅宽度里有几个亮条。', en: 'Only the frequency moves. Make your stripes as dense as the target\'s: count the light stripes across the whole width.' },
    knobs: ['k'],
    target: { c: 0.5, A: 0.4, k: 3, phase: 0 },
  },
  {
    title: { zh: '深浅', en: 'Light and dark' },
    note: { zh: '密度对了，可目标更亮、明暗差更小。两个新旋钮分别管什么？', en: 'The density is right, but the target is brighter and has less contrast. What does each of the two new knobs control?' },
    knobs: ['k', 'A', 'c'],
    target: { c: 0.65, A: 0.15, k: 3, phase: 0 },
  },
  {
    title: { zh: '错位', en: 'Offset' },
    note: { zh: '这次连位置也错开了。条纹数、深浅都对上以后，再把它整体挪过去。', en: 'This time the position is off as well. Once the stripe count and the light and dark match, slide the whole wave across.' },
    knobs: ['k', 'A', 'c', 'phase'],
    target: { c: 0.5, A: 0.35, k: 2, phase: 90 },
  },
  {
    title: { zh: '转方向', en: 'Change direction' },
    note: { zh: '图像是二维的，条纹可以斜着走。一道斜波要两个频率：横着走几个周期，竖着走几个周期。', en: 'An image is 2-D, so stripes can run on a slant. A slanted wave needs two frequencies: how many cycles it makes across, and how many down.' },
    knobs: ['kx', 'ky'],
    twoD: true,
    target: { c: 0.5, A: 0.4, kx: 2, ky: -3, phase: 0 },
  },
]
// A 2-D wave as an image: c + A·cos(2π(kx·x + ky·y)/N + φ).
const planeWave = ({ c, A, kx, ky, phase }, size = N) =>
  fromFn(size, size, (x, y) => c + A * Math.cos((TAU * (kx * x + ky * y)) / size + (phase * Math.PI) / 180))
const tunerCurve = (p) => sampleAt(cosine(p), 64)
// On the 2-D stage only the direction is in play; brightness, contrast and phase are the target's.
const tunerMatches = (stage, p) =>
  stage.twoD
    ? maxDiff(planeWave({ ...stage.target, kx: p.kx, ky: p.ky }).data, planeWave(stage.target).data) < 1e-6
    : maxDiff(tunerCurve(p), tunerCurve(stage.target)) < 1e-6
const onGrid = (key, v) => {
  const knob = KNOBS[key]
  const steps = (v - knob.min) / knob.step
  return v >= knob.min - 1e-9 && v <= knob.max + 1e-9 && Math.abs(steps - Math.round(steps)) < 1e-6
}

const tunerLevel = {
  id: '2-1',
  kind: 'board',
  board: 'WaveTuner',
  chapter: 2,
  title: { zh: '一道波', en: 'One wave' },
  brief: { zh: '四条目标条纹，一条一条来。拨动旋钮，让你的波和目标完全重合。', en: 'Four target stripe patterns, one at a time. Turn the knobs until your wave lies exactly on the target.' },
  hint: { zh: '一次只动一个旋钮，看曲线哪里变了。亮条的个数、最亮和最暗差多少、第一个亮条在哪里，各由一个旋钮管。', en: 'Move one knob at a time and watch what changes on the curve. The number of light stripes, the gap between brightest and darkest, and where the first light stripe sits: each has a knob of its own.' },
  after: { zh: '一道波只要四个数：平均亮度 c、振幅 A（明暗差多大）、频率 k（整幅宽度里走几个周期）、相位 φ（整体往哪边挪）。图像里的波还有方向：横着走 kx 个周期、竖着走 ky 个周期，条纹和箭头 (kx, ky) 垂直，箭头越长条纹越密。下一关你会发现：再复杂的形状，也是许多这样的波叠起来的。解锁的「波」元件就是这台调波器。', en: 'A wave takes just four numbers: the average brightness c, the amplitude A (how far light and dark differ), the frequency k (how many cycles across the whole width) and the phase φ (how far the whole wave is slid). A wave in an image also has a direction: kx cycles across and ky cycles down. The stripes run perpendicular to the arrow (kx, ky), and the longer the arrow, the denser the stripes. In the next level you will find that any shape, however complex, is many such waves added together. The "Wave" part you have unlocked is this wave tuner.' },
  requires: ['1-3'],
  unlocks: ['wave'],
  tuner: { N, knobs: KNOBS, start: TUNER_START, stages: TUNER_STAGES, planeWave, curve: (p) => cosine(p), matches: tunerMatches },
  verify() {
    let state = { ...TUNER_START }
    for (const [index, stage] of TUNER_STAGES.entries()) {
      const label = `第 ${index + 1} 条`
      for (const key of stage.knobs) if (!onGrid(key, stage.target[key])) return `${label}目标的 ${key} 不在旋钮刻度上`
      if (tunerMatches(stage, state)) return `${label}一开始就已经对上`
      // Only the stage's knobs move; everything else must already be right.
      const reached = { ...state, ...Object.fromEntries(stage.knobs.map((key) => [key, stage.target[key]])) }
      if (!tunerMatches(stage, reached)) return `${label}只靠能动的旋钮对不上`
      // Every knob the stage introduces must matter: leaving it where it was fails.
      const previous = TUNER_STAGES[index - 1]?.knobs ?? []
      for (const key of stage.knobs.filter((k) => !previous.includes(k))) {
        if (tunerMatches(stage, { ...reached, [key]: state[key] })) return `${label}不用动 ${key} 也能对上`
      }
      state = reached
    }
    // Diagonal stripes run across the arrow: the transposed wave (ky, kx) must not match.
    const last = TUNER_STAGES.at(-1).target
    if (tunerMatches(TUNER_STAGES.at(-1), { ...last, kx: Math.abs(last.ky), ky: last.kx })) return '斜波的转置也能对上'
    return ''
  },
}

// ---------------- 2-2 叠加 ----------------

const MIX_BARS = 9 // c, then sines k = 1 … 8
const MIX_MAX = 0.6
const MIX_SAMPLES = 128
const sampleMid = (f) => Array.from({ length: MIX_SAMPLES }, (_, j) => f((j + 0.5) / MIX_SAMPLES))
// A light bar on the left half, dark on the right: 0.8 and 0.2.
const square = (u) => (u % 1 < 0.5 ? 0.8 : 0.2)
// The same bar seen through a Gaussian blur of σ = 2 px on a 32 px wide image.
const SOFT_SIGMA = 2 / N
const softSquare = (() => {
  // Blur each sine of the square's series: amplitude × e^(−(2πkσ)²/2).
  const terms = Array.from({ length: 200 }, (_, i) => 2 * i + 1).map((k) => [k, ((4 * 0.3) / (Math.PI * k)) * Math.exp(-((TAU * k * SOFT_SIGMA) ** 2) / 2)])
  return (u) => terms.reduce((sum, [k, b]) => sum + b * Math.sin(TAU * k * u), 0.5)
})()
// Sine amplitudes of a target, k = 0 … 8 (k = 0 is the average): drawn as ghosts once a stage is met.
const sineContent = (f) => {
  const x = sampleMid(f)
  return Array.from({ length: MIX_BARS }, (_, k) =>
    k === 0 ? x.reduce((a, b) => a + b, 0) / x.length : (2 / x.length) * x.reduce((sum, v, j) => sum + v * Math.sin((TAU * k * (j + 0.5)) / x.length), 0),
  )
}
const MIX_STAGES = [
  { title: { zh: '两道波', en: 'Two waves' }, note: { zh: '目标是两道波叠在一起，再加一个平均亮度。看误差曲线：它本身也是波，数数它有几个周期。', en: 'The target is two waves added together, plus an average brightness. Look at the error curve: it is a wave too. Count its cycles.' }, target: sineSum(0.5, [0, 0, 0.3, 0, 0, 0.1]), tolerance: 0.01 },
  { title: { zh: '方波', en: 'Square wave' }, note: { zh: '一半亮一半暗，边缘陡直。只用正弦波，把它拼到误差 ≤ 0.075。', en: 'Half light, half dark, with steep edges. Using sine waves only, build it until the error is ≤ 0.075.' }, target: square, tolerance: 0.075 },
  { title: { zh: '柔和的边', en: 'Soft edge' }, note: { zh: '这是上一条方波模糊后的样子。用尽量少的波把它拼出来。', en: 'This is the previous square wave after a blur. Build it from as few waves as you can.' }, target: softSquare, tolerance: 0.015 },
]
const mixStart = Array(MIX_BARS).fill(0)
const mixError = (stage, bars) => rms(sampleMid(sineSum(bars[0], bars)), sampleMid(stage.target))

const mixerLevel = {
  id: '2-2',
  kind: 'board',
  board: 'WaveMixer',
  chapter: 2,
  title: { zh: '叠加', en: 'Adding waves' },
  brief: { zh: '九根推杆：第一根是平均亮度，其余是频率 1 到 8 的正弦波的振幅。把它们叠起来，拼出三条目标曲线。', en: 'Nine faders: the first is the average brightness, the rest are the amplitudes of sine waves of frequency 1 to 8. Add them up to build three target curves.' },
  hint: { zh: '误差曲线总在提示你缺什么：它有几个周期，就去推那一根。方波的边很陡，需要很多根一起帮忙；看看哪些根一推误差反而变大。', en: 'The error curve always tells you what is missing: push the fader for however many cycles it has. The square wave\'s edges are steep and need many faders working together; watch which ones make the error grow when pushed.' },
  after: { zh: '任何一条曲线都能拆成一组波：每个频率一个振幅（再加相位）。方波只用到奇数频率，振幅按 1、1/3、1/5、1/7 递减；边越陡，需要的高频越多，少了它们边缘就会冒出一圈小波纹。模糊后的方波只剩低频：模糊，就是把高频推杆往下拉。这组振幅，就是这条曲线的频谱。', en: 'Any curve can be taken apart into a set of waves: one amplitude (plus a phase) for each frequency. A square wave uses only odd frequencies, with amplitudes falling as 1, 1/3, 1/5, 1/7. The steeper the edge, the more high frequencies it needs; without them, small ripples appear along the edge. A blurred square wave keeps only the low frequencies: blurring means pulling the high-frequency faders down. This set of amplitudes is the curve\'s spectrum.' },
  requires: ['2-1'],
  unlocks: [],
  mixer: { bars: MIX_BARS, max: MIX_MAX, step: 0.01, start: mixStart, stages: MIX_STAGES, samples: MIX_SAMPLES, error: mixError, content: sineContent, sum: sineSum },
  verify() {
    for (const [index, stage] of MIX_STAGES.entries()) {
      const label = `第 ${index + 1} 条`
      const best = sineContent(stage.target).map((v) => Math.round(v / 0.01) * 0.01)
      if (best.some((v) => v < -1e-9 || v > MIX_MAX + 1e-9)) return `${label}的振幅超出推杆范围`
      const reached = mixError(stage, best)
      if (reached > stage.tolerance) return `${label}最好也只能到 ${reached.toFixed(4)}`
      if (mixError(stage, mixStart) <= stage.tolerance) return `${label}一开始就对上了`
      // Previous stage's best answer must not carry over.
      if (index > 0) {
        const before = sineContent(MIX_STAGES[index - 1].target).map((v) => Math.round(v / 0.01) * 0.01)
        if (mixError(stage, before) <= stage.tolerance) return `${label}用上一条的答案也能过`
      }
    }
    // The square needs k = 7: with only 1, 3 and 5 it must fail.
    const squareBest = sineContent(square)
    const withoutSeven = squareBest.map((v, k) => (k === 7 ? 0 : v))
    if (mixError(MIX_STAGES[1], withoutSeven) <= MIX_STAGES[1].tolerance) return '方波不用 k = 7 也能过'
    // The soft edge must not need anything above k = 3.
    const softBest = sineContent(softSquare).map((v, k) => (k > 3 ? 0 : Math.round(v / 0.01) * 0.01))
    if (mixError(MIX_STAGES[2], softBest) > MIX_STAGES[2].tolerance) return '柔和的边需要 k > 3'
    return ''
  },
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
  { c: osc(k), s: osc(k, 'sin'), mc: 'mul', ms: 'mul', ac: 'fqMean', as: 'fqMean', qc: 'square', qs: 'square', t: 'add', r: 'sqrt', g: ['scale', { k: 2 }] },
  ['in>mc.a', 'c>mc.b', 'in>ms.a', 's>ms.b', 'mc>ac', 'ms>as', 'ac>qc', 'as>qs', 'qc>t.a', 'qs>t.b', 't>r', 'r>g', 'g>out'],
)

const probeLevel = {
  id: '2-3',
  chapter: 2,
  title: { zh: '频率探针', en: 'Frequency probe' },
  brief: { zh: '输入是一条 32 个点的波形，由几道波和一个平均亮度叠成。读出其中频率 k = 3 那道波的振幅 A，输出一个数。有一条波形里根本没有 k = 3。', en: 'The input is a waveform of 32 points, made of a few waves plus an average brightness. Read off the amplitude A of the wave with frequency k = 3, and output that one number. One of the waveforms has no k = 3 at all.' },
  hint: { zh: '把波形和一道 k = 3 的波逐点相乘，再求平均：同频率的部分正负同号、留了下来，别的频率正负相抵。可藏着的波要是错开了位置呢？', en: 'Multiply the waveform per-pixel by a k = 3 wave, then average: the part at the same frequency has matching signs and stays, while other frequencies cancel out. But what if the hidden wave is shifted?' },
  after: { zh: '这就是傅里叶变换：拿每个频率的 cos 和 sin 去和信号逐点相乘、求平均。两个读数 a、b 合起来，振幅是 2·√(a² + b²)，和波错开多少无关；错开多少（相位）是 atan2(b, a)。只用 cos 的探针会把错开 90° 的波量成 0。图像也一样，只是波有两个方向：「频谱」元件对每一个 (kx, ky) 都做一次你刚搭的探针，把测到的振幅画在 (kx, ky) 那一格，中心是 (0, 0)，也就是平均亮度。', en: 'This is the Fourier transform: multiply the signal per-pixel by the cos and the sin of each frequency, and average. Together the two readings a and b give the amplitude 2·√(a² + b²), however far the wave is shifted; how far it is shifted (the phase) is atan2(b, a). A probe with only cos measures a wave shifted by 90° as 0. Images work the same way, except that waves have two directions: the "Spectrum" part runs the probe you just built once for every (kx, ky) and draws the amplitude it measures in cell (kx, ky). The centre is (0, 0), the average brightness.' },
  requires: ['2-2'],
  unlocks: ['spectrum'],
  palette: ['fqWave', 'mul', 'fqMean', 'square', 'sqrt', 'add', 'scale'],
  check: { tolerance: 0.01 },
  tests: PROBE_SCENES.map(([label, parts, A]) => test({ zh: `波形 ${label}`, en: `Waveform ${label}` }, { in: sum(...parts) }, { out: image(1, 1, A) })),
  hidden: PROBE_HIDDEN.map(([label, parts, A]) => test({ zh: `波形 ${label}`, en: `Waveform ${label}` }, { in: sum(...parts) }, { out: image(1, 1, A) })),
  solution: fullProbe(3),
  // The first probe everyone builds: multiply by a cosine, average, double. It misses shifted waves.
  naive: probe({ c: osc(3), m: 'mul', a: 'fqMean', g: ['scale', { k: 2 }] }, ['in>m.a', 'c>m.b', 'm>a', 'a>g', 'g>out']),
  alsoFails: [
    // Right idea, forgot that the average of cos² is ½.
    probe({ c: osc(3), s: osc(3, 'sin'), mc: 'mul', ms: 'mul', ac: 'fqMean', as: 'fqMean', qc: 'square', qs: 'square', t: 'add', r: 'sqrt' }, ['in>mc.a', 'c>mc.b', 'in>ms.a', 's>ms.b', 'mc>ac', 'ms>as', 'ac>qc', 'as>qs', 'qc>t.a', 'qs>t.b', 't>r', 'r>out']),
    // Sine only.
    probe({ s: osc(3, 'sin'), m: 'mul', a: 'fqMean', g: ['scale', { k: 2 }] }, ['in>m.a', 's>m.b', 'm>a', 'a>g', 'g>out']),
    // The wrong frequency.
    fullProbe(5),
    // Just the average.
    probe({ a: 'fqMean' }, ['in>a', 'a>out']),
  ],
}

// ---------------- 2-5 调音台 ----------------

const EQ_N = 32
const EQ_BINS = EQ_N / 2 + 1 // gains for k = 0 … 16
const EQ_SIGMA = 1.5 // the target's spatial blur, in samples
// Fine noise: random amplitudes and phases on k = 9 … 16 only, so a good low-pass removes it all.
const eqNoise = (() => {
  let seed = 7
  const next = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  const parts = Array.from({ length: 8 }, (_, i) => ({ k: 9 + i, A: 0.04 + 0.05 * next(), phase: 360 * next() }))
  return Array.from({ length: EQ_N }, (_, j) => parts.reduce((s, p) => s + cosine({ ...p, c: 0 })(j / EQ_N), 0))
})()
const eqClean = Array.from({ length: EQ_N }, (_, j) => (j >= 8 && j < 24 ? 0.75 : 0.25))
const eqInput = eqClean.map((v, j) => v + eqNoise[j])
const eqTarget = blur(eqClean, EQ_SIGMA)
const EQ_PRESETS = {
  hard: (R) => Array.from({ length: EQ_BINS }, (_, k) => (k <= R + 1e-9 ? 1 : 0)),
  gauss: (R) => Array.from({ length: EQ_BINS }, (_, k) => Math.exp(-(k * k) / (2 * R * R))),
}
const EQ_TOLERANCE = 0.008
const eqError = (gains) => rms(applyGains(eqInput, gains), eqTarget)
// σ (pixels) of the spatial blur a Gaussian gain curve of width R stands for: σ = N / (2πR).
const sigmaOf = (R) => EQ_N / (TAU * R)

const equalizerLevel = {
  id: '2-5',
  kind: 'board',
  board: 'Equalizer',
  chapter: 2,
  title: { zh: '调音台', en: 'Equaliser' },
  brief: { zh: '一行像素：一块亮条，混着细密的噪点。给每个频率一个增益（0 到 1），让输出和目标（干净、边缘柔和）重合。', en: 'One row of pixels: a light bar mixed with fine noise. Give each frequency a gain (0 to 1) so the output lies on the target (clean, with soft edges).' },
  hint: { zh: '先看输入的频谱：噪点都在哪些频率？把那些拉到 0 试试，再看「等效的核」和输出的边缘。一刀切的增益，核长什么样？', en: 'Look at the input\'s spectrum first: which frequencies hold the noise? Try pulling those to 0, then look at the "equivalent kernel" and the output\'s edges. What does the kernel of a hard cut-off look like?' },
  after: { zh: '把每个频率乘一个增益，等于在空间里用一个核做卷积，这个核就是增益曲线变回空间的样子（卷积定理）。一刀切的增益对应一个两侧有负瓣的核，边缘两侧就会冒出波纹（振铃）；高斯形状的增益对应的核还是高斯，没有负瓣。目标其实就是 σ = 1.5 的空间高斯模糊，增益宽度 R 和它的关系是 σ = N/(2πR)。「频域低通」把同一套增益做成二维：按到频谱中心的距离 r 取增益。', en: 'Multiplying each frequency by a gain is the same as a convolution with a kernel in space, and that kernel is the gain curve turned back into space (the convolution theorem). A hard cut-off gain gives a kernel with negative lobes on both sides, so ripples appear on both sides of an edge (ringing); a Gaussian-shaped gain gives a kernel that is still a Gaussian, with no negative lobes. The target is in fact a spatial Gaussian blur with σ = 1.5, and the gain width R relates to it by σ = N/(2πR). The "Frequency low-pass" part makes the same gains 2-D: the gain depends on the distance r from the centre of the spectrum.' },
  requires: ['2-4'],
  unlocks: ['freq-filter'],
  eq: { n: EQ_N, bins: EQ_BINS, input: eqInput, target: eqTarget, presets: EQ_PRESETS, tolerance: EQ_TOLERANCE, error: eqError, apply: applyGains, kernelOf, amplitudes, sigmaOf },
  verify() {
    if (eqError(Array(EQ_BINS).fill(1)) <= EQ_TOLERANCE) return '什么都不做就能过'
    for (let R = 0; R <= 16; R++) if (eqError(EQ_PRESETS.hard(R)) <= EQ_TOLERANCE) return `一刀切 R = ${R} 也能过`
    const best = Math.round((EQ_N / (TAU * EQ_SIGMA)) * 10) / 10
    if (eqError(EQ_PRESETS.gauss(best)) > EQ_TOLERANCE) return `高斯 R = ${best} 都过不了（${eqError(EQ_PRESETS.gauss(best)).toFixed(4)}）`
    // The width matters: R off by a third fails.
    if (eqError(EQ_PRESETS.gauss(best * 1.33)) <= EQ_TOLERANCE || eqError(EQ_PRESETS.gauss(best / 1.33)) <= EQ_TOLERANCE) return 'R 差三分之一也能过'
    // The noise really is above k = 8.
    if (amplitudes(eqNoise).slice(0, 9).some((a) => a > 1e-9)) return '噪点混进了低频'
    return ''
  },
}

// ---------------- 2-7 采样 ----------------

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
  id: '2-7',
  kind: 'board',
  board: 'AliasProbe',
  chapter: 2,
  title: { zh: '采样', en: 'Sampling' },
  brief: { zh: '把一条连续的波变成一排点，只保留采到的值。三个小实验，看看采样会把什么弄丢、又会凭空造出什么。', en: 'Turn a continuous wave into a row of points, keeping only the sampled values. Three small experiments show what sampling loses, and what it makes up out of nothing.' },
  hint: { zh: '点之间发生了什么，采样后谁也不知道。一个周期里至少要有几个点，才认得出这道波？', en: 'Once sampled, nobody knows what happened between the points. How many points per cycle, at least, does it take to recognise the wave?' },
  after: { zh: '采 M 个点，只能分辨 M/2 以下的频率（奈奎斯特频率）。更快的波不会消失，而是折回来，冒充成一道慢波（k 冒充成 M − k），这就是混叠，采完以后无法再分开。所以要在采样之前把高于 M/2 的频率去掉，也就是先低通、再采样。隔点取样把 32 个点变成 16 个，频率高于 8 的纹就必须先滤掉。', en: 'With M samples you can only tell apart frequencies below M/2 (the Nyquist frequency). Faster waves do not vanish: they fold back and pose as a slower wave (k poses as M − k). This is aliasing, and once sampled the two can no longer be separated. So frequencies above M/2 must be removed before sampling: low-pass first, then sample. Downsampling turns 32 points into 16, so any pattern with a frequency above 8 must be filtered out first.' },
  requires: ['2-6'],
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

export const levels = [tunerLevel, mixerLevel, probeLevel, equalizerLevel, aliasLevel]
