import { GLYPHS, addNoise, correlate, flipKernel, fromFn, gaussianKernel, map, patterns as P, shift, zip } from '../../kit/domains/image/engine/image.js'
import { maxAbsDiff, racerRounds } from '../../kit/domains/image/benches/racer.js'
import { build, test } from '../../kit/domains/image/build.js'

// Chapter 1 · 邻居 (lecture 3): an output pixel from its neighbours. Steps: averages (and their separable and
// Gaussian forms, then sharpening), differences (both directions, then Sobel), the weighted sum that becomes the 3×3
// kernel (and why the part reads it rotated), and padding. Challenge: a 5×5 average cheaper than splitting it.
// Series: a document scanner that finds the paper's edges in a noisy scan with text on it.

const BOX3 = Array(9).fill(1 / 9)
const H3 = [0, 0, 0, 1 / 3, 1 / 3, 1 / 3, 0, 0, 0]
const V3 = [0, 1 / 3, 0, 0, 1 / 3, 0, 0, 1 / 3, 0]
const SOBEL_X = [-1, 0, 1, -2, 0, 2, -1, 0, 1].map((v) => v / 8)
const SOBEL_Y = [-1, -2, -1, 0, 0, 0, 1, 2, 1].map((v) => v / 8)
const diffx = (img) => zip(shift(img, -1, 0), img, (a, b) => a - b)
const box = (img, border) => correlate(img, BOX3, border)
const convolve = (img, kernel) => correlate(img, flipKernel(kernel))
const scenes = () => [
  [{ zh: '方块', en: 'Square' }, P.square()],
  [{ zh: '圆盘', en: 'Disc' }, P.disk()],
  [{ zh: '字母 T', en: 'Letter T' }, P.glyph(GLYPHS.T)],
  [{ zh: '棋盘', en: 'Checkerboard' }, P.checker()],
  [{ zh: '亮点', en: 'Bright dot' }, P.impulse(7, 7)],
]
const each = (cases, out) => cases.map(([label, img]) => test(label, { in: img }, { out: out(img) }))

const hblur = {
  id: '1-1',
  chapter: 1,
  title: { zh: '三点平均', en: 'Three-point average' },
  brief: { zh: '每个像素换成它和左右两个邻居的平均。', en: 'Replace each pixel with the average of itself and its left and right neighbours.' },
  hint: { zh: '你需要「往左挪一格」的图、「往右挪一格」的图和原图。', en: 'You need the image shifted one pixel left, the image shifted one pixel right, and the original.' },
  after: { zh: '输出不再只看自己，而是看邻居的加权和。这就是滤波。', en: 'The output no longer looks only at its own pixel, but at a weighted sum of its neighbours. This is filtering.' },
  unlocks: ['blur3h'],
  adds: ['arith', 'merge'],
  tests: each(scenes(), (img) => correlate(img, H3)),
  hidden: each([[{ zh: '挪开的字母 F', en: 'Shifted letter F' }, P.glyph(GLYPHS.F, 0.1, 0.9, 5, 2)], [{ zh: '随机纹理', en: 'Random texture' }, P.noise(11)]], (img) => correlate(img, H3)),
  solution: build({ l: ['shift', { dir: '←' }], r: ['shift', { dir: '→' }], a: ['arith', { op: 'add' }], b: ['arith', { op: 'add' }], k: ['arith', { op: 'mul' }], kN: ['const', { c: 1 / 3 }] }, ['in>l', 'in>r', 'l>a.a', 'r>a.b', 'a>b.a', 'in>b.b', 'b>k.a', 'k>out', 'kN>k.b']),
}

const vblur = {
  id: '1-2',
  chapter: 1,
  title: { zh: '竖着也来', en: 'Up and down too' },
  brief: { zh: '每个像素换成它和上下两个邻居的平均。', en: 'Replace each pixel with the average of itself and its neighbours above and below.' },
  after: { zh: '同一个想法换一个方向。横着平均抹平左右的毛刺，竖着平均抹平上下的。', en: 'The same idea in another direction. Averaging across smooths out spikes from side to side; averaging down smooths them from top to bottom.' },
  unlocks: [],
  tests: each(scenes().slice(0, 4), (img) => correlate(img, V3)),
  hidden: each([[{ zh: '横条', en: 'Horizontal bar' }, P.stepY(9)], [{ zh: '随机纹理', en: 'Random texture' }, P.noise(12)]], (img) => correlate(img, V3)),
  solution: build({ u: ['shift', { dir: '↑' }], d: ['shift', { dir: '↓' }], a: ['arith', { op: 'add' }], b: ['arith', { op: 'add' }], k: ['arith', { op: 'mul' }], kN: ['const', { c: 1 / 3 }] }, ['in>u', 'in>d', 'u>a.a', 'd>a.b', 'a>b.a', 'in>b.b', 'b>k.a', 'k>out', 'kN>k.b']),
  naive: build({ h: 'blur3h' }, ['in>h', 'h>out']),
}

