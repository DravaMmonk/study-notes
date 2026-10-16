// Chapter 2 (frequency, lecture 4), the spectrum half, and the chapter 1 speed drill: 2-4 看频谱,
// 2-6 低通, 2-9 混合图像, 1-R 核速判. The wave boards that lead up to them are in pack-waves.js.
// Every spectrum, mask and target here is computed by engine/fourier.js (a plain 2-D DFT).
import { GLYPHS, correlate, fromFn, gaussianKernel, map, patterns as P, random, zip } from '../engine/image.js'
import { highpass, lowpass, magnitudeSpectrum, meanAbsDiff } from '../engine/fourier.js'
import { NODE_TYPES } from '../engine/nodes.js'
import { build, test } from './util.js'

const N = 32

// ---------------- new parts ----------------

export const nodes = {
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
}
// index.js merges pack nodes too, but only after this module has run; the reference graphs below
// are built at load time and need their node types (and default params) already registered.
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
const maxAbsDiff = (a, b) => a.data.reduce((worst, v, i) => Math.max(worst, Math.abs(v - b.data[i])), 0)

// ---------------- 2-4 看频谱 ----------------

const PICTURES = [
  ['A', grating(4, 0)], // coarse vertical stripes, period 8 px
  ['B', grating(0, 4)], // the same stripes turned 90°
  ['C', grating(8, 0)], // finer vertical stripes, period 4 px
  ['D', grating(3, -3)], // diagonal stripes
  ['E', fromFn(N, N, (x, y) => 0.1 + 0.8 * Math.exp(-((x - 15.5) ** 2 + (y - 15.5) ** 2) / (2 * 4 * 4)))], // a soft blob
  ['F', (() => {
    const next = random(202)
    return fromFn(N, N, () => next())
  })()], // noise
]
const LAB_SIZE = 24
const LAB_PERIODS = [3, 4, 6, 8, 12] // whole cycles across 24 px; none so fine that it passes the sampling limit
// Spectra are shown in this order, so no spectrum sits under its own picture.
const SPECTRUM_ORDER = ['D', 'F', 'A', 'E', 'C', 'B']

