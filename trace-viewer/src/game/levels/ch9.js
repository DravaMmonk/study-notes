// 第 9 章 · 每个像素是什么 (lectures 19–20). Making pictures bigger again (zero insertion plus a kernel: a transposed
// convolution), putting pooled values back where they came from, and a step of k-means packed into a part. The series
// segments cells under a microscope: a coarse path that ignores noise, a skip path that keeps thin borders.
import { correlate, fromFn, image, maxPool, random } from '../engine/image.js'
import { NODE_TYPES } from '../engine/nodes.js'
import { ownPart } from '../engine/own.js'
import { build, test } from './util.js'

const zeroUp = (a) => fromFn(a.w * 2, a.h * 2, (x, y) => (x % 2 || y % 2 ? 0 : a.data[(y / 2) * a.w + x / 2]))
const NEAREST = [1, 1, 0, 1, 1, 0, 0, 0, 0]
const BILINEAR = [0.25, 0.5, 0.25, 0.5, 1, 0.5, 0.25, 0.5, 0.25]

export const nodes = {
  tconv: {
    label: { zh: '转置卷积（步幅 2）', en: 'Transposed convolution (stride 2)' },
    description: { zh: '补零放大一倍，再用 3×3 的核走一遍：你在「放大一倍」里搭的', en: 'Zero-upsamples to twice the size, then runs a 3×3 kernel over it: what you built in "Twice the size"' },
    inputs: ['in'],
    params: [{ key: 'w', label: { zh: '权重', en: 'Weights' }, kind: 'kernel', default: NEAREST }],
    eval: ({ in: a }, p) => correlate(zeroUp(a), p.w ?? NEAREST),
    cost: 9,
    unlock: 'tconv',
  },
}
Object.assign(NODE_TYPES, nodes)

// ---------------- 9-1 放大一倍 · 9-2 双线性放大 ----------------

const smallPictures = [
  [{ zh: '方块', en: 'Square' }, fromFn(8, 8, (x, y) => (x >= 2 && x < 6 && y >= 2 && y < 6 ? 0.9 : 0.1))],
  [{ zh: '对角', en: 'Diagonal' }, fromFn(8, 8, (x, y) => (x === y ? 0.9 : 0.1))],
  [{ zh: '斜坡', en: 'Ramp' }, fromFn(8, 8, (x) => x / 7)],
]
const smallHidden = [[{ zh: '一个亮点', en: 'One bright dot' }, fromFn(8, 8, (x, y) => (x === 3 && y === 5 ? 1 : 0))]]
const upTests = (cases, kernel) => cases.map(([label, img]) => test(label, { in: img }, { out: correlate(zeroUp(img), kernel) }))

const twice = {
  id: '9-1',
  chapter: 9,
  title: { zh: '放大一倍', en: 'Twice the size' },
  brief: { zh: '把 8×8 的图放大成 16×16：每个像素变成 2×2 的一小块，四格都一样。', en: 'Enlarge an 8×8 picture to 16×16: every pixel becomes a 2×2 block, all four cells the same.' },
  hint: { zh: '「补零放大」把每个像素放在 2×2 的左上角。剩下三格从哪里取数？', en: '"Zero upsample" puts each pixel in the top left of its 2×2. Where do the other three cells get their number?' },
  after: { zh: '先补零放大、再用一个核走一遍，就是步幅为 2 的转置卷积：核决定空出来的格子从哪些邻居、按什么比例取数。分割网络的解码器靠它把小特征图一层层放大回原图大小。它现在是现成的元件「转置卷积」，核可以换。', en: 'Zero-upsample first, then run a kernel over it: that is a transposed convolution with stride 2, and the kernel decides which neighbours, in what proportion, fill the empty cells. The decoder of a segmentation network uses it to enlarge small feature maps layer by layer back to the size of the picture. It is now a ready-made part, "Transposed convolution", with a kernel you can change.' },
  unlocks: ['tconv'],
  palette: ['zeroUp', 'kernel3', 'shift', 'arith', 'merge', 'const'],
  tests: upTests(smallPictures, NEAREST),
  hidden: upTests(smallHidden, NEAREST),
  solution: build({ z: 'zeroUp', k: ['kernel3', { w: NEAREST }] }, ['in>z', 'z>k', 'k>out']),
  naive: build({ z: 'zeroUp' }, ['in>z', 'z>out']),
}

