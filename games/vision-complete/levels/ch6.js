// 第 6 章 · 认出同一个点 (lectures 11–12). The steps build what a matcher needs from parts the player already has:
// Harris, a peak finder, a ratio test; voting (Hough) and random consensus (RANSAC) come from benches and become
// parts. The series pastes a book cover back onto a photo: the four corners (a bench) give a homography, a warp
// pastes the cover, and RANSAC over noisy pairs makes it robust.
import { GLYPHS, correlate, fromFn, image, map, patterns as P, random, zip } from '../../kit/domains/image/engine/image.js'
import { homographyDLT, project } from '../../kit/domains/image/engine/match.js'
import { NODE_TYPES, harrisResponse } from '../../kit/domains/image/engine/nodes.js'
import { benches } from './ch6-benches.js'
import { pairsOf, row, warp } from '../../kit/domains/image/engine/parts/matching.js'
import { build, test } from '../../kit/domains/image/build.js'

const SOBEL_X = [-1, 0, 1, -2, 0, 2, -1, 0, 1].map((v) => v / 8)
const SOBEL_Y = [-1, -2, -1, 0, 0, 0, 1, 2, 1].map((v) => v / 8)
// ---------------- 6-1 角点 ----------------

const HARRIS_T = 0.22
const cornerMask = (img) => map(harrisResponse(img), (v) => (v > HARRIS_T ? 1 : 0))

const cornersLevel = {
    id: '6-1',
    views: { in: 'slope', out: 'pixels', mid: 'terrain' },
    chapter: 6,
    title: { zh: '角点', en: 'Corners' },
    brief: { zh: '只在角上输出 1。直边、平坦处都是 0。', en: 'Output 1 only at corners. Straight edges and flat areas are 0.' },
    hint: { zh: '在角上，往哪个方向挪都会变；在直边上，沿着边挪不会变。分别统计 Gx²、Gy²、Gx·Gy 在 3×3 窗口里的和，再算 det − 0.05·trace²。', en: 'At a corner, moving in any direction changes what you see; on a straight edge, moving along the edge changes nothing. Sum Gx², Gy² and Gx·Gy over a 3×3 window, then compute det − 0.05·trace².' },
    after: { zh: '你搭出了 Harris 角点检测：两个方向的变化都大，才是角。直边只有一个方向大，所以 det 小、R 为负。', en: 'You have built the Harris corner detector: it is a corner only when the change is large in both directions. A straight edge is large in only one direction, so det is small and R is negative.' },
    unlocks: ['harris'],
    palette: ['sobelx', 'sobely', 'arith', 'merge', 'box3', 'const', 'threshold'],
    check: { tolerance: 0.5, mismatches: 2 },
    tests: [[{ zh: '一个角', en: 'One corner' }, P.corner()], [{ zh: '方块', en: 'Square' }, P.square(4, 4, 8)], [{ zh: '直边', en: 'Straight edge' }, P.stepX(8)], [{ zh: '字母 L', en: 'Letter L' }, P.glyph(GLYPHS.L)]].map(([label, img]) => test(label, { in: img }, { out: cornerMask(img) })),
    hidden: [[{ zh: '字母 T', en: 'Letter T' }, P.glyph(GLYPHS.T, 0.1, 0.9, 4, 3)], [{ zh: '挪开的小方块', en: 'Shifted small square' }, P.square(8, 2, 5)], [{ zh: '横边', en: 'Horizontal edge' }, P.stepY(9)]].map(([label, img]) => test(label, { in: img }, { out: cornerMask(img) })),
    solution: build(
      {
        x: 'sobelx', y: 'sobely', xx: ['arith', { op: 'mul' }], yy: ['arith', { op: 'mul' }], xy: ['arith', { op: 'mul' }], sxx: 'box3', syy: 'box3', sxy: 'box3',
        p: ['arith', { op: 'mul' }], q: ['arith', { op: 'mul' }], det: ['arith', { op: 'sub' }], tr: ['arith', { op: 'add' }], tt: ['arith', { op: 'mul' }], kt: ['arith', { op: 'mul' }], ktN: ['const', { c: 0.05 }], r: ['arith', { op: 'sub' }], s: ['arith', { op: 'mul' }], sN: ['const', { c: 100 }], t: ['threshold', { t: HARRIS_T }],
      },
      ['in>x', 'in>y', 'x>xx.a', 'x>xx.b', 'y>yy.a', 'y>yy.b', 'x>xy.a', 'y>xy.b', 'xx>sxx', 'yy>syy', 'xy>sxy', 'sxx>p.a', 'syy>p.b', 'sxy>q.a', 'sxy>q.b', 'p>det.a', 'q>det.b', 'sxx>tr.a', 'syy>tr.b', 'tr>tt.a', 'tr>tt.b', 'tt>kt.a', 'det>r.a', 'kt>r.b', 'r>s.a', 's>t', 't>out', 'ktN>kt.b', 'sN>s.b'],
    ),
    naive: build({ x: 'sobelx', y: 'sobely', xx: ['arith', { op: 'mul' }], yy: ['arith', { op: 'mul' }], a: ['arith', { op: 'add' }], s: ['arith', { op: 'mul' }], sN: ['const', { c: 100 }], t: ['threshold', { t: HARRIS_T }] }, ['in>x', 'in>y', 'x>xx.a', 'x>xx.b', 'y>yy.a', 'y>yy.b', 'xx>a.a', 'yy>a.b', 'a>s.a', 's>t', 't>out', 'sN>s.b']),
  }

