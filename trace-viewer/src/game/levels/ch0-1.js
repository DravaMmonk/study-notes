import { GLYPHS, addNoise, correlate, flipKernel, fromFn, gaussianKernel, map, patterns as P, shift, zip } from '../engine/image.js'
import { build, test } from './util.js'

const BOX3 = Array(9).fill(1 / 9)
const H3 = [0, 0, 0, 1 / 3, 1 / 3, 1 / 3, 0, 0, 0]
const diffx = (img) => zip(shift(img, -1, 0), img, (a, b) => a - b)
const scenes = () => [
  ['方块', P.square()],
  ['圆盘', P.disk()],
  ['字母 T', P.glyph(GLYPHS.T)],
  ['棋盘', P.checker()],
  ['亮点', P.impulse(7, 7)],
]

// ---------------- chapter 0 · 睁眼 ----------------

export const chapter0 = [
  {
    id: '0-1',
    chapter: 0,
    title: '睁眼',
    brief: '把输入接到输出。',
    hint: '从「输入」卡片右边的圆点按住，拖到「输出」卡片左边的圆点。',
    after: '你看到的每一张图，都只是一格一格的数字。把鼠标停在任意一格上，看看它是多少。',
    requires: [],
    unlocks: [],
    palette: [],
    tests: scenes().map(([label, img]) => test(label, { in: img }, { out: img })),
    hidden: [['挪开的字母 X', P.glyph(GLYPHS.X, 0.1, 0.9, 6, 5)], ['随机纹理', P.noise(7)]].map(([label, img]) => test(label, { in: img }, { out: img })),
    solution: build({}, ['in>out']),
  },
  {
    id: '0-2',
    kind: 'probe',
    chapter: 0,
    title: '未知算子',
    brief: '这是我们给你的第一个元件。它对图像做了什么？用测试图喂它，然后回答。',
    question: '它把图像往哪个方向挪了一格？',
    answers: ['→', '←', '↓', '↑'],
    answer: '→',
    probes: [
      ['亮点', P.impulse(7, 7)],
      ['竖条', fromFn(16, 16, (x) => (x === 4 ? 0.9 : 0.1))],
      ['字母 F', P.glyph(GLYPHS.F)],
      ['方块', P.square(2, 2, 6)],
    ],
    after: '正确。你得到了「平移」：整张图挪一格，挪出边界的地方补 0。这个看似无聊的元件，后面几乎所有东西都要靠它搭出来。',
    requires: ['0-1'],
    unlocks: ['shift'],
  },
  {
    id: '0-3',
    chapter: 0,
    title: '底片',
    brief: '黑变白、白变黑：输出 = 1 − 输入。',
    hint: '先把所有数乘 −1，再整体加上一个数。',
    after: '每个像素各算各的，互不打扰。这叫逐像素运算：它改变亮度，却永远不知道邻居是谁。',
    requires: ['0-2'],
    unlocks: ['invert'],
    palette: ['scale', 'offset', 'add', 'sub'],
    tests: scenes().map(([label, img]) => test(label, { in: img }, { out: map(img, (v) => 1 - v) })),
    hidden: [['斜坡', P.rampX()], ['随机纹理', P.noise(3)]].map(([label, img]) => test(label, { in: img }, { out: map(img, (v) => 1 - v) })),
    solution: build({ k: ['scale', { k: -1 }], c: ['offset', { c: 1 }] }, ['in>k', 'k>c', 'c>out']),
  },
  (() => {
    const background = (seed) => fromFn(16, 16, (x, y) => 0.15 + 0.5 * (x / 15) * (seed % 2 ? 1 : y / 15))
    const object = (bg, x0, y0) => fromFn(16, 16, (x, y) => bg.data[y * 16 + x] + (x >= x0 && x < x0 + 4 && y >= y0 && y < y0 + 4 ? 0.3 : 0))
    const mask = (x0, y0) => fromFn(16, 16, (x, y) => (x >= x0 && x < x0 + 4 && y >= y0 && y < y0 + 4 ? 1 : 0))
    const cases = [[2, 3, 1], [9, 9, 2], [10, 2, 3], [3, 10, 4]]
    const hiddenCases = [['左下角', 0, 12, 5], ['右边亮处', 12, 6, 6], ['正中', 6, 6, 7]]
    return {
      id: '0-4',
      chapter: 0,
      title: '谁闯进来了',
      inputs: ['scene', 'empty'],
      brief: '「现场」比「空场」多了一个东西。只在它所在的格子输出 1，其余输出 0。',
      hint: '光照不均时，单看亮不亮会误判。先比一比两张图哪里不一样。',
      after: '和参照比差异，比看绝对亮度可靠得多。这是背景减除，也是后面“比较两张图”的第一课。',
      requires: ['0-3'],
      unlocks: ['threshold'],
      palette: ['sub', 'add', 'scale', 'offset', 'threshold'],
      tests: cases.map(([x0, y0, seed], index) => {
        const bg = background(seed)
        return test(`第 ${index + 1} 组`, { scene: object(bg, x0, y0), empty: bg }, { out: mask(x0, y0) })
      }),
      hidden: hiddenCases.map(([label, x0, y0, seed]) => {
        const bg = background(seed)
        return test(label, { scene: object(bg, x0, y0), empty: bg }, { out: mask(x0, y0) })
      }),
      solution: build({ d: 'sub', t: ['threshold', { t: 0.15 }] }, ['scene>d.a', 'empty>d.b', 'd>t', 't>out'], { inputs: ['scene', 'empty'] }),
      naive: build({ t: ['threshold', { t: 0.6 }] }, ['scene>t', 't>out'], { inputs: ['scene', 'empty'] }),
    }
  })(),
]