const smooth = {
  id: '9-2',
  chapter: 9,
  title: { zh: '双线性放大', en: 'Bilinear enlargement' },
  brief: { zh: '还是放大一倍，这次要平滑：原来的像素原样留下，空出来的格子取左右（或上下）两个原像素的平均，角上的格子取四个的平均。', en: 'Twice the size again, this time smoothly: the original pixels stay as they are, an empty cell takes the average of the two original pixels on either side (or above and below), and a corner cell the average of four.' },
  hint: { zh: '一个原像素要分给周围哪些格子、各分多少？', en: 'Which surrounding cells does one original pixel go to, and how much to each?' },
  after: { zh: '换一个核，同一个转置卷积就从「一格复制四格」变成了平滑放大。在网络里，这个核是学出来的：解码器自己学会怎样放大才最有用。', en: 'Change the kernel and the same transposed convolution goes from "copy one cell to four" to smooth enlargement. In a network this kernel is learnt: the decoder learns for itself how best to enlarge.' },
  unlocks: [],
  palette: ['tconv', 'zeroUp', 'kernel3', 'arith', 'merge', 'const'],
  tests: upTests(smallPictures, BILINEAR),
  hidden: upTests(smallHidden, BILINEAR),
  solution: build({ t: ['tconv', { w: BILINEAR }] }, ['in>t', 't>out']),
  naive: build({ t: 'tconv' }, ['in>t', 't>out']),
}

// ---------------- 9-3 放回原处 · 9-4 池化再还原 ----------------
// Max unpooling: each pooled value goes back to the cell it came from, the rest of its 2×2 block is 0.

function blocky(seed) {
  const next = random(seed)
  const img = image(16, 16)
  for (let by = 0; by < 8; by++) {
    for (let bx = 0; bx < 8; bx++) {
      const win = Math.floor(next() * 4)
      for (let k = 0; k < 4; k++) img.data[(2 * by + (k >> 1)) * 16 + 2 * bx + (k & 1)] = k === win ? 0.7 + 0.25 * next() : 0.1 + 0.5 * next()
    }
  }
  return img
}
const unpooled = (big) => {
  const small = maxPool(big, 2)
  return fromFn(16, 16, (x, y) => (big.data[y * 16 + x] === small.data[(y >> 1) * 8 + (x >> 1)] ? big.data[y * 16 + x] : 0))
}
const unpoolGraph = () =>
  build({ u: 'tconv', d: ['arith', { op: 'sub' }], e: ['threshold', { t: -0.025 }], m: ['arith', { op: 'mul' }] }, ['small>u', 'big>d.a', 'u>d.b', 'd>e', 'u>m.a', 'e>m.b', 'm>out'], { inputs: ['small', 'big'] })
const putBack = {
  id: '9-3',
  chapter: 9,
  title: { zh: '放回原处', en: 'Back where it came from' },
  inputs: ['small', 'big'],
  inputLabels: { small: { zh: '池化后的 8×8', en: 'Pooled 8×8' }, big: { zh: '池化前的 16×16', en: 'The 16×16 before pooling' } },
  brief: { zh: '每个 2×2 块的最大值被池化成了一格。把它放回块里原来那一格，块里其余三格是 0。', en: 'Each 2×2 block\'s largest value was pooled into one cell. Put it back in the cell of the block it came from, with the other three cells of the block 0.' },
  hint: { zh: '先把小图放大到块那么大；块里哪一格和放大后的值一样大？', en: 'First enlarge the small picture to block size; which cell of the block equals the enlarged value?' },
  after: { zh: '这叫最大反池化：编码器池化时记下最大值在哪，解码器放大时放回原处，细节就不会被抹到整块上。SegNet 就是这么做的。你的电路现在是元件「反池化」。', en: 'This is max unpooling: the encoder remembers where each maximum was when pooling, and the decoder puts it back there when enlarging, so details are not smeared over the whole block. SegNet works like this. Your circuit is now the part "Unpool".' },
  packs: { name: { zh: '反池化', en: 'Unpool' }, desc: { zh: '你在「放回原处」里搭的：把池化后的值放回池化前它所在的那一格', en: 'What you built in "Back where it came from": puts each pooled value back in the cell it came from' } },
  unlocks: [],
  palette: ['tconv', 'arith', 'merge', 'const', 'threshold', 'max'],
  tests: [41, 42, 43].map((seed, i) => test({ zh: `第 ${i + 1} 组`, en: `Set ${i + 1}` }, { small: maxPool(blocky(seed), 2), big: blocky(seed) }, { out: unpooled(blocky(seed)) })),
  hidden: [44].map((seed) => test({ zh: '第 4 组', en: 'Set 4' }, { small: maxPool(blocky(seed), 2), big: blocky(seed) }, { out: unpooled(blocky(seed)) })),
  solution: unpoolGraph(),
  naive: build({ u: 'tconv' }, ['small>u', 'u>out'], { inputs: ['small', 'big'] }),
}
Object.assign(NODE_TYPES, { 'own-9-3': ownPart(putBack) })