const spectrumLevel = (() => {
  const pictures = PICTURES.map(([key, img]) => ({ key, img }))
  const spectra = SPECTRUM_ORDER.map((key) => ({ answer: key, img: magnitudeSpectrum(PICTURES.find(([k]) => k === key)[1]) }))
  // The experiment bench: a grating near the asked period (pixels) and angle (degrees), and its spectrum.
  // It is 24×24, not 32×32, so it teaches the rule without reproducing any card exactly. The grating
  // is snapped to a whole number of cycles across the image in x and in y, so its spectrum is two
  // clean dots instead of a smear; the period and angle it reports are the snapped, true ones.
  const lab = (period, angle) => {
    const t = (angle * Math.PI) / 180
    const fx = Math.round((LAB_SIZE / period) * Math.cos(t))
    const fy = Math.round((LAB_SIZE / period) * Math.sin(t))
    const img = fromFn(LAB_SIZE, LAB_SIZE, (x, y) => 0.5 + 0.4 * Math.cos((2 * Math.PI * (fx * x + fy * y)) / LAB_SIZE))
    const actualAngle = ((Math.atan2(fy, fx) * 180) / Math.PI + 180) % 180
    return { img, spectrum: magnitudeSpectrum(img), period: LAB_SIZE / Math.hypot(fx, fy), angle: Math.round(actualAngle) }
  }
  // Best one-to-one matching under a similarity score, by trying all 720 orders.
  const bestMatching = (scoreOf) => {
    const score = pictures.map((p) => spectra.map((s) => scoreOf(p, s)))
    let best = null
    const permute = (rest, chosen) => {
      if (!rest.length) {
        const total = chosen.reduce((sum, s, i) => sum + score[i][s], 0)
        if (!best || total > best.total) best = { total, chosen: [...chosen] }
        return
      }
      rest.forEach((s, i) => permute([...rest.slice(0, i), ...rest.slice(i + 1)], [...chosen, s]))
    }
    permute(spectra.map((_, i) => i), [])
    return best.chosen.filter((s, i) => spectra[s].answer === pictures[i].key).length
  }
  const rotate90 = (img) => fromFn(img.w, img.h, (x, y) => img.data[x * img.w + (img.w - 1 - y)])
  return {
    id: '2-4',
    kind: 'board',
    board: 'SpectrumMatch',
    chapter: 2,
    title: { zh: '看频谱', en: 'Reading spectra' },
    brief: { zh: '「频谱」元件就是你在 2-3 搭的探针，对每个 (kx, ky) 各量一次：位置是频率，亮度是那道波的振幅（取了对数）。下面六张图的频谱被打乱了，把它们配成对。', en: 'The "Spectrum" part is the probe you built in 2-3, run once for each (kx, ky): position is frequency, and brightness is that wave\'s amplitude (on a log scale). The spectra of the six pictures below have been shuffled. Pair them up.' },
    hint: { zh: '先在试验台上转一转、调一调条纹：亮点跟着怎样动？还记得 2-1 的箭头吗？中心那一点是 (0, 0)，也就是平均亮度。', en: 'First turn and adjust the stripes on the bench: how do the bright dots move? Remember the arrow in 2-1? The dot in the centre is (0, 0), the average brightness.' },
    after: { zh: '频谱中心是平均亮度（直流分量），离中心越远代表变化越快：条纹越密，亮点离中心越远；条纹转 90°，亮点也转 90°，并且总是排在和条纹垂直的方向上。模糊的图只剩中心一团低频，噪声则什么频率都有。', en: 'The centre of a spectrum is the average brightness (the DC component), and further from the centre means faster change: the denser the stripes, the further the dots sit from the centre. Turn the stripes by 90° and the dots turn by 90° too, always lined up perpendicular to the stripes. A blurred picture keeps only a clump of low frequencies in the centre, while noise has every frequency.' },
    requires: ['2-3'],
    unlocks: [],
    pictures,
    spectra,
    lab,
    labPeriods: LAB_PERIODS,
    verify() {
      // (a) The intended matching is the only one: each picture's own spectrum is among the cards,
      // and every other card differs from it clearly.
      for (const picture of pictures) {
        const own = magnitudeSpectrum(picture.img)
        const close = spectra.filter((s) => maxAbsDiff(own, s.img) < 1e-6)
        if (close.length !== 1 || close[0].answer !== picture.key) return `图 ${picture.key} 的频谱不唯一`
        // Some pixel must differ by at least a third of the grey range, so the cards look different.
        const nearestOther = Math.min(...spectra.filter((s) => s.answer !== picture.key).map((s) => maxAbsDiff(own, s.img)))
        if (nearestOther < 0.33) return `图 ${picture.key} 与另一张频谱太像（${nearestOther.toFixed(3)}）`
      }
      // (b) Naive readings fail: "the dots run the same way as the stripes" and "the spectrum looks like the picture".
      const turned = new Map(pictures.map((p) => [p.key, magnitudeSpectrum(rotate90(p.img))]))
      const sameWay = bestMatching((p, s) => -meanAbsDiff(turned.get(p.key), s.img))
      if (sameWay > 4) return `“亮点和条纹同向”的配法对了 ${sameWay} 对`
      const lookalike = bestMatching((p, s) => -meanAbsDiff(p.img, s.img))
      if (lookalike === 6) return '直接比外观就能全配对'
      if (spectra.some((s, i) => s.answer === pictures[i].key)) return '有频谱就在它自己的图下面'
      return ''
    },
  }
})()

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
  hint: { zh: '这是二维的调音台：离频谱中心 R 以内的频率留下，以外压掉。调音台上哪种形状的增益不起波纹？盯住误差图里边缘两侧出现的东西。', en: 'This is a 2-D equaliser: frequencies within R of the spectrum\'s centre stay, and the rest are pressed down. Which gain shape on the equaliser made no ripples? Watch what appears on both sides of the edges in the error map.' },
  after: { zh: '和调音台上一样：硬圆盘一刀切，等于用一个带负瓣的核做卷积，边缘两侧冒出一圈圈亮暗波纹（振铃）；高斯掩膜平滑过渡，对应的核还是高斯，没有波纹。期望图其实是 σ = 1 的空间高斯模糊，对应的掩膜宽度 R = N/(2πσ) = 32/(2π) ≈ 5。空间里卷积，等于频域里相乘，这就是卷积定理。', en: 'Just as on the equaliser: a hard disk cuts sharply, which is the same as a convolution with a kernel that has negative lobes, so rings of light and dark ripple out on both sides of an edge (ringing). A Gaussian mask falls off smoothly; its kernel is still a Gaussian, with no ripples. The expected image is in fact a spatial Gaussian blur with σ = 1, which matches a mask width of R = N/(2πσ) = 32/(2π) ≈ 5. Convolution in space equals multiplication in the frequency domain: this is the convolution theorem.' },
  requires: ['2-5'],
  unlocks: [],
  palette: ['fqLowpass', 'fqSpectrum', 'add', 'sub', 'scale'],
  check: { tolerance: 0.03, mismatches: 6 },
  tests: LOWPASS_SCENES.map(([label, img], index) => test(label, { in: plus(img, fineNoise(index + 31)) }, { out: softened(img) })),
  hidden: LOWPASS_HIDDEN.map(([label, img], index) => test(label, { in: plus(img, fineNoise(index + 41)) }, { out: softened(img) })),
  solution: filter('gauss', 5),
  // The first idea: cut the spectrum off sharply. No radius works: small ones ring and over-blur,
  // large ones let the noise back in.
  naive: filter('disk', 7),
  alsoFails: [filter('disk', 4), filter('disk', 5), filter('disk', 10), filter('disk', 14), filter('gauss', 4), filter('gauss', 6.5), build({}, ['in>out'])],
}

