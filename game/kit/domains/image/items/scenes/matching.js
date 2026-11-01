// Scenes of matching (scenes/index.js): response maps with bumps, keypoints' distances to three candidates, a window
// and its brightened partner, lanes on a road, a line among specks, one cell's gradient directions, and a book cover
// pasted back onto a photo of it.
import { S } from '../../../../engine/schema.js'
import { correlate, fromFn, image, map, random, zip } from '../../engine/image.js'
import { homographyDLT, project } from '../../engine/match.js'
import { NODE_TYPES } from '../../engine/nodes.js'
import { pairsOf, row, warp } from '../../engine/parts/matching.js'
import { picture } from '../pictures.js'

const t = (zh, en) => ({ zh, en })
const num = S.num()
const PT = S.list(S.num(), { min: 2 })
const SEGMENT = S.list(S.num(), { min: 4, about: t('一条线经过的两点：x1, y1, x2, y2', 'two points on a line: x1, y1, x2, y2') })
const SOBEL_X = [-1, 0, 1, -2, 0, 2, -1, 0, 1].map((v) => v / 8)
const SOBEL_Y = [-1, -2, -1, 0, 0, 0, 1, 2, 1].map((v) => v / 8)

/** The peaks of a response map: cells above `t` that no 3×3 neighbour beats by more than 0.025. */
export const peaksOf = (img, t = 0.3) =>
  fromFn(img.w, img.h, (x, y) => {
    const v = img.data[y * img.w + x]
    if (v <= t) return 0
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const u = x + dx
        const w = y + dy
        // A neighbour within 0.025 counts as equal, so a flat top keeps all of its cells.
        if (u >= 0 && w >= 0 && u < img.w && w < img.h && img.data[w * img.w + u] > v + 0.025) return 0
      }
    }
    return 1
  })
const bumps = (list) => fromFn(16, 16, (x, y) => list.reduce((s, [cx, cy, h]) => s + h * Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / 2), 0))

// Each cell a keypoint, three maps its distances to three candidates; at the cells listed as ambiguous the second
// nearest is close behind.
const RATIO = 0.8
function distanceMaps(seed, ambiguous) {
  const next = random(seed)
  const d = [image(8, 8), image(8, 8), image(8, 8)]
  for (let i = 0; i < 64; i++) {
    const k = Math.floor(next() * 3)
    const vals = [0.55 + 0.4 * next(), 0.55 + 0.4 * next(), 0.55 + 0.4 * next()]
    vals[k] = 0.1 + 0.3 * next()
    if (ambiguous.includes(i)) vals[(k + 1) % 3] = vals[k] + 0.04 + 0.1 * next()
    // Keep the gaps clear of rounding: no two distances closer than 0.05.
    const sorted = [...vals].sort((a, b) => a - b)
    if (sorted[1] - sorted[0] < 0.05) vals[vals.indexOf(sorted[1])] = sorted[0] + 0.05
    vals.forEach((v, j) => (d[j].data[i] = v))
  }
  return d
}
const matchIndex = ([d1, d2, d3]) =>
  fromFn(8, 8, (x, y) => {
    const i = y * 8 + x
    const v = [d1.data[i], d2.data[i], d3.data[i]]
    const s = [...v].sort((a, b) => a - b)
    return s[0] < RATIO * s[1] ? v.indexOf(s[0]) + 1 : 0
  })
const texture = (seed, lo = 0.1, span = 0.8) => {
  const next = random(seed)
  return fromFn(8, 8, () => lo + span * next())
}
const brighter = (img, seed) => {
  const next = random(seed)
  return map(img, (v) => v + 0.3 + 0.04 * (next() - 0.5))
}

const onLine = (x1, y1, x2, y2) => (x, y) => {
  const dx = x2 - x1
  const dy = y2 - y1
  return Math.abs(dy * (x - x1) - dx * (y - y1)) / Math.hypot(dx, dy) < 0.5
}
// The true line drawn the way the RANSAC part draws one.
const drawn = (x1, y1, x2, y2) => fromFn(16, 16, (x, y) => (Math.abs((y2 - y1) * (x - x1) - (x2 - x1) * (y - y1)) / Math.hypot(x2 - x1, y2 - y1) < 0.7 ? 1 : 0))

