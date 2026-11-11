// Scenes of learning (scenes/index.js): samples of a rule, letters reduced to two stroke features, bright blocks to
// erode, dots that move, X and O at different places and inks, colour pictures and their colour contrasts, street
// scenes with red lights, scores into probabilities, and the parts on a sorting belt.
import { S } from '../../../../engine/schema.js'
import { GLYPHS, addNoise, correlate, fromFn, image, map, maxPool, patterns, random, zip } from '../../engine/image.js'
import { T as t } from '../../../../shell/i18n.js'
import { compose } from '../../engine/colour.js'

const num = (v) => image(1, 1, v)
const PT = S.list(S.int(), { min: 2 })
const RECT = S.list(S.int(), { min: 4, about: t('一个矩形：x0, y0, 宽, 高') })

// Bright blocks on a dark, slightly noisy ground; 1 wherever the whole 7×7 window around a pixel is bright.
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
const dotsAt = (points) => fromFn(16, 16, (x, y) => (points.some(([px, py]) => px === x && py === y) ? 1 : 0.05))

// A glyph on a 0.1 ground; with a seed, noise inside the frame only (the border rows stay as they are).
function glyphAt(rows, ox, oy, hi, seed, amp = 0.08) {
  const clean = patterns.glyph(rows, 0.1, hi, ox, oy)
  if (!seed) return clean
  const noisy = addNoise(clean, seed, amp)
  return fromFn(16, 16, (x, y) => (x === 0 || y === 0 || x === 15 || y === 15 ? clean.data[y * 16 + x] : noisy.data[y * 16 + x]))
}

// Colour pictures: their three channels (each less 0.5) and the Laplacian of one colour contrast in them.
const LAP = [0, -0.25, 0, -0.25, 1, -0.25, 0, -0.25, 0]
const MIXES = {
  redGreen: (r, g) => r - g,
  blueYellow: (r, g, b) => b - (r + g) / 2,
}
const RED = [0.7, 0.3, 0.3]
const GREEN = [0.3, 0.7, 0.3]
const SKY = [0.3, 0.45, 0.85]
const SAND = [0.8, 0.7, 0.3]
const PAINTS = {
  halves: (x) => (x < 8 ? RED : GREEN),
  greyBlock: (x, y) => (x >= 4 && x < 12 && y >= 4 && y < 12 ? [0.8, 0.8, 0.8] : [0.2, 0.2, 0.2]),
  redSpot: (x, y) => {
    if ((x - 5.5) ** 2 + (y - 6.5) ** 2 <= 12) return RED
    if (x >= 11 && y >= 9 && y < 14) return [0.3, 0.7, 0.9]
    return GREEN
  },
  slanted: (x, y) => (x + y < 15 ? RED : GREEN).map((v) => v + (y - 7.5) * 0.02),
  blueBar: (x, y) => {
    const grey = 0.25 + 0.03 * x
    return [grey, grey, y >= 5 && y < 10 ? 0.9 : grey]
  },
  skyline: (x, y) => (y < 7 ? SKY : SAND),
  greySquare: (x, y) => (x > 4 && x < 11 && y > 4 && y < 11 ? [0.8, 0.8, 0.8] : [0.2, 0.2, 0.2]),
  dunes: (x, y) => (y < 6 + Math.round(2 * Math.sin(x / 2)) ? SKY : SAND),
  slope: (x, y) => (x + y < 15 ? SKY : SAND),
  greyRamp: (x) => [0.25 + 0.03 * x, 0.25 + 0.03 * x, 0.25 + 0.03 * x],
}
function colourScene(paint, mix) {
  const [r, g, b] = [0, 1, 2].map((c) => fromFn(16, 16, (x, y) => paint(x, y)[c] - 0.5))
  return { inputs: { r, g, b }, expected: { out: correlate(fromFn(16, 16, (x, y) => mix(...[r, g, b].map((c) => c.data[y * 16 + x]))), LAP) } }
}
const colourNoise = (seed) => {
  const next = random(seed)
  const values = Array.from({ length: 3 * 256 }, () => 0.1 + 0.8 * next())
  return (x, y) => [0, 1, 2].map((c) => values[c * 256 + y * 16 + x])
}

