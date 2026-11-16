// Scenes of attention (scenes/index.js): pictures of 4 × 4 patterns with a few pixels erased from one copy, two such
// pictures at once, a bright and a dark patch in reading order, patterns at several brightnesses, and photos to match
// with their altered copies.
import { S } from '../../../../engine/schema.js'
import { fromFn, image } from '../../engine/image.js'
import { TILES, picture } from '../pictures.js'
import { T as t } from '../../../../shell/i18n.js'

const TILE = S.oneOf(Object.keys(TILES))
const AT = S.list(S.int({ min: 0 }), { min: 2, about: t('第几行、第几列的图块') })
// Patterns placed on a 16 × 16 picture, each pattern pixel `scale` cells wide (4 patterns to a row at scale 1, 2 at
// scale 2), a few pixels of one copy erased.
const ITEMS = S.list(S.obj({ tile: TILE, at: AT, erased: S.opt(S.list(S.list(S.int(), { min: 2 }), { about: t('擦掉的格子 [u, v]') })) }))
const placed = (items, scale = 1, erase = true) =>
  fromFn(16, 16, (x, y) => {
    const size = 4 * scale
    for (const { tile: name, at: [row, col], erased = [] } of items) {
      if (Math.floor(x / size) !== col || Math.floor(y / size) !== row) continue
      const u = scale === 1 ? x % 4 : (x % size) >> 1
      const v = scale === 1 ? y % 4 : (y % size) >> 1
      if (erase && erased.some(([eu, ev]) => eu === u && ev === v)) return 0
      return TILES[name][v][u] === '#' ? 1 : 0
    }
    return 0
  })
// Patterns lit at a brightness each.
const LIT = S.list(S.obj({ tile: TILE, at: AT, hi: S.num() }))
const lit = (items) =>
  fromFn(16, 16, (x, y) => {
    for (const { tile: name, at: [row, col], hi } of items) if (Math.floor(x / 4) === col && Math.floor(y / 4) === row) return TILES[name][y % 4][x % 4] === '#' ? hi : 0
    return 0
  })
const brightest = (items) => {
  const ink = (item) => TILES[item.tile].join('').split('#').length * item.hi
  const best = items.reduce((a, b) => (ink(b) > ink(a) ? b : a))
  return fromFn(16, 16, (x, y) => (TILES[best.tile][y % 4][x % 4] === '#' ? best.hi : 0))
}
// Each pixel's patch number in reading order, 0 … 15.
const PATCH_NUMBER = fromFn(16, 16, (x, y) => Math.floor(y / 4) * 4 + Math.floor(x / 4))
const orderScene = (bright, dark) => fromFn(16, 16, (x, y) => {
  const i = Math.floor(y / 4) * 4 + Math.floor(x / 4)
  return i === bright ? 0.9 : i === dark ? 0.1 : 0.5
})
const one = (yes) => image(1, 1, yes ? 1 : 0)

export const ATTENTION = {
  mend: {
    about: t('一张图上几个图案，一对对角上的同一个图案被擦掉了几格；期望是补好的图'),
    setup: S.obj({ scale: S.opt(S.oneOf([1, 2], { about: t('图案的一格画成几格（2：8 × 8 的图案）') })) }),
    test: S.obj({ items: ITEMS }),
    make: ({ items }, { scale = 1 }) => ({ inputs: { in: placed(items, scale) }, expected: { out: placed(items, scale, false) } }),
  },
  mendTwo: {
    about: t('两张这样的图，孪生图案的位置各不相同；期望是补好的两张图'),
    test: S.obj({ shape: ITEMS, mark: ITEMS }),
    make: ({ shape, mark }) => ({ inputs: { shape: placed(shape), mark: placed(mark) }, expected: { so: placed(shape, 1, false), mo: placed(mark, 1, false) } }),
  },
  order: {
    about: t('灰底上一块亮、一块暗，另给每格的图块编号；按阅读顺序亮块在前就整张图是 1'),
    test: S.obj({ bright: S.int({ min: 0, max: 15 }), dark: S.int({ min: 0, max: 15 }) }),
    make: ({ bright, dark }) => ({ inputs: { in: orderScene(bright, dark), pos: PATCH_NUMBER }, expected: { out: fromFn(16, 16, () => (bright < dark ? 1 : 0)) } }),
  },
  brightest: {
    about: t('几个图案，各有各的亮度；期望是每个图块都变成最亮的那个图案'),
    test: S.obj({ items: LIT }),
    make: ({ items }) => ({ inputs: { in: lit(items) }, expected: { out: brightest(items) } }),
  },
  nearest: {
    about: t('要找的照片和三张候选，其中一张是同一张照片（挪了、调了色或加了噪声）；期望是它那一路为 1'),
    test: S.obj({ q: S.call('picture'), candidates: S.list(S.call('picture'), { min: 3 }), which: S.int({ min: 0, max: 2 }) }),
    make: ({ q, candidates, which }) => {
      const [a, b, c] = candidates.map(picture)
      return { inputs: { q: picture(q), a, b, c }, expected: { pa: one(which === 0), pb: one(which === 1), pc: one(which === 2) } }
    },
  },
  duplicate: {
    about: t('两张照片；期望是它们是不是同一张（挪了、调了色或加了噪声也算）'),
    test: S.obj({ a: S.call('picture'), b: S.call('picture'), same: S.bool() }),
    make: ({ a, b, same }) => ({ inputs: { a: picture(a), b: picture(b) }, expected: { same: one(same) } }),
  },
}