// ---------------- 6-2 只留最强的 ----------------
// A response map with smooth bumps. A peak is a cell no 3×3 neighbour beats, above 0.3.

const bumps = (list) => fromFn(16, 16, (x, y) => list.reduce((s, [cx, cy, h]) => s + h * Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / 2), 0))
const PEAK_T = 0.3
const peaksOf = (img, t = PEAK_T) =>
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
const PEAKS = [
  [{ zh: '三个峰', en: 'Three peaks' }, [[3, 4, 0.9], [11, 5, 0.6], [7, 12, 0.8]]],
  [{ zh: '挨得近的峰', en: 'Close peaks' }, [[5, 5, 0.9], [8, 6, 0.7], [12, 12, 0.5]]],
  [{ zh: '有一个太弱', en: 'One too weak' }, [[4, 11, 0.8], [11, 3, 0.25], [12, 10, 0.6]]],
]
const PEAKS_HIDDEN = [
  [{ zh: '贴边的峰', en: 'A peak at the edge' }, [[0, 7, 0.7], [9, 9, 0.9]]],
  [{ zh: '一排峰', en: 'A row of peaks' }, [[2, 8, 0.6], [6, 8, 0.8], [10, 8, 0.7], [14, 8, 0.5]]],
]
const peakTests = (cases) => cases.map(([label, list]) => test(label, { in: bumps(list) }, { out: peaksOf(bumps(list)) }))
const peakGraph = () =>
  build(
    {
      l: ['shift', { dir: '←' }], r: ['shift', { dir: '→' }], h1: 'max', h: 'max', u: ['shift', { dir: '↑' }], d: ['shift', { dir: '↓' }], v1: 'max', v: 'max',
      df: ['arith', { op: 'sub' }], eq: ['threshold', { t: -0.025 }], big: ['threshold', { t: PEAK_T }], m: ['arith', { op: 'mul' }],
    },
    ['in>l', 'in>r', 'in>h1.a', 'l>h1.b', 'h1>h.a', 'r>h.b', 'h>u', 'h>d', 'h>v1.a', 'u>v1.b', 'v1>v.a', 'd>v.b', 'in>df.a', 'v>df.b', 'df>eq', 'in>big', 'eq>m.a', 'big>m.b', 'm>out'],
  )

const peaks = {
  id: '6-2',
  chapter: 6,
  title: { zh: '只留最强的', en: 'Keep only the strongest' },
  inputs: ['in'],
  outputs: ['out'],
  brief: { zh: `一张响应图上有几个鼓包。只在峰顶输出 1：这一格比 3×3 邻居都不小，而且大于 ${PEAK_T}。`, en: `A response map has a few bumps. Output 1 only at the tops: a cell no smaller than any of its 3×3 neighbours, and above ${PEAK_T}.` },
  hint: { zh: '先算出每一格周围 3×3 里最大的是多少。「取较大」一次只比两张图，可以先横着比、再竖着比。', en: 'First work out the largest value in the 3×3 around each cell. "Larger" compares only two pictures at a time, so compare across first, then down.' },
  after: {
    zh: '「等于周围最大值」的格子才是峰顶：这叫非极大值抑制（NMS）。一块 3×3 的最大值可以拆成先横后竖，和可分离的模糊一个道理。你的电路现在是元件「找峰」，后面检测角点、找直线、框物体都要用。',
    en: 'Only a cell equal to the largest around it is a top: this is called non-maximum suppression (NMS). The maximum over a 3×3 block splits into across then down, just like a separable blur. Your circuit is now the part "Peak finder", and detecting corners, finding lines and boxing objects all need it later.',
  },
  packs: { name: { zh: '找峰', en: 'Peak finder' }, desc: { zh: `你在「只留最强的」里搭的：比 3×3 邻居都不小、又大于 ${PEAK_T} 的格子输出 1`, en: `What you built in "Keep only the strongest": 1 where a cell is no smaller than its 3×3 neighbours and above ${PEAK_T}` } },
  unlocks: [],
  palette: ['shift', 'max', 'arith', 'merge', 'const', 'threshold'],
  tests: peakTests(PEAKS),
  hidden: peakTests(PEAKS_HIDDEN),
  solution: peakGraph(),
  naive: build({ big: ['threshold', { t: PEAK_T }] }, ['in>big', 'big>out']),
}

// ---------------- 6-3 一个角一个点 ----------------

