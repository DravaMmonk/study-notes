// Parts for finding the same point again (视觉完备 chapter 6): Hough voting, RANSAC and homographies, and warping a
// picture by one. Points come from a mask's bright pixels; a homography travels as a 1×9 row and pairs of points as a
// row of x, y, x′, y′ four at a time.
import { fromFn, random } from '../image.js'
import { distanceToLine, homographyDLT, houghAccumulate, invert3, project, ransacLine } from '../match.js'

const HOUGH_BINS = 16

export const pointsOf = (img) => {
  const points = []
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) if (img.data[y * img.w + x] > 0.5) points.push([x, y])
  return points
}
// A homography as a 1×9 row, and pairs of points as a row of x, y, x′, y′ four at a time.
export const row = (values) => ({ w: values.length, h: 1, data: Float32Array.from(values) })
export const pairsOf = (signal) => Array.from({ length: Math.floor(signal.w / 4) }, (_, i) => ({ from: [signal.data[4 * i], signal.data[4 * i + 1]], to: [signal.data[4 * i + 2], signal.data[4 * i + 3]] }))
const reprojection = (H, { from, to }) => Math.hypot(...project(H, ...from).map((v, i) => v - to[i]))
function robustHomography(pairs, k, next) {
  if (!k) return homographyDLT(pairs)
  let best = null
  for (let round = 0; round < k; round++) {
    const pick = []
    while (pick.length < 4) {
      const i = Math.floor(next() * pairs.length)
      if (!pick.includes(i)) pick.push(i)
    }
    const H = homographyDLT(pick.map((i) => pairs[i]))
    if (!H) continue
    const inliers = pairs.filter((pair) => reprojection(H, pair) < 1.5)
    if (!best || inliers.length > best.length) best = inliers
  }
  return best && best.length >= 4 ? homographyDLT(best) : null
}
// The picture `onto` with `img` carried there by H, sampling the nearest pixel; 0 where it falls outside `img`.
export function warp(img, H, onto) {
  const back = invert3(H)
  return fromFn(onto.w, onto.h, (x, y) => {
    if (!back) return 0
    const [u, v] = project(back, x, y).map(Math.round)
    return u >= 0 && v >= 0 && u < img.w && v < img.h ? img.data[v * img.w + u] : 0
  })
}


export const MATCHING = {
  hough: {
    label: { zh: 'Hough 累加器', en: 'Hough accumulator' },
    description: {
      zh: '亮于 0.5 的每个点给经过它的所有直线 x·cosθ + y·sinθ = ρ 投一票：横着是 θ（16 格，0° … 180°），竖着是 ρ（每格 2 像素）',
      en: 'Every point brighter than 0.5 votes for each line x·cosθ + y·sinθ = ρ through it: across is θ (16 cells, 0° … 180°), down is ρ (2 pixels a cell)',
    },
    inputs: ['in'],
    eval: ({ in: a }) => {
      const acc = houghAccumulate(pointsOf(a), 180 / HOUGH_BINS, 2, Math.ceil(Math.hypot(a.w, a.h)))
      return { w: acc.nT, h: acc.nR, data: acc.votes }
    },
    cost: HOUGH_BINS,
    unlock: 'hough',
  },
  ransac: {
    label: { zh: 'RANSAC 找直线', en: 'RANSAC line' },
    description: {
      zh: '在亮于 0.5 的点里，k 轮各抽两点连线、数离线不到 δ 的点，留下支持最多的线并用它的内点重新拟合，画出来（离线不到 0.7 的格子为 1）',
      en: 'Among the points brighter than 0.5, k rounds each join two random points and count the points closer than δ; the best line is refitted on its inliers and drawn (cells closer than 0.7 are 1)',
    },
    inputs: ['in'],
    params: [
      { key: 'k', label: { zh: '轮数 k', en: 'Rounds k' }, kind: 'number', min: 1, max: 200, step: 1, default: 10 },
      { key: 'd', label: 'δ', kind: 'number', min: 0.25, max: 3, step: 0.25, default: 1 },
    ],
    eval: ({ in: a }, p) => {
      const fit = ransacLine(pointsOf(a), p.k ?? 10, p.d ?? 1, random(7))
      return fromFn(a.w, a.h, (x, y) => (fit && distanceToLine(fit.line, [x, y]) < 0.7 ? 1 : 0))
    },
    cost: (p) => Math.max(1, Math.round((p.k ?? 10) / 4)),
    unlock: 'ransac',
  },
  homography: {
    label: { zh: '求单应', en: 'Solve homography' },
    description: {
      zh: '点对每 4 个数一对：(x, y) → (x′, y′)。k = 0 时用全部点对直接解（DLT）；k > 0 时做 RANSAC：k 轮各抽 4 对解 H，数误差小于 1.5 像素的点对，留下最多的一组再解一次。输出 H 的 9 个数',
      en: 'Pairs come four numbers at a time: (x, y) → (x′, y′). With k = 0 it solves from all the pairs (DLT); with k > 0 it runs RANSAC: k rounds each solve H from 4 random pairs and count the pairs it maps within 1.5 pixels, and the largest group is solved again. Outputs the 9 numbers of H',
    },
    inputs: ['pairs'],
    params: [{ key: 'k', label: { zh: '轮数 k', en: 'Rounds k' }, kind: 'number', min: 0, max: 200, step: 10, default: 0 }],
    eval: ({ pairs }, p) => {
      const H = robustHomography(pairsOf(pairs), p.k ?? 0, random(11))
      if (!H) throw new Error('the pairs do not fix a homography')
      return row(H)
    },
    cost: 1,
    unlock: 'homography',
  },
  warp: {
    label: { zh: '单应变形', en: 'Homography warp' },
    description: {
      zh: '按 H 把图搬到「画布」那么大的一张图上：画布上每一格取原图里 H⁻¹ 指向的那一格（最近的一格），落在原图外是 0',
      en: 'Carries the picture by H onto a picture the size of the "canvas": each cell of the canvas takes the cell of the picture that H⁻¹ points to (the nearest one), and 0 where that falls outside',
    },
    inputs: ['in', 'H', 'onto'],
    anySize: true,
    eval: ({ in: a, H, onto }) => warp(a, Array.from(H.data), onto),
    cost: 4,
  },
}

