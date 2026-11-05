// Scenes of detection (scenes/index.js): two boxes and how much they overlap, ranked lists of detections into AP,
// anchor boxes and their corrections, X- and O-marked boxes on a shelf, and dogs as solid blobs.
import { S } from '../../../../engine/schema.js'
import { correlate, fromFn, gaussianKernel, image, random, zip } from '../../engine/image.js'
import { T as t } from '../../../../shell/i18n.js'

const num = (v) => image(1, 1, v)
const row = (values) => ({ w: values.length, h: 1, data: Float32Array.from(values) })
const BOX = S.list(S.int(), { min: 4, about: t('一个框：x0, y0, x1, y1（不含 x1、y1）', 'a box: x0, y0, x1, y1 (x1, y1 excluded)') })

const boxMask = ([x0, y0, x1, y1]) => fromFn(16, 16, (x, y) => (x >= x0 && x < x1 && y >= y0 && y < y1 ? 1 : 0))
const iou = (a, b) => {
  let inter = 0
  let sa = 0
  let sb = 0
  for (let i = 0; i < a.data.length; i++) {
    inter += a.data[i] * b.data[i]
    sa += a.data[i]
    sb += b.data[i]
  }
  return inter / (sa + sb - inter)
}
const BOX_EXPECTS = {
  iou: (a, b) => ({ out: num(iou(a, b)) }),
  good: (a, b) => ({ ok: num(iou(a, b) > 0.5 ? 1 : 0) }),
}

// Detections sorted by score, each right (1) or wrong (0); AP = the precision at each right one, added up, over the
// number of labelled objects G.
const N = 16
const ap = (flags, g) => {
  let right = 0
  let sum = 0
  flags.forEach((f, k) => {
    right += f
    if (f) sum += right / (k + 1)
  })
  return sum / g
}
const RANKS = row(Array.from({ length: N }, (_, k) => k + 1))
const RANKED = S.obj({ flags: S.list(S.oneOf([0, 1]), { min: N, about: t('按分数排好的 16 个检测，对 1 错 0', 'the 16 detections in score order, right 1 and wrong 0') }), g: S.int({ min: 1, about: t('标注了几个', 'how many are labelled') }) })

// An anchor (cx, cy, w, h) and the corrections (tx, ty, tw, th): the box is centred at cx + tx·w, cy + ty·h, w·e^tw
// by h·e^th.
const nudge = (v) => ({ bx: v.cx + v.tx * v.w, by: v.cy + v.ty * v.h, bw: v.w * Math.exp(v.tw), bh: v.h * Math.exp(v.th) })

// Marks on a shelf: 3 × 3 X and O, at twice the size when large (centred on an odd pixel, so each of their cells is a
// 2 × 2 block).
const X3 = ['#.#', '.#.', '#.#']
const O3 = ['###', '#.#', '###']
const stamp = (w, h, marks) =>
  fromFn(w, h, (x, y) => {
    for (const { mark, at: [cx, cy], scale: s = 1 } of marks) {
      const u = Math.floor((x - cx) / s + 1.5)
      const v = Math.floor((y - cy) / s + 1.5)
      if (u >= 0 && u < 3 && v >= 0 && v < 3 && x - cx >= -1.5 * s && x - cx < 1.5 * s && y - cy >= -1.5 * s && y - cy < 1.5 * s) return (mark === 'X' ? X3 : O3)[v][u] === '#' ? 0.9 : 0.1
    }
    return 0.1
  })
const MARKS = S.list(S.obj({ mark: S.oneOf(['X', 'O']), at: S.list(S.int(), { min: 2 }), scale: S.opt(S.oneOf([1, 2], { about: t('2 是大号', '2 for a large one') })) }))
const smallCentres = (marks, w) => fromFn(w, w, (x, y) => (marks.some(({ mark, at: [cx, cy], scale = 1 }) => mark === 'X' && scale === 1 && cx === x && cy === y) ? 1 : 0))
const bigCentres = (marks, w) => fromFn(w, w, (x, y) => (marks.some(({ mark, at: [cx, cy], scale = 1 }) => mark === 'X' && scale === 2 && (x >> 1) === cx >> 1 && (y >> 1) === cy >> 1) ? 1 : 0))
const SHELF_EXPECTS = {
  small: (marks, w) => smallCentres(marks, w),
  both: (marks, w) => zip(smallCentres(marks, w), bigCentres(marks, w), Math.max),
}
const grain = (img, seed, amp) => {
  const next = random(seed)
  return zip(img, img, (v) => v + amp * (next() - 0.5) * 2)
}