const dots = (list) => fromFn(16, 16, (x, y) => list.find(([px, py]) => px === x && py === y)?.[2] ?? 0)
const DOTS = [
  [{ zh: '三个点', en: 'Three dots' }, [[3, 2, 0.9], [10, 7, 0.6], [6, 13, 0.8]]],
  [{ zh: '挨着的点', en: 'Dots side by side' }, [[4, 4, 0.9], [7, 5, 0.7], [12, 12, 0.5]]],
  [{ zh: '贴边的点', en: 'Dots at the edge' }, [[0, 9, 0.8], [15, 0, 0.9], [9, 15, 0.6]]],
]
const roundTrip = {
  id: '9-4',
  chapter: 9,
  title: { zh: '池化再还原', en: 'Pool and back again' },
  brief: { zh: '一张稀疏的亮点图先做 2×2 最大池化，再放大回 16×16，每个亮点要回到原来的位置。', en: 'A picture of sparse bright dots goes through 2×2 max pooling, then back up to 16×16, and every dot must return to where it was.' },
  hint: { zh: '一放大，每个点就糊成一整块。', en: 'Enlarge it and every dot smears into a whole block.' },
  after: { zh: '池化把位置丢掉了一部分，反池化把它找回来：亮点在 2×2 块里的哪一格，信息还在池化前的图里。', en: 'Pooling throws part of the position away, and unpooling gets it back: which cell of the 2×2 block the dot was in is still in the picture before pooling.' },
  unlocks: [],
  palette: ['own-9-3', 'maxpool', 'tconv', 'arith', 'merge', 'const'],
  tests: DOTS.map(([label, list]) => test(label, { in: dots(list) }, { out: dots(list) })),
  hidden: [[{ zh: '四个点', en: 'Four dots' }, [[1, 1, 0.7], [5, 8, 0.9], [13, 3, 0.6], [11, 14, 0.8]]]].map(([label, list]) => test(label, { in: dots(list) }, { out: dots(list) })),
  solution: build({ p: 'maxpool', u: 'own-9-3' }, ['in>p', 'p>u.small', 'in>u.big', 'u>out']),
  naive: build({ p: 'maxpool', u: 'tconv' }, ['in>p', 'p>u', 'u>out']),
}

// ---------------- 9-5 分成几类 · 9-6 颜色分割 ----------------
// Two-means on brightness, kept as the boundary m between the two centres: pixels above m are one class; the new
// centres are the two classes' averages, and the new boundary is halfway between them.

