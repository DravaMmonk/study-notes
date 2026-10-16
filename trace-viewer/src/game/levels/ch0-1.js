import { GLYPHS, addNoise, correlate, flipKernel, fromFn, gaussianKernel, map, patterns as P, shift, zip } from '../engine/image.js'
import { build, test } from './util.js'

const BOX3 = Array(9).fill(1 / 9)
const H3 = [0, 0, 0, 1 / 3, 1 / 3, 1 / 3, 0, 0, 0]
const diffx = (img) => zip(shift(img, -1, 0), img, (a, b) => a - b)
const scenes = () => [
  [{ zh: '方块', en: 'Square' }, P.square()],
  [{ zh: '圆盘', en: 'Disc' }, P.disk()],
  [{ zh: '字母 T', en: 'Letter T' }, P.glyph(GLYPHS.T)],
  [{ zh: '棋盘', en: 'Checkerboard' }, P.checker()],
  [{ zh: '亮点', en: 'Bright dot' }, P.impulse(7, 7)],
]

// ---------------- chapter 0 · 睁眼 ----------------

export const chapter0 = [
  {
    id: '0-1',
    chapter: 0,
    title: { zh: '睁眼', en: 'Open your eyes' },
    brief: { zh: '把输入接到输出。', en: 'Connect the input to the output.' },
    hint: { zh: '从「输入」卡片右边的圆点按住，拖到「输出」卡片左边的圆点。', en: 'Press on the dot on the right of the "Input" card and drag it to the dot on the left of the "Output" card.' },
    after: { zh: '你看到的每一张图，都只是一格一格的数字。把鼠标停在任意一格上，看看它是多少。', en: 'Every image you see is just a grid of numbers, cell by cell. Hover over any cell to see its value.' },
    requires: [],
    unlocks: [],
    palette: [],
    tests: scenes().map(([label, img]) => test(label, { in: img }, { out: img })),
    hidden: [[{ zh: '挪开的字母 X', en: 'Shifted letter X' }, P.glyph(GLYPHS.X, 0.1, 0.9, 6, 5)], [{ zh: '随机纹理', en: 'Random texture' }, P.noise(7)]].map(([label, img]) => test(label, { in: img }, { out: img })),
    solution: build({}, ['in>out']),
  },
  {
    id: '0-2',
    kind: 'probe',
    chapter: 0,
    title: { zh: '未知算子', en: 'Unknown operator' },
    brief: { zh: '这是我们给你的第一个元件。它对图像做了什么？用测试图喂它，然后回答。', en: 'This is the first part we are giving you. What does it do to an image? Feed it test images, then answer.' },
    question: { zh: '它把图像往哪个方向挪了一格？', en: 'Which way does it move the image by one pixel?' },
    answers: ['→', '←', '↓', '↑'],
    answer: '→',
    probes: [
      [{ zh: '亮点', en: 'Bright dot' }, P.impulse(7, 7)],
      [{ zh: '竖条', en: 'Vertical bar' }, fromFn(16, 16, (x) => (x === 4 ? 0.9 : 0.1))],
      [{ zh: '字母 F', en: 'Letter F' }, P.glyph(GLYPHS.F)],
      [{ zh: '方块', en: 'Square' }, P.square(2, 2, 6)],
    ],
    after: { zh: '正确。你得到了「平移」：整张图挪一格，挪出边界的地方补 0。这个看似无聊的元件，后面几乎所有东西都要靠它搭出来。', en: 'Correct. You now have "Shift": it moves the whole image by one pixel and fills the gap left at the border with 0. This dull-looking part is what almost everything later is built from.' },
    requires: ['0-1'],
    unlocks: ['shift'],
  },
  {
    id: '0-3',
    chapter: 0,
    title: { zh: '底片', en: 'Negative' },
    brief: { zh: '黑变白、白变黑：输出 = 1 − 输入。', en: 'Black becomes white, white becomes black: output = 1 − input.' },
    hint: { zh: '先把所有数乘 −1，再整体加上一个数。', en: 'First multiply every number by −1, then add one number to all of them.' },
    after: { zh: '每个像素各算各的，互不打扰。这叫逐像素运算：它改变亮度，却永远不知道邻居是谁。', en: 'Each pixel is worked out on its own, leaving the others alone. This is a per-pixel operation: it changes brightness, but never knows who its neighbours are.' },
    requires: ['0-2'],
    unlocks: ['invert'],
    palette: ['scale', 'offset', 'add', 'sub'],
    tests: scenes().map(([label, img]) => test(label, { in: img }, { out: map(img, (v) => 1 - v) })),
    hidden: [[{ zh: '斜坡', en: 'Ramp' }, P.rampX()], [{ zh: '随机纹理', en: 'Random texture' }, P.noise(3)]].map(([label, img]) => test(label, { in: img }, { out: map(img, (v) => 1 - v) })),
    solution: build({ k: ['scale', { k: -1 }], c: ['offset', { c: 1 }] }, ['in>k', 'k>c', 'c>out']),
  },
  (() => {
    const background = (seed) => fromFn(16, 16, (x, y) => 0.15 + 0.5 * (x / 15) * (seed % 2 ? 1 : y / 15))
    const object = (bg, x0, y0) => fromFn(16, 16, (x, y) => bg.data[y * 16 + x] + (x >= x0 && x < x0 + 4 && y >= y0 && y < y0 + 4 ? 0.3 : 0))
    const mask = (x0, y0) => fromFn(16, 16, (x, y) => (x >= x0 && x < x0 + 4 && y >= y0 && y < y0 + 4 ? 1 : 0))
    const cases = [[2, 3, 1], [9, 9, 2], [10, 2, 3], [3, 10, 4]]
    const hiddenCases = [[{ zh: '左下角', en: 'Bottom-left corner' }, 0, 12, 5], [{ zh: '右边亮处', en: 'Bright right side' }, 12, 6, 6], [{ zh: '正中', en: 'Dead centre' }, 6, 6, 7]]
    return {
      id: '0-4',
      chapter: 0,
      title: { zh: '谁闯进来了', en: 'Who came in?' },
      inputs: ['scene', 'empty'],
      brief: { zh: '「现场」比「空场」多了一个东西。只在它所在的格子输出 1，其余输出 0。', en: 'The "Scene" has one thing more than the "Empty scene". Output 1 only in the cells it covers, and 0 everywhere else.' },
      hint: { zh: '光照不均时，单看亮不亮会误判。先比一比两张图哪里不一样。', en: 'With uneven lighting, judging by brightness alone goes wrong. First compare where the two images differ.' },
      after: { zh: '和参照比差异，比看绝对亮度可靠得多。这是背景减除，也是后面“比较两张图”的第一课。', en: 'Comparing against a reference is far more reliable than looking at absolute brightness. This is background subtraction, and your first lesson in "comparing two images".' },
      requires: ['0-3'],
      unlocks: ['threshold'],
      palette: ['sub', 'add', 'scale', 'offset', 'threshold'],
      tests: cases.map(([x0, y0, seed], index) => {
        const bg = background(seed)
        return test({ zh: `第 ${index + 1} 组`, en: `Set ${index + 1}` }, { scene: object(bg, x0, y0), empty: bg }, { out: mask(x0, y0) })
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
    title: { zh: '三点平均', en: 'Three-point average' },
    brief: { zh: '每个像素换成它和左右两个邻居的平均。', en: 'Replace each pixel with the average of itself and its left and right neighbours.' },
    hint: { zh: '你需要「往左挪一格」的图、「往右挪一格」的图和原图。', en: 'You need the image shifted one pixel left, the image shifted one pixel right, and the original.' },
    after: { zh: '输出不再只看自己，而是看邻居的加权和。这就是滤波。', en: 'The output no longer looks only at its own pixel, but at a weighted sum of its neighbours. This is filtering.' },
    requires: ['0-4'],
    unlocks: ['blur3h'],
    palette: ['shift', 'add', 'sub', 'scale'],
    tests: scenes().map(([label, img]) => test(label, { in: img }, { out: hblur(img) })),
    hidden: [[{ zh: '挪开的字母 F', en: 'Shifted letter F' }, P.glyph(GLYPHS.F, 0.1, 0.9, 5, 2)], [{ zh: '随机纹理', en: 'Random texture' }, P.noise(11)]].map(([label, img]) => test(label, { in: img }, { out: hblur(img) })),
    solution: build({ l: ['shift', { dir: '←' }], r: ['shift', { dir: '→' }], a: 'add', b: 'add', k: ['scale', { k: 1 / 3 }] }, ['in>l', 'in>r', 'l>a.a', 'r>a.b', 'a>b.a', 'in>b.b', 'b>k', 'k>out']),
  },
  {
    id: '1-2',
    chapter: 1,
    title: { zh: '方块模糊', en: 'Box blur' },
    brief: { zh: '每个像素换成它周围 3×3 九个格子的平均。计算量不能超过 6。', en: 'Replace each pixel with the average of the nine cells in the 3×3 block around it. The cost must not exceed 6.' },
    hint: { zh: '九个格子挨个加要 8 次加法。先横着平均一次，再……', en: 'Adding up nine cells one by one takes 8 additions. Average horizontally once first, then…' },
    after: { zh: '先横后竖，九次乘加变成六次。核能拆成一行乘一列时就能这样省，这叫可分离滤波；核越大省得越多。', en: 'Horizontal first, then vertical: nine multiply-adds become six. You can save like this whenever a kernel splits into a row times a column. This is separable filtering; the bigger the kernel, the more you save.' },
    requires: ['1-1'],
    unlocks: ['box3'],
    palette: ['shift', 'add', 'scale', 'blur3h'],
    constraint: (score) => (score.cost > 6 ? { zh: `计算量 ${score.cost}，超过 6`, en: `Cost ${score.cost}, over 6` } : ''),
    tests: scenes().map(([label, img]) => test(label, { in: img }, { out: box(img) })),
    hidden: [[{ zh: '挪开的字母 L', en: 'Shifted letter L' }, P.glyph(GLYPHS.L, 0.1, 0.9, 2, 5)], [{ zh: '随机纹理', en: 'Random texture' }, P.noise(13)]].map(([label, img]) => test(label, { in: img }, { out: box(img) })),
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
    title: { zh: '更圆的模糊', en: 'A rounder blur' },
    brief: { zh: '做出和目标一样的柔和模糊（σ ≈ 1.4 的高斯）。手里只有 3×3 平均。', en: 'Make the same soft blur as the target (a Gaussian with σ ≈ 1.4). All you have is the 3×3 average.' },
    hint: { zh: '一次平均太“方”。多来几次会怎样？', en: 'One average is too "square". What happens if you do it a few more times?' },
    after: { zh: '平均一次是方的，平均三次几乎就是高斯了。平滑叠平滑会越来越像高斯，所以高斯在视觉里无处不在。', en: 'Averaging once gives a square; averaging three times is almost a Gaussian. Smoothing on top of smoothing looks more and more like a Gaussian, which is why Gaussians are everywhere in vision.' },
    requires: ['1-2'],
    unlocks: ['gauss'],
    palette: ['box3', 'scale', 'add'],
    check: { tolerance: 0.025 },
    tests: [[{ zh: '亮点', en: 'Bright dot' }, P.impulse(7, 7)], [{ zh: '方块', en: 'Square' }, P.square(5, 5, 6)], [{ zh: '圆盘', en: 'Disc' }, P.disk(7.5, 7.5, 3.5)]].map(([label, img]) => test(label, { in: img }, { out: correlate(img, GAUSS_TARGET) })),
    hidden: [[{ zh: '偏一边的亮点', en: 'Off-centre bright dot' }, P.impulse(4, 10)], [{ zh: '偏一边的圆盘', en: 'Off-centre disc' }, P.disk(9.5, 6.5, 3)], [{ zh: '字母 T', en: 'Letter T' }, P.glyph(GLYPHS.T)]].map(([label, img]) => test(label, { in: img }, { out: correlate(img, GAUSS_TARGET) })),
    solution: build({ a: 'box3', b: 'box3', c: 'box3' }, ['in>a', 'a>b', 'b>c', 'c>out']),
    naive: build({ a: 'box3', b: 'box3' }, ['in>a', 'a>b', 'b>out']),
  },
  {
    id: '1-4',
    views: { in: 'slope', out: 'terrain', mid: 'terrain' },
    chapter: 1,
    title: { zh: '台阶在哪', en: 'Where is the step?' },
    brief: { zh: '在亮度突然变化的地方输出变化量：输出 = 右边邻居 − 自己。', en: 'Where the brightness suddenly changes, output the amount of change: output = right neighbour − self.' },
    after: { zh: '边缘就是相邻像素的差。平坦处差为 0，台阶处差最大。', en: 'An edge is the difference between neighbouring pixels. On flat ground the difference is 0; at a step it is largest.' },
    requires: ['1-1'],
    unlocks: ['diffx'],
    palette: ['shift', 'sub', 'add', 'scale'],
    tests: [[{ zh: '台阶', en: 'Step' }, P.stepX(8)], [{ zh: '方块', en: 'Square' }, P.square()], [{ zh: '斜坡', en: 'Ramp' }, P.rampX()], [{ zh: '字母 L', en: 'Letter L' }, P.glyph(GLYPHS.L)]].map(([label, img]) => test(label, { in: img }, { out: diffx(img) })),
    hidden: [[{ zh: '亮到暗的台阶', en: 'Bright-to-dark step' }, P.stepX(5, 0.85, 0.15)], [{ zh: '挪开的字母 F', en: 'Shifted letter F' }, P.glyph(GLYPHS.F, 0.1, 0.9, 6, 4)], [{ zh: '随机纹理', en: 'Random texture' }, P.noise(17)]].map(([label, img]) => test(label, { in: img }, { out: diffx(img) })),
    solution: build({ l: ['shift', { dir: '←' }], d: 'sub' }, ['in>l', 'l>d.a', 'in>d.b', 'd>out']),
  },
  {
    id: '1-5',
    views: { in: 'slope', out: 'terrain', mid: 'terrain' },
    chapter: 1,
    title: { zh: '有噪声的边', en: 'A noisy edge' },
    brief: { zh: '照片里有噪声。只在真正的台阶处输出 1（台阶都是左暗右亮）。', en: 'The photo is noisy. Output 1 only at the real step (every step is dark on the left, bright on the right).' },
    hint: { zh: '差分会把噪声一起放大。在求差之前，能不能先让噪声安静下来？', en: 'Taking a difference amplifies the noise too. Before you take the difference, can you quieten the noise first?' },
    after: { zh: '先平滑、再求导，噪声被压下去，真正的边留下来。这正是 Sobel 算子：一个方向求导，另一个方向平滑。', en: 'Smooth first, then differentiate: the noise is pushed down and the real edge stays. This is exactly the Sobel operator: differentiate in one direction, smooth in the other.' },
    requires: ['1-4', '1-2'],
    unlocks: ['sobel'],
    palette: ['box3', 'diffx', 'threshold', 'scale', 'sub'],
    check: { tolerance: 0.5, mismatches: 4 },
    tests: [[5, 1], [8, 2], [11, 3], [7, 4]].map(([edge, seed]) =>
      test({ zh: `台阶 x=${edge}`, en: `Step x=${edge}` }, { in: addNoise(cleanStep(edge, 0.15, 0.85), seed, 0.22) }, { out: edgeTarget(cleanStep(edge, 0.15, 0.85)) }),
    ),
    hidden: [[6, 5], [9, 7], [10, 19]].map(([edge, seed]) =>
      test({ zh: `新台阶 x=${edge}`, en: `New step x=${edge}` }, { in: addNoise(cleanStep(edge, 0.15, 0.85), seed, 0.22) }, { out: edgeTarget(cleanStep(edge, 0.15, 0.85)) }),
    ),
    solution: build({ b: 'box3', d: 'diffx', t: ['threshold', { t: 0.15 }] }, ['in>b', 'b>d', 'd>t', 't>out']),
    naive: build({ d: 'diffx', t: ['threshold', { t: 0.15 }] }, ['in>d', 'd>t', 't>out']),
  },
  {
    id: '1-6',
    chapter: 1,
    title: { zh: '猜核', en: 'Guess the kernel' },
    brief: { zh: '有人用一个 3×3 核处理了这些图。把你的核拧成和它一样。', en: 'Someone processed these images with a 3×3 kernel. Dial your kernel in until it matches.' },
    hint: { zh: '先看第一组：一个亮点经过处理，会变成什么形状？再想想你的元件是怎样读核的。', en: 'Look at Set 1 first: what shape does a bright dot turn into after processing? Then think about how your part reads its kernel.' },
    after: { zh: '亮点的输出就是核本身（冲激响应）。但它是“卷积”的结果，而你的元件做的是“互相关”：要把核旋转 180° 才对得上。', en: 'The output for a bright dot is the kernel itself (the impulse response). But that is the result of a "convolution", while your part does "cross-correlation": you have to rotate the kernel by 180° to make them match.' },
    requires: ['1-5'],
    unlocks: ['kernel3'],
    palette: ['kernel3'],
    tests: [[{ zh: '亮点', en: 'Bright dot' }, P.impulse(7, 7)], [{ zh: '方块', en: 'Square' }, P.square()], [{ zh: '字母 F', en: 'Letter F' }, P.glyph(GLYPHS.F)]].map(([label, img]) => test(label, { in: img }, { out: convolve(img, MYSTERY) })),
    hidden: [[{ zh: '挪开的字母 L', en: 'Shifted letter L' }, P.glyph(GLYPHS.L, 0.1, 0.9, 4, 2)], [{ zh: '随机纹理', en: 'Random texture' }, P.noise(23)]].map(([label, img]) => test(label, { in: img }, { out: convolve(img, MYSTERY) })),
    solution: build({ k: ['kernel3', { w: flipKernel(MYSTERY) }] }, ['in>k', 'k>out']),
    naive: build({ k: ['kernel3', { w: MYSTERY }] }, ['in>k', 'k>out']),
  },
  {
    id: '1-7',
    chapter: 1,
    title: { zh: '补边', en: 'Padding' },
    brief: { zh: '向右平移一格，但最左一列不补 0，而是照抄原图最左一列。', en: 'Shift right by one pixel, but instead of padding the leftmost column with 0, copy the original image\'s leftmost column.' },
    hint: { zh: '先做出补 0 的平移：它只错在最左一列。能不能单独拿到「原图的最左一列，其余全是 0」？试试先往左挪、再往右挪会丢掉什么。', en: 'First build the zero-padded shift: it is wrong only in the leftmost column. Can you get "the original\'s leftmost column, with 0 everywhere else" on its own? See what is lost when you shift left and then right.' },
    after: { zh: '你拼出的就是「复制边缘」：图外缺的值，用离它最近的边上像素代替，不会凭空造出一道黑边。从现在起，元件的「边界」设置里多了「复制边缘」，做的就是你刚才拼的这件事。', en: 'What you built is "Replicate edge": a missing value outside the image is replaced by the nearest pixel on the edge, so no black border appears out of nowhere. From now on, the "Border" setting on parts has a "Replicate edge" option that does exactly what you just built.' },
    requires: ['1-6'],
    unlocks: ['edge-pad'],
    // The border setting is what this level builds by hand, so it stays out of reach here even for a player who has it.
    withhold: ['edge-pad'],
    grants: ['mul'],
    palette: ['shift', 'add', 'sub', 'mul', 'scale', 'offset'],
    tests: [[{ zh: '亮条贴左边', en: 'Bright bar on the left edge' }, P.stepX(4, 0.85, 0.2)], [{ zh: '字母 F 贴左边', en: 'Letter F on the left edge' }, P.glyph(GLYPHS.F, 0.15, 0.9, 0, 3)], [{ zh: '方块贴左边', en: 'Square on the left edge' }, P.square(0, 4, 6, 0.1, 0.9)], [{ zh: '斜坡', en: 'Ramp' }, fromFn(16, 16, (x, y) => 0.1 + 0.05 * y)]].map(([label, img]) =>
      test(label, { in: img }, { out: shift(img, 1, 0, 'edge') }),
    ),
    hidden: [[{ zh: '随机纹理', en: 'Random texture' }, P.noise(31)], [{ zh: '亮底暗块', en: 'Dark block on bright background' }, P.square(0, 9, 5, 0.85, 0.25)]].map(([label, img]) =>
      test(label, { in: img }, { out: shift(img, 1, 0, 'edge') }),
    ),
    solution: build({ r: ['shift', { dir: '→' }], l: ['shift', { dir: '←' }], b: ['shift', { dir: '→' }], d: 'sub', a: 'add' }, ['in>r', 'in>l', 'l>b', 'in>d.a', 'b>d.b', 'r>a.a', 'd>a.b', 'a>out']),
    alsoFails: [build({ r: ['shift', { dir: '→' }], a: 'add' }, ['in>r', 'r>a.a', 'in>a.b', 'a>out'])],
    naive: build({ r: ['shift', { dir: '→' }] }, ['in>r', 'r>out']),
  },
  {
    id: '1-8',
    chapter: 1,
    title: { zh: '黑框', en: 'Black frame' },
    brief: { zh: '在亮背景上做 3×3 平均，边缘不能发黑。', en: 'Take a 3×3 average on a bright background without the border going dark.' },
    hint: { zh: '图外面补的是 0，也就是黑色。上一关你拼出了另一种补法。', en: 'Outside the image is padded with 0, which is black. In the last level you built another way to pad.' },
    after: { zh: '补 0 等于在图外画了一圈黑框，平均时把黑色混了进来。复制边缘像素就不会制造假边界。', en: 'Padding with 0 draws a black frame round the image, and averaging mixes that black in. Replicating the edge pixels creates no false border.' },
    requires: ['1-7'],
    grants: ['edge-pad'],
    palette: ['box3', 'shift', 'add', 'scale'],
    tests: [[{ zh: '亮底方块', en: 'Square on bright background' }, P.square(5, 5, 6, 0.85, 0.3)], [{ zh: '亮底圆', en: 'Circle on bright background' }, P.disk(7.5, 7.5, 4, 0.9, 0.2)], [{ zh: '亮底字母', en: 'Letter on bright background' }, P.glyph(GLYPHS.T, 0.9, 0.2)]].map(([label, img]) =>
      test(label, { in: img }, { out: box(img, 'edge') }),
    ),
    hidden: [[{ zh: '贴边的暗方块', en: 'Dark square on the edge' }, P.square(0, 10, 5, 0.8, 0.3)], [{ zh: '亮底字母 X', en: 'Letter X on bright background' }, P.glyph(GLYPHS.X, 0.75, 0.15, 6, 4)], [{ zh: '亮底竖条', en: 'Vertical bar on bright background' }, P.stepX(13, 0.9, 0.35)]].map(([label, img]) =>
      test(label, { in: img }, { out: box(img, 'edge') }),
    ),
    solution: build({ b: ['box3', { border: 'edge' }] }, ['in>b', 'b>out']),
    naive: build({ b: 'box3' }, ['in>b', 'b>out']),
  },
  {
    id: '1-9',
    views: { in: 'terrain', out: 'terrain', mid: 'terrain' },
    chapter: 1,
    title: { zh: '锐化', en: 'Sharpen' },
    brief: { zh: '让细节更清楚：输出 = 原图 + 1.5 ×（原图 − 模糊图）。模糊用 σ = 1、复制边缘。', en: 'Make the details clearer: output = original + 1.5 × (original − blurred). Blur with σ = 1 and replicate edge.' },
    after: { zh: '原图减去模糊图，剩下的正是细节（高频）。把细节加回去，图就变“锐”了。', en: 'The original minus the blurred image leaves exactly the detail (the high frequencies). Add the detail back and the image becomes "sharper".' },
    requires: ['1-3', '1-8'],
    unlocks: ['sharpen'],
    palette: ['gauss', 'sub', 'add', 'scale'],
    tests: scenes().slice(0, 4).map(([label, img]) => {
      const blurred = correlate(img, gaussianKernel(1), 'edge')
      return test(label, { in: img }, { out: zip(img, blurred, (a, b) => a + 1.5 * (a - b)) })
    }),
    hidden: [[{ zh: '挪开的字母 L', en: 'Shifted letter L' }, P.glyph(GLYPHS.L, 0.1, 0.9, 5, 4)], [{ zh: '随机纹理', en: 'Random texture' }, P.noise(21)]].map(([label, img]) => {
      const blurred = correlate(img, gaussianKernel(1), 'edge')
      return test(label, { in: img }, { out: zip(img, blurred, (a, b) => a + 1.5 * (a - b)) })
    }),
    solution: build({ g: ['gauss', { sigma: 1, border: 'edge' }], d: 'sub', k: ['scale', { k: 1.5 }], a: 'add' }, ['in>g', 'in>d.a', 'g>d.b', 'd>k', 'in>a.a', 'k>a.b', 'a>out']),
  },
]
