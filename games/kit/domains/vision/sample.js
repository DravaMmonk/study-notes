// A task's sample (样张): a larger picture its board also runs on, to see what the machine does to an image as a whole
// while the small numeric tests judge it cell by cell. It is never judged: the screen shows the reference board's
// outputs on it beside the player's.
//
// A picture is painted: a background, then layers in order (a disc, a rectangle, a ramp, stripes, a checkerboard, a
// four-cornered patch such as a sheet of paper lying askew, lines of text; a region bounds stripes, checkers and text),
// then seeded noise added: independent in every cell, or one offset a row or a column (a sensor's banding), the
// offsets optionally repeating every `period` rows or columns and summing to zero over one.
// Coordinates are cells, x right and y down.
//
//   PICTURE                       the schema content writes a picture in
//   paint(spec) → image           the picture as a grey image
//   readSample(task, sample)      { inputs }: the first test's inputs with the sample's in their place, read
import { S } from '../../engine/schema.js'
import { make, valueOf } from './image.js'
import { T as t } from '../../shell/i18n.js'

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
    quad: S.obj({ shape: S.oneOf(['quad']), corners: S.list(S.list(num, { min: 2 }), { min: 4, about: t('四个角 [x, y]，按一圈的顺序', 'four corners [x, y], in order around') }), v: num }, { about: t('四边形：比如斜放的一张纸', 'a four-sided patch, such as a sheet of paper lying askew') }),
    text: S.obj({ shape: S.oneOf(['text']), v: num, gap: S.opt(num), seed: S.opt(S.int()), ...region }, { about: t('一行行字：每行是一串长短不一的短划，gap 是行距（默认 3 格）', 'lines of text: each a run of words of varying length, gap rows apart (3 by default)') }),
  }))),
  relief: S.opt(S.list(S.obj({ cx: num, cy: num, r: S.num({ min: 0.5 }), height: num }), { about: t('有起伏时画的是表面朝向（三通道：右、下、朝相机的分量）：每项一个圆形的凸起（height > 0）或凹坑（< 0）', 'with a relief the picture is the surface normal (three channels: right, down, towards the camera): each item a round bump (height > 0) or dent (< 0)') })),
  noise: S.opt(S.obj({ seed: S.int(), amp: num, kind: S.opt(S.oneOf(['cells', 'rows', 'columns'], { about: t('每格各自起伏（默认），或每行、每列一个起伏（传感器的条纹）', 'each cell its own (the default), or one per row or column (a sensor’s banding)') })), period: S.opt(S.int({ min: 2, about: t('条纹每 period 行或列重复一次，一个周期里的起伏加起来为 0', 'the banding repeats every period rows or columns, its offsets summing to zero over one') })) }, { about: t('加上的随机起伏：每格 ±amp 以内，种子定下是哪一张', 'random variation added, within ±amp a cell, the seed saying which') })),
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
  quad: (l, x, y, v) => (insideQuad(l.corners, x + 0.5, y + 0.5) ? l.v : v),
  text: (l, x, y, v) => (inside(l, x, y) && inked(l, x, y) ? l.v : v),
}

/** Whether a point lies inside a convex four-cornered patch, whichever way round its corners go. */
function insideQuad(corners, px, py) {
  const sides = corners.map(([ax, ay], i) => {
    const [bx, by] = corners[(i + 1) % corners.length]
    return Math.sign((bx - ax) * (py - ay) - (by - ay) * (px - ax))
  })
  return sides.every((s) => s >= 0) || sides.every((s) => s <= 0)
}

/** A text layer's ink: one row in every `gap`, words of 2 to 5 cells with one-cell spaces, the same for a seed. */
function inked(l, x, y) {
  const gap = l.gap ?? 3
  const row = y - (l.y ?? 0)
  if (row % gap !== 1) return false
  const next = random((l.seed ?? 1) * 7919 + Math.floor(row / gap))
  let at = (l.x ?? 0) + 1
  while (at <= x) {
    const word = 2 + Math.floor(next() * 4)
    if (x < at + word) return true
    at += word + 1
  }
  return false
}

/** A relief's surface normal at a cell: each bump a smooth cap, height × (1 − (d/r)²)², its slope tilting the normal. */
function normalAt(relief, x, y) {
  let gx = 0
  let gy = 0
  for (const { cx, cy, r, height } of relief) {
    const dx = x + 0.5 - cx
    const dy = y + 0.5 - cy
    const q = (dx * dx + dy * dy) / (r * r)
    if (q >= 1) continue
    const k = (-4 * height * (1 - q)) / (r * r)
    gx += k * dx
    gy += k * dy
  }
  const n = Math.hypot(gx, gy, 1)
  return [-gx / n || 0, -gy / n || 0, 1 / n]
}

/** `n` seeded offsets within ±amp; when they repeat, centred to sum to zero (and kept within ±amp). */
function banding(next, amp, n, repeats) {
  const out = Array.from({ length: n }, () => amp * (2 * next() - 1))
  if (!repeats) return out
  const mean = out.reduce((a, b) => a + b, 0) / n
  const top = Math.max(...out.map((v) => Math.abs(v - mean)))
  return out.map((v) => ((v - mean) * Math.min(1, amp / top)) || 0)
}

/** A picture spec painted: a grey image, or with a relief the colour image of its surface normals. */
export function paint({ size: [w, h], base = 0.2, layers = [], noise, relief }) {
  if (relief) return make(w, h, 3, (x, y, c) => normalAt(relief, x, y)[c])
  const next = noise ? random(noise.seed) : null
  const kind = noise?.kind ?? 'cells'
  const bands = next && kind !== 'cells' ? banding(next, noise.amp, noise.period ?? (kind === 'rows' ? h : w), noise.period) : null
  return make(w, h, 1, (x, y) => {
    let v = base
    for (const l of layers) v = LAYERS[l.shape](l, x, y, v, w, h)
    if (bands) return v + bands[(kind === 'rows' ? y : x) % bands.length]
    return next ? v + noise.amp * (2 * next() - 1) : v
  })
}

const isPicture = (v) => v !== null && typeof v === 'object' && !Array.isArray(v) && Array.isArray(v.size)

/** The sample's inputs: the first test's, with the sample's in their place (pictures painted), read as values. */
export function readSample(task, sample) {
  const given = { ...task.tests[0].inputs, ...sample.inputs }
  return { inputs: Object.fromEntries(Object.entries(given).map(([k, v]) => [k, isPicture(v) ? paint(v) : valueOf(v)])) }
}
