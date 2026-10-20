// 第 10 章 · 框出来 (lectures 21–22). How detections are judged (IoU, a ranked list into AP), how a box is nudged
// from an anchor, and how a detector is a template slid over the picture with peaks kept. The series counts the
// X-marked boxes on a shelf, small and large, among O-marked ones.
import { correlate, fromFn, gaussianKernel, image, random, zip } from '../../kit/domains/image/engine/image.js'
import { build, test } from '../../kit/domains/image/build.js'

const row = (values) => ({ w: values.length, h: 1, data: Float32Array.from(values) })
const num = (v) => image(1, 1, v)

// ---------------- 10-1 重叠多少 · 10-2 合格的框 ----------------

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
const PAIRS = [
  [{ zh: '错开一点', en: 'Slightly off' }, [2, 2, 10, 10], [4, 3, 12, 11]],
  [{ zh: '大框套小框', en: 'A big box round a small one' }, [1, 1, 15, 15], [5, 5, 10, 10]],
  [{ zh: '只碰到边', en: 'Barely touching' }, [0, 0, 8, 8], [6, 6, 14, 14]],
]
const PAIRS_HIDDEN = [[{ zh: '一模一样', en: 'Identical' }, [3, 4, 9, 12], [3, 4, 9, 12]], [{ zh: '不重叠', en: 'Not overlapping' }, [0, 0, 5, 5], [8, 8, 14, 14]]]
const iouTests = (cases) => cases.map(([label, a, b]) => test(label, { a: boxMask(a), b: boxMask(b) }, { out: num(iou(boxMask(a), boxMask(b))) }))
const BOX_LABELS = { a: { zh: '框 a', en: 'Box a' }, b: { zh: '框 b', en: 'Box b' } }
const overlap = {
  id: '10-1',
  chapter: 10,
  title: { zh: '重叠多少', en: 'How much overlap' },
  inputs: ['a', 'b'],
  inputLabels: BOX_LABELS,
  brief: { zh: '两个框画成掩膜（框里是 1）。输出它们的交并比 IoU = 交集的面积 ÷ 并集的面积。', en: 'Two boxes drawn as masks (1 inside the box). Output their intersection over union, IoU = area of the intersection ÷ area of the union.' },
  hint: { zh: '交集是两张掩膜逐格相乘。并集 = 两个面积相加，再减去重复算的那部分。「求平均」量出的面积都差同一个倍数。', en: 'The intersection is the two masks multiplied cell by cell. The union = the two areas added, minus the part counted twice. Areas measured with "Average" are all off by the same factor.' },
  after: { zh: 'IoU 在 0 到 1 之间：1 是完全重合，0 是不沾边。检测器画的框和标注的框 IoU 够大，才算找对了。你的电路现在是元件「IoU」。', en: 'IoU lies between 0 and 1: 1 is a perfect overlap, 0 is not touching at all. A detector\'s box only counts as right when its IoU with the labelled box is large enough. Your circuit is now the part "IoU".' },
  packs: { name: { zh: 'IoU', en: 'IoU' }, desc: { zh: '你在「重叠多少」里搭的：两个框掩膜的交并比', en: 'What you built in "How much overlap": the intersection over union of two box masks' } },
  unlocks: [],
  check: { tolerance: 0.005 },
  tests: iouTests(PAIRS),
  hidden: iouTests(PAIRS_HIDDEN),
  solution: build({ i: ['arith', { op: 'mul' }], mi: 'fqMean', ma: 'fqMean', mb: 'fqMean', s: ['arith', { op: 'add' }], u: ['arith', { op: 'sub' }], q: ['arith', { op: 'div' }] }, ['a>i.a', 'b>i.b', 'i>mi', 'a>ma', 'b>mb', 'ma>s.a', 'mb>s.b', 's>u.a', 'mi>u.b', 'mi>q.a', 'u>q.b', 'q>out'], { inputs: ['a', 'b'] }),
  naive: build({ i: ['arith', { op: 'mul' }], mi: 'fqMean', ma: 'fqMean', q: ['arith', { op: 'div' }] }, ['a>i.a', 'b>i.b', 'i>mi', 'a>ma', 'mi>q.a', 'ma>q.b', 'q>out'], { inputs: ['a', 'b'] }),
}

