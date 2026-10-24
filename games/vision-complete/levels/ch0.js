import { GLYPHS, fromFn, map, patterns as P, shift } from '../../kit/domains/image/engine/image.js'
import { build, test } from '../../kit/domains/image/build.js'

// Chapter 0 · 睁眼 (lectures 1–2): an image is a grid of numbers. Steps: wire a camera to a screen, find out what the
// first part does, chain it, then per-pixel arithmetic and the threshold; the camera obscura bench shows where the
// numbers come from. Challenge: outline an intruder with nothing but shifts, sums and one threshold. Series: a factory
// inspection station compares each part with a reference, under a lamp that has aged.

const scenes = () => [
  [{ zh: '方块', en: 'Square' }, P.square()],
  [{ zh: '圆盘', en: 'Disc' }, P.disk()],
  [{ zh: '字母 T', en: 'Letter T' }, P.glyph(GLYPHS.T)],
  [{ zh: '棋盘', en: 'Checkerboard' }, P.checker()],
  [{ zh: '亮点', en: 'Bright dot' }, P.impulse(7, 7)],
]
const box = (x0, y0, w, h) => (x, y) => x >= x0 && x < x0 + w && y >= y0 && y < y0 + h
const maskOf = (inside) => fromFn(16, 16, (x, y) => (inside(x, y) ? 1 : 0))


const open = {
  id: '0-1',
  chapter: 0,
  title: { zh: '睁眼', en: 'Open your eyes' },
  brief: { zh: '把输入接到输出。', en: 'Connect the input to the output.' },
  hint: { zh: '从「输入」卡片右边的圆点按住，拖到「输出」卡片左边的圆点。', en: 'Press on the dot on the right of the "Input" card and drag it to the dot on the left of the "Output" card.' },
  after: { zh: '你看到的每一张图，都只是一格一格的数字。把鼠标停在任意一格上，看看它是多少。', en: 'Every image you see is just a grid of numbers, cell by cell. Hover over any cell to see its value.' },
  unlocks: [],
  tests: scenes().map(([label, img]) => test(label, { in: img }, { out: img })),
  hidden: [[{ zh: '挪开的字母 X', en: 'Shifted letter X' }, P.glyph(GLYPHS.X, 0.1, 0.9, 6, 5)], [{ zh: '随机纹理', en: 'Random texture' }, P.noise(7)]].map(([label, img]) => test(label, { in: img }, { out: img })),
  solution: build({}, ['in>out']),
}

const unknown = {
  id: '0-2',
  kind: 'probe',
  chapter: 0,
  title: { zh: '未知算子', en: 'Unknown operator' },
  brief: { zh: '这是我们给你的第一个元件。它对图像做了什么？用测试图喂它，然后回答。', en: 'This is the first part we are giving you. What does it do to an image? Feed it test images, then answer.' },
  part: 'mystery',
  question: { zh: '它把图像往哪个方向挪了一格？', en: 'Which way does it move the image by one pixel?' },
  answers: ['→', '←', '↓', '↑'],
  answer: '→',
  wrong: { zh: '换一张测试图，盯住某个亮点看它去了哪里。', en: 'Try another test picture and follow one bright spot to see where it goes.' },
  probes: [
    [{ zh: '亮点', en: 'Bright dot' }, P.impulse(7, 7)],
    [{ zh: '竖条', en: 'Vertical bar' }, fromFn(16, 16, (x) => (x === 4 ? 0.9 : 0.1))],
    [{ zh: '字母 F', en: 'Letter F' }, P.glyph(GLYPHS.F)],
    [{ zh: '方块', en: 'Square' }, P.square(2, 2, 6)],
  ],
  after: { zh: '正确。你得到了「平移」：整张图挪一格，挪出边界的地方补 0。它的方向可以设成上下左右。', en: 'Correct. You now have "Shift": it moves the whole image by one pixel and fills the gap left at the border with 0. Its direction can be set to up, down, left or right.' },
  unlocks: ['shift'],
}