const boxBlur = {
  id: '1-3',
  chapter: 1,
  title: { zh: '方块模糊', en: 'Box blur' },
  brief: { zh: '每个像素换成它周围 3×3 九个格子的平均。计算量不能超过 6。', en: 'Replace each pixel with the average of the nine cells in the 3×3 block around it. The cost must not exceed 6.' },
  hint: { zh: '九个格子挨个加要 8 次加法。3×3 的方块，能不能拆成几步更小的平均？', en: 'Adding up nine cells one by one takes 8 additions. Can the 3×3 block be split into a few smaller averages?' },
  after: { zh: '先横后竖，九次乘加变成六次。核能拆成一行乘一列时就能这样省，这叫可分离滤波；核越大省得越多。', en: 'Horizontal first, then vertical: nine multiply-adds become six. You can save like this whenever a kernel splits into a row times a column. This is separable filtering; the bigger the kernel, the more you save.' },
  unlocks: ['box3'],
  constraint: (score) => (score.cost > 6 ? { zh: `计算量 ${score.cost}，超过 6`, en: `Cost ${score.cost}, over 6` } : ''),
  tests: each(scenes(), (img) => box(img)),
  hidden: each([[{ zh: '挪开的字母 L', en: 'Shifted letter L' }, P.glyph(GLYPHS.L, 0.1, 0.9, 2, 5)], [{ zh: '随机纹理', en: 'Random texture' }, P.noise(13)]], (img) => box(img)),
  solution: build({ h: 'blur3h', u: ['shift', { dir: '↑' }], d: ['shift', { dir: '↓' }], a: ['arith', { op: 'add' }], b: ['arith', { op: 'add' }], k: ['arith', { op: 'mul' }], kN: ['const', { c: 1 / 3 }] }, ['in>h', 'h>u', 'h>d', 'u>a.a', 'd>a.b', 'a>b.a', 'h>b.b', 'b>k.a', 'k>out', 'kN>k.b']),
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
      nodes[`a${i}`] = ['arith', { op: 'add' }]
      wires.push(`${last}>a${i}.a`, `${b ? `t${i}` : `s${i}`}>a${i}.b`)
      last = `a${i}`
    })
    nodes.k = ['arith', { op: 'mul' }]
    nodes.kN = ['const', { c: 1 / 9 }]
    wires.push(`${last}>k.a`, 'kN>k.b', 'k>out')
    return build(nodes, wires)
  })(),
}

const GAUSS_TARGET = gaussianKernel(Math.SQRT2, 4)

const rounder = {
  id: '1-4',
  views: { out: 'terrain' },
  chapter: 1,
  title: { zh: '更圆的模糊', en: 'A rounder blur' },
  brief: { zh: '做出和目标一样的柔和模糊（σ ≈ 1.4 的高斯）。手里只有 3×3 平均。', en: 'Make the same soft blur as the target (a Gaussian with σ ≈ 1.4). All you have is the 3×3 average.' },
  hint: { zh: '一次平均太“方”。多来几次会怎样？', en: 'One average is too "square". What happens if you do it a few more times?' },
  after: { zh: '平均一次是方的，平均三次几乎就是高斯了。平滑叠平滑会越来越像高斯，所以高斯在视觉里无处不在。', en: 'Averaging once gives a square; averaging three times is almost a Gaussian. Smoothing on top of smoothing looks more and more like a Gaussian, which is why Gaussians are everywhere in vision.' },
  unlocks: ['gauss'],
  check: { tolerance: 0.025 },
  tests: each([[{ zh: '亮点', en: 'Bright dot' }, P.impulse(7, 7)], [{ zh: '方块', en: 'Square' }, P.square(5, 5, 6)], [{ zh: '圆盘', en: 'Disc' }, P.disk(7.5, 7.5, 3.5)]], (img) => correlate(img, GAUSS_TARGET)),
  hidden: each([[{ zh: '偏一边的亮点', en: 'Off-centre bright dot' }, P.impulse(4, 10)], [{ zh: '偏一边的圆盘', en: 'Off-centre disc' }, P.disk(9.5, 6.5, 3)], [{ zh: '字母 T', en: 'Letter T' }, P.glyph(GLYPHS.T)]], (img) => correlate(img, GAUSS_TARGET)),
  solution: build({ a: 'box3', b: 'box3', c: 'box3' }, ['in>a', 'a>b', 'b>c', 'c>out']),
  naive: build({ a: 'box3', b: 'box3' }, ['in>a', 'a>b', 'b>out']),
}

const sharpened = (img) => {
  const blurred = correlate(img, gaussianKernel(1))
  return zip(img, blurred, (a, b) => a + 1.5 * (a - b))
}

const sharpen = {
  id: '1-5',
  views: { in: 'terrain', out: 'terrain', mid: 'terrain' },
  chapter: 1,
  title: { zh: '锐化', en: 'Sharpen' },
  brief: { zh: '让细节更清楚：输出 = 原图 + 1.5 ×（原图 − 模糊图）。模糊用 σ = 1 的高斯。', en: 'Make the details clearer: output = original + 1.5 × (original − blurred). Blur with a Gaussian of σ = 1.' },
  after: { zh: '原图减去模糊图，剩下的正是细节（高频）。把细节加回去，图就变“锐”了。', en: 'The original minus the blurred image leaves exactly the detail (the high frequencies). Add the detail back and the image becomes "sharper".' },
  unlocks: ['sharpen'],
  tests: each(scenes().slice(0, 4), sharpened),
  hidden: each([[{ zh: '挪开的字母 L', en: 'Shifted letter L' }, P.glyph(GLYPHS.L, 0.1, 0.9, 5, 4)], [{ zh: '随机纹理', en: 'Random texture' }, P.noise(21)]], sharpened),
  solution: build({ g: ['gauss', { sigma: 1 }], d: ['arith', { op: 'sub' }], k: ['arith', { op: 'mul' }], kN: ['const', { c: 1.5 }], a: ['arith', { op: 'add' }] }, ['in>g', 'in>d.a', 'g>d.b', 'd>k.a', 'in>a.a', 'k>a.b', 'a>out', 'kN>k.b']),
  naive: build({ g: ['gauss', { sigma: 1 }], d: ['arith', { op: 'sub' }], k: ['arith', { op: 'mul' }], kN: ['const', { c: 1.5 }], a: ['arith', { op: 'add' }] }, ['in>g', 'g>d.a', 'in>d.b', 'd>k.a', 'in>a.a', 'k>a.b', 'a>out', 'kN>k.b']),
}

