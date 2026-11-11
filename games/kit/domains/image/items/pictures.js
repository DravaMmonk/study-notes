// The pictures content names (vocabulary.js picture): the test-picture library (../engine/image.js patterns) with its
// parameters by name, a few drawn at any size, and pictures made from another (a noisy copy, a blurred one). A
// picture is written { name: params } or, with every parameter left at its default, by its name alone; a test, a
// probe, an intro figure, a bench or a scene names one. Pictures are 16 × 16 unless they say their size.
import { S, callOf } from '../../../engine/schema.js'
import { GLYPHS, SIZE, addNoise, correlate, fromFn, gaussianKernel, map, patterns, random, zip } from '../engine/image.js'
import { blob } from '../engine/parts/generative.js'
import { T as t } from '../../../shell/i18n.js'

const TAU = 2 * Math.PI
const num = S.opt(S.num())
const int = S.opt(S.int())
const size = S.opt(S.int({ min: 1, about: t('边长（格）') }))
/** A letter of the library (GLYPHS), or rows of '#' and '.' drawn the same way. */
export const LETTER = S.oneOf(Object.keys(GLYPHS))
const ROWS = S.opt(S.list(S.str({ pattern: '^[#.]+$' })))
export const rowsOf = ({ letter, rows }) => rows ?? GLYPHS[letter]
const of = S.call('picture')
/** The 4 × 4 patterns the attention scenes compare (a picture of one is `tile`). */
export const TILES = {
  X: ['#..#', '.##.', '.##.', '#..#'],
  C: ['####', '#...', '#...', '#...'],
  P: ['.#..', '####', '.#..', '.#..'],
  K: ['##..', '##..', '..##', '..##'],
  R: ['.##.', '#..#', '#..#', '.##.'],
  S: ['#...', '##..', '###.', '####'],
}

// A pattern of the library: its parameters are its arguments by name, in order (all optional: its defaults stand in).
const pattern = (name, about, args, schema = {}) => ({
  about,
  params: S.obj(Object.fromEntries(args.map((a) => [a, schema[a] ?? num]))),
  args,
  make: (p) => patterns[name](...args.map((a) => p[a])),
})