const twoDown = {
  id: '0-3',
  chapter: 0,
  title: { zh: '斜着挪两格', en: 'Two steps diagonally' },
  brief: { zh: '把整张图往右挪两格，再往下挪两格。', en: 'Move the whole image two pixels right and two pixels down.' },
  hint: { zh: '一个平移元件只挪一格。它的输出可以接到另一个元件的输入。', en: 'One shift part moves the image by one pixel. Its output can feed another part\'s input.' },
  after: { zh: '元件可以一个接一个地串起来：前一个的输出就是后一个的输入。几个简单的元件串在一起，能做到单个元件做不到的事，这就是电路。', en: 'Parts can be chained one after another: the output of one is the input of the next. A few simple parts in a row can do what no single part can. That is a circuit.' },
  unlocks: [],
  tests: scenes().slice(0, 4).map(([label, img]) => test(label, { in: img }, { out: shift(img, 2, 2) })),
  hidden: [[{ zh: '挪开的字母 L', en: 'Shifted letter L' }, P.glyph(GLYPHS.L, 0.1, 0.9, 5, 2)], [{ zh: '随机纹理', en: 'Random texture' }, P.noise(5)]].map(([label, img]) => test(label, { in: img }, { out: shift(img, 2, 2) })),
  solution: build({ a: ['shift', { dir: 'right' }], b: ['shift', { dir: 'right' }], c: ['shift', { dir: 'down' }], d: ['shift', { dir: 'down' }] }, ['in>a', 'a>b', 'b>c', 'c>d', 'd>out']),
  naive: build({ a: ['shift', { dir: 'right' }], c: ['shift', { dir: 'down' }] }, ['in>a', 'a>c', 'c>out']),
}

const negative = {
  id: '0-4',
  chapter: 0,
  title: { zh: '底片', en: 'Negative' },
  brief: { zh: '黑变白、白变黑：输出 = 1 − 输入。', en: 'Black becomes white, white becomes black: output = 1 − input.' },
  hint: { zh: '先把所有数乘 −1，再整体加上一个数。', en: 'First multiply every number by −1, then add one number to all of them.' },
  after: { zh: '每个像素各算各的，互不打扰。这叫逐像素运算：它改变亮度，却永远不知道邻居是谁。', en: 'Each pixel is worked out on its own, leaving the others alone. This is a per-pixel operation: it changes brightness, but never knows who its neighbours are.' },
  unlocks: ['invert'],
  adds: ['mul', 'const', 'add'],
  tests: scenes().map(([label, img]) => test(label, { in: img }, { out: map(img, (v) => 1 - v) })),
  hidden: [[{ zh: '斜坡', en: 'Ramp' }, P.rampX()], [{ zh: '随机纹理', en: 'Random texture' }, P.noise(3)]].map(([label, img]) => test(label, { in: img }, { out: map(img, (v) => 1 - v) })),
  solution: build({ k: 'mul', kN: ['const', { c: -1 }], c: 'add', cN: ['const', { c: 1 }] }, ['in>k.a', 'k>c.a', 'c>out', 'kN>k.b', 'cN>c.b']),
  naive: build({ k: 'mul', kN: ['const', { c: -1 }] }, ['in>k.a', 'k>out', 'kN>k.b']),
}

// A washed-out photo: every brightness squeezed into 0.25 … 0.75.
const dull = (img) => map(img, (v) => 0.25 + 0.5 * v)
const stretchScenes = () => [
  [{ zh: '方块', en: 'Square' }, P.square(4, 4, 8, 0, 1)],
  [{ zh: '圆盘', en: 'Disc' }, P.disk(7.5, 7.5, 5, 0, 1)],
  [{ zh: '斜坡', en: 'Ramp' }, P.rampX()],
  [{ zh: '字母 F', en: 'Letter F' }, P.glyph(GLYPHS.F, 0, 1)],
]