const HARRIS_GAIN = 2
const cornerPoints = (img) => peaksOf(map(harrisResponse(img), (v) => v * HARRIS_GAIN))
const ONE = [
  [{ zh: '方块', en: 'Square' }, P.square(4, 4, 8)],
  [{ zh: '字母 L', en: 'Letter L' }, P.glyph(GLYPHS.L)],
  [{ zh: '两个方块', en: 'Two squares' }, fromFn(16, 16, (x, y) => ((x >= 2 && x < 7 && y >= 2 && y < 7) || (x >= 9 && x < 14 && y >= 8 && y < 14) ? 0.9 : 0.1))],
]
const ONE_HIDDEN = [[{ zh: '字母 T', en: 'Letter T' }, P.glyph(GLYPHS.T, 0.1, 0.9, 4, 3)], [{ zh: '一个角', en: 'One corner' }, P.corner(5, 7)]]
const onePoint = {
  id: '6-3',
  chapter: 6,
  title: { zh: '一个角一个点', en: 'One point per corner' },
  views: { in: 'pixels', out: 'pixels', mid: 'terrain' },
  brief: { zh: `每个角只输出一个点：Harris 响应乘 ${HARRIS_GAIN} 以后，峰顶输出 1。`, en: `Output a single point per corner: after multiplying the Harris response by ${HARRIS_GAIN}, output 1 at its tops.` },
  hint: { zh: '门槛只能留下一块一块，每个角留下好几格。', en: 'A threshold leaves blobs: several cells per corner.' },
  after: {
    zh: '响应图一过门槛就是一片，片里只有峰顶是真正的角。先算响应、再找峰，是所有检测器的固定套路：角点、直线、物体框都这样。',
    en: 'Above a threshold the response is a patch, and only its top is the real corner. Response first, then peaks: every detector follows this routine, for corners, lines and object boxes alike.',
  },
  unlocks: [],
  palette: ['harris', 'own-6-2', 'arith', 'merge', 'const', 'threshold'],
  tests: ONE.map(([label, img]) => test(label, { in: img }, { out: cornerPoints(img) })),
  hidden: ONE_HIDDEN.map(([label, img]) => test(label, { in: img }, { out: cornerPoints(img) })),
  solution: build({ h: 'harris', g: ['arith', { op: 'mul' }], gk: ['const', { c: HARRIS_GAIN }], p: 'own-6-2' }, ['in>h', 'h>g.a', 'gk>g.b', 'g>p', 'p>out']),
  naive: build({ h: 'harris', t: ['threshold', { t: HARRIS_T }] }, ['in>h', 'h>t', 't>out']),
}

// ---------------- 6-4 可信的匹配 ----------------
// Each cell is a keypoint; its three maps are the distances to three candidates. Accept the nearest only when it is
// clearly nearer than the second: d₁ < 0.8 · d₂.

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
const MATCHES = [
  [{ zh: '第一组', en: 'Set 1' }, 21, [3, 9, 27, 40, 51]],
  [{ zh: '第二组', en: 'Set 2' }, 22, [0, 14, 33, 47, 60, 62]],
  [{ zh: '重复花纹多', en: 'Lots of repeated texture' }, 23, [1, 5, 8, 12, 19, 25, 30, 36, 44, 49, 55, 58]],
]
const MATCHES_HIDDEN = [[{ zh: '第四组', en: 'Set 4' }, 24, [2, 17, 29, 43, 56]]]
const matchTests = (cases) =>
  cases.map(([label, seed, amb]) => {
    const [d1, d2, d3] = distanceMaps(seed, amb)
    return test(label, { d1, d2, d3 }, { idx: matchIndex([d1, d2, d3]) })
  })
const matchGraph = (ratio = true) =>
  build(
    {
      M12: 'max', s12: ['arith', { op: 'add' }], m12: ['arith', { op: 'sub' }],
      M: 'max', sm: ['arith', { op: 'add' }], best: ['arith', { op: 'sub' }],
      s2: ['arith', { op: 'add' }], M2: 'max', second: ['arith', { op: 'sub' }],
      k8: ['const', { c: RATIO }], r: ['arith', { op: 'mul' }], gap: ['arith', { op: 'sub' }], ok: ['threshold', { t: 0 }],
      e1: ['arith', { op: 'sub' }], i1: ['threshold', { t: -0.025 }], e2: ['arith', { op: 'sub' }], i2: ['threshold', { t: -0.025 }], e3: ['arith', { op: 'sub' }], i3: ['threshold', { t: -0.025 }],
      two: ['const', { c: 2 }], three: ['const', { c: 3 }], w2: ['arith', { op: 'mul' }], w3: ['arith', { op: 'mul' }], sum: 'merge', out2: ['arith', { op: 'mul' }],
    },
    [
      'd1>M12.a', 'd2>M12.b', 'd1>s12.a', 'd2>s12.b', 's12>m12.a', 'M12>m12.b',
      'm12>M.a', 'd3>M.b', 'm12>sm.a', 'd3>sm.b', 'sm>best.a', 'M>best.b',
      'M>s2.a', 'M12>s2.b', 'M>M2.a', 'M12>M2.b', 's2>second.a', 'M2>second.b',
      'second>r.a', 'k8>r.b', 'r>gap.a', 'best>gap.b', 'gap>ok',
      'best>e1.a', 'd1>e1.b', 'e1>i1', 'best>e2.a', 'd2>e2.b', 'e2>i2', 'best>e3.a', 'd3>e3.b', 'e3>i3',
      'i2>w2.a', 'two>w2.b', 'i3>w3.a', 'three>w3.b', 'i1>sum.a', 'w2>sum.b', 'w3>sum.c',
      ...(ratio ? ['sum>out2.a', 'ok>out2.b', 'out2>idx'] : ['sum>idx']),
    ],
    { inputs: ['d1', 'd2', 'd3'], outputs: ['idx'] },
  )