function twoTone(seed, dark, bright, share) {
  const next = random(seed)
  return fromFn(16, 16, (x, y) => (next() < share(x, y) ? bright + 0.1 * (next() - 0.5) : dark + 0.1 * (next() - 0.5)))
}
const kmeansStep = (img, m) => {
  let hi = 0
  let nh = 0
  let lo = 0
  let nl = 0
  for (const v of img.data) {
    if (v > m) {
      hi += v
      nh++
    } else {
      lo += v
      nl++
    }
  }
  return (hi / nh + lo / nl) / 2
}
const PICTURES = [
  twoTone(51, 0.25, 0.75, (x, y) => ((x - 5) ** 2 + (y - 6) ** 2 < 16 ? 1 : 0)),
  twoTone(52, 0.2, 0.6, (x) => (x > 10 ? 1 : 0)),
  twoTone(53, 0.4, 0.9, (x, y) => ((x + y) % 7 < 3 ? 1 : 0)),
]
const stepGraph = () =>
  build(
    {
      d: ['arith', { op: 'sub' }], L: ['threshold', { t: 0 }], N: 'invert',
      hn: ['arith', { op: 'mul' }], hm: 'fqMean', hd: 'fqMean', hi: ['arith', { op: 'div' }],
      ln: ['arith', { op: 'mul' }], lm: 'fqMean', ld: 'fqMean', lo: ['arith', { op: 'div' }],
      s: ['arith', { op: 'add' }], k: ['const', { c: 0.5 }], m2: ['arith', { op: 'mul' }],
    },
    ['img>d.a', 'm>d.b', 'd>L', 'L>N', 'img>hn.a', 'L>hn.b', 'hn>hm', 'L>hd', 'hm>hi.a', 'hd>hi.b', 'img>ln.a', 'N>ln.b', 'ln>lm', 'N>ld', 'lm>lo.a', 'ld>lo.b', 'hi>s.a', 'lo>s.b', 's>m2.a', 'k>m2.b', 'm2>out'],
    { inputs: ['img', 'm'] },
  )
const KM_LABELS = { img: { zh: '图', en: 'Picture' }, m: { zh: '现在的分界 m', en: 'Boundary m now' } }
const stepTests = (cases) => cases.map(([label, img, m]) => test(label, { img, m: image(1, 1, m) }, { out: image(1, 1, kmeansStep(img, m)) }))
const oneStep = {
  id: '9-5',
  chapter: 9,
  title: { zh: '分成几类', en: 'Into classes' },
  inputs: ['img', 'm'],
  inputLabels: KM_LABELS,
  brief: { zh: '把像素按亮度分成两类：亮于分界 m 的一类，其余一类。算出两类各自的平均亮度，输出它们正中间的新分界。', en: 'Split the pixels into two classes by brightness: those brighter than the boundary m, and the rest. Work out each class\'s average brightness and output the new boundary halfway between them.' },
  hint: { zh: '一类的平均 = 这一类像素的亮度之和 ÷ 这一类的像素数。「求平均」除以的是全部像素数，两个平均相除就约掉了。', en: 'A class\'s average = the sum of its pixels\' brightness ÷ the number of its pixels. "Average" divides by the number of all the pixels, which cancels when one average is divided by another.' },
  after: { zh: '分两类、各求中心、再分：这是 k 均值的一步。重复几步，分界就停在两堆像素之间。你的电路现在是元件「k 均值一步」。', en: 'Split into two, find each centre, split again: that is one step of k-means. Repeat a few steps and the boundary settles between the two heaps of pixels. Your circuit is now the part "One k-means step".' },
  packs: { name: { zh: 'k 均值一步', en: 'One k-means step' }, desc: { zh: '你在「分成几类」里搭的：按分界 m 分两类，输出两类平均的正中间', en: 'What you built in "Into classes": splits by the boundary m and outputs halfway between the two class averages' } },
  unlocks: [],
  palette: ['arith', 'merge', 'const', 'threshold', 'invert', 'fqMean'],
  check: { tolerance: 0.005 },
  tests: stepTests([[{ zh: '圆斑', en: 'A round patch' }, PICTURES[0], 0.4], [{ zh: '右边一条', en: 'A strip on the right' }, PICTURES[1], 0.3], [{ zh: '斜纹', en: 'Slanted stripes' }, PICTURES[2], 0.7]]),
  hidden: stepTests([[{ zh: '圆斑，从低处分', en: 'Round patch, split low' }, PICTURES[0], 0.28]]),
  solution: stepGraph(),
  naive: build({ k: ['const', { c: 0.5 }], s: 'fqMean', a: ['arith', { op: 'add' }], h: ['arith', { op: 'mul' }] }, ['img>s', 's>a.a', 'm>a.b', 'a>h.a', 'k>h.b', 'h>out'], { inputs: ['img', 'm'] }),
}
Object.assign(NODE_TYPES, { 'own-9-5': ownPart(oneStep) })