const stretch = {
  id: '0-5',
  chapter: 0,
  title: { zh: '拉开对比', en: 'Stretch the contrast' },
  brief: { zh: '这些照片灰蒙蒙的：最暗只有 0.25，最亮只有 0.75。把 0.25 变成 0、0.75 变成 1，中间的按比例拉开。', en: 'These photos are washed out: the darkest is only 0.25 and the brightest only 0.75. Turn 0.25 into 0 and 0.75 into 1, stretching everything in between in proportion.' },
  hint: { zh: '先让最暗的那一格落到 0，再想要乘多少，最亮的才会落到 1。', en: 'First bring the darkest cell down to 0, then work out what to multiply by so the brightest lands on 1.' },
  after: { zh: '先挪、再放大，就把 [0.25, 0.75] 拉满了 [0, 1]。修图软件的「色阶」「对比度」做的就是这件事。顺序要紧：先放大再挪，挪的量就得跟着变。', en: 'Shift first, then scale, and [0.25, 0.75] fills all of [0, 1]. The "levels" and "contrast" tools in photo editors do exactly this. The order matters: scale first, and the amount you shift by has to change with it.' },
  unlocks: [],
  tests: stretchScenes().map(([label, img]) => test(label, { in: dull(img) }, { out: img })),
  hidden: [[{ zh: '棋盘', en: 'Checkerboard' }, P.checker(4, 0, 1)], [{ zh: '随机纹理', en: 'Random texture' }, P.noise(9)]].map(([label, img]) => test(label, { in: dull(img) }, { out: img })),
  solution: build({ c: 'add', cN: ['const', { c: -0.25 }], k: 'mul', kN: ['const', { c: 2 }] }, ['in>c.a', 'c>k.a', 'k>out', 'cN>c.b', 'kN>k.b']),
  naive: build({ k: 'mul', kN: ['const', { c: 2 }], c: 'add', cN: ['const', { c: -0.25 }] }, ['in>k.a', 'k>c.a', 'c>out', 'kN>k.b', 'cN>c.b']),
}

const gate = {
  id: '0-6',
  kind: 'probe',
  chapter: 0,
  title: { zh: '门槛', en: 'The gate' },
  brief: { zh: '又一个黑箱。它只会输出 0 和 1。用测试图喂它，找出它在多亮的地方从 0 变成 1。', en: 'Another black box. It only ever outputs 0 or 1. Feed it test images and find how bright a cell must be before it turns from 0 to 1.' },
  part: 'mysteryGate',
  question: { zh: '亮度要超过多少，它才输出 1？', en: 'How bright must a cell be before it outputs 1?' },
  answers: ['0.2', '0.4', '0.6', '0.8'],
  answer: '0.6',
  wrong: { zh: '用斜坡试：点一下从 0 变 1 的那两格，读出它们原来的亮度。', en: 'Try the ramp: tap the two cells where 0 turns into 1 and read their original brightness.' },
  probes: [
    [{ zh: '横向斜坡', en: 'Horizontal ramp' }, fromFn(16, 16, (x) => x / 15)],
    [{ zh: '纵向斜坡', en: 'Vertical ramp' }, fromFn(16, 16, (x, y) => y / 15)],
    [{ zh: '圆盘', en: 'Disc' }, P.disk(7.5, 7.5, 5, 0.3, 0.7)],
    [{ zh: '随机纹理', en: 'Random texture' }, P.noise(4)],
  ],
  after: { zh: '正确。你得到了「阈值」：大于门槛 t 的格子变 1，其余变 0，t 由你来定。只有 0 和 1 的图叫掩膜，用来标出图里的某块区域。', en: 'Correct. You now have "Threshold": cells above the threshold t become 1 and the rest 0, and you choose t. An image of only 0s and 1s is called a mask; it marks out a region of the picture.' },
  unlocks: ['threshold'],
}

// ---------------- 0-7 谁闯进来了 ----------------