const GOOD = 0.5
const goodTests = (cases) => cases.map(([label, a, b]) => test(label, { a: boxMask(a), b: boxMask(b) }, { ok: num(iou(boxMask(a), boxMask(b)) > GOOD ? 1 : 0) }))
const goodBox = {
  id: '10-2',
  chapter: 10,
  title: { zh: '合格的框', en: 'A box that counts' },
  inputs: ['a', 'b'],
  outputs: ['ok'],
  inputLabels: { a: { zh: '检测出的框', en: 'Detected box' }, b: { zh: '标注的框', en: 'Labelled box' } },
  outputLabels: { ok: { zh: '算找对', en: 'Counts as right' } },
  brief: { zh: `检测出的框和标注的框 IoU 大于 ${GOOD} 时输出 1，否则 0。`, en: `Output 1 when the IoU of the detected box and the labelled box is above ${GOOD}, otherwise 0.` },
  hint: { zh: '上一关的「IoU」接一个门槛。', en: 'Last level\'s "IoU", then a threshold.' },
  after: { zh: `${GOOD} 是 PASCAL VOC 的标准；COCO 把 0.5 到 0.95 的十个门槛都算一遍再平均，框要画得更准才拿得到分。`, en: `${GOOD} is the PASCAL VOC standard; COCO computes ten thresholds from 0.5 to 0.95 and averages them, so boxes have to be drawn more precisely to score.` },
  unlocks: [],
  tests: goodTests([...PAIRS, [{ zh: '差不多', en: 'Nearly the same' }, [2, 2, 12, 12], [3, 3, 13, 13]]]),
  hidden: goodTests(PAIRS_HIDDEN),
  solution: build({ i: 'own-10-1', t: ['threshold', { t: GOOD }] }, ['a>i.a', 'b>i.b', 'i>t', 't>ok'], { inputs: ['a', 'b'], outputs: ['ok'] }),
  naive: build({ i: 'own-10-1' }, ['a>i.a', 'b>i.b', 'i>ok'], { inputs: ['a', 'b'], outputs: ['ok'] }),
}

// ---------------- 10-3 排名表 · 10-4 两类求平均 ----------------
// Detections sorted by score, each marked right (1) or wrong (0). Precision at rank k = (right ones up to k) / k;
// AP = the precision at each right one, added up, divided by the number of labelled objects G.

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
const apTests = (cases) => cases.map(([label, flags, g]) => test(label, { f: row(flags), k: RANKS, g: num(g) }, { out: num(ap(flags, g)) }))
const LISTS = [
  [{ zh: '前面都对', en: 'All right at the top' }, [1, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0], 8],
  [{ zh: '对错交替', en: 'Right and wrong in turn' }, [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0], 6],
  [{ zh: '漏了几个', en: 'A few missed' }, [0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], 7],
]
const apGraph = (prefix = true) => {
  const n = { m: ['arith', { op: 'mul' }], a: 'fqMean', kN: ['const', { c: N }], s: ['arith', { op: 'mul' }], q: ['arith', { op: 'div' }] }
  const w = []
  if (prefix) {
    let last = 'f'
    for (const step of [1, 2, 4, 8]) {
      Object.assign(n, { [`h${step}`]: ['shift', { dir: '→', n: step }], [`p${step}`]: ['arith', { op: 'add' }] })
      w.push(`${last}>h${step}`, `${last}>p${step}.a`, `h${step}>p${step}.b`)
      last = `p${step}`
    }
    Object.assign(n, { pr: ['arith', { op: 'div' }] })
    w.push(`${last}>pr.a`, 'k>pr.b', 'pr>m.a')
  } else {
    Object.assign(n, { pr: ['arith', { op: 'div' }] })
    w.push('f>pr.a', 'k>pr.b', 'pr>m.a')
  }
  w.push('f>m.b', 'm>a', 'a>s.a', 'kN>s.b', 's>q.a', 'g>q.b', 'q>out')
  return build(n, w, { inputs: ['f', 'k', 'g'] })
}
const AP_LABELS = { f: { zh: '按分数排好的对错', en: 'Right or wrong, by score' }, k: { zh: '名次 1 … 16', en: 'Rank 1 … 16' }, g: { zh: '标注了几个 G', en: 'Number labelled, G' } }
const ranking = {
  id: '10-3',
  chapter: 10,
  title: { zh: '排名表', en: 'The ranking' },
  inputs: ['f', 'k', 'g'],
  inputLabels: AP_LABELS,
  brief: { zh: '检测结果按分数从高到低排好，每一个标了对（1）错（0）。第 k 名的精确率 = 前 k 名里对的个数 ÷ k。AP = 每个对的那一名的精确率加起来 ÷ G。', en: 'The detections are sorted by score, high to low, each marked right (1) or wrong (0). The precision at rank k = the number right in the top k ÷ k. AP = the precisions at each right rank, added up, ÷ G.' },
  hint: { zh: '「前 k 名里对的个数」是一个累加：每一格加上它左边所有格。平移多了一个「格数」设置：先加左边 1 格的，再加左边 2 格的……', en: '"The number right in the top k" is a running total: every cell plus all the cells to its left. Shift now has a "Steps" setting: add the one 1 cell to the left, then the one 2 cells to the left…' },
  after: { zh: '累加只要 4 次「平移再相加」就覆盖了 16 格：每次挪的格数翻倍。AP 是精确率—召回率曲线下的面积：对的越靠前，分越高；漏掉的标注拉低分母。你的电路现在是元件「AP 计」。', en: 'The running total covers 16 cells with only 4 rounds of "shift and add", the shift doubling each time. AP is the area under the precision–recall curve: the earlier the right ones, the higher the score, and missed labels raise the denominator. Your circuit is now the part "AP meter".' },
  packs: { name: { zh: 'AP 计', en: 'AP meter' }, desc: { zh: '你在「排名表」里搭的：按分数排好的对错、名次和标注数 G → AP', en: 'What you built in "The ranking": right or wrong by score, the ranks and the number labelled G → AP' } },
  grants: ['long-shift'],
  unlocks: ['long-shift'],
  check: { tolerance: 0.005 },
  tests: apTests(LISTS),
  hidden: apTests([[{ zh: '最后才对', en: 'Right only at the end' }, [0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1], 6]]),
  solution: apGraph(),
  naive: apGraph(false),
}