const step = {
  id: '1-6',
  views: { in: 'slope', out: 'terrain', mid: 'terrain' },
  chapter: 1,
  title: { zh: '台阶在哪', en: 'Where is the step?' },
  brief: { zh: '在亮度突然变化的地方输出变化量：输出 = 右边邻居 − 自己。', en: 'Where the brightness suddenly changes, output the amount of change: output = right neighbour − self.' },
  after: { zh: '边缘就是相邻像素的差。平坦处差为 0，台阶处差最大。「右边邻居 − 自己」只看得见竖着的边；同样的道理，「下边邻居 − 自己」看得见横着的边。两个现在都是现成的元件：真实的边朝哪个方向都有，两个方向都得量。', en: 'An edge is the difference between neighbouring pixels. On flat ground the difference is 0; at a step it is largest. "Right neighbour − self" only sees vertical edges; in the same way, "neighbour below − self" sees horizontal ones. Both are now ready-made parts: real edges run every way, so both directions have to be measured.' },
  unlocks: ['diffx', 'diffy'],
  tests: each([[{ zh: '台阶', en: 'Step' }, P.stepX(8)], [{ zh: '方块', en: 'Square' }, P.square()], [{ zh: '斜坡', en: 'Ramp' }, P.rampX()], [{ zh: '字母 L', en: 'Letter L' }, P.glyph(GLYPHS.L)]], diffx),
  hidden: each([[{ zh: '亮到暗的台阶', en: 'Bright-to-dark step' }, P.stepX(5, 0.85, 0.15)], [{ zh: '挪开的字母 F', en: 'Shifted letter F' }, P.glyph(GLYPHS.F, 0.1, 0.9, 6, 4)], [{ zh: '随机纹理', en: 'Random texture' }, P.noise(17)]], diffx),
  solution: build({ l: ['shift', { dir: '←' }], d: ['arith', { op: 'sub' }] }, ['in>l', 'l>d.a', 'in>d.b', 'd>out']),
  naive: build({ l: ['shift', { dir: '→' }], d: ['arith', { op: 'sub' }] }, ['in>l', 'l>d.a', 'in>d.b', 'd>out']),
}

const edgeTarget = (img) => map(diffx(box(img)), (v) => (v > 0.15 ? 1 : 0))

const noisyEdge = {
  id: '1-7',
  views: { in: 'slope', out: 'terrain', mid: 'terrain' },
  chapter: 1,
  title: { zh: '有噪声的边', en: 'A noisy edge' },
  brief: { zh: '照片里有噪声。只在真正的台阶处输出 1（台阶都是左暗右亮）。', en: 'The photo is noisy. Output 1 only at the real step (every step is dark on the left, bright on the right).' },
  hint: { zh: '差分会把噪声一起放大。在求差之前，能不能先让噪声安静下来？', en: 'Taking a difference amplifies the noise too. Before you take the difference, can you quieten the noise first?' },
  after: { zh: '先平滑、再求导，噪声被压下去，真正的边留下来。这正是 Sobel 算子：一个方向求导，另一个方向平滑。', en: 'Smooth first, then differentiate: the noise is pushed down and the real edge stays. This is exactly the Sobel operator: differentiate in one direction, smooth in the other.' },
  unlocks: ['sobel'],
  check: { tolerance: 0.5, mismatches: 4 },
  tests: [[5, 1], [8, 2], [11, 3], [7, 4]].map(([edge, seed]) =>
    test({ zh: `台阶 x=${edge}`, en: `Step x=${edge}` }, { in: addNoise(P.stepX(edge, 0.15, 0.85), seed, 0.22) }, { out: edgeTarget(P.stepX(edge, 0.15, 0.85)) }),
  ),
  hidden: [[6, 5], [9, 7], [10, 19]].map(([edge, seed]) =>
    test({ zh: `新台阶 x=${edge}`, en: `New step x=${edge}` }, { in: addNoise(P.stepX(edge, 0.15, 0.85), seed, 0.22) }, { out: edgeTarget(P.stepX(edge, 0.15, 0.85)) }),
  ),
  solution: build({ b: 'box3', d: 'diffx', t: ['threshold', { t: 0.15 }] }, ['in>b', 'b>d', 'd>t', 't>out']),
  naive: build({ d: 'diffx', t: ['threshold', { t: 0.15 }] }, ['in>d', 'd>t', 't>out']),
}

// The stamp a bright dot turns into: half a copy one pixel up, half a copy one pixel down and to the right.
const STAMP = [0, 0.5, 0, 0, 0, 0, 0, 0, 0.5]

const weighted = {
  id: '1-8',
  chapter: 1,
  title: { zh: '拼出加权和', en: 'Build a weighted sum' },
  brief: { zh: '有人用一种邻居加权和处理了这些图。用平移、常数和四则运算，搭出同样的处理。', en: 'Someone processed these images with a weighted sum of neighbours. Build the same processing out of shifts, constants, multiplications and additions.' },
  hint: { zh: '先看亮点那一组：一个亮点变成了几个点？各在哪里，各有多亮？', en: 'Look at the bright dot first: how many dots did one dot turn into? Where is each, and how bright?' },
  after: { zh: '亮点被处理成什么样，就是这种处理的「印章」：每个输入像素都盖一个，挪到对应位置、乘上权重再相加。把权重排成 3×3 的小方阵，就是核。从现在起你有了「3×3 核」元件，九个权重一次填好。', en: 'Whatever a bright dot is turned into is the "stamp" of the processing: every input pixel presses one, moved to its place, multiplied by its weight and added up. Arrange the weights in a small 3×3 grid and you have a kernel. From now on you have the "3×3 kernel" part, with all nine weights set at once.' },
  unlocks: ['kernel3'],
  tests: each([[{ zh: '亮点', en: 'Bright dot' }, P.impulse(7, 7)], [{ zh: '方块', en: 'Square' }, P.square()], [{ zh: '字母 F', en: 'Letter F' }, P.glyph(GLYPHS.F)]], (img) => convolve(img, STAMP)),
  hidden: each([[{ zh: '挪开的字母 T', en: 'Shifted letter T' }, P.glyph(GLYPHS.T, 0.1, 0.9, 5, 4)], [{ zh: '随机纹理', en: 'Random texture' }, P.noise(22)]], (img) => convolve(img, STAMP)),
  solution: build({ u: ['shift', { dir: '↑' }], r: ['shift', { dir: '→' }], rd: ['shift', { dir: '↓' }], a: ['arith', { op: 'add' }], k: ['arith', { op: 'mul' }], kN: ['const', { c: 0.5 }] }, ['in>u', 'in>r', 'r>rd', 'u>a.a', 'rd>a.b', 'a>k.a', 'k>out', 'kN>k.b']),
  naive: build({ u: ['shift', { dir: '↓' }], r: ['shift', { dir: '←' }], rd: ['shift', { dir: '↑' }], a: ['arith', { op: 'add' }], k: ['arith', { op: 'mul' }], kN: ['const', { c: 0.5 }] }, ['in>u', 'in>r', 'r>rd', 'u>a.a', 'rd>a.b', 'a>k.a', 'k>out', 'kN>k.b']),
}