const intruder = (() => {
  const background = (seed) => fromFn(16, 16, (x, y) => 0.15 + 0.5 * (x / 15) * (seed % 2 ? 1 : y / 15))
  const object = (bg, x0, y0) => fromFn(16, 16, (x, y) => bg.data[y * 16 + x] + (box(x0, y0, 4, 4)(x, y) ? 0.3 : 0))
  const cases = [[2, 3, 1], [9, 9, 2], [10, 2, 3], [3, 10, 4]]
  const hiddenCases = [[{ zh: '左下角', en: 'Bottom-left corner' }, 0, 12, 5], [{ zh: '右边亮处', en: 'Bright right side' }, 12, 6, 6], [{ zh: '正中', en: 'Dead centre' }, 6, 6, 7]]
  const make = (label, x0, y0, seed) => {
    const bg = background(seed)
    return test(label, { scene: object(bg, x0, y0), empty: bg }, { out: maskOf(box(x0, y0, 4, 4)) })
  }
  return {
    id: '0-7',
    chapter: 0,
    title: { zh: '谁闯进来了', en: 'Who came in?' },
    inputs: ['scene', 'empty'],
    brief: { zh: '「现场」比「空场」多了一个东西。只在它所在的格子输出 1，其余输出 0。', en: 'The "Scene" has one thing more than the "Empty scene". Output 1 only in the cells it covers, and 0 everywhere else.' },
    hint: { zh: '光照不均时，单看亮不亮会误判。先比一比两张图哪里不一样。', en: 'With uneven lighting, judging by brightness alone goes wrong. First compare where the two images differ.' },
    after: { zh: '和参照比差异，比看绝对亮度可靠得多。这就是背景减除。', en: 'Comparing against a reference is far more reliable than looking at absolute brightness. This is background subtraction.' },
    unlocks: [],
    adds: ['sub'],
    tests: cases.map(([x0, y0, seed], index) => make({ zh: `第 ${index + 1} 组`, en: `Set ${index + 1}` }, x0, y0, seed)),
    hidden: hiddenCases.map(([label, x0, y0, seed]) => make(label, x0, y0, seed)),
    solution: build({ d: 'sub', t: ['threshold', { t: 0.15 }] }, ['scene>d.a', 'empty>d.b', 'd>t', 't>out'], { inputs: ['scene', 'empty'] }),
    naive: build({ t: ['threshold', { t: 0.6 }] }, ['scene>t', 't>out'], { inputs: ['scene', 'empty'] }),
  }
})()

// ---------------- 0-9 描边 (challenge) ----------------

// Intruders of any shape on a plain floor; the answer is the ring of intruder cells that touch the floor (above,
// below, left or right). Nothing new: shifts, sums and thresholds.
const outline = (() => {
  const floor = (seed) => fromFn(16, 16, (x, y) => 0.2 + 0.25 * ((x + 2 * y + seed) % 5) / 4)
  const cases = [
    [{ zh: '方块', en: 'Square' }, box(4, 4, 7, 6), 1],
    [{ zh: '长条', en: 'Bar' }, box(2, 6, 12, 3), 2],
    [{ zh: '十字', en: 'Cross' }, (x, y) => box(6, 2, 3, 12)(x, y) || box(2, 6, 12, 3)(x, y), 3],
    [{ zh: '两块', en: 'Two blocks' }, (x, y) => box(1, 1, 5, 5)(x, y) || box(9, 8, 5, 6)(x, y), 4],
  ]
  const hiddenCases = [
    [{ zh: '贴着上边', en: 'Against the top edge' }, box(5, 0, 6, 5), 5],
    [{ zh: '字母 L', en: 'Letter L' }, (x, y) => box(3, 3, 3, 10)(x, y) || box(3, 10, 9, 3)(x, y), 6],
  ]
  // The intruder is 0.4 brighter than the floor; outside the picture counts as floor.
  const make = (label, inside, seed) => {
    const bg = floor(seed)
    const scene = fromFn(16, 16, (x, y) => bg.data[y * 16 + x] + (inside(x, y) ? 0.4 : 0))
    const isIn = (x, y) => x >= 0 && y >= 0 && x < 16 && y < 16 && inside(x, y)
    const ring = maskOf((x, y) => isIn(x, y) && !(isIn(x - 1, y) && isIn(x + 1, y) && isIn(x, y - 1) && isIn(x, y + 1)))
    return test(label, { scene, empty: bg }, { out: ring })
  }
  const g = (nodes, wires) => build(nodes, wires, { inputs: ['scene', 'empty'] })
  return {
    id: '0-9',
    chapter: 0,
    title: { zh: '描边', en: 'Outline' },
    inputs: ['scene', 'empty'],
    brief: { zh: '只描出闯入者的外圈：闯入者身上、上下左右至少挨着一格地面的那些格子输出 1，其余输出 0。图外算地面。', en: 'Trace only the intruder\'s outer ring: output 1 on intruder cells that touch at least one floor cell above, below, left or right, and 0 everywhere else. Outside the picture counts as floor.' },
    hint: { zh: '先得到闯入者的掩膜。外圈的格子和里面的格子，邻居有什么不同？', en: 'Get the intruder\'s mask first. How do the neighbours of a cell on the ring differ from those of a cell further in?' },
    after: { zh: '把掩膜往四个方向各挪一格加起来，再加上自己，只有四面都被围住的格子能数到 5。用一个阈值留下这些「内部」，再从掩膜里减掉，剩下的就是外圈。数邻居再取阈值，后来有个名字叫腐蚀。', en: 'Shift the mask one pixel in each of the four directions, add them up and add the cell itself: only a cell surrounded on all four sides counts to 5. A threshold keeps this "inside", and taking it away from the mask leaves the outer ring. Counting neighbours and then thresholding has a name: erosion.' },
    unlocks: [],
    tests: cases.map(([label, inside, seed]) => make(label, inside, seed)),
    hidden: hiddenCases.map(([label, inside, seed]) => make(label, inside, seed)),
    solution: g(
      { d: 'sub', m: ['threshold', { t: 0.2 }], l: ['shift', { dir: 'left' }], r: ['shift', { dir: 'right' }], u: ['shift', { dir: 'up' }], w: ['shift', { dir: 'down' }], a1: 'add', a2: 'add', a3: 'add', a4: 'add', avg: 'mul', avgN: ['const', { c: 0.2 }], core: ['threshold', { t: 0.9 }], ring: 'sub' },
      ['scene>d.a', 'empty>d.b', 'd>m', 'm>l', 'm>r', 'm>u', 'm>w', 'l>a1.a', 'r>a1.b', 'u>a2.a', 'w>a2.b', 'a1>a3.a', 'a2>a3.b', 'a3>a4.a', 'm>a4.b', 'a4>avg.a', 'avg>core', 'm>ring.a', 'core>ring.b', 'ring>out', 'avgN>avg.b'],
    ),
    naive: g({ d: 'sub', m: ['threshold', { t: 0.2 }] }, ['scene>d.a', 'empty>d.b', 'd>m', 'm>out']),
  }
})()