export const PICTURES = {
  blank: pattern('blank', t('一张同色的图'), ['v']),
  impulse: {
    about: t('黑底上的一个亮点'),
    params: S.obj({ x: int, y: int, v: num, size }),
    make: ({ x: px = 7, y: py = 7, v = 1, size: n = SIZE }) => fromFn(n, n, (x, y) => (x === px && y === py ? v : 0)),
  },
  dots: {
    about: t('黑底上的几个亮点：[x, y, 亮度] 各一个'),
    params: S.obj({ dots: S.list(S.list(S.num(), { min: 3 })) }),
    make: ({ dots }) => fromFn(SIZE, SIZE, (x, y) => dots.find(([px, py]) => px === x && py === y)?.[2] ?? 0),
  },
  diagonal: {
    about: t('一条从左上到右下的对角线'),
    params: S.obj({ lo: num, hi: num, size }),
    make: ({ lo = 0.1, hi = 0.9, size: n = SIZE }) => fromFn(n, n, (x, y) => (x === y ? hi : lo)),
  },
  stepX: pattern('stepX', t('左右两半一暗一亮的台阶'), ['edge', 'lo', 'hi']),
  stepY: pattern('stepY', t('上下两半一暗一亮的台阶'), ['edge', 'lo', 'hi']),
  rampX: {
    about: t('从左到右由黑变白的斜坡'),
    params: S.obj({ size }),
    make: ({ size: n = SIZE }) => fromFn(n, n, (x) => x / (n - 1)),
  },
  rampY: {
    about: t('从上到下由黑变白的斜坡'),
    make: () => fromFn(SIZE, SIZE, (x, y) => y / (SIZE - 1)),
  },
  ramp: {
    about: t('按格子坐标变化的平滑渐变：c + x·dx + y·dy'),
    params: S.obj({ c: num, dx: num, dy: num }),
    make: ({ c = 0, dx = 0, dy = 0 }) => fromFn(SIZE, SIZE, (x, y) => c + dx * x + dy * y),
  },
  bar: {
    about: t('一条竖线：一列亮，其余暗'),
    params: S.obj({ x: S.int(), lo: num, hi: num }),
    make: ({ x: at, lo = 0.1, hi = 0.9 }) => fromFn(SIZE, SIZE, (x) => (x === at ? hi : lo)),
  },
  square: pattern('square', t('一个方块'), ['x0', 'y0', 's', 'lo', 'hi']),
  rect: {
    about: t('一个矩形：左上角 (x0, y0)，宽 w、高 h'),
    params: S.obj({ x0: S.num(), y0: S.num(), w: S.num(), h: S.num(), lo: num, hi: num, size }),
    make: ({ x0, y0, w, h, lo = 0.1, hi = 0.9, size: n = SIZE }) => fromFn(n, n, (x, y) => (x >= x0 && x < x0 + w && y >= y0 && y < y0 + h ? hi : lo)),
  },
  rects: {
    about: t('几个矩形：[x0, y0, 宽, 高] 各一个'),
    params: S.obj({ rects: S.list(S.list(S.num(), { min: 4 })), lo: num, hi: num, size }),
    make: ({ rects, lo = 0.1, hi = 0.9, size: n = SIZE }) => fromFn(n, n, (x, y) => (rects.some(([x0, y0, w, h]) => x >= x0 && x < x0 + w && y >= y0 && y < y0 + h) ? hi : lo)),
  },
  disk: {
    about: t('一个圆盘：圆心 (cx, cy)，半径 r'),
    params: S.obj({ cx: num, cy: num, r: num, lo: num, hi: num, size }),
    make: ({ cx = 7.5, cy = 7.5, r = 5, lo = 0.1, hi = 0.9, size: n = SIZE }) => fromFn(n, n, (x, y) => ((x - cx) ** 2 + (y - cy) ** 2 <= r * r ? hi : lo)),
  },
  discs: {
    about: t('几个圆盘：[cx, cy, r] 各一个'),
    params: S.obj({ discs: S.list(S.list(S.num(), { min: 3 })), lo: num, hi: num, size }),
    make: ({ discs, lo = 0.1, hi = 0.9, size: n = SIZE }) => fromFn(n, n, (x, y) => (discs.some(([cx, cy, r]) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r) ? hi : lo)),
  },
  checker: {
    about: t('棋盘：每格 cell 宽'),
    params: S.obj({ cell: num, lo: num, hi: num, size }),
    make: ({ cell = 4, lo = 0.1, hi = 0.9, size: n = SIZE }) => fromFn(n, n, (x, y) => ((Math.floor(x / cell) + Math.floor(y / cell)) % 2 ? hi : lo)),
  },
  stripes: {
    about: t('条纹：period 格一个周期，默认竖条（axis: y 是横条）'),
    params: S.obj({ period: num, lo: num, hi: num, w: int, h: int, axis: S.opt(S.oneOf(['x', 'y'])) }),
    make: ({ period = 4, lo = 0.1, hi = 0.9, w = SIZE, h = SIZE, axis = 'x' }) => fromFn(w, h, (x, y) => (Math.floor(((axis === 'x' ? x : y) * 2) / period) % 2 ? hi : lo)),
  },
  corner: pattern('corner', t('右下四分之一亮的角'), ['x0', 'y0', 'lo', 'hi']),
  speckle: {
    about: t('斑点：每格 base + amp × 一个随机数，种子定下是哪一张'),
    params: S.obj({ seed: S.int(), base: S.num(), amp: S.num() }),
    make: ({ seed, base, amp }) => {
      const next = random(seed)
      return fromFn(SIZE, SIZE, () => base + amp * next())
    },
  },
  twoTone: {
    about: t('两种亮度的颗粒：每格按它在不在形状里（圆 disc、右边 rightOf、斜纹 stripes）随机取亮或暗，各带一点抖动'),
    params: S.obj({
      seed: S.int(), dark: S.num(), bright: S.num(),
      disc: S.opt(S.list(S.num(), { min: 3, about: t('圆：cx, cy, 半径的平方') })),
      rightOf: S.opt(S.int({ about: t('这一列右边') })),
      stripes: S.opt(S.list(S.int(), { min: 2, about: t('斜纹：(x + y) 除以 period 的余数小于 width') })),
    }),
    make: ({ seed, dark, bright, disc, rightOf, stripes }) => {
      const share = disc ? (x, y) => ((x - disc[0]) ** 2 + (y - disc[1]) ** 2 < disc[2] ? 1 : 0) : rightOf !== undefined ? (x) => (x > rightOf ? 1 : 0) : (x, y) => ((x + y) % stripes[0] < stripes[1] ? 1 : 0)
      const next = random(seed)
      return fromFn(SIZE, SIZE, (x, y) => (next() < share(x, y) ? bright + 0.1 * (next() - 0.5) : dark + 0.1 * (next() - 0.5)))
    },
  },
  noise: pattern('noise', t('随机纹理：每格一个随机亮度，种子定下是哪一张'), ['seed', 'amp'], { seed: int }),
  zonePlate: {
    about: t('斑马板：圆心 (cx, cy) 起越往外越密的同心圆，0.5 ± A'),
    params: S.obj({ k: num, cx: num, cy: num, A: num, size }),
    make: ({ k = 0.06, size: n = 32, cx = n / 2, cy = n / 2, A = 0.5 }) => fromFn(n, n, (x, y) => 0.5 + A * Math.cos(k * ((x - cx) ** 2 + (y - cy) ** 2))),
  },
  fabric: {
    about: t('布纹：period 格一个周期、朝 angle 度方向的斜条纹'),
    params: S.obj({ period: S.num(), angle: S.num(), size }),
    make: ({ period, angle, size: n = 32 }) => {
      const a = (angle * Math.PI) / 180
      return fromFn(n, n, (x, y) => 0.5 + 0.35 * Math.cos((TAU * (x * Math.cos(a) + y * Math.sin(a))) / period))
    },
  },
  glyph: {
    about: t('一个字母（或照样画的几行），可以挪开、放大'),
    params: S.obj({ letter: S.opt(LETTER), rows: ROWS, lo: num, hi: num, ox: num, oy: num, scale: num, size }),
    make: ({ lo = 0.1, hi = 0.9, ox = 3, oy = 3, scale = 2, size: n = SIZE, ...p }) => {
      const rows = rowsOf(p)
      return fromFn(n, n, (x, y) => (rows[Math.floor((y - oy) / scale)]?.[Math.floor((x - ox) / scale)] === '#' ? hi : lo))
    },
  },
  row: {
    about: t('一行数（一个点、一条线、一个向量……）'),
    params: S.obj({ values: S.list(S.num(), { min: 1 }) }),
    make: ({ values }) => fromFn(values.length, 1, (x) => values[x]),
  },
  blob: {
    about: t('一个柔和的斑点，中心 (x, y)'),
    params: S.obj({ x: S.num(), y: S.num() }),
    make: ({ x, y }) => blob(x, y),
  },
  tile: {
    about: t('一个 4 × 4 的图案（一个图块），亮度 hi'),
    params: S.obj({ name: S.oneOf(Object.keys(TILES)), hi: num }),
    make: ({ name, hi = 1 }) => fromFn(4, 4, (x, y) => (TILES[name][y][x] === '#' ? hi : 0)),
  },
  radius: {
    about: t('频率半径：每格离频谱中心（频率 (0, 0)）多远'),
    params: S.obj({ size }),
    make: ({ size: n = 32 }) => fromFn(n, n, (x, y) => Math.hypot(x - n / 2, y - n / 2)),
  },
  offset: {
    about: t('一张图每格加上 by（减 0.5 就是网络常用的居中）'),
    params: S.obj({ of, by: S.num() }),
    make: ({ of: inner, by }) => map(picture(inner), (v) => v + by),
  },
  scaled: {
    about: t('一张 16 × 16 的图缩放成 size × size（取最近的格子）'),
    params: S.obj({ of, size: S.int({ min: 1 }) }),
    make: ({ of: inner, size: n }) => {
      const img = picture(inner)
      return fromFn(n, n, (x, y) => img.data[Math.floor((y * 16) / n) * 16 + Math.floor((x * 16) / n)])
    },
  },
  margined: {
    about: t('一张图四周涂黑 width 格宽的边'),
    params: S.obj({ of, width: S.int({ min: 0 }) }),
    make: ({ of: inner, width }) => {
      const img = picture(inner)
      return fromFn(img.w, img.h, (x, y) => (x < width || y < width || x >= img.w - width || y >= img.h - width ? 0 : img.data[y * img.w + x]))
    },
  },
  noisy: {
    about: t('一张图加上随机噪声（三个随机数之和，种子定下是哪一份）'),
    params: S.obj({ of, seed: S.int(), amp: S.num() }),
    make: ({ of: inner, seed, amp }) => addNoise(picture(inner), seed, amp),
  },
  blurred: {
    about: t('一张图的高斯模糊（σ，复制边缘；σ = 0 是原图）'),
    params: S.obj({ of, sigma: S.num({ min: 0 }) }),
    make: ({ of: inner, sigma }) => (sigma ? correlate(picture(inner), gaussianKernel(sigma), 'edge') : picture(inner)),
  },
  screened: {
    about: t('印刷品翻拍出的网纹：一张图叠上一道频率 (fx, fy) 的条纹'),
    params: S.obj({ of, fx: S.int(), fy: S.int() }),
    make: ({ of: inner, fx, fy }) => {
      const img = picture(inner)
      const grating = fromFn(img.w, img.h, (x, y) => 0.5 + 0.12 * Math.cos((2 * Math.PI * (fx * x + fy * y)) / img.w))
      return zip(img, grating, (p, q) => p + q - 0.5)
    },
  },
}

/** The picture a call names. */
export function picture(call) {
  const [name, params] = callOf(call)
  const item = PICTURES[name]
  if (!item) throw new Error(`no picture ${name}`)
  return item.make(params)
}