// ---------------- 2-9 混合图像 ----------------

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
  id: '2-9',
  chapter: 2,
  title: { zh: '混合图像', en: 'Hybrid images' },
  inputs: ['a', 'b'],
  inputLabels: { a: 'A', b: 'B' },
  brief: { zh: '输出 = A 的低频 + B 的高频，两处都用半径 3 的高斯掩膜。近看是 B，远看是 A。', en: 'Output = the low frequencies of A + the high frequencies of B, both with a Gaussian mask of radius 3. Up close you see B; from afar, A.' },
  hint: { zh: '你只有低通。原图里去掉低频，还剩下什么？', en: 'You only have a low-pass. Take the low frequencies out of an image: what is left?' },
  after: { zh: '高通 = 原图 − 低通，也就是掩膜 1 − H。A 只留下大轮廓，B 只留下边缘和细纹，叠在一起：近看细节占上风，远看或眯起眼时细节消失，只剩 A。滤波是线性的，所以 低通(A − B) + B 也是同一个结果，只用一次变换。', en: 'High-pass = image − low-pass, that is, the mask 1 − H. A keeps only its broad outline and B only its edges and fine texture. Added together, the detail wins up close; from afar, or with squinted eyes, the detail disappears and only A is left. Filtering is linear, so low-pass(A − B) + B gives the same result with a single transform.' },
  requires: ['2-8'],
  unlocks: [],
  palette: ['fqLowpass', 'fqSpectrum', 'add', 'sub', 'scale'],
  check: { tolerance: 0.02 },
  tests: HYBRID_PAIRS.map(([label, a, b]) => test(label, { a, b }, { out: hybrid(a, b) })),
  hidden: HYBRID_HIDDEN.map(([label, a, b]) => test(label, { a, b }, { out: hybrid(a, b) })),
  solution: hybridGraph({ la: gaussLow(), lb: gaussLow(), hb: 'sub', sum: 'add' }, ['a>la', 'b>lb', 'b>hb.a', 'lb>hb.b', 'la>sum.a', 'hb>sum.b', 'sum>out']),
  naive: hybridGraph({ sum: 'add' }, ['a>sum.a', 'b>sum.b', 'sum>out']),
  alsoFails: [
    // Low-pass A, but B added whole: its low frequencies (its average, its big shapes) come along.
    hybridGraph({ la: gaussLow(), sum: 'add' }, ['a>la', 'la>sum.a', 'b>sum.b', 'sum>out']),
    // Both low-passed.
    hybridGraph({ la: gaussLow(), lb: gaussLow(), sum: 'add' }, ['a>la', 'b>lb', 'la>sum.a', 'lb>sum.b', 'sum>out']),
    // Right wiring, hard masks: ringing again.
    hybridGraph({ la: ['fqLowpass', { shape: 'disk', R: HYBRID_R }], lb: ['fqLowpass', { shape: 'disk', R: HYBRID_R }], hb: 'sub', sum: 'add' }, ['a>la', 'b>lb', 'b>hb.a', 'lb>hb.b', 'la>sum.a', 'hb>sum.b', 'sum>out']),
    // Roles swapped: B's outline and A's detail.
    hybridGraph({ lb: gaussLow(), la: gaussLow(), ha: 'sub', sum: 'add' }, ['b>lb', 'a>la', 'a>ha.a', 'la>ha.b', 'lb>sum.a', 'ha>sum.b', 'sum>out']),
  ],
}