const MYSTERY = [0, 0, 0.5, 0, 0, 0, 0.25, 0, 0.25]

const guess = {
  id: '1-9',
  chapter: 1,
  title: { zh: '猜核', en: 'Guess the kernel' },
  brief: { zh: '有人用一个 3×3 核处理了这些图。把你的核拧成和它一样。', en: 'Someone processed these images with a 3×3 kernel. Dial your kernel in until it matches.' },
  hint: { zh: '亮点会变成核的样子。可你的元件是怎样读核的？把你填的核喂一个亮点，看看出来的是什么。', en: 'A bright dot turns into the shape of the kernel. But how does your part read its kernel? Feed a bright dot to the kernel you entered and see what comes out.' },
  after: { zh: '亮点的输出就是核本身（冲激响应）。但它是“卷积”的结果，而你的元件做的是“互相关”：要把核旋转 180° 才对得上。', en: 'The output for a bright dot is the kernel itself (the impulse response). But that is the result of a "convolution", while your part does "cross-correlation": you have to rotate the kernel by 180° to make them match.' },
  unlocks: [],
  tests: each([[{ zh: '亮点', en: 'Bright dot' }, P.impulse(7, 7)], [{ zh: '方块', en: 'Square' }, P.square()], [{ zh: '字母 F', en: 'Letter F' }, P.glyph(GLYPHS.F)]], (img) => convolve(img, MYSTERY)),
  hidden: each([[{ zh: '挪开的字母 L', en: 'Shifted letter L' }, P.glyph(GLYPHS.L, 0.1, 0.9, 4, 2)], [{ zh: '随机纹理', en: 'Random texture' }, P.noise(23)]], (img) => convolve(img, MYSTERY)),
  solution: build({ k: ['kernel3', { w: flipKernel(MYSTERY) }] }, ['in>k', 'k>out']),
  naive: build({ k: ['kernel3', { w: MYSTERY }] }, ['in>k', 'k>out']),
}

const pad = {
  id: '1-11',
  chapter: 1,
  title: { zh: '补边', en: 'Padding' },
  brief: { zh: '向右平移一格，但最左一列不补 0，而是照抄原图最左一列。', en: 'Shift right by one pixel, but instead of padding the leftmost column with 0, copy the original image\'s leftmost column.' },
  hint: { zh: '先做出补 0 的平移：它只错在最左一列。能不能单独拿到「原图的最左一列，其余全是 0」？', en: 'First build the zero-padded shift: it is wrong only in the leftmost column. Can you get "the original\'s leftmost column, with 0 everywhere else" on its own?' },
  after: { zh: '你拼出的就是「复制边缘」：图外缺的值，用离它最近的边上像素代替，不会凭空造出一道黑边。从现在起，平移元件的「边界」设置里多了「复制边缘」，做的就是你刚才拼的这件事。', en: 'What you built is "Replicate edge": a missing value outside the image is replaced by the nearest pixel on the edge, so no black border appears out of nowhere. From now on, the Shift part\'s "Border" setting has a "Replicate edge" option that does exactly what you just built.' },
  unlocks: ['edge-pad'],
  // The border setting is what this level builds by hand, so it stays out of reach here even for a player who has it.
  withhold: ['edge-pad'],
  tests: each([[{ zh: '亮条贴左边', en: 'Bright bar on the left edge' }, P.stepX(4, 0.85, 0.2)], [{ zh: '字母 F 贴左边', en: 'Letter F on the left edge' }, P.glyph(GLYPHS.F, 0.15, 0.9, 0, 3)], [{ zh: '方块贴左边', en: 'Square on the left edge' }, P.square(0, 4, 6, 0.1, 0.9)], [{ zh: '斜坡', en: 'Ramp' }, fromFn(16, 16, (x, y) => 0.1 + 0.05 * y)]], (img) => shift(img, 1, 0, 'edge')),
  hidden: each([[{ zh: '随机纹理', en: 'Random texture' }, P.noise(31)], [{ zh: '亮底暗块', en: 'Dark block on bright background' }, P.square(0, 9, 5, 0.85, 0.25)]], (img) => shift(img, 1, 0, 'edge')),
  solution: build({ r: ['shift', { dir: '→' }], l: ['shift', { dir: '←' }], b: ['shift', { dir: '→' }], d: ['arith', { op: 'sub' }], a: ['arith', { op: 'add' }] }, ['in>r', 'in>l', 'l>b', 'in>d.a', 'b>d.b', 'r>a.a', 'd>a.b', 'a>out']),
  alsoFails: [build({ r: ['shift', { dir: '→' }], a: ['arith', { op: 'add' }] }, ['in>r', 'r>a.a', 'in>a.b', 'a>out'])],
  naive: build({ r: ['shift', { dir: '→' }] }, ['in>r', 'r>out']),
}