// A 12 × 16 book cover and a 32 × 32 photo of a desk with the book on it, seen at an angle (its corners at `quad`).
const COVER_W = 12
const COVER_H = 16
const COVER = fromFn(COVER_W, COVER_H, (x, y) => {
  if (x === 0 || y === 0 || x === COVER_W - 1 || y === COVER_H - 1) return 0.3
  if (y >= 2 && y <= 4 && x >= 2 && x <= 9) return 0.15
  if (x >= 4 && x <= 7 && y >= 8 && y <= 11) return 0.5
  return 0.9
})
const CORNERS_OF_COVER = [[0, 0], [COVER_W - 1, 0], [COVER_W - 1, COVER_H - 1], [0, COVER_H - 1]]
const homographyTo = (quad) => homographyDLT(CORNERS_OF_COVER.map((from, i) => ({ from, to: quad[i] })))
const DESK = fromFn(32, 32, (x, y) => (Math.floor((x + y) / 3) % 2 ? 0.35 : 0.45))
const photoOf = (H) => {
  const seen = warp(map(COVER, (v) => 0.25 + 0.5 * v), H, DESK)
  const mask = warp(map(COVER, () => 1), H, DESK)
  return zip(zip(DESK, mask, (d, m) => d * (1 - m)), seen, (a, b) => a + b)
}
// The crisp cover over the book: the photo where the cover does not land, the cover where it does.
const paste = (photo, H) => {
  const mask = warp(map(COVER, () => 1), H, photo)
  return zip(zip(photo, mask, (p, m) => p * (1 - m)), warp(COVER, H, photo), (a, b) => a + b)
}
// Points of the cover (its corners, the title bar's, the picture's) where they land in the photo, a little noisy,
// then wrong matches from the repeated desk pattern; 4 numbers a pair.
const COVER_POINTS = [...CORNERS_OF_COVER, [2, 2], [9, 2], [9, 4], [2, 4], [4, 8], [7, 8], [7, 11], [4, 11]]
const pairsFor = (H, seed, wrong) => {
  const next = random(seed)
  const values = []
  for (const [x, y] of COVER_POINTS) values.push(x, y, ...project(H, x, y).map((v) => v + 0.6 * (next() - 0.5)))
  for (let i = 0; i < wrong; i++) values.push(Math.floor(next() * COVER_W), Math.floor(next() * COVER_H), Math.floor(next() * 32), Math.floor(next() * 32))
  return row(values)
}
const QUAD = S.list(PT, { min: 4, about: t('书的四个角在照片里的位置', 'where the book’s four corners are in the photo') })