const trusted = {
  id: '6-4',
  chapter: 6,
  title: { zh: '可信的匹配', en: 'A match you can trust' },
  inputs: ['d1', 'd2', 'd3'],
  outputs: ['idx'],
  inputLabels: { d1: { zh: '到候选 1 的距离', en: 'Distance to candidate 1' }, d2: { zh: '到候选 2 的距离', en: 'Distance to candidate 2' }, d3: { zh: '到候选 3 的距离', en: 'Distance to candidate 3' } },
  outputLabels: { idx: { zh: '配上的候选', en: 'Matched candidate' } },
  check: { tolerance: 0.1 },
  brief: {
    zh: `每一格是一个关键点，三张图是它到三个候选的距离。最近的距离 d₁ 小于第二近 d₂ 的 ${RATIO} 倍时，输出最近那个候选的编号 1、2 或 3；否则输出 0。`,
    en: `Each cell is a keypoint, and the three maps are its distances to three candidates. When the nearest distance d₁ is less than ${RATIO} times the second nearest d₂, output the number of the nearest candidate, 1, 2 or 3; otherwise output 0.`,
  },
  hint: { zh: '较小的那个 = 两个相加，再减去较大的那个。三个数里第二小的，是哪两个较小值里较大的？', en: 'The smaller of two = their sum minus the larger. Of three numbers, which is the second smallest: the larger of which two smaller ones?' },
  after: {
    zh: '重复的花纹里，第一名和第二名几乎一样近：这种匹配再像也不可信。距离比检验 d₁ / d₂ < 0.8 只接受第一名明显领先的匹配，整体变亮也不影响比值。你的电路现在是元件「匹配器」。',
    en: 'In repeated texture the first and second places are almost equally close: however alike, such a match cannot be trusted. The ratio test d₁ / d₂ < 0.8 accepts only a match whose first place is clearly ahead, and an overall brightening does not change the ratio. Your circuit is now the part "Matcher".',
  },
  packs: { name: { zh: '匹配器', en: 'Matcher' }, desc: { zh: `你在「可信的匹配」里搭的：最近的距离小于第二近的 ${RATIO} 倍时输出它的编号 1–3，否则 0`, en: `What you built in "A match you can trust": the number 1–3 of the nearest when it is under ${RATIO} times the second nearest, otherwise 0` } },
  unlocks: [],
  palette: ['max', 'arith', 'merge', 'const', 'threshold'],
  tests: matchTests(MATCHES),
  hidden: matchTests(MATCHES_HIDDEN),
  solution: matchGraph(),
  naive: matchGraph(false),
}

// ---------------- 6-5 亮度变了也配得上 ----------------
// The true partner is the same texture brightened by 0.3; the strangers are flat textures at the same brightness.
// Raw distances prefer a stranger; distances between mean-free patches find the partner.

const texture = (seed, lo = 0.1, span = 0.8) => {
  const next = random(seed)
  return fromFn(8, 8, () => lo + span * next())
}
const brighter = (img, seed) => {
  const next = random(seed)
  return map(img, (v) => v + 0.3 + 0.04 * (next() - 0.5))
}
const LIT = [
  [{ zh: '是 1', en: 'Candidate 1' }, 31, 0],
  [{ zh: '是 3', en: 'Candidate 3' }, 32, 2],
  [{ zh: '是 2', en: 'Candidate 2' }, 33, 1],
]
const LIT_HIDDEN = [[{ zh: '又是 3', en: 'Candidate 3 again' }, 34, 2]]
const litTests = (cases) =>
  cases.map(([label, seed, k]) => {
    const p = texture(seed)
    const cands = [0, 1, 2].map((j) => (j === k ? brighter(p, seed + 9) : texture(seed + 20 + j, 0.45, 0.1)))
    return test(label, { p, c1: cands[0], c2: cands[1], c3: cands[2] }, { idx: image(1, 1, k + 1) })
  })
const litGraph = (centre = true) => {
  const n = { mp: 'fqMean', dp: ['arith', { op: 'sub' }], m: 'own-6-4' }
  const w = ['p>mp', 'p>dp.a', 'mp>dp.b']
  for (const j of [1, 2, 3]) {
    Object.assign(n, { [`m${j}`]: 'fqMean', [`d${j}`]: ['arith', { op: 'sub' }], [`e${j}`]: ['arith', { op: 'sub' }], [`q${j}`]: ['arith', { op: 'mul' }], [`s${j}`]: 'fqMean' })
    w.push(`c${j}>m${j}`, `c${j}>d${j}.a`, `m${j}>d${j}.b`, centre ? `dp>e${j}.a` : `p>e${j}.a`, centre ? `d${j}>e${j}.b` : `c${j}>e${j}.b`, `e${j}>q${j}.a`, `e${j}>q${j}.b`, `q${j}>s${j}`, `s${j}>m.d${j}`)
  }
  w.push('m>idx')
  return build(n, w, { inputs: ['p', 'c1', 'c2', 'c3'], outputs: ['idx'] })
}

const brighterMatch = {
  id: '6-5',
  chapter: 6,
  title: { zh: '亮度变了也配得上', en: 'Matching through a change of light' },
  inputs: ['p', 'c1', 'c2', 'c3'],
  outputs: ['idx'],
  inputLabels: { p: { zh: '关键点的窗口', en: 'Keypoint window' }, c1: { zh: '候选 1', en: 'Candidate 1' }, c2: { zh: '候选 2', en: 'Candidate 2' }, c3: { zh: '候选 3', en: 'Candidate 3' } },
  outputLabels: { idx: { zh: '配上的候选', en: 'Matched candidate' } },
  check: { tolerance: 0.1 },
  brief: { zh: '右图整体亮了一截。用匹配器找出哪个候选窗口和关键点的窗口是同一处，输出它的编号。', en: 'The right image is brighter all over. Use the matcher to find which candidate window shows the same place as the keypoint window, and output its number.' },
  hint: { zh: '距离 = 平均((窗口 − 候选)²)。整体亮了一截时，每一格都差同一个数，这一点能先去掉吗？', en: 'Distance = average((window − candidate)²). When everything is brighter by some amount, every cell differs by the same number. Can you take that away first?' },
  after: {
    zh: '先让每个窗口减去自己的平均亮度，整体变亮就不影响距离了；再除以自己的标准差，连对比度变了也不怕。这就是归一化互相关（NCC）的想法，SIFT 描述子也会做类似的归一化。',
    en: "Subtract each window's own mean brightness first, and an overall brightening no longer affects the distance; divide by its own standard deviation as well, and even a contrast change does not matter. This is the idea behind normalised cross-correlation (NCC), and SIFT descriptors are normalised in a similar way.",
  },
  unlocks: [],
  palette: ['own-6-4', 'fqMean', 'arith', 'merge', 'const', 'sqrt'],
  tests: litTests(LIT),
  hidden: litTests(LIT_HIDDEN),
  solution: litGraph(),
  naive: litGraph(false),
}