const frame = {
  id: '1-12',
  chapter: 1,
  title: { zh: '黑框', en: 'Black frame' },
  brief: { zh: '在亮背景上做 3×3 平均，边缘不能发黑。', en: 'Take a 3×3 average on a bright background without the border going dark.' },
  hint: { zh: '3×3 平均元件只会在图外补 0。哪个元件已经会另一种补法？', en: 'The 3×3 average part can only pad with 0 outside the image. Which part already knows another way to pad?' },
  after: { zh: '补 0 等于在图外画了一圈黑框，平均时把黑色混了进来。你用复制边缘的平移拼出了不发黑的平均。从现在起，3×3 平均、高斯这些滤波元件的「边界」设置里也有了「复制边缘」。', en: 'Padding with 0 draws a black frame round the image, and averaging mixes that black in. You built an average that does not darken from shifts that replicate the edge. From now on, the "Border" setting on filters such as the 3×3 average and the Gaussian has "Replicate edge" too.' },
  unlocks: ['edge-filter'],
  // The filters' border setting is what this level builds by hand, so it stays out of reach here even for a player who has it.
  withhold: ['edge-filter'],
  tests: each([[{ zh: '亮底方块', en: 'Square on bright background' }, P.square(5, 5, 6, 0.85, 0.3)], [{ zh: '亮底圆', en: 'Circle on bright background' }, P.disk(7.5, 7.5, 4, 0.9, 0.2)], [{ zh: '亮底字母', en: 'Letter on bright background' }, P.glyph(GLYPHS.T, 0.9, 0.2)]], (img) => box(img, 'edge')),
  hidden: each([[{ zh: '贴边的暗方块', en: 'Dark square on the edge' }, P.square(0, 10, 5, 0.8, 0.3)], [{ zh: '亮底字母 X', en: 'Letter X on bright background' }, P.glyph(GLYPHS.X, 0.75, 0.15, 6, 4)], [{ zh: '亮底竖条', en: 'Vertical bar on bright background' }, P.stepX(13, 0.9, 0.35)]], (img) => box(img, 'edge')),
  solution: build(
    { l: ['shift', { dir: '←', border: 'edge' }], r: ['shift', { dir: '→', border: 'edge' }], h: 'merge', three: ['const', { c: 3 }], hq: ['arith', { op: 'div' }], u: ['shift', { dir: '↑', border: 'edge' }], d: ['shift', { dir: '↓', border: 'edge' }], v: 'merge', vq: ['arith', { op: 'div' }] },
    ['in>l', 'in>r', 'l>h.a', 'in>h.b', 'r>h.c', 'h>hq.a', 'three>hq.b', 'hq>u', 'hq>d', 'u>v.a', 'hq>v.b', 'd>v.c', 'v>vq.a', 'three>vq.b', 'vq>out'],
  ),
  naive: build({ b: 'box3' }, ['in>b', 'b>out']),
}

// ---------------- 1-13 5×5 平均 (challenge) ----------------

// Pictures with a dark margin four pixels wide, so sums that slide past the border lose nothing.
const BOX5 = Array(25).fill(1 / 25)
const margined = (img) => fromFn(16, 16, (x, y) => (x < 4 || y < 4 || x > 11 || y > 11 ? 0 : img.data[y * 16 + x]))
const sum5 = (dir, back) => ({
  nodes: (p) => ({
    [`${p}1`]: ['shift', { dir }], [`${p}2`]: ['arith', { op: 'add' }], [`${p}3`]: ['shift', { dir }], [`${p}4`]: ['shift', { dir }], [`${p}5`]: ['arith', { op: 'add' }],
    [`${p}6`]: ['shift', { dir }], [`${p}7`]: ['shift', { dir }], [`${p}8`]: ['shift', { dir }], [`${p}9`]: ['shift', { dir }], [`${p}a`]: ['arith', { op: 'add' }],
    [`${p}b`]: ['shift', { dir: back }], [`${p}c`]: ['shift', { dir: back }], [`${p}k`]: ['arith', { op: 'mul' }], [`${p}kN`]: ['const', { c: 0.2 }],
  }),
  // s2 = x + next; s4 = s2 + s2 two along; s5 = s4 + the pixel four along; then slide back two to centre it.
  wires: (p, from, to) => [
    `${from}>${p}1`, `${from}>${p}2.a`, `${p}1>${p}2.b`, `${p}2>${p}3`, `${p}3>${p}4`, `${p}2>${p}5.a`, `${p}4>${p}5.b`,
    `${from}>${p}6`, `${p}6>${p}7`, `${p}7>${p}8`, `${p}8>${p}9`, `${p}5>${p}a.a`, `${p}9>${p}a.b`, `${p}a>${p}b`, `${p}b>${p}c`, `${p}c>${p}k.a`, `${p}kN>${p}k.b`, `${p}k>${to}`,
  ],
})
const direct5 = (dir, back, p, from) => {
  const nodes = { [`${p}l1`]: ['shift', { dir }], [`${p}l2`]: ['shift', { dir }], [`${p}r1`]: ['shift', { dir: back }], [`${p}r2`]: ['shift', { dir: back }], [`${p}a`]: ['arith', { op: 'add' }], [`${p}b`]: ['arith', { op: 'add' }], [`${p}c`]: ['arith', { op: 'add' }], [`${p}d`]: ['arith', { op: 'add' }], [`${p}k`]: ['arith', { op: 'mul' }], [`${p}kN`]: ['const', { c: 0.2 }] }
  const wires = [`${from}>${p}l1`, `${p}l1>${p}l2`, `${from}>${p}r1`, `${p}r1>${p}r2`, `${from}>${p}a.a`, `${p}l1>${p}a.b`, `${p}a>${p}b.a`, `${p}l2>${p}b.b`, `${p}b>${p}c.a`, `${p}r1>${p}c.b`, `${p}c>${p}d.a`, `${p}r2>${p}d.b`, `${p}d>${p}k.a`, `${p}kN>${p}k.b`]
  return { nodes, wires }
}