// ---------------- chapter 1 · 邻居 ----------------

const hblur = (img, border) => correlate(img, H3, border)
const box = (img, border) => correlate(img, BOX3, border)
const GAUSS_TARGET = gaussianKernel(Math.SQRT2, 4)
const MYSTERY = [0, 0, 0.5, 0, 0, 0, 0.25, 0, 0.25]
const convolve = (img, kernel) => correlate(img, flipKernel(kernel))
const cleanStep = (edge, lo, hi) => P.stepX(edge, lo, hi)
const edgeTarget = (img) => map(diffx(box(img)), (v) => (v > 0.15 ? 1 : 0))

export const chapter1 = [
  {
    id: '1-1',
    chapter: 1,
    title: '三点平均',
    brief: '每个像素换成它和左右两个邻居的平均。',
    hint: '你需要「往左挪一格」的图、「往右挪一格」的图和原图。',
    after: '输出不再只看自己，而是看邻居的加权和。这就是滤波。',
    requires: ['0-4'],
    unlocks: ['blur3h'],
    palette: ['shift', 'add', 'sub', 'scale'],
    tests: scenes().map(([label, img]) => test(label, { in: img }, { out: hblur(img) })),
    hidden: [['挪开的字母 F', P.glyph(GLYPHS.F, 0.1, 0.9, 5, 2)], ['随机纹理', P.noise(11)]].map(([label, img]) => test(label, { in: img }, { out: hblur(img) })),
    solution: build({ l: ['shift', { dir: '←' }], r: ['shift', { dir: '→' }], a: 'add', b: 'add', k: ['scale', { k: 1 / 3 }] }, ['in>l', 'in>r', 'l>a.a', 'r>a.b', 'a>b.a', 'in>b.b', 'b>k', 'k>out']),
  },
  {
    id: '1-2',
    chapter: 1,
    title: '方块模糊',
    brief: '每个像素换成它周围 3×3 九个格子的平均。计算量不能超过 6。',
    hint: '九个格子挨个加要 8 次加法。先横着平均一次，再……',
    after: '先横后竖，九次乘加变成六次。核能拆成一行乘一列时就能这样省，这叫可分离滤波；核越大省得越多。',
    requires: ['1-1'],
    unlocks: ['box3'],
    palette: ['shift', 'add', 'scale', 'blur3h'],
    constraint: (score) => (score.cost > 6 ? `计算量 ${score.cost}，超过 6` : ''),
    tests: scenes().map(([label, img]) => test(label, { in: img }, { out: box(img) })),
    hidden: [['挪开的字母 L', P.glyph(GLYPHS.L, 0.1, 0.9, 2, 5)], ['随机纹理', P.noise(13)]].map(([label, img]) => test(label, { in: img }, { out: box(img) })),
    solution: build({ h: 'blur3h', u: ['shift', { dir: '↑' }], d: ['shift', { dir: '↓' }], a: 'add', b: 'add', k: ['scale', { k: 1 / 3 }] }, ['in>h', 'h>u', 'h>d', 'u>a.a', 'd>a.b', 'a>b.a', 'h>b.b', 'b>k', 'k>out']),
    naive: (() => {
      const nodes = {}
      const wires = []
      const offsets = [['←', null], ['→', null], ['↑', null], ['↓', null], ['←', '↑'], ['←', '↓'], ['→', '↑'], ['→', '↓']]
      offsets.forEach(([a, b], i) => {
        nodes[`s${i}`] = ['shift', { dir: a }]
        wires.push(`in>s${i}`)
        if (b) {
          nodes[`t${i}`] = ['shift', { dir: b }]
          wires.push(`s${i}>t${i}`)
        }
      })
      let last = 'in'
      offsets.forEach(([, b], i) => {
        nodes[`a${i}`] = 'add'
        wires.push(`${last}>a${i}.a`, `${b ? `t${i}` : `s${i}`}>a${i}.b`)
        last = `a${i}`
      })
      nodes.k = ['scale', { k: 1 / 9 }]
      wires.push(`${last}>k`, 'k>out')
      return build(nodes, wires)
    })(),
  },
  {
    id: '1-3',
    views: { out: 'terrain' },
    chapter: 1,
    title: '更圆的模糊',
    brief: '做出和目标一样的柔和模糊（σ ≈ 1.4 的高斯）。手里只有 3×3 平均。',
    hint: '一次平均太“方”。多来几次会怎样？',
    after: '平均一次是方的，平均三次几乎就是高斯了。平滑叠平滑会越来越像高斯，所以高斯在视觉里无处不在。',
    requires: ['1-2'],
    unlocks: ['gauss'],
    palette: ['box3', 'scale', 'add'],
    check: { tolerance: 0.025 },
    tests: [['亮点', P.impulse(7, 7)], ['方块', P.square(5, 5, 6)], ['圆盘', P.disk(7.5, 7.5, 3.5)]].map(([label, img]) => test(label, { in: img }, { out: correlate(img, GAUSS_TARGET) })),
    hidden: [['偏一边的亮点', P.impulse(4, 10)], ['偏一边的圆盘', P.disk(9.5, 6.5, 3)], ['字母 T', P.glyph(GLYPHS.T)]].map(([label, img]) => test(label, { in: img }, { out: correlate(img, GAUSS_TARGET) })),
    solution: build({ a: 'box3', b: 'box3', c: 'box3' }, ['in>a', 'a>b', 'b>c', 'c>out']),
    naive: build({ a: 'box3', b: 'box3' }, ['in>a', 'a>b', 'b>out']),
  },
  {
    id: '1-4',
    views: { in: 'slope', out: 'terrain', mid: 'terrain' },
    chapter: 1,
    title: '台阶在哪',
    brief: '在亮度突然变化的地方输出变化量：输出 = 右边邻居 − 自己。',
    after: '边缘就是相邻像素的差。平坦处差为 0，台阶处差最大。',
    requires: ['1-1'],
    unlocks: ['diffx'],
    palette: ['shift', 'sub', 'add', 'scale'],
    tests: [['台阶', P.stepX(8)], ['方块', P.square()], ['斜坡', P.rampX()], ['字母 L', P.glyph(GLYPHS.L)]].map(([label, img]) => test(label, { in: img }, { out: diffx(img) })),
    hidden: [['亮到暗的台阶', P.stepX(5, 0.85, 0.15)], ['挪开的字母 F', P.glyph(GLYPHS.F, 0.1, 0.9, 6, 4)], ['随机纹理', P.noise(17)]].map(([label, img]) => test(label, { in: img }, { out: diffx(img) })),
    solution: build({ l: ['shift', { dir: '←' }], d: 'sub' }, ['in>l', 'l>d.a', 'in>d.b', 'd>out']),
  },
  {
    id: '1-5',
    views: { in: 'slope', out: 'terrain', mid: 'terrain' },
    chapter: 1,
    title: '有噪声的边',
    brief: '照片里有噪声。只在真正的台阶处输出 1（台阶都是左暗右亮）。',
    hint: '差分会把噪声一起放大。在求差之前，能不能先让噪声安静下来？',
    after: '先平滑、再求导，噪声被压下去，真正的边留下来。这正是 Sobel 算子：一个方向求导，另一个方向平滑。',
    requires: ['1-4', '1-2'],
    unlocks: ['sobel'],
    palette: ['box3', 'diffx', 'threshold', 'scale', 'sub'],
    check: { tolerance: 0.5, mismatches: 4 },
    tests: [[5, 1], [8, 2], [11, 3], [7, 4]].map(([edge, seed]) =>
      test(`台阶 x=${edge}`, { in: addNoise(cleanStep(edge, 0.15, 0.85), seed, 0.22) }, { out: edgeTarget(cleanStep(edge, 0.15, 0.85)) }),
    ),
    hidden: [[6, 5], [9, 7], [10, 19]].map(([edge, seed]) =>
      test(`新台阶 x=${edge}`, { in: addNoise(cleanStep(edge, 0.15, 0.85), seed, 0.22) }, { out: edgeTarget(cleanStep(edge, 0.15, 0.85)) }),
    ),
    solution: build({ b: 'box3', d: 'diffx', t: ['threshold', { t: 0.15 }] }, ['in>b', 'b>d', 'd>t', 't>out']),
    naive: build({ d: 'diffx', t: ['threshold', { t: 0.15 }] }, ['in>d', 'd>t', 't>out']),
  },
  {
    id: '1-6',
    chapter: 1,
    title: '猜核',
    brief: '有人用一个 3×3 核处理了这些图。把你的核拧成和它一样。',
    hint: '先看第一组：一个亮点经过处理，会变成什么形状？再想想你的元件是怎样读核的。',
    after: '亮点的输出就是核本身（冲激响应）。但它是“卷积”的结果，而你的元件做的是“互相关”：要把核旋转 180° 才对得上。',
    requires: ['1-5'],
    unlocks: ['kernel3'],
    palette: ['kernel3'],
    tests: [['亮点', P.impulse(7, 7)], ['方块', P.square()], ['字母 F', P.glyph(GLYPHS.F)]].map(([label, img]) => test(label, { in: img }, { out: convolve(img, MYSTERY) })),
    hidden: [['挪开的字母 L', P.glyph(GLYPHS.L, 0.1, 0.9, 4, 2)], ['随机纹理', P.noise(23)]].map(([label, img]) => test(label, { in: img }, { out: convolve(img, MYSTERY) })),
    solution: build({ k: ['kernel3', { w: flipKernel(MYSTERY) }] }, ['in>k', 'k>out']),
    naive: build({ k: ['kernel3', { w: MYSTERY }] }, ['in>k', 'k>out']),
  },
  {
    id: '1-7',
    chapter: 1,
    title: '补边',
    brief: '向右平移一格，但最左一列不补 0，而是照抄原图最左一列。',
    hint: '先做出补 0 的平移：它只错在最左一列。能不能单独拿到「原图的最左一列，其余全是 0」？试试先往左挪、再往右挪会丢掉什么。',
    after: '你拼出的就是「复制边缘」：图外缺的值，用离它最近的边上像素代替，不会凭空造出一道黑边。从现在起，元件的「边界」设置里多了「复制边缘」，做的就是你刚才拼的这件事。',
    requires: ['1-6'],
    unlocks: ['edge-pad'],
    // The border setting is what this level builds by hand, so it stays out of reach here even for a player who has it.
    withhold: ['edge-pad'],
    grants: ['mul'],
    palette: ['shift', 'add', 'sub', 'mul', 'scale', 'offset'],
    tests: [['亮条贴左边', P.stepX(4, 0.85, 0.2)], ['字母 F 贴左边', P.glyph(GLYPHS.F, 0.15, 0.9, 0, 3)], ['方块贴左边', P.square(0, 4, 6, 0.1, 0.9)], ['斜坡', fromFn(16, 16, (x, y) => 0.1 + 0.05 * y)]].map(([label, img]) =>
      test(label, { in: img }, { out: shift(img, 1, 0, 'edge') }),
    ),
    hidden: [['随机纹理', P.noise(31)], ['亮底暗块', P.square(0, 9, 5, 0.85, 0.25)]].map(([label, img]) =>
      test(label, { in: img }, { out: shift(img, 1, 0, 'edge') }),
    ),
    solution: build({ r: ['shift', { dir: '→' }], l: ['shift', { dir: '←' }], b: ['shift', { dir: '→' }], d: 'sub', a: 'add' }, ['in>r', 'in>l', 'l>b', 'in>d.a', 'b>d.b', 'r>a.a', 'd>a.b', 'a>out']),
    alsoFails: [build({ r: ['shift', { dir: '→' }], a: 'add' }, ['in>r', 'r>a.a', 'in>a.b', 'a>out'])],
    naive: build({ r: ['shift', { dir: '→' }] }, ['in>r', 'r>out']),
  },
  {
    id: '1-8',
    chapter: 1,
    title: '黑框',
    brief: '在亮背景上做 3×3 平均，边缘不能发黑。',
    hint: '图外面补的是 0，也就是黑色。上一关你拼出了另一种补法。',
    after: '补 0 等于在图外画了一圈黑框，平均时把黑色混了进来。复制边缘像素就不会制造假边界。',
    requires: ['1-7'],
    grants: ['edge-pad'],
    palette: ['box3', 'shift', 'add', 'scale'],
    tests: [['亮底方块', P.square(5, 5, 6, 0.85, 0.3)], ['亮底圆', P.disk(7.5, 7.5, 4, 0.9, 0.2)], ['亮底字母', P.glyph(GLYPHS.T, 0.9, 0.2)]].map(([label, img]) =>
      test(label, { in: img }, { out: box(img, 'edge') }),
    ),
    hidden: [['贴边的暗方块', P.square(0, 10, 5, 0.8, 0.3)], ['亮底字母 X', P.glyph(GLYPHS.X, 0.75, 0.15, 6, 4)], ['亮底竖条', P.stepX(13, 0.9, 0.35)]].map(([label, img]) =>
      test(label, { in: img }, { out: box(img, 'edge') }),
    ),
    solution: build({ b: ['box3', { border: 'edge' }] }, ['in>b', 'b>out']),
    naive: build({ b: 'box3' }, ['in>b', 'b>out']),
  },
  {
    id: '1-9',
    views: { in: 'terrain', out: 'terrain', mid: 'terrain' },
    chapter: 1,
    title: '锐化',
    brief: '让细节更清楚：输出 = 原图 + 1.5 ×（原图 − 模糊图）。模糊用 σ = 1、复制边缘。',
    after: '原图减去模糊图，剩下的正是细节（高频）。把细节加回去，图就变“锐”了。',
    requires: ['1-3', '1-8'],
    unlocks: ['sharpen'],
    palette: ['gauss', 'sub', 'add', 'scale'],
    tests: scenes().slice(0, 4).map(([label, img]) => {
      const blurred = correlate(img, gaussianKernel(1), 'edge')
      return test(label, { in: img }, { out: zip(img, blurred, (a, b) => a + 1.5 * (a - b)) })
    }),
    hidden: [['挪开的字母 L', P.glyph(GLYPHS.L, 0.1, 0.9, 5, 4)], ['随机纹理', P.noise(21)]].map(([label, img]) => {
      const blurred = correlate(img, gaussianKernel(1), 'edge')
      return test(label, { in: img }, { out: zip(img, blurred, (a, b) => a + 1.5 * (a - b)) })
    }),
    solution: build({ g: ['gauss', { sigma: 1, border: 'edge' }], d: 'sub', k: ['scale', { k: 1.5 }], a: 'add' }, ['in>g', 'in>d.a', 'g>d.b', 'd>k', 'in>a.a', 'k>a.b', 'a>out']),
  },
]