const segment = (img, m0, steps = 3) => {
  let m = m0
  for (let i = 0; i < steps; i++) m = kmeansStep(img, m)
  return fromFn(16, 16, (x, y) => (img.data[y * 16 + x] > m ? 1 : 0))
}
const segTests = (cases) => cases.map(([label, img, m0]) => test(label, { img, m: image(1, 1, m0) }, { out: segment(img, m0) }))
const colourSeg = {
  id: '9-6',
  chapter: 9,
  title: { zh: '颜色分割', en: 'Segmenting by brightness' },
  inputs: ['img', 'm'],
  inputLabels: { img: KM_LABELS.img, m: { zh: '起始的分界', en: 'Starting boundary' } },
  brief: { zh: '从给定的起始分界出发做三步 k 均值，再按最后的分界把每个像素分成两类：亮的一类输出 1。', en: 'Starting from the given boundary, take three k-means steps, then split every pixel into two classes by the final boundary: output 1 for the bright class.' },
  hint: { zh: '起始的分界可能离得很远。', en: 'The starting boundary may be a long way off.' },
  after: { zh: '不用告诉它什么是前景，k 均值自己把像素分成两堆。可它只看亮度：亮度一样的两样东西，它分不开。', en: 'Without being told what the foreground is, k-means splits the pixels into two heaps by itself. But it looks only at brightness: two things of the same brightness, it cannot tell apart.' },
  unlocks: [],
  palette: ['own-9-5', 'arith', 'merge', 'const', 'threshold'],
  tests: segTests([[{ zh: '圆斑', en: 'A round patch' }, PICTURES[0], 0.28], [{ zh: '右边一条', en: 'A strip on the right' }, PICTURES[1], 0.55], [{ zh: '斜纹', en: 'Slanted stripes' }, PICTURES[2], 0.45]]),
  hidden: segTests([[{ zh: '暗一些的圆斑', en: 'A darker round patch' }, twoTone(54, 0.15, 0.5, (x, y) => ((x - 10) ** 2 + (y - 9) ** 2 < 20 ? 1 : 0)), 0.2]]),
  solution: build({ a: 'own-9-5', b: 'own-9-5', c: 'own-9-5', d: ['arith', { op: 'sub' }], t: ['threshold', { t: 0 }] }, ['img>a.img', 'm>a.m', 'img>b.img', 'a>b.m', 'img>c.img', 'b>c.m', 'img>d.a', 'c>d.b', 'd>t', 't>out'], { inputs: ['img', 'm'] }),
  naive: build({ d: ['arith', { op: 'sub' }], t: ['threshold', { t: 0 }] }, ['img>d.a', 'm>d.b', 'd>t', 't>out'], { inputs: ['img', 'm'] }),
}

// ---------------- 9-7 先缩小再放大 · 9-8 细线不见了 · 9-9 细胞分割 ----------------
// Cells under a microscope: bright cells on a darker background, with grain. A coarse path (2×2 averages, then back
// up) ignores the grain; a skip path at full size keeps the one-pixel gaps between touching cells.

const AVG = [0, 0, 0, 0, 0.25, 0.25, 0, 0.25, 0.25]
const rects = (list) => (x, y) => list.some(([x0, y0, x1, y1]) => x >= x0 && x < x1 && y >= y0 && y < y1)
function cells(seed, inside, { cell = 0.8, back = 0.2, grain = 0.4 } = {}) {
  const next = random(seed)
  const img = fromFn(16, 16, (x, y) => (inside(x, y) ? cell : back) + grain * (next() - 0.5) * 2)
  return { img, mask: fromFn(16, 16, (x, y) => (inside(x, y) ? 1 : 0)) }
}
const coarseGraph = (t = 0.5) =>
  build({ a: ['kernel3', { w: AVG }], s: 'downsample', c: ['threshold', { t }], u: 'tconv' }, ['in>a', 'a>s', 's>c', 'c>u', 'u>out'])