// ---------------- 6-7 车道线 ----------------
// Two lanes on a dark road with a few bright specks. Threshold, vote, scale, find the peaks: two lines.

const line = (x1, y1, x2, y2) => (x, y) => {
  const dx = x2 - x1
  const dy = y2 - y1
  return Math.abs(dy * (x - x1) - dx * (y - y1)) / Math.hypot(dx, dy) < 0.5
}
const road = (lanes, specks) =>
  fromFn(16, 16, (x, y) => (lanes.some((f) => f(x, y)) || specks.some(([sx, sy]) => sx === x && sy === y) ? 0.9 : 0.1))
const VOTE_SCALE = 1 / 8
const lanePeaks = (img) => {
  const acc = NODE_TYPES.hough.eval({ in: img })
  return peaksOf(map(acc, (v) => v * VOTE_SCALE))
}
const LANES = [
  [{ zh: '两条车道', en: 'Two lanes' }, [line(3, 15, 7, 0), line(13, 15, 9, 0)], [[1, 2], [14, 3]]],
  [{ zh: '弯向一边', en: 'Leaning one way' }, [line(1, 15, 8, 0), line(9, 15, 15, 2)], [[4, 4], [12, 11]]],
  [{ zh: '杂点多一些', en: 'More specks' }, [line(4, 15, 6, 0), line(14, 15, 10, 0)], [[0, 0], [2, 9], [12, 5], [15, 14]]],
]
const LANES_HIDDEN = [[{ zh: '一横一竖', en: 'One across, one down' }, [line(0, 12, 15, 12), line(5, 0, 5, 15)], [[10, 3], [13, 7]]]]
const laneTests = (cases) => cases.map(([label, lanes, specks]) => test(label, { in: road(lanes, specks) }, { out: lanePeaks(road(lanes, specks)) }))

const lanes = {
  id: '6-7',
  chapter: 6,
  title: { zh: '车道线', en: 'Lane lines' },
  brief: { zh: '路面上有两条亮的车道线和几个亮点。在 Hough 累加器里只标出这两条线的格子：票数乘 1/8 以后的峰。', en: 'The road has two bright lane lines and a few bright specks. Mark only the cells of these two lines in the Hough accumulator: the peaks after multiplying the votes by 1/8.' },
  hint: { zh: '每个亮点都投票，可一个孤零零的亮点票数分散，成不了峰。', en: 'Every bright point votes, but a lone speck spreads its votes thin and makes no peak.' },
  after: {
    zh: '亮点、投票、找峰：Hough 把「找一条线」变成「在累加器里找峰」，挡掉了零散的杂点，线断了几段也照样找得到。车道保持系统的第一代就是这么做的。',
    en: 'Points, votes, peaks: Hough turns "find a line" into "find a peak in the accumulator", which ignores scattered specks and still finds a line broken into pieces. The first lane-keeping systems worked exactly like this.',
  },
  unlocks: [],
  palette: ['hough', 'own-6-2', 'threshold', 'arith', 'merge', 'const', 'sobelx', 'sobely'],
  tests: laneTests(LANES),
  hidden: laneTests(LANES_HIDDEN),
  solution: build({ t: ['threshold', { t: 0.5 }], h: 'hough', s: ['arith', { op: 'mul' }], sk: ['const', { c: VOTE_SCALE }], p: 'own-6-2' }, ['in>t', 't>h', 'h>s.a', 'sk>s.b', 's>p', 'p>out']),
  naive: build({ t: ['threshold', { t: 0.5 }], h: 'hough', s: ['arith', { op: 'mul' }], sk: ['const', { c: VOTE_SCALE }], b: ['threshold', { t: PEAK_T }] }, ['in>t', 't>h', 'h>s.a', 'sk>s.b', 's>b', 'b>out']),
}

// ---------------- 6-9 拽不歪的线 ----------------

const scatter = (seed, f, outliers) => {
  const next = random(seed)
  const specks = Array.from({ length: outliers }, () => [Math.floor(next() * 16), Math.floor(next() * 16)])
  return fromFn(16, 16, (x, y) => (f(x, y) || specks.some(([sx, sy]) => sx === x && sy === y) ? 1 : 0))
}
// The answer is the true line, drawn the way the part draws one.
const drawn = (x1, y1, x2, y2) => fromFn(16, 16, (x, y) => (Math.abs((y2 - y1) * (x - x1) - (x2 - x1) * (y - y1)) / Math.hypot(x2 - x1, y2 - y1) < 0.7 ? 1 : 0))
const CLUTTER = [
  [{ zh: '斜线和杂点', en: 'A slant and specks' }, [1, 14, 14, 3], 41, 10],
  [{ zh: '杂点更多', en: 'More specks' }, [2, 2, 13, 12], 42, 16],
  [{ zh: '陡的线', en: 'A steep line' }, [6, 0, 9, 15], 43, 12],
]
const CLUTTER_HIDDEN = [[{ zh: '平的线', en: 'A flat line' }, [0, 9, 15, 7], 44, 14]]
const clutterTests = (cases) => cases.map(([label, ends, seed, n]) => test(label, { in: scatter(seed, line(...ends), n) }, { out: drawn(...ends) }))