// ---------------- 0-10 … 0-12 质检台 (series) ----------------

// A reference part and the part on the belt, both under the station's lamp. Defects are dents (darker) or shiny
// scratches (brighter). The lamp in 0-11 and the finale has aged to 80%.
const PARTS = {
  plate: (x, y) => (box(2, 2, 12, 12)(x, y) ? 0.85 : 0.3),
  ring: (x, y) => ((x - 7.5) ** 2 + (y - 7.5) ** 2 <= 36 && (x - 7.5) ** 2 + (y - 7.5) ** 2 >= 6 ? 0.95 : 0.3),
  bracket: (x, y) => (box(2, 2, 4, 12)(x, y) || box(2, 10, 12, 4)(x, y) ? 0.95 : 0.3),
  gear: (x, y) => (box(3, 3, 10, 10)(x, y) || ((x === 1 || x === 14) && y % 4 < 2) || ((y === 1 || y === 14) && x % 4 < 2) ? 0.8 : 0.3),
  tile: (x, y) => ((Math.floor(x / 4) + Math.floor(y / 4)) % 2 ? 0.95 : 0.3),
}
const DEFECT = 0.15
const station = ({ part, dents = [], scratches = [], lamp = 1 }) => {
  const ref = fromFn(16, 16, PARTS[part])
  const hit = (list) => (x, y) => list.some(([x0, y0, w, h]) => box(x0, y0, w, h)(x, y))
  const dent = hit(dents)
  const scratch = hit(scratches)
  const actual = fromFn(16, 16, (x, y) => lamp * (PARTS[part](x, y) - (dent(x, y) ? DEFECT : 0) + (scratch(x, y) ? DEFECT : 0)))
  return { inputs: { ref, part: actual }, mask: maskOf((x, y) => dent(x, y) || scratch(x, y)) }
}
const stationTest = (label, spec) => {
  const { inputs, mask } = station(spec)
  return test(label, inputs, { out: mask })
}
const STATION_INPUTS = { inputs: ['ref', 'part'], inputLabels: { ref: { zh: '标准件', en: 'Reference' }, part: { zh: '实物', en: 'Part' } } }
const sg = (nodes, wires) => build(nodes, wires, { inputs: ['ref', 'part'] })
const darker = (t) => sg({ d: 'sub', m: ['threshold', { t }] }, ['ref>d.a', 'part>d.b', 'd>m', 'm>out'])
const relit = sg({ k: 'mul', kN: ['const', { c: 1.25 }], d: 'sub', m: ['threshold', { t: 0.07 }] }, ['part>k.a', 'ref>d.a', 'k>d.b', 'd>m', 'm>out', 'kN>k.b'])