const box5 = (() => {
  const h = sum5('←', '→')
  const v = sum5('↑', '↓')
  const dh = direct5('←', '→', 'h', 'in')
  const dv = direct5('↑', '↓', 'v', 'hk')
  return {
    id: '1-13',
    chapter: 1,
    title: { zh: '5×5 平均', en: 'A 5×5 average' },
    brief: { zh: '每个像素换成它周围 5×5 共 25 格的平均。计算量不能超过 8。', en: 'Replace each pixel with the average of the 25 cells in the 5×5 block around it. The cost must not exceed 8.' },
    hint: { zh: '先横后竖还不够省。数一数电路里有几次加法；平移不花计算量。', en: 'Splitting into across and down is not cheap enough. Count the additions in your circuit; shifting costs nothing.' },
    after: { zh: '两格的和挪两格再加一次，就是四格的和；再补一格就是五格。已经算过的部分和，挪一挪就能再用，平移不花计算量。这个「倍增」的想法以后还会出现：要的范围越大，省得越多。', en: 'The sum of two cells, shifted two along and added again, is the sum of four; one more cell makes five. A partial sum already worked out can be shifted and reused, and shifting costs nothing. This doubling idea will come up again: the bigger the reach, the more it saves.' },
    unlocks: [],
    constraint: (score) => (score.cost > 8 ? { zh: `计算量 ${score.cost}，超过 8`, en: `Cost ${score.cost}, over 8` } : ''),
    tests: each([[{ zh: '方块', en: 'Square' }, P.square(4, 4, 8, 0, 0.9)], [{ zh: '亮点', en: 'Bright dot' }, P.impulse(7, 7)], [{ zh: '字母 T', en: 'Letter T' }, P.glyph(GLYPHS.T, 0, 0.9, 5, 5, 1)]], (img) => correlate(img, BOX5)),
    hidden: each([[{ zh: '圆盘', en: 'Disc' }, P.disk(7.5, 7.5, 3.5, 0, 0.9)], [{ zh: '随机纹理', en: 'Random texture' }, margined(P.noise(24))]], (img) => correlate(img, BOX5)),
    solution: build({ ...h.nodes('h'), ...v.nodes('v') }, [...h.wires('h', 'in', '').slice(0, -1), ...v.wires('v', 'hk', 'out')]),
    naive: build({ ...dh.nodes, ...dv.nodes }, [...dh.wires, ...dv.wires, 'vk>out']),
    alsoFails: [build({ a: 'box3', b: 'box3' }, ['in>a', 'a>b', 'b>out'])],
  }
})()

// ---------------- 1-14 … 1-16 扫描仪 (series) ----------------

// A 24×24 scan: a sheet of paper on a dark desk, a few lines of text on it, sometimes sensor noise. The scanner
// outputs the paper's edges.
const S = 24
const DESK = 0.2
const PAPER = 0.85
const INK = 0.3
const sheet = ({ x0, y0, x1, y1, lines = [], noise = 0, seed = 1 }) => {
  const clean = fromFn(S, S, (x, y) => {
    if (!(x >= x0 && x <= x1 && y >= y0 && y <= y1)) return DESK
    return lines.some(([lx, ly, len]) => y === ly && x >= lx && x < lx + len) ? INK : PAPER
  })
  return { clean, scan: noise ? addNoise(clean, seed, noise) : clean }
}
const sobel2 = (img, border) => zip(correlate(img, SOBEL_X, border), correlate(img, SOBEL_Y, border), (gx, gy) => gx * gx + gy * gy)
const EDGE_T = 0.04
const BLUR = 1.5
const BLUR_T = 0.01
const edges = (img) => map(sobel2(img, 'edge'), (v) => (v > EDGE_T ? 1 : 0))
const paperEdges = (img) => map(sobel2(correlate(img, gaussianKernel(BLUR), 'edge'), 'edge'), (v) => (v > BLUR_T ? 1 : 0))
const denoised = (img) => correlate(img, gaussianKernel(1), 'edge')

const sobelGraph = (border, t, blur) => build(
  { ...(blur ? { g: ['gauss', { sigma: blur, border: 'edge' }] } : {}), x: ['sobelx', { border }], y: ['sobely', { border }], xx: ['arith', { op: 'mul' }], yy: ['arith', { op: 'mul' }], a: ['arith', { op: 'add' }], t: ['threshold', { t }] },
  [...(blur ? ['in>g', 'g>x', 'g>y'] : ['in>x', 'in>y']), 'x>xx.a', 'x>xx.b', 'y>yy.a', 'y>yy.b', 'xx>a.a', 'yy>a.b', 'a>t', 't>out'],
)

const clean = {
  id: '1-14',
  chapter: 1,
  title: { zh: '先去噪', en: 'Clean up first' },
  brief: { zh: '扫描仪的传感器有噪声。把扫描件变成期望里那样干净、柔和的图。', en: 'The scanner\'s sensor is noisy. Turn the scan into a clean, soft image like the expected one.' },
  hint: { zh: '期望图并不比原件更清楚，只是没有颗粒。图边上的纸不能变黑。', en: 'The expected image is no sharper than the original, it just has no grain. Paper at the image border must not turn dark.' },
  after: { zh: '一点模糊换来安静的图，后面的步骤才不会被颗粒骗。图边要复制边缘，不然纸贴着边时会多出一圈暗框。', en: 'A little blur buys a quiet image, so the later steps are not fooled by grain. The border must replicate the edge, or paper touching it gains a dark frame.' },
  unlocks: [],
  check: { tolerance: 0.1, mismatches: 8 },
  tests: [
    [{ zh: '一张纸', en: 'A sheet' }, { x0: 3, y0: 4, x1: 19, y1: 21, lines: [[6, 8, 10], [6, 11, 8], [6, 14, 11]], noise: 0.2, seed: 2 }],
    [{ zh: '贴着上边', en: 'Against the top' }, { x0: 5, y0: 0, x1: 21, y1: 17, lines: [[8, 4, 9], [8, 7, 7]], noise: 0.2, seed: 3 }],
    [{ zh: '小纸条', en: 'A slip' }, { x0: 7, y0: 7, x1: 16, y1: 15, lines: [[9, 10, 5]], noise: 0.2, seed: 4 }],
  ].map(([label, spec]) => {
    const { clean: c, scan } = sheet(spec)
    return test(label, { in: scan }, { out: denoised(c) })
  }),
  hidden: [
    [{ zh: '贴着左边', en: 'Against the left' }, { x0: 0, y0: 3, x1: 14, y1: 20, lines: [[3, 7, 8], [3, 10, 9]], noise: 0.2, seed: 5 }],
    [{ zh: '整张纸', en: 'A whole page' }, { x0: 1, y0: 1, x1: 22, y1: 22, lines: [[4, 5, 14], [4, 9, 12], [4, 13, 15], [4, 17, 10]], noise: 0.2, seed: 6 }],
  ].map(([label, spec]) => {
    const { clean: c, scan } = sheet(spec)
    return test(label, { in: scan }, { out: denoised(c) })
  }),
  solution: build({ g: ['gauss', { sigma: 1, border: 'edge' }] }, ['in>g', 'g>out']),
  naive: build({}, ['in>out']),
}