export const MATCHING = {
  bumps: {
    about: t('一张有几个平滑鼓包的响应图；期望是它的峰：比 3×3 邻居都不小、又大于 above 的格子', 'a response map with smooth bumps; its peaks expected: cells no smaller than their 3×3 neighbours and above `above`'),
    setup: S.obj({ above: num }),
    test: S.obj({ bumps: S.list(S.list(num, { min: 3 }), { about: t('鼓包：cx, cy, 高', 'bumps: cx, cy, height') }) }),
    make: ({ bumps: list }, { above }) => ({ inputs: { in: bumps(list) }, expected: { out: peaksOf(bumps(list), above) } }),
  },
  distances: {
    about: t('每格一个关键点，三张图是它到三个候选的距离；期望是距离比检验配上的候选（1–3，没配上是 0）', 'each cell a keypoint, three maps its distances to three candidates; the candidate the ratio test accepts (1–3, else 0) expected'),
    test: S.obj({ seed: S.int(), ambiguous: S.list(S.int(), { about: t('第二近紧跟在后的格子', 'the cells where the second nearest is close behind') }) }),
    make: ({ seed, ambiguous }) => {
      const [d1, d2, d3] = distanceMaps(seed, ambiguous)
      return { inputs: { d1, d2, d3 }, expected: { idx: matchIndex([d1, d2, d3]) } }
    },
  },
  brighter: {
    about: t('关键点的窗口和三个候选：真搭档是同一块纹理调亮了 0.3，另两个是同样亮的平淡纹理；期望是搭档的编号', 'a keypoint’s window and three candidates, its partner the same texture brightened by 0.3, the others flat textures as bright; the partner’s number expected'),
    test: S.obj({ seed: S.int(), which: S.int({ min: 0, max: 2 }) }),
    make: ({ seed, which }) => {
      const p = texture(seed)
      const cands = [0, 1, 2].map((j) => (j === which ? brighter(p, seed + 9) : texture(seed + 20 + j, 0.45, 0.1)))
      return { inputs: { p, c1: cands[0], c2: cands[1], c3: cands[2] }, expected: { idx: image(1, 1, which + 1) } }
    },
  },
  road: {
    about: t('暗路面上的车道线和几个亮斑；期望是投票累加器（× 1/8）里的峰', 'lanes on a dark road with a few bright specks; the peaks of the vote accumulator (× 1/8) expected'),
    test: S.obj({ lanes: S.list(SEGMENT), specks: S.list(PT) }),
    make: ({ lanes, specks }) => {
      const fs = lanes.map((l) => onLine(...l))
      const img = fromFn(16, 16, (x, y) => (fs.some((f) => f(x, y)) || specks.some(([sx, sy]) => sx === x && sy === y) ? 0.9 : 0.1))
      return { inputs: { in: img }, expected: { out: peaksOf(map(NODE_TYPES.hough.eval({ in: img }), (v) => v / 8)) } }
    },
  },
  clutter: {
    about: t('一条线和随机的杂点；期望是那条真线', 'a line among random specks; the true line expected'),
    test: S.obj({ line: SEGMENT, seed: S.int(), outliers: S.int({ min: 0 }) }),
    make: ({ line, seed, outliers }) => {
      const next = random(seed)
      const specks = Array.from({ length: outliers }, () => [Math.floor(next() * 16), Math.floor(next() * 16)])
      const f = onLine(...line)
      return { inputs: { in: fromFn(16, 16, (x, y) => (f(x, y) || specks.some(([sx, sy]) => sx === x && sy === y) ? 1 : 0)) }, expected: { out: drawn(...line) } }
    },
  },
  orientations: {
    about: t('一个小格：期望是梯度幅值按方向（→ ↑ ← ↓）分到四个数，各除以格数', 'one cell: its gradient magnitude shared out to four directions (→ ↑ ← ↓), each divided by the cells, expected'),
    test: S.obj({ in: S.call('picture') }),
    make: (test) => {
      const img = picture(test.in)
      const gx = correlate(img, SOBEL_X)
      const gy = correlate(img, SOBEL_Y)
      const sums = { e: 0, n: 0, w: 0, s: 0 }
      for (let i = 0; i < gx.data.length; i++) {
        const [x, y] = [gx.data[i], gy.data[i]]
        const m = Math.hypot(x, y)
        if (Math.abs(x) > Math.abs(y)) sums[x > 0 ? 'e' : 'w'] += m
        else if (Math.abs(y) > Math.abs(x)) sums[y > 0 ? 's' : 'n'] += m
      }
      return { inputs: { in: img }, expected: Object.fromEntries(['e', 'n', 'w', 's'].map((k) => [k, image(1, 1, sums[k] / gx.data.length)])) }
    },
  },
  paste: {
    about: t('书的照片、清楚的封面和单应 H；期望是封面贴回照片上', 'a photo of the book, the crisp cover and the homography H; the cover pasted back onto the photo expected'),
    test: S.obj({ quad: QUAD }),
    make: ({ quad }) => {
      const H = homographyTo(quad)
      return { inputs: { photo: photoOf(H), cover: COVER, H: row(H) }, expected: { out: paste(photoOf(H), H) } }
    },
  },
  coverPairs: {
    about: t('书的照片、封面和匹配的点对（有噪声，夹着错配）；期望是用对的点对解出的单应贴回封面', 'a photo of the book, the cover and matched pairs (noisy, with wrong ones among them); the cover pasted back by the homography of the right pairs expected'),
    test: S.obj({ quad: QUAD, seed: S.int(), wrong: S.int({ min: 0, about: t('错配几对', 'how many wrong pairs') }) }),
    make: ({ quad, seed, wrong }) => {
      const H = homographyTo(quad)
      const pairs = pairsFor(H, seed, wrong)
      // The best a circuit can do is the homography of the right pairs alone, noise and all: that is the answer.
      const best = homographyDLT(pairsOf(pairs).slice(0, COVER_POINTS.length))
      return { inputs: { photo: photoOf(H), cover: COVER, pairs }, expected: { out: paste(photoOf(H), best) } }
    },
  },
}