const robustLine = {
  id: '6-9',
  chapter: 6,
  title: { zh: '拽不歪的线', en: 'A line that will not be dragged' },
  brief: { zh: '边缘图里有一条直线和一堆杂点。画出这条直线（离线不到 0.7 的格子为 1）。', en: 'An edge map holds one straight line and a heap of specks. Draw the line (cells closer than 0.7 are 1).' },
  hint: { zh: '杂点越多，一轮抽中两个线上点的机会越小。', en: 'The more specks, the smaller the chance that a round draws two points on the line.' },
  after: {
    zh: '最小二乘会被每个杂点往外拽一点；RANSAC 只信得到最多支持的那条线，再用它的内点重新拟合，杂点再多也拽不歪。要几轮由杂点的比例决定，δ 由线上点的抖动决定。',
    en: 'Least squares gets pulled a little by every speck; RANSAC trusts only the line with the most support and refits it on its inliers, so however many specks there are they cannot drag it. The number of rounds is set by the share of specks, and δ by how much the points on the line wobble.',
  },
  unlocks: [],
  palette: ['ransac', 'hough', 'own-6-2', 'threshold', 'arith', 'merge', 'const'],
  check: { tolerance: 0.1, mismatches: 3 },
  tests: clutterTests(CLUTTER),
  hidden: clutterTests(CLUTTER_HIDDEN),
  solution: build({ r: ['ransac', { k: 60, d: 1 }] }, ['in>r', 'r>out']),
  naive: build({ r: ['ransac', { k: 1, d: 1 }] }, ['in>r', 'r>out']),
}

// ---------------- 6-10 方向直方图 (challenge) ----------------
// One cell of a SIFT-like descriptor: the gradient magnitude, shared out to four directions.

const DIRS = [['e', 1, 0], ['n', 0, -1], ['w', -1, 0], ['s', 0, 1]]
const histogram = (img) => {
  const gx = correlate(img, SOBEL_X)
  const gy = correlate(img, SOBEL_Y)
  const sums = { e: 0, n: 0, w: 0, s: 0 }
  for (let i = 0; i < gx.data.length; i++) {
    const [x, y] = [gx.data[i], gy.data[i]]
    const m = Math.hypot(x, y)
    if (Math.abs(x) > Math.abs(y)) sums[x > 0 ? 'e' : 'w'] += m
    else if (Math.abs(y) > Math.abs(x)) sums[y > 0 ? 's' : 'n'] += m
  }
  return Object.fromEntries(DIRS.map(([k]) => [k, image(1, 1, sums[k] / gx.data.length)]))
}
const CELLS = [
  [{ zh: '竖边', en: 'A vertical edge' }, P.stepX(8)],
  [{ zh: '横边', en: 'A horizontal edge' }, P.stepY(6, 0.8, 0.2)],
  [{ zh: '方块', en: 'Square' }, P.square(3, 5, 7)],
  [{ zh: '字母 F', en: 'Letter F' }, P.glyph(GLYPHS.F)],
]
const CELLS_HIDDEN = [[{ zh: '斜坡', en: 'A ramp' }, P.rampX()], [{ zh: '圆盘', en: 'Disc' }, P.disk()]]
const histGraph = () =>
  build(
    {
      gx: 'sobelx', gy: 'sobely', m: 'gradmag', neg: ['const', { c: -1 }], nx: ['arith', { op: 'mul' }], ny: ['arith', { op: 'mul' }], ax: 'max', ay: 'max',
      dxy: ['arith', { op: 'sub' }], dyx: ['arith', { op: 'sub' }], hx: ['threshold', { t: 0 }], hy: ['threshold', { t: 0 }],
      px: ['threshold', { t: 0 }], qx: ['threshold', { t: 0 }], py: ['threshold', { t: 0 }], qy: ['threshold', { t: 0 }],
      mx: ['arith', { op: 'mul' }], my: ['arith', { op: 'mul' }],
      be: ['arith', { op: 'mul' }], bw: ['arith', { op: 'mul' }], bs: ['arith', { op: 'mul' }], bn: ['arith', { op: 'mul' }],
      ae: 'fqMean', aw: 'fqMean', as: 'fqMean', an: 'fqMean',
    },
    [
      'in>gx', 'in>gy', 'in>m', 'gx>nx.a', 'neg>nx.b', 'gy>ny.a', 'neg>ny.b', 'gx>ax.a', 'nx>ax.b', 'gy>ay.a', 'ny>ay.b',
      'ax>dxy.a', 'ay>dxy.b', 'ay>dyx.a', 'ax>dyx.b', 'dxy>hx', 'dyx>hy', 'gx>px', 'nx>qx', 'gy>py', 'ny>qy',
      'm>mx.a', 'hx>mx.b', 'm>my.a', 'hy>my.b',
      'mx>be.a', 'px>be.b', 'mx>bw.a', 'qx>bw.b', 'my>bs.a', 'py>bs.b', 'my>bn.a', 'qy>bn.b',
      'be>ae', 'bw>aw', 'bs>as', 'bn>an', 'ae>e', 'an>n', 'aw>w', 'as>s',
    ],
    { outputs: ['e', 'n', 'w', 's'] },
  )