const spot = {
  id: '0-10',
  chapter: 0,
  ...STATION_INPUTS,
  title: { zh: '找不同', en: 'Spot the difference' },
  brief: { zh: '质检台上，「标准件」是合格零件的照片，「实物」是传送带上这一件。实物上的凹坑比标准件暗。凹坑处输出 1，其余输出 0。', en: 'At the inspection station, the "Reference" is a photo of a good part and the "Part" is the one on the belt. Dents on the part are darker than the reference. Output 1 on the dents and 0 everywhere else.' },
  hint: { zh: '零件本身有亮有暗，单看实物分不出哪里是凹坑。', en: 'The part itself has light and dark areas, so the part alone cannot tell you where the dents are.' },
  after: { zh: '和标准件逐格比，零件本来的明暗就抵消了，只剩下缺陷。', en: 'Compared cell by cell with the reference, the part\'s own light and dark cancel out and only the defects are left.' },
  unlocks: [],
  tests: [
    [{ zh: '平板', en: 'Plate' }, { part: 'plate', dents: [[5, 5, 2, 2], [10, 9, 2, 3]] }],
    [{ zh: '圆环', en: 'Ring' }, { part: 'ring', dents: [[3, 6, 2, 2]] }],
    [{ zh: '支架', en: 'Bracket' }, { part: 'bracket', dents: [[3, 4, 2, 2], [11, 11, 2, 2]] }],
  ].map(([label, spec]) => stationTest(label, spec)),
  hidden: [
    [{ zh: '齿轮', en: 'Gear' }, { part: 'gear', dents: [[6, 6, 3, 2]] }],
    [{ zh: '格板', en: 'Tiles' }, { part: 'tile', dents: [[1, 1, 2, 2], [13, 9, 2, 2]] }],
    [{ zh: '合格的平板', en: 'A good plate' }, { part: 'plate' }],
  ].map(([label, spec]) => stationTest(label, spec)),
  solution: darker(0.07),
  naive: sg({ i: 'invert', m: ['threshold', { t: 0.55 }] }, ['part>i', 'i>m', 'm>out']),
}

const aged = {
  id: '0-11',
  chapter: 0,
  ...STATION_INPUTS,
  title: { zh: '灯老了', en: 'An ageing lamp' },
  brief: { zh: '质检台的灯老了，只剩原来亮度的 80%：现在拍的实物整体偏暗，标准件还是以前拍的。只标出凹坑，不能因为灯暗了就到处报警。', en: 'The station\'s lamp has aged to 80% of its old brightness: the part photographed now is darker all over, while the reference was taken before. Mark only the dents; the dimmer lamp must not set off alarms everywhere.' },
  hint: { zh: '灯暗了 20%，亮的地方和暗的地方，各暗了多少？只调门槛够不够？', en: 'With the lamp 20% dimmer, how much do bright areas lose, and how much dark ones? Is adjusting the threshold enough?' },
  after: { zh: '灯光是乘上去的：亮度 = 灯 × 表面。乘回 1 ÷ 0.8 = 1.25，就回到了拍标准件时的灯光，再比较才公平。只调门槛不行：亮处因为灯暗掉的，比暗处凹坑掉的还多。', en: 'Light multiplies: brightness = lamp × surface. Multiplying back by 1 ÷ 0.8 = 1.25 restores the lighting the reference was taken under, and only then is the comparison fair. Adjusting the threshold alone fails: bright areas lose more to the dim lamp than dark areas lose to a dent.' },
  unlocks: [],
  tests: [
    [{ zh: '平板', en: 'Plate' }, { part: 'plate', dents: [[5, 5, 2, 2], [0, 12, 2, 2]], lamp: 0.8 }],
    [{ zh: '圆环', en: 'Ring' }, { part: 'ring', dents: [[7, 0, 2, 2]], lamp: 0.8 }],
    [{ zh: '格板', en: 'Tiles' }, { part: 'tile', dents: [[1, 5, 2, 2], [9, 9, 2, 2]], lamp: 0.8 }],
  ].map(([label, spec]) => stationTest(label, spec)),
  hidden: [
    [{ zh: '支架', en: 'Bracket' }, { part: 'bracket', dents: [[2, 3, 3, 2], [8, 6, 2, 2]], lamp: 0.8 }],
    [{ zh: '合格的格板', en: 'A good tile board' }, { part: 'tile', lamp: 0.8 }],
  ].map(([label, spec]) => stationTest(label, spec)),
  solution: relit,
  naive: darker(0.17),
  alsoFails: [darker(0.12), darker(0.07)],
}