// ---------------- 1-R 核速判 ----------------

// Kernels as the 3×3 kernel part reads them (cross-correlation): `cells` is what the card shows,
// the weights are cells ÷ div.
export const RACER_KERNELS = [
  { id: 'identity', cells: [0, 0, 0, 0, 1, 0, 0, 0, 0], div: 1 },
  { id: 'right', cells: [0, 0, 0, 1, 0, 0, 0, 0, 0], div: 1 },
  { id: 'down', cells: [0, 1, 0, 0, 0, 0, 0, 0, 0], div: 1 },
  { id: 'box', cells: [1, 1, 1, 1, 1, 1, 1, 1, 1], div: 9 },
  { id: 'gauss', cells: [1, 2, 1, 2, 4, 2, 1, 2, 1], div: 16 },
  { id: 'hmean', cells: [0, 0, 0, 1, 1, 1, 0, 0, 0], div: 3 },
  { id: 'sobelx', cells: [-1, 0, 1, -2, 0, 2, -1, 0, 1], div: 8 },
  { id: 'sobely', cells: [-1, -2, -1, 0, 0, 0, 1, 2, 1], div: 8 },
  { id: 'sharpen', cells: [0, -1, 0, -1, 5, -1, 0, -1, 0], div: 1 },
  { id: 'laplace', cells: [0, 1, 0, 1, -4, 1, 0, 1, 0], div: 1 },
].map((k) => ({ ...k, w: k.cells.map((c) => c / k.div) }))

const RACER_INPUTS = [
  P.impulse(7, 7),
  P.square(),
  P.glyph(GLYPHS.F),
  P.glyph(GLYPHS.L),
  P.disk(),
  P.stepX(8),
  P.checker(4),
  P.corner(),
]
export const RACER = { rounds: 10, pass: 8, minGap: 0.15 }
export const racerTime = (round) => Math.max(2.5, 8 - 0.6 * round) // seconds allowed for round 0, 1, …