const border = {
  id: '1-15',
  views: { in: 'pixels', out: 'pixels', mid: 'terrain' },
  chapter: 1,
  title: { zh: '别把图边当纸边', en: 'The image edge is not the paper edge' },
  brief: { zh: '没有噪声和文字，但纸常常超出扫描范围。输出纸的边：横边和竖边都要，在 x、y 两个方向的 Sobel 平方和大于 0.04 的地方输出 1。图边不是纸边。', en: 'No noise and no text, but the paper often runs off the scan. Output the paper\'s edges, horizontal and vertical: 1 wherever the sum of the squared Sobel responses in x and y is above 0.04. The image border is not a paper edge.' },
  hint: { zh: '纸一直铺到图边时，Sobel 在图外看到的是什么？', en: 'When paper runs right up to the image border, what does Sobel see beyond it?' },
  after: { zh: '补 0 让图外变成黑桌面，纸在图边就「断」了，冒出一条假边。复制边缘让纸自然延伸出去，只有真的纸边才亮。', en: 'Padding with 0 turns the outside into a black desk, so the paper "ends" at the image border and a fake edge appears. Replicating the edge lets the paper carry on outward, so only real paper edges light up.' },
  unlocks: [],
  check: { tolerance: 0.02, mismatches: 2 },
  tests: [
    [{ zh: '整张纸', en: 'A whole sheet' }, { x0: 4, y0: 4, x1: 19, y1: 19 }],
    [{ zh: '出了右边', en: 'Off the right' }, { x0: 6, y0: 3, x1: 30, y1: 18 }],
    [{ zh: '出了左上角', en: 'Off the top left' }, { x0: -5, y0: -5, x1: 14, y1: 16 }],
  ].map(([label, spec]) => test(label, { in: sheet(spec).scan }, { out: edges(sheet(spec).scan) })),
  hidden: [
    [{ zh: '出了下边', en: 'Off the bottom' }, { x0: 2, y0: 9, x1: 20, y1: 40 }],
    [{ zh: '铺满了', en: 'Fills the scan' }, { x0: -3, y0: -3, x1: 30, y1: 30 }],
  ].map(([label, spec]) => test(label, { in: sheet(spec).scan }, { out: edges(sheet(spec).scan) })),
  solution: sobelGraph('edge', EDGE_T),
  naive: sobelGraph('zero', EDGE_T),
}

const textLines = [[7, 7, 9], [7, 10, 6], [7, 13, 10], [7, 16, 8]]
const scanner = {
  id: '1-16',
  views: { in: 'pixels', out: 'pixels', mid: 'terrain' },
  chapter: 1,
  title: { zh: '扫描仪', en: 'Scanner' },
  brief: { zh: '真实的扫描件：有噪声，有字，纸常常超出扫描范围。输出纸张的边，和期望一样。', en: 'Real scans: noisy, with text, and the paper often runs off the edge. Output the paper\'s edges, as in the expected image.' },
  hint: { zh: '<level-ref to="1-14"></level-ref>和<level-ref to="1-15"></level-ref>各解决了一件事，这次纸上还有字。字的笔画只有一格粗，纸边却是一大片亮挨着一大片暗。', en: '<level-ref to="1-14"></level-ref> and <level-ref to="1-15"></level-ref> each solved one thing, and this time there is text on the paper too. Text strokes are one pixel thick, while a paper edge is a large bright area beside a large dark one.' },
  after: { zh: '大一点的高斯模糊把噪点和细笔画都糊成一片浅灰，几乎没有坡度；纸边是大块明暗的交界，糊了还是一道坡。看多粗的东西，就先模糊到多粗：这个「尺度」的想法后面会一再出现。扫描 App 找纸张四边，第一步就是这样一条流水线：模糊掉噪声和字，在不制造假边的前提下求梯度，再取阈值。找到的边，后面再拟合成四条直线，就能把斜拍的纸拉正。', en: 'A larger Gaussian blur turns the grain and the thin strokes into a faint grey with almost no slope, while a paper edge, where large areas of light and dark meet, is still a slope after blurring. To look for things of a certain size, blur to that size first: this idea of "scale" will keep coming back. A scanning app finding the four sides of a page starts with exactly this pipeline: blur away the noise and the text, take gradients without inventing edges at the border, then threshold. The edges found are later fitted with four straight lines, so a page photographed at an angle can be straightened.' },
  unlocks: [],
  check: { tolerance: 0.02, mismatches: 8 },
  tests: [
    [{ zh: '一页字', en: 'A page of text' }, { x0: 4, y0: 4, x1: 19, y1: 19, lines: textLines, noise: 0.15, seed: 7 }],
    [{ zh: '出了右边', en: 'Off the right' }, { x0: 6, y0: 3, x1: 30, y1: 18, lines: [[9, 6, 10], [9, 9, 12], [9, 12, 8]], noise: 0.15, seed: 8 }],
    [{ zh: '出了左上角', en: 'Off the top left' }, { x0: -5, y0: -5, x1: 15, y1: 16, lines: [[2, 3, 9], [2, 6, 10], [2, 9, 7]], noise: 0.15, seed: 9 }],
  ].map(([label, spec]) => test(label, { in: sheet(spec).scan }, { out: paperEdges(sheet(spec).scan) })),
  hidden: [
    [{ zh: '出了下边', en: 'Off the bottom' }, { x0: 3, y0: 8, x1: 20, y1: 40, lines: [[6, 11, 11], [6, 14, 9], [6, 17, 12]], noise: 0.15, seed: 10 }],
    [{ zh: '没有字', en: 'No text' }, { x0: 5, y0: 6, x1: 18, y1: 17, noise: 0.15, seed: 11 }],
  ].map(([label, spec]) => test(label, { in: sheet(spec).scan }, { out: paperEdges(sheet(spec).scan) })),
  solution: sobelGraph('edge', BLUR_T, BLUR),
  naive: sobelGraph('zero', BLUR_T, BLUR),
  alsoFails: [sobelGraph('edge', EDGE_T), sobelGraph('edge', BLUR_T), sobelGraph('edge', BLUR_T, 1)],
}

