// A task's sample (样张): a larger picture its board also runs on, to see what the machine does to an image as a whole
// while the small numeric tests judge it cell by cell. It is never judged: the screen shows the reference board's
// outputs on it beside the player's.
//
// A picture is painted: a background, then layers in order (a disc, a rectangle, a ramp, stripes, a checkerboard; a
// region bounds stripes and checkers), then seeded noise added. Coordinates are cells, x right and y down.
//
//   PICTURE                       the schema content writes a picture in
//   paint(spec) → image           the picture as a grey image
//   readSample(task, sample)      { inputs }: the first test's inputs with the sample's in their place, read
import { S } from '../../engine/schema.js'
import { make, valueOf } from './image.js'

const t = (zh, en) => ({ zh, en })
/** The longest side a sample may have: its board runs on every change, the player's own circuit cell by cell. */
export const SAMPLE_MAX = 128
const num = S.num()
const opt = S.opt(S.num())
const region = { x: opt, y: opt, w: opt, h: opt }

export const PICTURE = S.obj({
  size: S.list(S.int({ min: 4, max: SAMPLE_MAX }), { min: 2, about: t('宽和高（格）', 'width and height, in cells') }),
  base: S.opt(S.num({ about: t('底色（默认 0.2）', 'the background (0.2 by default)') })),
  layers: S.opt(S.list(S.by('shape', {
    disc: S.obj({ shape: S.oneOf(['disc']), cx: num, cy: num, r: num, v: num }, { about: t('圆盘：圆心 (cx, cy)、半径 r、亮度 v', 'a disc: centre (cx, cy), radius r, value v') }),
    rect: S.obj({ shape: S.oneOf(['rect']), x: num, y: num, w: num, h: num, v: num }, { about: t('矩形：左上角 (x, y)、宽 w、高 h', 'a rectangle: top left (x, y), w wide, h high') }),
    ramp: S.obj({ shape: S.oneOf(['ramp']), axis: S.opt(S.oneOf(['x', 'y'])), from: num, to: num }, { about: t('整张图沿一个轴从 from 渐变到 to', 'the whole picture graded from `from` to `to` along an axis') }),
    stripes: S.obj({ shape: S.oneOf(['stripes']), period: num, axis: S.opt(S.oneOf(['x', 'y'])), lo: num, hi: num, ...region }, { about: t('条纹：每 period 格一个周期，axis x 是竖条；可限在一块区域里', 'stripes, a cycle every period cells, upright for axis x; optionally within a region') }),
    checker: S.obj({ shape: S.oneOf(['checker']), cell: num, lo: num, hi: num, ...region }, { about: t('棋盘：每格 cell 宽；可限在一块区域里', 'a checkerboard, its squares cell wide; optionally within a region') }),
  }))),
  noise: S.opt(S.obj({ seed: S.int(), amp: num }, { about: t('加上的随机起伏：每格 ±amp 以内，种子定下是哪一张', 'random variation added, within ±amp a cell, the seed saying which') })),
}, { about: t('画出的一张样张', 'a painted sample picture') })

/** A seeded generator of numbers in [0, 1) (mulberry32): the same seed paints the same picture everywhere. */
function random(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let r = Math.imul(a ^ (a >>> 15), 1 | a)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

const inside = (l, x, y) => (l.x === undefined || x >= l.x) && (l.y === undefined || y >= l.y) && (l.w === undefined || x < (l.x ?? 0) + l.w) && (l.h === undefined || y < (l.y ?? 0) + l.h)

const LAYERS = {
  disc: (l, x, y, v) => ((x + 0.5 - l.cx) ** 2 + (y + 0.5 - l.cy) ** 2 <= l.r * l.r ? l.v : v),
  rect: (l, x, y, v) => (x >= l.x && x < l.x + l.w && y >= l.y && y < l.y + l.h ? l.v : v),
  ramp: (l, x, y, v, w, h) => {
    const along = (l.axis ?? 'x') === 'x' ? x / Math.max(1, w - 1) : y / Math.max(1, h - 1)
    return l.from + (l.to - l.from) * along
  },
  stripes: (l, x, y, v) => (inside(l, x, y) ? (Math.floor((((l.axis ?? 'x') === 'x' ? x : y) * 2) / l.period) % 2 ? l.hi : l.lo) : v),
  checker: (l, x, y, v) => (inside(l, x, y) ? ((Math.floor(x / l.cell) + Math.floor(y / l.cell)) % 2 ? l.hi : l.lo) : v),
}

/** A picture spec painted as a grey image. */
export function paint({ size: [w, h], base = 0.2, layers = [], noise }) {
  const next = noise ? random(noise.seed) : null
  return make(w, h, 1, (x, y) => {
    let v = base
    for (const l of layers) v = LAYERS[l.shape](l, x, y, v, w, h)
    return next ? v + noise.amp * (2 * next() - 1) : v
  })
}

const isPicture = (v) => v !== null && typeof v === 'object' && !Array.isArray(v) && Array.isArray(v.size)

/** The sample's inputs: the first test's, with the sample's in their place (pictures painted), read as values. */
export function readSample(task, sample) {
  const given = { ...task.tests[0].inputs, ...sample.inputs }
  return { inputs: Object.fromEntries(Object.entries(given).map(([k, v]) => [k, isPicture(v) ? paint(v) : valueOf(v)])) }
}