// Ten rounds from a seed: an input, the output of one kernel, and four kernel cards in shuffled order.
// A round is kept only if every wrong card would have produced a clearly different output.
export function racerRounds(seed) {
  const next = random(seed * 7919 + 13)
  const pick = (n) => Math.floor(next() * n)
  const rounds = []
  let previous = null
  while (rounds.length < RACER.rounds) {
    const inputIndex = pick(RACER_INPUTS.length)
    const answer = pick(RACER_KERNELS.length)
    if (answer === previous) continue
    const others = RACER_KERNELS.map((_, i) => i).filter((i) => i !== answer)
    const choices = [answer]
    while (choices.length < 4) choices.push(others.splice(pick(others.length), 1)[0])
    for (let i = choices.length - 1; i > 0; i--) {
      const j = pick(i + 1)
      ;[choices[i], choices[j]] = [choices[j], choices[i]]
    }
    const input = RACER_INPUTS[inputIndex]
    const output = correlate(input, RACER_KERNELS[answer].w)
    const gap = Math.min(...choices.filter((c) => c !== answer).map((c) => maxAbsDiff(correlate(input, RACER_KERNELS[c].w), output)))
    if (gap < RACER.minGap) continue
    previous = answer
    rounds.push({ inputIndex, input, output, choices, answer: choices.indexOf(answer) })
  }
  return rounds
}

const racerLevel = {
  id: '1-R',
  kind: 'board',
  board: 'KernelRacer',
  chapter: 1,
  title: { zh: '核速判', en: 'Kernel sprint' },
  brief: { zh: '看输入和输出，选出是哪个 3×3 核做的（按「3×3 核」元件的读法）。10 轮对 8 轮过关，越往后越快。', en: 'Look at the input and the output, and pick the 3×3 kernel that made it (read the way the "3×3 kernel" part reads it). Get 8 of 10 rounds right to pass; it gets faster as you go.' },
  hint: { zh: '权重全正、和为 1：变软。正负相抵、和为 0：平坦处变 0。只有一个 1：整张图挪了一格。', en: 'All weights positive, summing to 1: softer. Positives and negatives cancelling, summing to 0: flat areas become 0. A single 1: the whole image shifts by one pixel.' },
  after: { zh: '你已经能从结果反推核：全正且和为 1 是平滑，越集中越接近原图；和为 0 的核只对变化有反应，是求导；中心大、四周为负是锐化；只有一个 1 是平移，挪的方向和 1 的位置相反。', en: 'You can now work back from a result to its kernel. All positive and summing to 1 is smoothing, and the more concentrated, the closer to the original. A kernel that sums to 0 responds only to change: a derivative. A large centre with negative neighbours is sharpening. A single 1 is a shift, moving the opposite way from where the 1 sits.' },
  requires: ['1-6'],
  unlocks: [],
  kernels: RACER_KERNELS,
  rounds: racerRounds,
  racer: RACER,
  timeFor: racerTime,
  verify() {
    for (let seed = 1; seed <= 40; seed++) {
      const a = racerRounds(seed)
      const b = racerRounds(seed)
      if (JSON.stringify(a.map((r) => [r.inputIndex, r.choices, r.answer])) !== JSON.stringify(b.map((r) => [r.inputIndex, r.choices, r.answer]))) return `种子 ${seed} 不确定`
      for (const [index, round] of a.entries()) {
        const outputs = round.choices.map((c) => correlate(round.input, RACER_KERNELS[c].w))
        const matching = outputs.filter((o) => maxAbsDiff(o, round.output) < 1e-9).length
        if (matching !== 1 || maxAbsDiff(outputs[round.answer], round.output) > 1e-9) return `种子 ${seed} 第 ${index + 1} 轮答案不唯一`
        if (new Set(round.choices).size !== 4) return `种子 ${seed} 第 ${index + 1} 轮选项重复`
      }
      // Always pressing the same key must not pass.
      for (let key = 0; key < 4; key++) {
        const hits = a.filter((r) => r.answer === key).length
        if (hits >= RACER.pass) return `种子 ${seed} 一直按 ${key + 1} 能对 ${hits} 轮`
      }
    }
    return ''
  },
}

export const levels = [spectrumLevel, lowpassLevel, hybridLevel, racerLevel]