// ---------------- 1-10 核速判 ----------------
// Kernels as the 3×3 kernel part reads them (cross-correlation): `cells` is what the card shows,
// the weights are cells ÷ div.
export const RACER_KERNELS = [
  { id: 'identity', cells: [0, 0, 0, 0, 1, 0, 0, 0, 0], div: 1 },
  { id: 'right', cells: [0, 0, 0, 1, 0, 0, 0, 0, 0], div: 1 },
  { id: 'down', cells: [0, 1, 0, 0, 0, 0, 0, 0, 0], div: 1 },
  { id: 'box', cells: [1, 1, 1, 1, 1, 1, 1, 1, 1], div: 9 },
  { id: 'gauss', cells: [1, 2, 1, 2, 4, 2, 1, 2, 1], div: 16 },
  { id: 'hmean', cells: [0, 0, 0, 1, 1, 1, 0, 0, 0], div: 3 },
  { id: 'sobelx', cells: [-1, 0, 1, -2, 0, 2, -1, 0, 1], div: 8 },
  { id: 'sobely', cells: [-1, -2, -1, 0, 0, 0, 1, 2, 1], div: 8 },
  { id: 'sharpen', cells: [0, -1, 0, -1, 5, -1, 0, -1, 0], div: 1 },
  { id: 'laplace', cells: [0, 1, 0, 1, -4, 1, 0, 1, 0], div: 1 },
].map((k) => ({ ...k, w: k.cells.map((c) => c / k.div) }))

const RACER_INPUTS = [
  P.impulse(7, 7),
  P.square(),
  P.glyph(GLYPHS.F),
  P.glyph(GLYPHS.L),
  P.disk(),
  P.stepX(8),
  P.checker(4),
  P.corner(),
]
export const RACER = { rounds: 10, pass: 8, minGap: 0.15 }
export const racerTime = (round) => Math.max(2.5, 8 - 0.6 * round) // seconds allowed for round 0, 1, …

const rounds = (seed) => racerRounds({ kernels: RACER_KERNELS, inputs: RACER_INPUTS, racer: RACER }, seed)

const racerLevel = {
  id: '1-10',
  kind: 'board',
  board: 'KernelRacer',
  chapter: 1,
  title: { zh: '核速判', en: 'Kernel sprint' },
  brief: { zh: '看输入和输出，选出是哪个 3×3 核做的（按「3×3 核」元件的读法）。10 轮对 8 轮过关，越往后越快。', en: 'Look at the input and the output, and pick the 3×3 kernel that made it (read the way the "3×3 kernel" part reads it). Get 8 of 10 rounds right to pass; it gets faster as you go.' },
  hint: { zh: '权重全正、和为 1：变软。正负相抵、和为 0：平坦处变 0。只有一个 1：整张图挪了一格。', en: 'All weights positive, summing to 1: softer. Positives and negatives cancelling, summing to 0: flat areas become 0. A single 1: the whole image shifts by one pixel.' },
  after: { zh: '你已经能从结果反推核：全正且和为 1 是平滑，越集中越接近原图；和为 0 的核只对变化有反应，是求导；中心大、四周为负是锐化；只有一个 1 是平移，挪的方向和 1 的位置相反。', en: 'You can now work back from a result to its kernel. All positive and summing to 1 is smoothing, and the more concentrated, the closer to the original. A kernel that sums to 0 responds only to change: a derivative. A large centre with negative neighbours is sharpening. A single 1 is a shift, moving the opposite way from where the 1 sits.' },
  unlocks: [],
  kernels: RACER_KERNELS,
  rounds,
  racer: RACER,
  timeFor: racerTime,
  verify() {
    for (let seed = 1; seed <= 40; seed++) {
      const a = rounds(seed)
      const b = rounds(seed)
      if (JSON.stringify(a.map((r) => [r.inputIndex, r.choices, r.answer])) !== JSON.stringify(b.map((r) => [r.inputIndex, r.choices, r.answer]))) return `种子 ${seed} 不确定`
      for (const [index, round] of a.entries()) {
        const outputs = round.choices.map((c) => correlate(round.input, RACER_KERNELS[c].w))
        const matching = outputs.filter((o) => maxAbsDiff(o, round.output) < 1e-9).length
        if (matching !== 1 || maxAbsDiff(outputs[round.answer], round.output) > 1e-9) return `种子 ${seed} 第 ${index + 1} 轮答案不唯一`
        if (new Set(round.choices).size !== 4) return `种子 ${seed} 第 ${index + 1} 轮选项重复`
      }
      // Always pressing the same key must not pass.
      for (let key = 0; key < 4; key++) {
        const hits = a.filter((r) => r.answer === key).length
        if (hits >= RACER.pass) return `种子 ${seed} 一直按 ${key + 1} 能对 ${hits} 轮`
      }
    }
    return ''
  },
}

export const levels = [hblur, vblur, boxBlur, rounder, sharpen, step, noisyEdge, weighted, guess, racerLevel, pad, frame, box5, clean, border, scanner]