const mapTests = (cases) => cases.map(([label, [f1, g1], [f2, g2]]) => test(label, { f1: row(f1), g1: num(g1), f2: row(f2), g2: num(g2), k: RANKS }, { out: num((ap(f1, g1) + ap(f2, g2)) / 2) }))
const meanAp = {
  id: '10-4',
  chapter: 10,
  title: { zh: '两类求平均', en: 'Averaging two classes' },
  inputs: ['f1', 'g1', 'f2', 'g2', 'k'],
  inputLabels: { f1: { zh: '第一类的对错', en: 'Class 1, right or wrong' }, g1: { zh: '第一类标注了几个', en: 'Class 1, number labelled' }, f2: { zh: '第二类的对错', en: 'Class 2, right or wrong' }, g2: { zh: '第二类标注了几个', en: 'Class 2, number labelled' }, k: AP_LABELS.k },
  brief: { zh: '检测器认两类东西，每类各有一张排名表。输出两类 AP 的平均（mAP）。', en: 'The detector recognises two kinds of thing, each with its own ranking. Output the average of the two classes\' APs (mAP).' },
  hint: { zh: '每一类各用一个「AP 计」。', en: 'One "AP meter" for each class.' },
  after: { zh: 'mAP 是每类 AP 的平均：少见的类和常见的类一样重要，检测器不能只把常见的类做好。论文里报的检测成绩几乎都是它。', en: 'mAP is the average of the per-class APs: a rare class counts as much as a common one, so a detector cannot just do well on the common classes. Almost every detection result reported in papers is this number.' },
  unlocks: [],
  check: { tolerance: 0.005 },
  tests: mapTests([[{ zh: '一好一差', en: 'One good, one poor' }, [LISTS[0][1], 8], [LISTS[2][1], 7]], [{ zh: '差不多', en: 'About the same' }, [LISTS[1][1], 6], [LISTS[0][1], 9]]]),
  hidden: mapTests([[{ zh: '一类全对', en: 'One class all right' }, [[1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 4], [LISTS[1][1], 7]]]),
  solution: build({ a: 'own-10-3', b: 'own-10-3', s: ['arith', { op: 'add' }], h: ['const', { c: 0.5 }], m: ['arith', { op: 'mul' }] }, ['f1>a.f', 'k>a.k', 'g1>a.g', 'f2>b.f', 'k>b.k', 'g2>b.g', 'a>s.a', 'b>s.b', 's>m.a', 'h>m.b', 'm>out'], { inputs: ['f1', 'g1', 'f2', 'g2', 'k'] }),
  naive: build({ a: 'own-10-3' }, ['f1>a.f', 'k>a.k', 'g1>a.g', 'a>out'], { inputs: ['f1', 'g1', 'f2', 'g2', 'k'] }),
}

// ---------------- 10-5 挪框 · 10-6 一排锚框 ----------------
// An anchor (cx, cy, w, h) and the network's corrections (tx, ty, tw, th): the box is centred at cx + tx·w, cy + ty·h,
// with size w·e^tw by h·e^th.

const BOX_INS = ['cx', 'cy', 'w', 'h', 'tx', 'ty', 'tw', 'th']
const BOX_OUTS = ['bx', 'by', 'bw', 'bh']
const nudge = (v) => ({ bx: v.cx + v.tx * v.w, by: v.cy + v.ty * v.h, bw: v.w * Math.exp(v.tw), bh: v.h * Math.exp(v.th) })
const asNumbers = (v) => Object.fromEntries(Object.entries(v).map(([k, x]) => [k, num(x)]))
const nudgeTests = (cases) => cases.map(([label, v]) => test(label, asNumbers(v), asNumbers(nudge(v))))
const nudgeGraph = (exp = true) =>
  build(
    {
      mx: ['arith', { op: 'mul' }], ax: ['arith', { op: 'add' }], my: ['arith', { op: 'mul' }], ay: ['arith', { op: 'add' }],
      ...(exp ? { ew: 'exp', eh: 'exp' } : {}), sw: ['arith', { op: 'mul' }], sh: ['arith', { op: 'mul' }],
    },
    ['tx>mx.a', 'w>mx.b', 'cx>ax.a', 'mx>ax.b', 'ax>bx', 'ty>my.a', 'h>my.b', 'cy>ay.a', 'my>ay.b', 'ay>by', ...(exp ? ['tw>ew', 'th>eh', 'ew>sw.a', 'eh>sh.a'] : ['tw>sw.a', 'th>sh.a']), 'w>sw.b', 'h>sh.b', 'sw>bw', 'sh>bh'],
    { inputs: BOX_INS, outputs: BOX_OUTS },
  )
const BOX_IN_LABELS = { cx: { zh: '锚框中心 x', en: 'Anchor centre x' }, cy: { zh: '锚框中心 y', en: 'Anchor centre y' }, w: { zh: '锚框宽', en: 'Anchor width' }, h: { zh: '锚框高', en: 'Anchor height' }, tx: { zh: '修正 tx', en: 'Correction tx' }, ty: { zh: '修正 ty', en: 'Correction ty' }, tw: { zh: '修正 tw', en: 'Correction tw' }, th: { zh: '修正 th', en: 'Correction th' } }
const BOX_OUT_LABELS = { bx: { zh: '框中心 x', en: 'Box centre x' }, by: { zh: '框中心 y', en: 'Box centre y' }, bw: { zh: '框宽', en: 'Box width' }, bh: { zh: '框高', en: 'Box height' } }
const nudgeBox = {
  id: '10-5',
  chapter: 10,
  title: { zh: '挪框', en: 'Nudging the box' },
  inputs: BOX_INS,
  outputs: BOX_OUTS,
  inputLabels: BOX_IN_LABELS,
  outputLabels: BOX_OUT_LABELS,
  brief: { zh: '检测器先放一个锚框，再给出四个修正。框的中心 = 锚框中心 + 修正 × 锚框的宽（或高）；框的宽 = 锚框宽 × e^tw，高同理。', en: 'The detector places an anchor box first, then gives four corrections. The box centre = the anchor centre + correction × the anchor\'s width (or height); the box width = the anchor width × e^tw, and the height likewise.' },
  hint: { zh: '每个输出各是一小段算式。', en: 'Each output is a short formula of its own.' },
  after: { zh: '修正量按锚框的大小来算，大框小框用同一套数；宽高用 e 的指数，修正是正是负都不会把框变成负的宽度。Faster R-CNN、YOLO 都这样回归框。', en: 'The corrections are scaled by the anchor\'s size, so big and small boxes use the same numbers; width and height go through e to the power, so whatever the sign of a correction, the box never gets a negative width. Faster R-CNN and YOLO both regress boxes like this.' },
  unlocks: [],
  check: { tolerance: 0.005 },
  tests: nudgeTests([
    [{ zh: '往右挪', en: 'Nudged right' }, { cx: 8, cy: 8, w: 4, h: 6, tx: 0.5, ty: 0, tw: 0, th: 0 }],
    [{ zh: '变宽', en: 'Made wider' }, { cx: 5, cy: 10, w: 3, h: 3, tx: 0, ty: -0.2, tw: 0.4, th: -0.1 }],
    [{ zh: '都变了', en: 'Everything changed' }, { cx: 12, cy: 4, w: 6, h: 2, tx: -0.3, ty: 0.5, tw: -0.5, th: 0.7 }],
  ]),
  hidden: nudgeTests([[{ zh: '变小', en: 'Made smaller' }, { cx: 7, cy: 7, w: 8, h: 8, tx: 0.1, ty: 0.1, tw: -0.7, th: -0.7 }]]),
  solution: nudgeGraph(),
  naive: nudgeGraph(false),
}

const rowOfAnchors = (cases) =>
  cases.map(([label, anchors, t]) => {
    const pick = (key) => row(anchors.map((a) => a[key]))
    const boxes = anchors.map((a) => nudge({ ...a, ...t }))
    return test(label, { cx: pick('cx'), cy: pick('cy'), w: pick('w'), h: pick('h'), tx: num(t.tx), ty: num(t.ty), tw: num(t.tw), th: num(t.th) }, Object.fromEntries(BOX_OUTS.map((k) => [k, row(boxes.map((b) => b[k]))])))
  })
const ANCHORS = [2, 4, 8].map((s) => ({ cx: 8, cy: 8, w: s, h: s }))
const anchorRow = {
  id: '10-6',
  chapter: 10,
  title: { zh: '一排锚框', en: 'A row of anchors' },
  inputs: BOX_INS,
  outputs: BOX_OUTS,
  inputLabels: { ...BOX_IN_LABELS, cx: { zh: '锚框中心 x（一排）', en: 'Anchor centres x (a row)' }, cy: { zh: '锚框中心 y（一排）', en: 'Anchor centres y (a row)' }, w: { zh: '锚框宽（一排）', en: 'Anchor widths (a row)' }, h: { zh: '锚框高（一排）', en: 'Anchor heights (a row)' } },
  outputLabels: BOX_OUT_LABELS,
  brief: { zh: '同一处放了大中小三个锚框，排成一行。同一组修正作用到每一个上，输出三个框。', en: 'Three anchors, small, medium and large, sit at the same place in a row. The same corrections apply to each; output the three boxes.' },
  hint: { zh: '一个数和一整行运算时，这个数用在每一格上。', en: 'When a single number meets a whole row, it applies to every cell.' },
  after: { zh: '同一套修正，在小锚框上挪得少，在大锚框上挪得多：修正量是相对的。检测器在每个位置都放几种大小、几种宽高比的锚框，一起回归、一起打分。', en: 'The same corrections move a small anchor a little and a large one a lot: the corrections are relative. A detector places anchors of several sizes and aspect ratios at every position, regressing and scoring them all together.' },
  unlocks: [],
  check: { tolerance: 0.005 },
  tests: rowOfAnchors([[{ zh: '往右挪', en: 'Nudged right' }, ANCHORS, { tx: 0.5, ty: 0, tw: 0, th: 0 }], [{ zh: '都变大', en: 'All bigger' }, ANCHORS, { tx: 0, ty: 0.2, tw: 0.3, th: 0.3 }]]),
  hidden: rowOfAnchors([[{ zh: '变扁', en: 'Flattened' }, ANCHORS, { tx: -0.2, ty: 0.1, tw: 0.4, th: -0.4 }]]),
  solution: nudgeGraph(),
  naive: nudgeGraph(false),
}

// ---------------- 10-7 滑窗 · 10-8 一只狗三个框 ----------------
// Small marks on a shelf: X-marked boxes to find, O-marked ones to ignore. A 3×3 template slid over the picture
// answers "is there an X centred here?" at every pixel.

const X3 = ['#.#', '.#.', '#.#']
const O3 = ['###', '#.#', '###']
const stamp = (w, h, marks, scale = 1) =>
  fromFn(w, h, (x, y) => {
    for (const [kind, cx, cy, s = scale] of marks) {
      const u = Math.floor((x - cx) / s + 1.5)
      const v = Math.floor((y - cy) / s + 1.5)
      if (u >= 0 && u < 3 && v >= 0 && v < 3 && x - cx >= -1.5 * s && x - cx < 1.5 * s && y - cy >= -1.5 * s && y - cy < 1.5 * s) return (kind === 'X' ? X3 : O3)[v][u] === '#' ? 0.9 : 0.1
    }
    return 0.1
  })
const centres = (w, h, marks) => fromFn(w, h, (x, y) => (marks.some(([kind, cx, cy]) => kind === 'X' && cx === x && cy === y) ? 1 : 0))
const XT = [1, -1, 1, -1, 1, -1, 1, -1, 1]
const SHELF = [
  [{ zh: '两个 X 一个 O', en: 'Two X, one O' }, [['X', 3, 3], ['X', 11, 6], ['O', 6, 12]]],
  [{ zh: '一排', en: 'A row' }, [['O', 2, 8], ['X', 7, 8], ['O', 12, 8]]],
  [{ zh: '散开', en: 'Spread out' }, [['X', 2, 13], ['X', 13, 2], ['O', 8, 7], ['X', 12, 12]]],
]
const SHELF_HIDDEN = [[{ zh: '只有 O', en: 'Only O' }, [['O', 4, 4], ['O', 11, 10]]], [{ zh: '靠边', en: 'Near the edge' }, [['X', 1, 1], ['O', 14, 14], ['X', 14, 7]]]]
const slideTests = (cases) => cases.map(([label, marks]) => test(label, { in: stamp(16, 16, marks) }, { out: centres(16, 16, marks) }))
const sliding = {
  id: '10-7',
  chapter: 10,
  title: { zh: '滑窗', en: 'Sliding window' },
  brief: { zh: '货架上的箱子贴着 3×3 的记号，有 X 也有 O。只在每个 X 的正中间输出 1。', en: 'The boxes on the shelf carry 3×3 marks, some X and some O. Output 1 only at the very centre of each X.' },
  hint: { zh: '一个 3×3 的核，X 的格子给正，别的格子给负：哪里最像 X，哪里就最大。', en: 'A 3×3 kernel with positive weights on the X cells and negative elsewhere: wherever looks most like an X gives the most.' },
  after: { zh: '把一个模板在图上逐位置滑过去打分，再过门槛：这就是滑窗检测。卷积网络做的是同一件事，只是模板是学出来的，而且一层层叠着用。', en: 'Slide a template over the picture scoring every position, then apply a threshold: this is sliding-window detection. A convolutional network does the same thing, except that the templates are learnt and stacked layer on layer.' },
  unlocks: [],
  tests: slideTests(SHELF),
  hidden: slideTests(SHELF_HIDDEN),
  solution: build({ k: ['kernel3', { w: XT }], t: ['threshold', { t: 3 }] }, ['in>k', 'k>t', 't>out']),
  naive: build({ k: ['kernel3', { w: [1, 0, 1, 0, 1, 0, 1, 0, 1] }], t: ['threshold', { t: 3 }] }, ['in>k', 'k>t', 't>out']),
}

// Dogs are solid bright blobs: a smooth detector (an average over 3×3) fires on every cell of a blob, strongest at its
// centre.
const blurred = (img) => correlate(img, gaussianKernel(0.5), 'edge')
const dogs = (list) => correlate(fromFn(16, 16, (x, y) => (list.some(([cx, cy]) => Math.abs(x - cx) <= 1 && Math.abs(y - cy) <= 1) ? 0.9 : 0.1)), gaussianKernel(0.8), 'edge')
const dogCentres = (list) => fromFn(16, 16, (x, y) => (list.some(([cx, cy]) => cx === x && cy === y) ? 1 : 0))
const DOGS = [
  [{ zh: '两只狗', en: 'Two dogs' }, [[4, 4], [11, 9]]],
  [{ zh: '三只狗', en: 'Three dogs' }, [[3, 12], [8, 3], [13, 13]]],
  [{ zh: '一只狗', en: 'One dog' }, [[7, 7]]],
]
const dogTests = (cases) => cases.map(([label, list]) => test(label, { in: dogs(list) }, { out: dogCentres(list) }))
const dogBoxes = {
  id: '10-8',
  chapter: 10,
  title: { zh: '一只狗三个框', en: 'One dog, three boxes' },
  brief: { zh: '照片里的狗是一团团亮斑，边有点糊。每只狗只输出一个点，在它正中间。', en: 'The dogs in the photo are bright patches, a little blurred at the edges. Output a single point for each dog, at its very centre.' },
  hint: { zh: '3×3 平均在亮斑上的每一格都很大。', en: 'A 3×3 average is large on every cell of a patch.' },
  after: { zh: '一个物体附近好几个位置都过了门槛，就会框出好几个重叠的框。非极大值抑制只留下周围最强的那一个：检测器的最后一步几乎都是它。', en: 'When several positions round one object pass the threshold, you get several overlapping boxes. Non-maximum suppression keeps only the strongest round about: it is almost always a detector\'s last step.' },
  unlocks: [],
  tests: dogTests(DOGS),
  hidden: dogTests([[{ zh: '挨着的两只', en: 'Two side by side' }, [[5, 8], [10, 8]]]]),
  solution: build({ b: 'box3', p: 'own-6-2' }, ['in>b', 'b>p', 'p>out']),
  naive: build({ b: 'box3', t: ['threshold', { t: 0.5 }] }, ['in>b', 'b>t', 't>out']),
}

// ---------------- 10-9 X 在哪 · 10-10 大的小的都要 · 10-11 货架盘点 ----------------
// A 24×24 shelf. Small marks are 3×3; large ones are the same marks at twice the size, centred on an odd pixel so
// each of their cells is one 2×2 block. A large X is found at half size by the same template, and marked as a 2×2
// block back at full size.

const grain = (img, seed, amp) => {
  const next = random(seed)
  return zip(img, img, (v) => v + amp * (next() - 0.5) * 2)
}
const bigCentres = (marks) => fromFn(24, 24, (x, y) => (marks.some(([kind, cx, cy, s]) => kind === 'X' && s === 2 && (x >> 1) === cx >> 1 && (y >> 1) === cy >> 1) ? 1 : 0))
const smallCentres = (marks) => fromFn(24, 24, (x, y) => (marks.some(([kind, cx, cy, s]) => kind === 'X' && s === 1 && cx === x && cy === y) ? 1 : 0))
const both = (marks) => zip(smallCentres(marks), bigCentres(marks), Math.max)
const noisyTests = (cases) => cases.map(([label, marks, seed]) => test(label, { in: grain(stamp(24, 24, marks.map((m) => [...m])), seed, 0.15) }, { out: smallCentres(marks) }))
const SMALL = [
  [{ zh: '一层货架', en: 'One shelf' }, [['X', 4, 4, 1], ['O', 10, 4, 1], ['X', 16, 5, 1], ['O', 20, 18, 1]], 101],
  [{ zh: '两层货架', en: 'Two shelves' }, [['X', 3, 6, 1], ['X', 9, 6, 1], ['O', 15, 17, 1], ['X', 20, 17, 1]], 102],
  [{ zh: '都是 O', en: 'All O' }, [['O', 5, 5, 1], ['O', 12, 12, 1], ['O', 19, 6, 1]], 103],
]
const findX = {
  id: '10-9',
  chapter: 10,
  title: { zh: 'X 在哪', en: 'Where are the X' },
  brief: { zh: '一张 24×24 的货架照片，有噪点。只在每个 X 记号的正中间输出 1。', en: 'A 24×24 photo of a shelf, with grain. Output 1 only at the very centre of each X mark.' },
  hint: { zh: '滑窗加门槛。门槛要高过噪点能凑出来的分数。', en: 'A sliding window and a threshold, high enough that grain cannot add up to it.' },
  after: { zh: '噪点让每个位置的分数都抖一点，门槛要留出余量：太低，噪点凑成假的 X；太高，暗一点的 X 就漏了。', en: 'Grain makes every position\'s score wobble a little, so the threshold needs a margin: too low and the grain makes false X; too high and a fainter X slips through.' },
  unlocks: [],
  tests: noisyTests(SMALL),
  hidden: noisyTests([[{ zh: '挤在一起', en: 'Crowded' }, [['X', 4, 12, 1], ['O', 8, 12, 1], ['X', 12, 12, 1], ['X', 19, 19, 1]], 104]]),
  solution: build({ k: ['kernel3', { w: XT }], t: ['threshold', { t: 3 }] }, ['in>k', 'k>t', 't>out']),
  naive: build({ k: ['kernel3', { w: XT }], t: ['threshold', { t: 1.5 }] }, ['in>k', 'k>t', 't>out']),
}

const scaleGraph = (big = true) =>
  build(
    {
      k: ['kernel3', { w: XT }], t: ['threshold', { t: 3 }],
      ...(big ? { a: ['kernel3', { w: [0, 0, 0, 0, 0.25, 0.25, 0, 0.25, 0.25] }], d: 'downsample', k2: ['kernel3', { w: XT }], t2: ['threshold', { t: 3 }], u: 'tconv', m: 'max' } : {}),
    },
    ['in>k', 'k>t', ...(big ? ['in>a', 'a>d', 'd>k2', 'k2>t2', 't2>u', 't>m.a', 'u>m.b', 'm>out'] : ['t>out'])],
  )
const sizesTests = (cases) => cases.map(([label, marks]) => test(label, { in: stamp(24, 24, marks) }, { out: both(marks) }))
const SIZES = [
  [{ zh: '一大一小', en: 'One large, one small' }, [['X', 5, 5, 1], ['X', 15, 15, 2], ['O', 20, 4, 1]]],
  [{ zh: '大的 O', en: 'A large O' }, [['O', 7, 17, 2], ['X', 18, 6, 1], ['X', 13, 5, 2]]],
  [{ zh: '两个大的', en: 'Two large' }, [['X', 5, 19, 2], ['X', 19, 19, 2], ['X', 11, 4, 1]]],
]
const sizes = {
  id: '10-10',
  chapter: 10,
  title: { zh: '大的小的都要', en: 'Large and small alike' },
  brief: { zh: '货架上有小箱子，也有大一倍的箱子，记号也大一倍。小 X 在正中间输出 1；大 X 的正中间输出一个 2×2 的小块。', en: 'The shelf has small boxes and boxes twice the size, with marks twice as big. Output 1 at the centre of a small X, and a 2×2 block at the centre of a large X.' },
  hint: { zh: '3×3 的模板认不出 6×6 的 X。要是图缩小一半，大 X 会变成什么样？', en: 'A 3×3 template cannot recognise a 6×6 X. If the picture were half the size, what would a large X become?' },
  after: { zh: '同一个检测器，在原图上找小的，在缩小的图上找大的，再把结果放大回来合在一起：这就是图像金字塔上的多尺度检测。FPN 在网络内部做同样的事。', en: 'The same detector finds small things on the original and large things on a shrunken copy, and the results are enlarged back and merged: this is multi-scale detection on an image pyramid. FPN does the same thing inside the network.' },
  unlocks: [],
  tests: sizesTests(SIZES),
  hidden: sizesTests([[{ zh: '只有大的', en: 'Only large' }, [['X', 9, 9, 2], ['O', 19, 15, 2]]]]),
  solution: scaleGraph(),
  naive: scaleGraph(false),
}

const HEAT_SCALE = 0.2
const finaleGraph = () =>
  build(
    {
      k: ['kernel3', { w: XT }], s: ['arith', { op: 'mul' }], sk: ['const', { c: HEAT_SCALE }], p: 'own-6-2',
      a: ['kernel3', { w: [0, 0, 0, 0, 0.25, 0.25, 0, 0.25, 0.25] }], d: 'downsample', k2: ['kernel3', { w: XT }], s2: ['arith', { op: 'mul' }], p2: 'own-6-2', u: 'tconv', m: 'max',
    },
    ['in>k', 'k>s.a', 'sk>s.b', 's>p', 'in>a', 'a>d', 'd>k2', 'k2>s2.a', 'sk>s2.b', 's2>p2', 'p2>u', 'p>m.a', 'u>m.b', 'm>out'],
  )
const stockTests = (cases) => cases.map(([label, marks, seed]) => test(label, { in: grain(blurred(stamp(24, 24, marks)), seed, 0.1) }, { out: both(marks) }))
const stockTake = {
  id: '10-11',
  chapter: 10,
  title: { zh: '货架盘点', en: 'Stock-take' },
  brief: { zh: '一张有噪点、有点糊的货架照片，大小箱子都有。每个 X 只标一处：小 X 一个点，大 X 一个 2×2 的小块。', en: 'A grainy, slightly blurred photo of a shelf, with large and small boxes. Mark each X once: a point for a small X, a 2×2 block for a large one.' },
  hint: { zh: '前面每一关都解决了这里的一个麻烦。', en: 'Each of the last few levels dealt with one of the troubles here.' },
  after: { zh: '模板打分、多尺度、非极大值抑制，每个 X 恰好标一次：一台最简单的检测器。把模板换成学出来的卷积、加上框回归，就是真实的目标检测网络；它的成绩用你搭的 IoU 和 AP 来量。', en: 'Template scores, several scales, non-maximum suppression, each X marked exactly once: the simplest detector. Replace the template with learnt convolutions and add box regression, and you have a real object-detection network, its results measured with the IoU and AP you built.' },
  unlocks: [],
  tests: stockTests([
    [{ zh: '一大一小', en: 'One large, one small' }, SIZES[0][1], 111],
    [{ zh: '大的 O', en: 'A large O' }, SIZES[1][1], 112],
    [{ zh: '一排小的', en: 'A row of small ones' }, [['X', 4, 12, 1], ['O', 10, 12, 1], ['X', 16, 12, 1], ['X', 20, 4, 1]], 113],
  ]),
  hidden: stockTests([[{ zh: '两个大的', en: 'Two large' }, SIZES[2][1], 114]]),
  solution: finaleGraph(),
  naive: scaleGraph(),
}

export const levels = [overlap, goodBox, ranking, meanAp, nudgeBox, anchorRow, sliding, dogBoxes, findX, sizes, stockTake]