const orientations = {
  id: '6-10',
  chapter: 6,
  title: { zh: '方向直方图', en: 'Orientation histogram' },
  outputs: ['e', 'n', 'w', 's'],
  outputLabels: { e: { zh: '向右 →', en: 'Right →' }, n: { zh: '向上 ↑', en: 'Up ↑' }, w: { zh: '向左 ←', en: 'Left ←' }, s: { zh: '向下 ↓', en: 'Down ↓' } },
  brief: {
    zh: '把每一格的梯度幅值分给它最接近的方向：横向分量更大时，往右变亮算「→」，往左算「←」；纵向分量更大时，往下变亮算「↓」，往上算「↑」。四个输出是四个方向各自的幅值总和除以格数。',
    en: 'Give each cell\'s gradient magnitude to the direction it is closest to: when the across part is larger, brightening to the right counts as "→" and to the left as "←"; when the down part is larger, brightening downwards counts as "↓" and upwards as "↑". The four outputs are the magnitude summed per direction, divided by the number of cells.',
  },
  hint: { zh: '|gx| 是 gx 和 −gx 里较大的那个。每个方向是两个条件同时成立：哪个分量大，它的正负号。', en: '|gx| is the larger of gx and −gx. Each direction needs two conditions at once: which part is larger, and its sign.' },
  after: {
    zh: 'SIFT 描述子把关键点周围分成 4×4 个小格，每格做一个 8 个方向的直方图，一共 128 个数。方向按梯度分，幅值当票数：边往哪个方向变亮，这一格就往那个方向投票。',
    en: 'A SIFT descriptor divides the area round a keypoint into 4×4 small cells and makes an 8-direction histogram in each, 128 numbers in all. Directions follow the gradient and the magnitude is the vote: whichever way an edge brightens, the cell votes that way.',
  },
  unlocks: [],
  palette: ['sobelx', 'sobely', 'gradmag', 'max', 'arith', 'merge', 'const', 'threshold', 'fqMean'],
  check: { tolerance: 0.005 },
  tests: CELLS.map(([label, img]) => test(label, { in: img }, histogram(img))),
  hidden: CELLS_HIDDEN.map(([label, img]) => test(label, { in: img }, histogram(img))),
  solution: histGraph(),
  naive: build({ m: 'gradmag', a: 'fqMean' }, ['in>m', 'm>a', 'a>e', 'a>n', 'a>w', 'a>s'], { outputs: ['e', 'n', 'w', 's'] }),
}

// ---------------- 6-12 贴回照片 · 6-13 书封面 ----------------
// A 12×16 cover and a 32×32 photo of a desk with the book on it, seen at an angle. The paste puts the crisp cover
// over the book: photo where the cover does not land, cover where it does.

const COVER_W = 12
const COVER_H = 16
const cover = fromFn(COVER_W, COVER_H, (x, y) => {
  if (x === 0 || y === 0 || x === COVER_W - 1 || y === COVER_H - 1) return 0.3
  if (y >= 2 && y <= 4 && x >= 2 && x <= 9) return 0.15
  if (x >= 4 && x <= 7 && y >= 8 && y <= 11) return 0.5
  return 0.9
})
const CORNERS_OF_COVER = [[0, 0], [COVER_W - 1, 0], [COVER_W - 1, COVER_H - 1], [0, COVER_H - 1]]
const homographyTo = (quad) => homographyDLT(CORNERS_OF_COVER.map((from, i) => ({ from, to: quad[i] })))
const desk = fromFn(32, 32, (x, y) => (Math.floor((x + y) / 3) % 2 ? 0.35 : 0.45))
const photoOf = (H) => {
  const seen = warp(map(cover, (v) => 0.25 + 0.5 * v), H, desk)
  const mask = warp(map(cover, () => 1), H, desk)
  return zip(zip(desk, mask, (d, m) => d * (1 - m)), seen, (a, b) => a + b)
}
const paste = (photo, H) => {
  const mask = warp(map(cover, () => 1), H, photo)
  return zip(zip(photo, mask, (p, m) => p * (1 - m)), warp(cover, H, photo), (a, b) => a + b)
}
const QUADS = [
  [{ zh: '往右斜', en: 'Leaning right' }, [[9, 5], [21, 7], [23, 27], [7, 25]]],
  [{ zh: '远的一边短', en: 'Far edge shorter' }, [[11, 6], [20, 6], [25, 26], [5, 26]]],
  [{ zh: '转了一下', en: 'Turned a little' }, [[6, 9], [18, 4], [25, 21], [12, 27]]],
]
const QUADS_HIDDEN = [[{ zh: '小一点', en: 'Smaller' }, [[13, 10], [21, 11], [21, 22], [12, 21]]]]
const pasteGraph = (mask = true, solve = null) =>
  build(
    {
      ...(solve !== null ? { hs: ['homography', { k: solve }] } : {}),
      w: 'warp', ...(mask ? { z: ['arith', { op: 'mul' }], zk: ['const', { c: 0 }], one: ['arith', { op: 'add' }], ok: ['const', { c: 1 }], m: 'warp', inv: 'invert', keep: ['arith', { op: 'mul' }], sum: ['arith', { op: 'add' }] } : {}),
    },
    [
      ...(solve !== null ? ['pairs>hs.pairs'] : []),
      'cover>w.in', `${solve !== null ? 'hs' : 'H'}>w.H`, 'photo>w.onto',
      ...(mask ? ['cover>z.a', 'zk>z.b', 'z>one.a', 'ok>one.b', 'one>m.in', `${solve !== null ? 'hs' : 'H'}>m.H`, 'photo>m.onto', 'm>inv', 'photo>keep.a', 'inv>keep.b', 'keep>sum.a', 'w>sum.b', 'sum>out'] : ['w>out']),
    ],
    { inputs: ['photo', 'cover', solve !== null ? 'pairs' : 'H'] },
  )

