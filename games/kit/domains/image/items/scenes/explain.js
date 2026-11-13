// Scenes of checking a model (scenes/index.js): a street with a car, a linear classifier's weights for it (a weight
// a cell: its score is the sum of weight × brightness), and a ViT's class token asking the street's patches.
import { S } from '../../../../engine/schema.js'
import { attention } from '../../engine/attention.js'
import { fromFn, image } from '../../engine/image.js'
import { T as t } from '../../../../shell/i18n.js'

const num = (v) => image(1, 1, v)
const at = (img, x, y) => (x < 0 || y < 0 || x >= img.w || y >= img.h ? null : img.data[y * img.w + x])
const sum = (img) => img.data.reduce((s, v) => s + v, 0)
const times = (a, b) => fromFn(a.w, a.h, (x, y) => at(a, x, y) * at(b, x, y))

// A car (body 0.9, wheels 0.05) on a bright road (0.75, lane marks 0.95) under a dark sky (0.2), with a house (0.5)
// beside it in some streets. The car is 6 cells wide and 4 tall from (cx, 7); the road starts at row 11.
const street = ({ cx = 5, house = null, sky = 0.2 } = {}) =>
  fromFn(16, 16, (x, y) => {
    if (y === 11 && (x === cx + 1 || x === cx + 4)) return 0.05
    if (y >= 7 && y <= 10 && x >= cx && x < cx + 6) return 0.9
    if (y >= 11) return y === 13 && x % 4 < 2 ? 0.95 : 0.75
    if (house !== null && x >= house && x < house + 3 && y >= 6) return 0.5
    return sky
  })
const carMask = ({ cx = 5 } = {}) => fromFn(16, 16, (x, y) => ((y >= 7 && y <= 10 && x >= cx && x < cx + 6) || (y === 11 && (x === cx + 1 || x === cx + 4)) ? 1 : 0))
const STREET = S.obj({ cx: S.int({ about: t('车的左边在第几列') }), house: S.opt(S.int({ about: t('房子的左边在第几列') })) })
const streetOf = ({ cx, house }) => ({ cx, house: house ?? null })

// Weights a classifier might have learnt: on the car, on the road (every car photo had road in it), on both, on the
// wheels, against a dark sky, under the car, or wide.
const WEIGHTS = {
  car: fromFn(16, 16, (x, y) => (y >= 7 && y <= 10 && x >= 5 && x < 11 ? 0.3 : 0)),
  road: fromFn(16, 16, (x, y) => (y >= 12 ? 0.25 : 0)),
  both: fromFn(16, 16, (x, y) => (y >= 7 && y <= 10 && x >= 4 && x < 12 ? 0.2 : y >= 13 ? 0.15 : 0)),
  wheels: fromFn(16, 16, (x, y) => (y === 11 ? -0.4 : y === 10 && x >= 4 && x < 12 ? 0.2 : 0)),
  sky: fromFn(16, 16, (x, y) => (y < 6 ? -0.2 : y >= 7 && y <= 10 && x >= 5 && x < 11 ? 0.25 : 0)),
  shadow: fromFn(16, 16, (x, y) => (y >= 11 && y <= 12 && x >= 4 && x < 12 ? 0.3 : y === 10 && x >= 5 && x < 11 ? 0.1 : 0)),
  wide: fromFn(16, 16, (x, y) => (y >= 6 && y <= 11 && x >= 3 && x < 13 ? 0.2 : 0)),
}

// What covering the r × r block round each cell with v takes from the score. Cells beyond the picture are not there
// to cover.
const score = (x, w) => sum(times(x, w))
function occlusion(x, w, { v = 0, r = 3 } = {}) {
  const base = score(x, w)
  const half = (r - 1) / 2
  return fromFn(16, 16, (px, py) => {
    const covered = fromFn(16, 16, (x0, y0) => (Math.abs(x0 - px) <= half && Math.abs(y0 - py) <= half ? v : at(x, x0, y0)))
    return base - score(covered, w)
  })
}
// The share of a map on the object, and of the occlusion map's positive part (ReLU, as Grad-CAM does).
const share = (map, m) => sum(times(map, m)) / sum(map)
const positive = (img) => fromFn(img.w, img.h, (x, y) => Math.max(0, at(img, x, y)))
const heatShare = (x, w, m) => share(positive(occlusion(x, w, { v: 0.5 })), m)
// What a check of the classifier asks for, and whether it needs the car's mask.
const CHECKS = {
  contribution: { expect: (x, w) => ({ out: times(x, w) }) },
  occlusion: { expect: (x, w, m, cover) => ({ out: occlusion(x, w, cover) }) },
  share: { mask: true, expect: (x, w, m) => ({ out: num(share(times(x, w), m)) }) },
  heatShare: { mask: true, expect: (x, w, m) => ({ out: num(heatShare(x, w, m)) }) },
  checkup: { mask: true, expect: (x, w, m) => ({ heat: occlusion(x, w, { v: 0.5 }), cheat: num(heatShare(x, w, m) < 0.5 ? 1 : 0) }) },
}

// A ViT's class token asks every 4 × 4 patch with its query.
const tile = (paint) => fromFn(16, 16, (x, y) => paint(x % 4, y % 4))
const QUERIES = {
  bright: tile(() => 1.5),
  stripe: tile((x, y) => (y === 1 ? (x < 2 ? 10 : -10) : 0)),
  dark: tile(() => -1.5),
}
const patchMask = (patches) => fromFn(16, 16, (x, y) => (patches.some(([px, py]) => px === Math.floor(x / 4) && py === Math.floor(y / 4)) ? 1 : 0))

export const EXPLAIN = {
  classifier: {
    about: t('一条有车的街和一个线性分类器的权重（可以另给车的掩膜）；期望是每格的贡献、遮挡图、落在车上的分数比例、热图落在车上的比例，或体检的热图和判定'),
    setup: S.obj({
      check: S.oneOf(Object.keys(CHECKS)),
      cover: S.opt(S.obj({ v: S.opt(S.num()), r: S.opt(S.int({ min: 1 })) }, { about: t('遮挡用的块：亮度 v，r × r（默认黑的 3 × 3）') })),
    }),
    test: S.obj({ street: STREET, weights: S.oneOf(Object.keys(WEIGHTS)) }),
    make: (test, { check, cover }) => {
      const scene = streetOf(test.street)
      const x = street(scene)
      const w = WEIGHTS[test.weights]
      const m = carMask(scene)
      return { inputs: { in: x, w, ...(CHECKS[check].mask ? { m } : {}) }, expected: CHECKS[check].expect(x, w, m, cover) }
    },
  },
  classToken: {
    about: t('一条街、ViT 类别 token 的查询和车所在的图块；期望是注意力落在车上的比例'),
    test: S.obj({ street: STREET, query: S.oneOf(Object.keys(QUERIES)), patches: S.list(S.list(S.int(), { min: 2 }), { about: t('车所在的图块 [列, 行]') }) }),
    make: ({ street: s, query, patches }) => {
      const x = street(streetOf(s))
      const m = patchMask(patches)
      return { inputs: { in: x, q: QUERIES[query], m }, expected: { out: num(sum(attention(QUERIES[query], x, m)) / 256) } }
    },
  },
}
