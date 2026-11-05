// Scenes of per-pixel work (scenes/index.js): a washed-out photo, an intruder against an empty scene, the inspection
// station that compares a part with its reference.
import { S } from '../../../../engine/schema.js'
import { fromFn, map } from '../../engine/image.js'
import { picture } from '../pictures.js'
import { T as t } from '../../../../shell/i18n.js'

const RECT = S.list(S.int(), { min: 4, about: t('一个矩形：x0, y0, 宽, 高', 'a rectangle: x0, y0, width, height') })
const box = (x0, y0, w, h) => (x, y) => x >= x0 && x < x0 + w && y >= y0 && y < y0 + h
const inRects = (rects) => (x, y) => rects.some(([x0, y0, w, h]) => box(x0, y0, w, h)(x, y))
const maskOf = (inside) => fromFn(16, 16, (x, y) => (inside(x, y) ? 1 : 0))

// The intruder scenes: a floor lit unevenly (a slope across, and on even seeds down too), the intruder 0.3 brighter.
const unevenFloor = (seed) => fromFn(16, 16, (x, y) => 0.15 + 0.5 * (x / 15) * (seed % 2 ? 1 : y / 15))
// A floor of faint tiles, the intruder 0.4 brighter.
const tiledFloor = (seed) => fromFn(16, 16, (x, y) => 0.2 + 0.25 * ((x + 2 * y + seed) % 5) / 4)

// The station's parts under its lamp: the reference as photographed, the part on the belt with its defects (dents
// darker, shiny scratches brighter).
const PARTS = {
  plate: (x, y) => (box(2, 2, 12, 12)(x, y) ? 0.85 : 0.3),
  ring: (x, y) => ((x - 7.5) ** 2 + (y - 7.5) ** 2 <= 36 && (x - 7.5) ** 2 + (y - 7.5) ** 2 >= 6 ? 0.95 : 0.3),
  bracket: (x, y) => (box(2, 2, 4, 12)(x, y) || box(2, 10, 12, 4)(x, y) ? 0.95 : 0.3),
  gear: (x, y) => (box(3, 3, 10, 10)(x, y) || ((x === 1 || x === 14) && y % 4 < 2) || ((y === 1 || y === 14) && x % 4 < 2) ? 0.8 : 0.3),
  tile: (x, y) => ((Math.floor(x / 4) + Math.floor(y / 4)) % 2 ? 0.95 : 0.3),
}
const DEFECT = 0.15

export const PIXELS = {
  washedOut: {
    about: t('灰蒙蒙的照片：亮度挤进 0.25 … 0.75，期望是原来的照片', 'a washed-out photo, its brightness squeezed into 0.25 … 0.75; the photo as it was is expected'),
    test: S.obj({ photo: S.call('picture') }),
    make: ({ photo }) => {
      const img = picture(photo)
      return { inputs: { in: map(img, (v) => 0.25 + 0.5 * v) }, expected: { out: img } }
    },
  },
  intruder: {
    about: t('闯入者：现场比空场多一个 4×4 的东西，光照不均；期望是它的掩膜', 'an intruder: the scene has one 4×4 thing more than the empty scene, lit unevenly; its mask is expected'),
    test: S.obj({ x: S.int(), y: S.int(), seed: S.int() }),
    make: ({ x: x0, y: y0, seed }) => {
      const bg = unevenFloor(seed)
      const scene = fromFn(16, 16, (x, y) => bg.data[y * 16 + x] + (box(x0, y0, 4, 4)(x, y) ? 0.3 : 0))
      return { inputs: { scene, empty: bg }, expected: { out: maskOf(box(x0, y0, 4, 4)) } }
    },
  },
  outline: {
    about: t('闯入者的外圈：任意形状的闯入者站在花砖地面上；期望是它挨着地面的那一圈格子（图外算地面）', 'an intruder’s outer ring: an intruder of any shape on a tiled floor; the ring of its cells touching the floor is expected (outside the picture counts as floor)'),
    test: S.obj({ shape: S.list(RECT, { min: 1, about: t('闯入者：几个矩形的并', 'the intruder: a union of rectangles') }), seed: S.int() }),
    make: ({ shape, seed }) => {
      const inside = inRects(shape)
      const bg = tiledFloor(seed)
      const scene = fromFn(16, 16, (x, y) => bg.data[y * 16 + x] + (inside(x, y) ? 0.4 : 0))
      const isIn = (x, y) => x >= 0 && y >= 0 && x < 16 && y < 16 && inside(x, y)
      const ring = maskOf((x, y) => isIn(x, y) && !(isIn(x - 1, y) && isIn(x + 1, y) && isIn(x, y - 1) && isIn(x, y + 1)))
      return { inputs: { scene, empty: bg }, expected: { out: ring } }
    },
  },
  station: {
    about: t('质检台：标准件的照片和传送带上的实物，实物上有凹坑（偏暗）和划痕（偏亮），灯可能老了；期望是缺陷的掩膜', 'the inspection station: a photo of the reference and the part on the belt, with dents (darker) and scratches (brighter), under a lamp that may have aged; the defects’ mask is expected'),
    test: S.obj({ part: S.oneOf(Object.keys(PARTS)), dents: S.opt(S.list(RECT)), scratches: S.opt(S.list(RECT)), lamp: S.opt(S.num({ about: t('灯还剩原来亮度的几成', 'what the lamp has left of its brightness') })) }),
    make: ({ part, dents = [], scratches = [], lamp = 1 }) => {
      const ref = fromFn(16, 16, PARTS[part])
      const dent = inRects(dents)
      const scratch = inRects(scratches)
      const actual = fromFn(16, 16, (x, y) => lamp * (PARTS[part](x, y) - (dent(x, y) ? DEFECT : 0) + (scratch(x, y) ? DEFECT : 0)))
      return { inputs: { ref, part: actual }, expected: { out: maskOf((x, y) => dent(x, y) || scratch(x, y)) } }
    },
  },
}