const inspector = {
  id: '0-12',
  chapter: 0,
  ...STATION_INPUTS,
  title: { zh: '质检台', en: 'Inspection station' },
  brief: { zh: '正式上线：灯只剩 80%，零件上既有凹坑（偏暗），也有反光的划痕（偏亮）。两种缺陷都标 1，其余标 0。', en: 'Going live: the lamp is at 80%, and parts have both dents (darker) and shiny scratches (brighter). Mark both kinds of defect with 1 and everything else with 0.' },
  hint: { zh: '一个阈值只能看一边。两种缺陷的差值，一正一负。', en: 'A threshold only looks one way. The two kinds of defect differ in opposite directions.' },
  after: { zh: '质检台做的三件事：先把灯光补回来，再和标准件逐格相减，最后两边各取一次阈值、合在一起。工厂里的视觉检测，第一版常常就是这样：参照、对齐、比较。', en: 'The station does three things: restore the lighting, subtract the reference cell by cell, then threshold each side and combine. Machine-vision inspection in factories often starts out exactly like this: a reference, alignment, a comparison.' },
  unlocks: [],
  tests: [
    [{ zh: '平板', en: 'Plate' }, { part: 'plate', dents: [[4, 4, 2, 2]], scratches: [[9, 10, 4, 1]], lamp: 0.8 }],
    [{ zh: '圆环', en: 'Ring' }, { part: 'ring', scratches: [[2, 7, 1, 3]], dents: [[11, 11, 2, 2]], lamp: 0.8 }],
    [{ zh: '支架', en: 'Bracket' }, { part: 'bracket', scratches: [[3, 5, 1, 4], [8, 12, 4, 1]], lamp: 0.8 }],
    [{ zh: '齿轮', en: 'Gear' }, { part: 'gear', dents: [[5, 5, 2, 2]], scratches: [[0, 6, 2, 1]], lamp: 0.8 }],
  ].map(([label, spec]) => stationTest(label, spec)),
  hidden: [
    [{ zh: '格板', en: 'Tiles' }, { part: 'tile', dents: [[2, 2, 2, 2]], scratches: [[12, 5, 1, 3], [6, 13, 3, 1]], lamp: 0.8 }],
    [{ zh: '只有划痕', en: 'Scratches only' }, { part: 'plate', scratches: [[6, 1, 1, 4], [0, 9, 3, 1]], lamp: 0.8 }],
    [{ zh: '合格的圆环', en: 'A good ring' }, { part: 'ring', lamp: 0.8 }],
  ].map(([label, spec]) => stationTest(label, spec)),
  solution: sg(
    { k: 'mul', kN: ['const', { c: 1.25 }], dn: 'sub', up: 'sub', md: ['threshold', { t: 0.07 }], mu: ['threshold', { t: 0.07 }], a: 'add' },
    ['part>k.a', 'ref>dn.a', 'k>dn.b', 'k>up.a', 'ref>up.b', 'dn>md', 'up>mu', 'md>a.a', 'mu>a.b', 'a>out', 'kN>k.b'],
  ),
  naive: relit,
}

export const levels = [open, unknown, twoDown, negative, stretch, gate, intruder, outline, spot, aged, inspector]