const COARSE = [
  [{ zh: '两个细胞', en: 'Two cells' }, cells(61, rects([[2, 2, 8, 8], [10, 6, 14, 14]]))],
  [{ zh: '长条', en: 'A long cell' }, cells(62, rects([[2, 10, 14, 14]]))],
  [{ zh: '三个细胞', en: 'Three cells' }, cells(63, rects([[0, 0, 4, 6], [6, 2, 12, 8], [4, 10, 10, 16]]))],
]
const coarse = {
  id: '9-7',
  chapter: 9,
  title: { zh: '先缩小再放大', en: 'Shrink, then enlarge' },
  brief: { zh: '显微镜下的细胞，噪点很重。标出细胞（1）和背景（0）。', en: 'Cells under a microscope, with heavy grain. Mark the cells (1) and the background (0).' },
  hint: { zh: '一格一格看，噪点会骗过门槛。几格一起看呢？', en: 'Looked at cell by cell, the grain fools the threshold. What about several cells at once?' },
  after: { zh: '缩小时几格平均，噪点互相抵消；判断完再放大回来：这就是编码器—解码器。代价是边界只能对齐到块：比块还细的东西，缩小时就丢了。', en: 'Shrinking averages several cells so the grain cancels out; decide, then enlarge back: this is an encoder–decoder. The price is that boundaries can only line up with the blocks: anything finer than a block is lost in the shrinking.' },
  unlocks: [],
  palette: ['kernel3', 'box3', 'downsample', 'maxpool', 'tconv', 'own-9-3', 'threshold', 'arith', 'merge', 'const'],
  check: { tolerance: 0.1, mismatches: 4 },
  tests: COARSE.map(([label, c]) => test(label, { in: c.img }, { out: c.mask })),
  hidden: [[{ zh: '一大一小', en: 'One big, one small' }, cells(64, rects([[2, 2, 12, 10], [12, 12, 16, 16]]))]].map(([label, c]) => test(label, { in: c.img }, { out: c.mask })),
  solution: coarseGraph(),
  naive: build({ t: ['threshold', { t: 0.5 }] }, ['in>t', 't>out']),
}

// Touching cells with a one-pixel gap between them, on odd columns or rows so a 2×2 block straddles each gap.
const gaps = (list, gapX = [], gapY = []) => (x, y) => rects(list)(x, y) && !gapX.includes(x) && !gapY.includes(y)
// The coarse path keeps any block with a cell in it (a cell corner fills one cell of four); the fine path decides.
const skipGraph = (skip = true) =>
  build(
    { a: ['kernel3', { w: AVG }], s: 'downsample', c: ['threshold', { t: 0.3 }], u: 'tconv', ...(skip ? { f: ['threshold', { t: 0.5 }], m: ['arith', { op: 'mul' }] } : {}) },
    ['in>a', 'a>s', 's>c', 'c>u', ...(skip ? ['in>f', 'u>m.a', 'f>m.b', 'm>out'] : ['u>out'])],
  )
const THIN = [
  [{ zh: '两个挨着', en: 'Two touching' }, cells(71, gaps([[2, 3, 14, 11]], [7]), { grain: 0.2 })],
  [{ zh: '上下挨着', en: 'One above the other' }, cells(72, gaps([[3, 1, 11, 15]], [], [7]), { grain: 0.2 })],
  [{ zh: '一排三个', en: 'Three in a row' }, cells(73, gaps([[1, 4, 15, 10]], [5, 11]), { grain: 0.2 })],
]
const thin = {
  id: '9-8',
  chapter: 9,
  title: { zh: '细线不见了', en: 'The thin line is gone' },
  brief: { zh: '挨在一起的细胞之间只隔一条一像素的暗缝。标出细胞，缝要留着（0）。', en: 'Touching cells are separated only by a dark gap one pixel wide. Mark the cells, and keep the gaps (0).' },
  hint: { zh: '缩小再放大的那条路看不见一像素的缝。原图里还看得见。', en: 'The shrink-then-enlarge path cannot see a one-pixel gap. The original picture still can.' },
  after: { zh: '把放大回来的粗结果和原尺寸的细结果合起来：粗的一路挡住噪点，细的一路留下细节。这条从编码器直接连到解码器的线叫跳连，U-Net 每一层都有。', en: 'Combine the coarse result enlarged back with the fine result at full size: the coarse path keeps out the grain, the fine path keeps the detail. This line straight from encoder to decoder is called a skip connection, and U-Net has one at every level.' },
  unlocks: [],
  palette: ['kernel3', 'box3', 'downsample', 'maxpool', 'tconv', 'own-9-3', 'threshold', 'arith', 'merge', 'const'],
  check: { tolerance: 0.1, mismatches: 3 },
  tests: THIN.map(([label, c]) => test(label, { in: c.img }, { out: c.mask })),
  hidden: [[{ zh: '一排两个，缝在别处', en: 'Two in a row, gap elsewhere' }, cells(74, gaps([[0, 2, 14, 8]], [9]), { grain: 0.2 })]].map(([label, c]) => test(label, { in: c.img }, { out: c.mask })),
  solution: skipGraph(),
  naive: skipGraph(false),
}