export const DETECT = {
  boxPair: {
    about: t('两个框的掩膜；期望是交并比（iou），或交并比是否大于 0.5（good）', 'two boxes’ masks; their intersection over union (iou), or whether it is over 0.5 (good), expected'),
    setup: S.obj({ expect: S.oneOf(Object.keys(BOX_EXPECTS)) }),
    test: S.obj({ a: BOX, b: BOX }),
    make: ({ a, b }, { expect }) => ({ inputs: { a: boxMask(a), b: boxMask(b) }, expected: BOX_EXPECTS[expect](boxMask(a), boxMask(b)) }),
  },
  ranking: {
    about: t('按分数排好的检测对错、名次 1 … 16 和标注数 G；期望是 AP', 'the detections right or wrong in score order, the ranks 1 … 16 and the number labelled G; the AP expected'),
    test: RANKED,
    make: ({ flags, g }) => ({ inputs: { f: row(flags), k: RANKS, g: num(g) }, expected: { out: num(ap(flags, g)) } }),
  },
  twoRankings: {
    about: t('两类各自的排名表和标注数，另给名次；期望是两类 AP 的平均（mAP）', 'two classes’ ranked lists and numbers labelled, with the ranks; the mean of their APs (mAP) expected'),
    test: S.obj({ one: RANKED, two: RANKED }),
    make: ({ one, two }) => ({ inputs: { f1: row(one.flags), g1: num(one.g), f2: row(two.flags), g2: num(two.g), k: RANKS }, expected: { out: num((ap(one.flags, one.g) + ap(two.flags, two.g)) / 2) } }),
  },
  nudge: {
    about: t('一排锚框 (cx, cy, w, h) 和网络给的修正 (tx, ty, tw, th)；期望是修正后的框', 'a row of anchor boxes (cx, cy, w, h) and the network’s corrections (tx, ty, tw, th); the corrected boxes expected'),
    test: S.obj({ anchors: S.list(S.obj({ cx: S.num(), cy: S.num(), w: S.num(), h: S.num() }), { min: 1 }), t: S.obj({ tx: S.num(), ty: S.num(), tw: S.num(), th: S.num() }) }),
    make: ({ anchors, t: c }) => {
      const pick = (key) => row(anchors.map((a) => a[key]))
      const boxes = anchors.map((a) => nudge({ ...a, ...c }))
      return { inputs: { cx: pick('cx'), cy: pick('cy'), w: pick('w'), h: pick('h'), tx: num(c.tx), ty: num(c.ty), tw: num(c.tw), th: num(c.th) }, expected: Object.fromEntries(['bx', 'by', 'bw', 'bh'].map((k) => [k, row(boxes.map((b) => b[k]))])) }
    },
  },
  marks: {
    about: t('16 × 16 的货架上的小记号：X 是要找的盒子，O 不要；期望是每个 X 的中心', 'small marks on a 16 × 16 shelf, X for the boxes to find and O for the rest; each X’s centre expected'),
    test: S.obj({ marks: MARKS }),
    make: ({ marks }) => ({ inputs: { in: stamp(16, 16, marks) }, expected: { out: smallCentres(marks, 16) } }),
  },
  shelf: {
    about: t('24 × 24 的货架，小号和大号的记号，可能有颗粒、可能有点糊；期望是小号 X 的中心（small），或连大号 X 也标出（both，大号标成一个 2 × 2 块）', 'a 24 × 24 shelf with small and large marks, maybe grainy, maybe a little blurred; the small Xs’ centres (small), or the large ones too, each a 2 × 2 block (both), expected'),
    setup: S.obj({ expect: S.oneOf(Object.keys(SHELF_EXPECTS)), grain: S.opt(S.num({ about: t('颗粒的大小', 'how strong the grain is') })), blur: S.opt(S.num({ about: t('先模糊（高斯的 σ，复制边缘）', 'a blur first (the Gaussian’s σ, the edge replicated)') })) }),
    test: S.obj({ marks: MARKS, seed: S.opt(S.int({ about: t('颗粒的种子', 'the grain’s seed') })) }),
    make: ({ marks, seed }, { expect, grain: amp, blur }) => {
      const drawn = stamp(24, 24, marks)
      const soft = blur ? correlate(drawn, gaussianKernel(blur), 'edge') : drawn
      return { inputs: { in: amp ? grain(soft, seed, amp) : soft }, expected: { out: SHELF_EXPECTS[expect](marks, 24) } }
    },
  },
  dogs: {
    about: t('几只狗，每只是一团亮的斑；期望是每只狗的中心', 'a few dogs, each a solid bright blob; each dog’s centre expected'),
    test: S.obj({ dogs: S.list(S.list(S.int(), { min: 2 })) }),
    make: ({ dogs }) => ({
      inputs: { in: correlate(fromFn(16, 16, (x, y) => (dogs.some(([cx, cy]) => Math.abs(x - cx) <= 1 && Math.abs(y - cy) <= 1) ? 0.9 : 0.1)), gaussianKernel(0.8), 'edge') },
      expected: { out: fromFn(16, 16, (x, y) => (dogs.some(([cx, cy]) => cx === x && cy === y) ? 1 : 0)) },
    }),
  },
}