// Street scenes: red lights (bright and red), red cars in shade (red but dark), white street lamps (bright, not red),
// green lights.
const STREET = { light: [0.95, 0.15, 0.1], car: [0.45, 0.08, 0.08], lamp: [0.95, 0.92, 0.85], green: [0.15, 0.9, 0.3], sky: [0.3, 0.35, 0.5], road: [0.25, 0.25, 0.25] }
const spot2 = (cx, cy) => (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= 2
const STREETS = {
  crossing: (x, y) => (spot2(4, 3)(x, y) ? 'light' : spot2(11, 3)(x, y) ? 'green' : y > 10 ? (x > 3 && x < 9 && y > 11 ? 'car' : 'road') : 'sky'),
  lamps: (x, y) => (spot2(3, 4)(x, y) || spot2(12, 4)(x, y) ? 'lamp' : spot2(8, 6)(x, y) ? 'light' : y > 11 ? 'road' : 'sky'),
  twoLights: (x, y) => (spot2(5, 5)(x, y) || spot2(10, 9)(x, y) ? 'light' : x < 4 && y > 11 ? 'car' : 'road'),
  traffic: (x, y) => (y > 9 && (x % 6) < 4 ? 'car' : spot2(13, 3)(x, y) ? 'light' : spot2(2, 3)(x, y) ? 'lamp' : 'sky'),
  greenLight: (x, y) => (spot2(7, 7)(x, y) ? 'green' : 'road'),
}

// Colour pictures for two mixes of blurred channels: R − G, and R + G − 2B.
const MIX_PAINTS = {
  halves: (x) => (x < 8 ? [0.8, 0.2, 0.2] : [0.2, 0.8, 0.2]),
  blueSquare: (x, y) => (x > 4 && x < 11 && y > 4 && y < 11 ? [0.2, 0.2, 0.9] : [0.5, 0.5, 0.5]),
  texture: (x, y) => [((x * 7 + y * 3) % 10) / 10, ((x * 3 + y * 5) % 10) / 10, ((x + y * 7) % 10) / 10],
  yellowDisc: (x, y) => ((x - 8) ** 2 + (y - 8) ** 2 < 20 ? [0.9, 0.85, 0.1] : [0.2, 0.3, 0.6]),
}
const blur3 = (img) => correlate(img, Array(9).fill(1 / 9))

// The sorting belt's parts: X, O and +.
const SORT_ROWS = { X: GLYPHS.X, O: GLYPHS.O, P: ['..#..', '..#..', '#####', '..#..', '..#..'] }

export const LEARNING = {
  samples: {
    about: t('一个数进、一个数出：期望是 scale·x + offset'),
    setup: S.obj({ scale: S.num(), offset: S.opt(S.num()) }),
    test: S.obj({ x: S.num() }),
    make: ({ x }, { scale, offset }) => ({ inputs: { in: num(x) }, expected: { out: num(offset === undefined ? scale * x : scale * x + offset) } }),
  },
  strokes: {
    about: t('一个字母化成两个数：斜笔画多少、弯笔画多少；期望 X 是 1，O 是 0'),
    test: S.obj({ letter: S.oneOf(['X', 'O']), f1: S.num(), f2: S.num() }),
    make: ({ letter, f1, f2 }) => ({ inputs: { f1: num(f1), f2: num(f2) }, expected: { out: num(letter === 'X' ? 1 : 0) } }),
  },
  blocks: {
    about: t('暗底上的亮块（有一点噪声）；期望是周围 7×7 全亮的格子'),
    test: S.obj({ rects: S.list(RECT), notches: S.opt(S.list(PT, { about: t('亮块上缺的格子') })), seed: S.int() }),
    make: ({ rects, notches, seed }) => {
      const { scene, fits } = blocks(rects, notches, seed)
      return { inputs: { in: scene }, expected: { out: fits } }
    },
  },
  movedDots: {
    about: t('几个亮点，从原位挪开一点；期望是原位的点做 2×2 最大池化'),
    test: S.obj({ dots: S.list(PT), home: S.list(PT) }),
    make: ({ dots, home }) => ({ inputs: { in: dotsAt(dots) }, expected: { out: maxPool(dotsAt(home), 2) } }),
  },
  xo: {
    about: t('一个 X 或 O，位置、墨色、噪点各不同；期望 X 是 1，O 是 0'),
    test: S.obj({ letter: S.oneOf(['X', 'O']), ox: S.int(), oy: S.int(), ink: S.num(), seed: S.int({ about: t('噪点的种子，0 是没有噪点') }) }),
    make: ({ letter, ox, oy, ink, seed }) => ({ inputs: { in: glyphAt(GLYPHS[letter], ox, oy, ink, seed) }, expected: { out: image(1, 1, letter === 'X' ? 1 : 0) } }),
  },
  colour: {
    about: t('一张彩色图的三个通道（各减 0.5）；期望是一种颜色对比（红对绿，或蓝对黄）的边'),
    setup: S.obj({ mix: S.oneOf(Object.keys(MIXES)) }),
    test: S.obj({ paint: S.opt(S.oneOf(Object.keys(PAINTS))), noise: S.opt(S.int({ about: t('彩色噪点的种子') })) }),
    make: ({ paint, noise }, { mix }) => colourScene(noise === undefined ? PAINTS[paint] : colourNoise(noise), MIXES[mix]),
  },
  street: {
    about: t('街景的三个通道：红灯、阴影里的红车、白色路灯、绿灯；期望是红灯的掩膜'),
    test: S.obj({ layout: S.oneOf(Object.keys(STREETS)) }),
    make: ({ layout }) => {
      const at = (x, y) => STREET[STREETS[layout](x, y)]
      return { inputs: { r: fromFn(16, 16, (x, y) => at(x, y)[0]), g: fromFn(16, 16, (x, y) => at(x, y)[1]), b: fromFn(16, 16, (x, y) => at(x, y)[2]) }, expected: { out: fromFn(16, 16, (x, y) => (STREETS[layout](x, y) === 'light' ? 1 : 0)) } }
    },
  },
  colourMix: {
    about: t('一张彩色图；期望是模糊后的两种通道组合：R − G 和 R + G − 2B'),
    test: S.obj({ paint: S.oneOf(Object.keys(MIX_PAINTS)) }),
    make: ({ paint }) => {
      const [r, g, b] = [0, 1, 2].map((c) => fromFn(16, 16, (x, y) => MIX_PAINTS[paint](x, y)[c]))
      const [R, G, B] = [blur3(r), blur3(g), blur3(b)]
      return { inputs: { r, g, b }, expected: { o1: zip(R, G, (p, q) => p - q), o2: fromFn(r.w, r.h, (x, y) => { const i = y * r.w + x; return R.data[i] + G.data[i] - 2 * B.data[i] }) } }
    },
  },
  binaryScores: {
    about: t('两个分数；期望是 Softmax 给出的两个权重'),
    test: S.obj({ s: S.list(S.num(), { min: 2, max: 2 }) }),
    make: ({ s }) => {
      const p = 1 / (1 + Math.exp(s[1] - s[0]))
      return { inputs: { a: num(s[0]), b: num(s[1]) }, expected: { pa: num(p), pb: num(1 - p) } }
    },
  },
  scores: {
    about: t('三类的分数；期望是 softmax 给的三个概率'),
    test: S.obj({ s: S.list(S.num(), { min: 3 }) }),
    make: ({ s }) => {
      const e = s.map(Math.exp)
      const total = e.reduce((a, b) => a + b, 0)
      const [px, po, pp] = e.map((v) => v / total)
      return { inputs: { sx: num(s[0]), so: num(s[1]), sp: num(s[2]) }, expected: { px: num(px), po: num(po), pp: num(pp) } }
    },
  },
  sorter: {
    about: t('分拣带上的零件：X、O 或 +，位置、墨色、噪点各不同；期望是它属于哪一类'),
    test: S.obj({ part: S.oneOf(Object.keys(SORT_ROWS)), ox: S.int(), oy: S.int(), ink: S.num(), seed: S.int({ about: t('噪点的种子，0 是没有噪点') }) }),
    make: ({ part, ox, oy, ink, seed }) => {
      const clean = patterns.glyph(SORT_ROWS[part], 0.1, ink, ox, oy)
      return { inputs: { in: seed ? addNoise(clean, seed, 0.06) : clean }, expected: { px: num(part === 'X' ? 1 : 0), po: num(part === 'O' ? 1 : 0), pp: num(part === 'P' ? 1 : 0) } }
    },
  },
}

// RGB versions keep the same targets while exposing the original colour pixels as one input.
const asColourInput = (made, restore = false) => {
  const planes = ['r', 'g', 'b'].map((key) => restore ? map(made.inputs[key], (v) => v + 0.5) : made.inputs[key])
  return { inputs: { photo: compose(...planes) }, expected: made.expected }
}
Object.assign(LEARNING, {
  rgbContrast: {
    about: t('彩色图像；期望是一种颜色对比的边'),
    setup: LEARNING.colour.setup,
    test: LEARNING.colour.test,
    make: (test, setup) => asColourInput(LEARNING.colour.make(test, setup), true),
  },
  rgbStreet: {
    about: t('彩色街景；期望是红灯的掩膜'),
    test: LEARNING.street.test,
    make: (test) => asColourInput(LEARNING.street.make(test)),
  },
  rgbMix: {
    about: t('彩色图像；期望是两种模糊通道组合'),
    test: LEARNING.colourMix.test,
    make: (test) => asColourInput(LEARNING.colourMix.make(test)),
  },
})