// The finale: brightness and contrast change from slide to slide, so the boundary comes from k-means, and the
// picture is measured against it before both paths.
const finaleGraph = (adapt = true) =>
  build(
    {
      ...(adapt ? { k0: ['const', { c: 0.5 }], a1: 'own-9-5', a2: 'own-9-5', a3: 'own-9-5', n: ['arith', { op: 'sub' }] } : { k0: ['const', { c: 0.5 }], n: ['arith', { op: 'sub' }] }),
      a: ['kernel3', { w: AVG }], s: 'downsample', c: ['threshold', { t: -0.13 }], u: 'tconv', f: ['threshold', { t: 0 }], m: ['arith', { op: 'mul' }],
    },
    [
      ...(adapt ? ['in>a1.img', 'k0>a1.m', 'in>a2.img', 'a1>a2.m', 'in>a3.img', 'a2>a3.m', 'in>n.a', 'a3>n.b'] : ['in>n.a', 'k0>n.b']),
      'n>a', 'a>s', 's>c', 'c>u', 'n>f', 'u>m.a', 'f>m.b', 'm>out',
    ],
  )
const SLIDES = [
  [{ zh: '暗的切片', en: 'A dark slide' }, cells(81, gaps([[2, 2, 14, 9]], [7]), { cell: 0.5, back: 0.2, grain: 0.1 })],
  [{ zh: '亮的切片', en: 'A bright slide' }, cells(82, gaps([[1, 3, 9, 15], [11, 1, 15, 7]], [], [9]), { cell: 0.95, back: 0.55, grain: 0.1 })],
  [{ zh: '一排细胞', en: 'A row of cells' }, cells(83, gaps([[1, 5, 15, 12]], [5, 9]), { cell: 0.7, back: 0.35, grain: 0.1 })],
]
const cellSeg = {
  id: '9-9',
  chapter: 9,
  title: { zh: '细胞分割', en: 'Segmenting cells' },
  brief: { zh: '一批显微镜切片，每张的亮度和对比度都不一样，细胞挨在一起。标出细胞，细胞之间的缝要留着。', en: 'A batch of microscope slides, each with its own brightness and contrast, with cells touching. Mark the cells, and keep the gaps between them.' },
  hint: { zh: '固定的门槛，在暗的切片上和亮的切片上不会都对。', en: 'A fixed threshold cannot be right on both dark slides and bright ones.' },
  after: { zh: '自适应的分界、去噪的粗路径、保细节的跳连：一个小小的 U-Net 式流水线。真实的细胞分割网络把每一步都换成学出来的卷积，结构还是这个样子。', en: 'An adaptive boundary, a coarse path that removes grain, a skip connection that keeps detail: a small U-Net-style pipeline. Real cell-segmentation networks replace every step with learnt convolutions, but the structure stays the same.' },
  unlocks: [],
  palette: ['own-9-5', 'kernel3', 'box3', 'downsample', 'maxpool', 'tconv', 'own-9-3', 'threshold', 'arith', 'merge', 'const'],
  check: { tolerance: 0.1, mismatches: 4 },
  tests: SLIDES.map(([label, c]) => test(label, { in: c.img }, { out: c.mask })),
  hidden: [[{ zh: '对比度低', en: 'Low contrast' }, cells(84, gaps([[2, 2, 14, 14]], [7], [7]), { cell: 0.6, back: 0.35, grain: 0.08 })]].map(([label, c]) => test(label, { in: c.img }, { out: c.mask })),
  solution: finaleGraph(),
  naive: finaleGraph(false),
}

export const levels = [twice, smooth, putBack, roundTrip, oneStep, colourSeg, coarse, thin, cellSeg]