const pasteBack = {
  id: '6-12',
  chapter: 6,
  title: { zh: '贴回照片', en: 'Paste it back' },
  inputs: ['photo', 'cover', 'H'],
  inputLabels: { photo: { zh: '照片', en: 'Photo' }, cover: { zh: '封面', en: 'Cover' }, H: { zh: '单应 H（9 个数）', en: 'Homography H (9 numbers)' } },
  brief: { zh: '已知把封面搬到照片里的单应 H。把清楚的封面贴到照片里书的位置上：封面落到的地方是封面，其余还是照片。', en: 'The homography H that carries the cover into the photo is given. Paste the crisp cover over the book in the photo: where the cover lands it is the cover, everywhere else still the photo.' },
  hint: { zh: '「单应变形」能搬任何一张图。要知道封面落在哪，可以搬一张和封面一样大、全是 1 的图。', en: '"Homography warp" can carry any picture. To know where the cover lands, carry a picture the size of the cover that is all 1.' },
  after: {
    zh: '变形加上一张同样变形的掩膜，就能把一张图合成进另一张：AR 贴图、全景拼接、换天空都是这一步。',
    en: 'A warp plus a mask warped the same way composites one picture into another: AR overlays, panorama stitching and sky replacement all take this step.',
  },
  unlocks: [],
  palette: ['warp', 'arith', 'merge', 'const', 'invert', 'threshold'],
  tests: QUADS.map(([label, quad]) => test(label, { photo: photoOf(homographyTo(quad)), cover, H: row(homographyTo(quad)) }, { out: paste(photoOf(homographyTo(quad)), homographyTo(quad)) })),
  hidden: QUADS_HIDDEN.map(([label, quad]) => test(label, { photo: photoOf(homographyTo(quad)), cover, H: row(homographyTo(quad)) }, { out: paste(photoOf(homographyTo(quad)), homographyTo(quad)) })),
  solution: pasteGraph(),
  naive: pasteGraph(false),
}

// The pairs: points of the cover (its corners, the title bar's, the picture's) where they land in the photo, a
// little noisy, plus wrong matches from the repeated desk pattern.
const COVER_POINTS = [...CORNERS_OF_COVER, [2, 2], [9, 2], [9, 4], [2, 4], [4, 8], [7, 8], [7, 11], [4, 11]]
const pairsFor = (H, seed, wrong) => {
  const next = random(seed)
  const values = []
  for (const [x, y] of COVER_POINTS) values.push(x, y, ...project(H, x, y).map((v) => v + 0.6 * (next() - 0.5)))
  for (let i = 0; i < wrong; i++) values.push(Math.floor(next() * COVER_W), Math.floor(next() * COVER_H), Math.floor(next() * 32), Math.floor(next() * 32))
  return row(values)
}
// The best a circuit can do is the homography of the right pairs alone, noise and all: that is the answer.
const coverTests = (cases) =>
  cases.map(([label, quad, seed, wrong]) => {
    const H = homographyTo(quad)
    const pairs = pairsFor(H, seed, wrong)
    const best = homographyDLT(pairsOf(pairs).slice(0, COVER_POINTS.length))
    return test(label, { photo: photoOf(H), cover, pairs }, { out: paste(photoOf(H), best) })
  })

const bookCover = {
  id: '6-13',
  chapter: 6,
  title: { zh: '书封面', en: 'Book cover' },
  inputs: ['photo', 'cover', 'pairs'],
  inputLabels: { photo: { zh: '照片', en: 'Photo' }, cover: { zh: '封面', en: 'Cover' }, pairs: { zh: '匹配的点对（每 4 个数一对）', en: 'Matched pairs (4 numbers each)' } },
  brief: { zh: '手机斜着拍了桌上的书。匹配器给出了封面和照片之间的点对，其中有几对是桌面花纹造成的错配。把清楚的封面贴回照片里书的位置。', en: 'A phone photographed the book on the desk at an angle. The matcher has given pairs of points between the cover and the photo, and a few are wrong matches caused by the desk pattern. Paste the crisp cover back over the book in the photo.' },
  hint: { zh: '错配只要混进一对，用全部点对解出的 H 就会歪。', en: 'Let a single wrong match in, and an H solved from all the pairs comes out crooked.' },
  after: {
    zh: '匹配、RANSAC 选内点、解单应、变形贴图：这条流水线就是 AR 书封面、全景拼接和文档扫描 App 的核心。每一步你都亲手做过一遍。',
    en: 'Match, choose inliers with RANSAC, solve the homography, warp and paste: this pipeline is the core of AR book covers, panorama stitching and document-scanning apps, and you have built every step of it yourself.',
  },
  unlocks: [],
  palette: ['homography', 'warp', 'arith', 'merge', 'const', 'invert', 'threshold'],
  tests: coverTests([
    [{ zh: '两对错配', en: 'Two wrong matches' }, QUADS[0][1], 51, 2],
    [{ zh: '四对错配', en: 'Four wrong matches' }, QUADS[1][1], 52, 4],
    [{ zh: '转了一下', en: 'Turned a little' }, QUADS[2][1], 53, 3],
  ]),
  hidden: coverTests([[{ zh: '小一点、错配多', en: 'Smaller, many wrong' }, QUADS_HIDDEN[0][1], 54, 5]]),
  solution: pasteGraph(true, 100),
  naive: pasteGraph(true, 0),
}

export const levels = [cornersLevel, peaks, onePoint, trusted, brighterMatch, benches.hough, lanes, benches.ransac, robustLine, orientations, benches.corners, pasteBack, bookCover]
