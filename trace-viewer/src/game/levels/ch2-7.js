import { GLYPHS, addNoise, correlate, downsample, fromFn, gaussianKernel, map, maxPool, patterns as P, random, shift, zip } from '../engine/image.js'
import { harrisResponse } from '../engine/nodes.js'
import { build, test } from './util.js'

const SOBEL_X = [-1, 0, 1, -2, 0, 2, -1, 0, 1].map((v) => v / 8)
const SOBEL_Y = [-1, -2, -1, 0, 0, 0, 1, 2, 1].map((v) => v / 8)
const gradmag = (img, border = 'zero') => zip(correlate(img, SOBEL_X, border), correlate(img, SOBEL_Y, border), Math.hypot)
const absdiff = (img) => map(zip(shift(img, -1, 0), img, (a, b) => a - b), Math.abs)

// ---------------- chapter 2 · 频率 ----------------

const prefiltered = (img) => downsample(correlate(img, gaussianKernel(1), 'edge'), 2)

export const chapter2 = [
  {
    id: '2-8',
    chapter: 2,
    title: { zh: '缩小一半', en: 'Half the size' },
    brief: { zh: '把 32×32 的图缩成 16×16，看起来要和原图一样（只是变小）。', en: 'Shrink a 32×32 image to 16×16. It should look like the original, only smaller.' },
    hint: { zh: '隔点取样把每行 32 个点变成 16 个。上一关说过：16 个点能分辨到哪个频率？更快的纹会怎样？在扔掉点之前，先做点什么。', en: 'Downsampling turns the 32 pixels in each row into 16. As the last level showed: up to what frequency can 16 samples tell apart? What happens to faster stripes? Do something before you throw pixels away.' },
    after: { zh: '直接隔点取样，频率高于 8 的细纹会折回来，冒充成原图里没有的粗纹（莫尔纹），这就是混叠。先用高斯模糊把这些频率压下去，再取样：抗混叠必须发生在采样之前。拍照、缩略图都会遇到同一个问题。', en: 'Downsample directly and fine stripes above frequency 8 fold back, posing as coarse stripes the original never had (moiré). That is aliasing. Suppress those frequencies with a Gaussian blur first, then sample: anti-aliasing must happen before sampling. Cameras and thumbnails both face the same problem.' },
    requires: ['2-7'],
    unlocks: [],
    grants: ['edge-pad'],
    palette: ['downsample', 'gauss', 'box3'],
    check: { tolerance: 0.12, mismatches: 6 },
    tests: [
      [{ zh: '斑马板', en: 'Zone plate' }, P.zonePlate(32, 32, 0.06)],
      [{ zh: '细条纹', en: 'Fine stripes' }, P.stripes(2.5, 0.1, 0.9, 32, 32)],
      [{ zh: '大圆盘', en: 'Large disc' }, fromFn(32, 32, (x, y) => ((x - 15.5) ** 2 + (y - 15.5) ** 2 < 100 ? 0.9 : 0.1))],
    ].map(([label, img]) => test(label, { in: img }, { out: prefiltered(img) })),
    hidden: [
      [{ zh: '横向细条纹', en: 'Fine horizontal stripes' }, fromFn(32, 32, (x, y) => (Math.floor((y * 2) / 2.5) % 2 ? 0.9 : 0.1))],
      [{ zh: '细棋盘', en: 'Fine checkerboard' }, fromFn(32, 32, (x, y) => ((x + y) % 2 ? 0.85 : 0.15))],
      [{ zh: '偏心斑马板', en: 'Off-centre zone plate' }, fromFn(32, 32, (x, y) => 0.5 + 0.4 * Math.cos(0.05 * ((x - 10) ** 2 + (y - 20) ** 2)))],
    ].map(([label, img]) => test(label, { in: img }, { out: prefiltered(img) })),
    solution: build({ g: ['gauss', { sigma: 1, border: 'edge' }], d: 'downsample' }, ['in>g', 'g>d', 'd>out']),
    naive: build({ d: 'downsample' }, ['in>d', 'd>out']),
  },
]

// ---------------- chapter 3 · 光与边 ----------------

const edgeMask = (img) => {
  const g = gradmag(img, 'edge')
  const peak = Math.max(...g.data)
  return map(g, (v) => (v / peak > 0.5 ? 1 : 0))
}
const lit = (img, gain, offset) => map(img, (v) => v * gain + offset)

export const chapter3 = [
  {
    id: '3-6',
    views: { in: 'slope', out: 'terrain', mid: 'terrain' },
    chapter: 3,
    title: { zh: '梯度大小', en: 'Gradient magnitude' },
    brief: { zh: '上一关你在一个点上量出 gx、gy，拼成箭头。现在要在每个像素上都量，并输出箭头有多长：√(gx² + gy²)。不管边是横的、竖的还是斜的，越陡的地方越亮。', en: 'Last level you measured gx and gy at one point and combined them into an arrow. Now measure them at every pixel and output how long the arrow is: √(gx² + gy²). Whether an edge is horizontal, vertical or diagonal, the steeper it is, the brighter.' },
    hint: { zh: 'Sobel x 在每个像素量 gx，Sobel y 量 gy（第 1 章搭过）。箭头长度怎么从两个分量算出来？想想勾股定理。', en: 'Sobel x measures gx at every pixel and Sobel y measures gy (you built them in chapter 1). How do you get the arrow\'s length from its two components? Think of Pythagoras.' },
    after: { zh: '两个方向的坡度合成一个长度，边缘强度就和边的方向无关了：横边、竖边、斜边一样亮。方向本身是 atan2(gy, gx)。切到「地形」视图看：输出在每条边上隆起一道山脊。', en: 'Combining the slopes in two directions into one length makes edge strength independent of edge direction: horizontal, vertical and diagonal edges are equally bright. The direction itself is atan2(gy, gx). Switch to the "Terrain" view: the output rises into a ridge along every edge.' },
    requires: ['3-5'],
    unlocks: ['gradmag'],
    grants: ['square'],
    palette: ['sobelx', 'sobely', 'square', 'sqrt', 'add', 'scale'],
    tests: [[{ zh: '方块', en: 'Square' }, P.square()], [{ zh: '圆盘', en: 'Disc' }, P.disk()], [{ zh: '字母 X', en: 'Letter X' }, P.glyph(GLYPHS.X)], [{ zh: '角', en: 'Corner' }, P.corner()]].map(([label, img]) => test(label, { in: img }, { out: gradmag(img) })),
    hidden: [[{ zh: '低对比圆盘', en: 'Low-contrast disc' }, P.disk(9, 6, 4, 0.4, 0.65)], [{ zh: '挪开的字母 T', en: 'Shifted letter T' }, P.glyph(GLYPHS.T, 0.2, 0.75, 5, 4)], [{ zh: '斜坡', en: 'Ramp' }, fromFn(16, 16, (x, y) => 0.1 + 0.03 * x + 0.02 * y)]].map(([label, img]) => test(label, { in: img }, { out: gradmag(img) })),
    solution: build({ x: 'sobelx', y: 'sobely', xx: 'square', yy: 'square', a: 'add', r: 'sqrt' }, ['in>x', 'in>y', 'x>xx', 'y>yy', 'xx>a.a', 'yy>a.b', 'a>r', 'r>out']),
  },
  {
    id: '3-8',
    views: { in: 'slope', out: 'pixels', mid: 'terrain' },
    chapter: 3,
    title: { zh: '关灯也认得', en: 'Seen even in dim light' },
    brief: { zh: '同一个物体在不同灯光下拍了几次：有的整体变亮，有的灯暗了一半。每次都要标出同一组边。上一关你发现，灯一暗，坡度就一起变小，固定门槛会漏边。', en: 'The same object was photographed several times under different lighting: in some shots it is brighter overall, in others the light is half as strong. Each time, mark the same set of edges. Last level you found that when the light dims, every slope shrinks with it, so a fixed threshold misses edges.' },
    hint: { zh: '不知道灯暗了多少，能不能在图里找一把跟着灯光一起变长变短的尺子？', en: 'You don\'t know how much the light dimmed. Can you find a ruler inside the image that grows and shrinks with the light?' },
    after: { zh: '求坡度去掉了整体加亮（偏置），除以最陡的坡度去掉了整体倍数（增益）。设计特征时先问：哪些变化不应该改变答案？这叫不变性。注意图外补的数：补 0 会在图边造出一条随灯光变化的假边，所以要复制边缘。', en: 'Taking slopes removes an overall brightening (the offset); dividing by the steepest slope removes an overall scaling (the gain). When you design a feature, first ask: which changes should not change the answer? This is called invariance. Mind the padding outside the image: padding with 0 creates a fake edge at the border that changes with the lighting, so replicate the edge instead.' },
    requires: ['3-7', '1-8'],
    unlocks: ['normalize'],
    grants: ['normalize', 'edge-pad'],
    palette: ['gradmag', 'globalMax', 'divide', 'threshold', 'scale', 'offset'],
    tests: [[1, 0], [0.45, 0.05], [1.6, -0.1], [0.7, 0.3]].map(([gain, offset]) => {
      const scene = P.glyph(GLYPHS.F, 0.15, 0.55)
      const extra = offset ? ` ${offset > 0 ? '+' : ''}${offset}` : ''
      return test({ zh: `灯光 ×${gain}${extra}`, en: `Light ×${gain}${extra}` }, { in: lit(scene, gain, offset) }, { out: edgeMask(scene) })
    }),
    hidden: [
      [{ zh: '换个物体 · 弱光', en: 'Another object · dim light' }, P.glyph(GLYPHS.T, 0.2, 0.6, 4, 3), 0.35, 0.02],
      [{ zh: '换个物体 · 强光', en: 'Another object · bright light' }, P.square(3, 5, 7, 0.1, 0.5), 1.8, 0.1],
      [{ zh: '换个物体 · 灰蒙蒙', en: 'Another object · hazy' }, P.glyph(GLYPHS.L, 0.15, 0.55, 6, 4), 0.5, 0.45],
    ].map(([label, scene, gain, offset]) => test(label, { in: lit(scene, gain, offset) }, { out: edgeMask(scene) })),
    solution: build({ g: ['gradmag', { border: 'edge' }], m: 'globalMax', d: 'divide', t: ['threshold', { t: 0.5 }] }, ['in>g', 'g>m', 'g>d.a', 'm>d.b', 'd>t', 't>out']),
    naive: build({ g: 'gradmag', t: ['threshold', { t: 0.1 }] }, ['in>g', 'g>t', 't>out']),
  },
]

// ---------------- chapter 4 · 学会看 ----------------

const HIDDEN = [0.1, -0.3, 0.2, 0.4, 0.15, -0.2, -0.1, 0.35, 0.05]
const noiseScene = (seed) => map(P.noise(seed, 1), (v) => v - 0.5)
const dotsAt = (points) => fromFn(16, 16, (x, y) => (points.some(([px, py]) => px === x && py === y) ? 1 : 0.05))

export const chapter4 = [
  {
    id: '4-2',
    chapter: 4,
    title: { zh: '让机器调旋钮', en: 'Let the machine turn the knobs' },
    brief: { zh: '上一关你用一个、两个旋钮下过山。这次是一个未知的 3×3 核：九个旋钮，数字很乱，凭眼睛猜不出来。接上可学习核，按「训练」。', en: 'Last level you walked downhill with one knob, then two. This time it is an unknown 3×3 kernel: nine knobs with messy numbers you can\'t guess by eye. Wire up a learnable kernel and press "Train".' },
    hint: { zh: '每按一次，九个旋钮一起往下坡挪一步（和上一关的「走一步」一样，只是旋钮多了）。看损失曲线往下走。', en: 'Each press moves all nine knobs one step downhill together (just like "Take a step" in the last level, only with more knobs). Watch the loss curve go down.' },
    after: { zh: '你没有设计这个核，它是从例子里学出来的。手工设计的特征，就这样被学到的特征取代了。', en: 'You didn\'t design this kernel; it was learned from examples. This is how learned features replace hand-designed ones.' },
    requires: ['4-1'],
    unlocks: ['learn3'],
    palette: ['learn3'],
    check: { tolerance: 0.02 },
    tests: [1, 2, 3, 4].map((seed) => test({ zh: `样本 ${seed}`, en: `Sample ${seed}` }, { in: noiseScene(seed) }, { out: correlate(noiseScene(seed), HIDDEN) })),
    hidden: [7, 8].map((seed) => test({ zh: `新样本 ${seed}`, en: `New sample ${seed}` },{ in: noiseScene(seed) }, { out: correlate(noiseScene(seed), HIDDEN) })),
    solution: build({ k: ['learn3', { w: HIDDEN }] }, ['in>k', 'k>out']),
    naive: build({ k: 'learn3' }, ['in>k', 'k>out']),
  },
  {
    id: '4-4',
    chapter: 4,
    title: { zh: '两种边都要', en: 'Both kinds of edge' },
    brief: { zh: '暗→亮的边和亮→暗的边都要输出正的强度（输出 = |右边 − 自己|）。', en: 'Both dark→light and light→dark edges must give a positive strength (output = |right − self|).' },
    hint: { zh: '只用加减和乘系数，无论怎么组合，暗→亮和亮→暗都会得到相反的符号。新元件 ReLU 把负数变成 0。', en: 'With only add, subtract and scale, however you combine them, dark→light and light→dark get opposite signs. The new part ReLU turns negative numbers into 0.' },
    after: { zh: '任何只含加减乘系数的组合都是线性的，正负号必然对称。中间插一个非线性（ReLU），网络才能表达“两种都要”。这就是神经网络需要激活函数的原因。', en: 'Any combination of add, subtract and scale is linear, so the signs are bound to be symmetric. Only by putting a nonlinearity (ReLU) in between can the network express "I want both". This is why neural networks need activation functions.' },
    requires: ['1-4', '4-3'],
    unlocks: ['relu'],
    palette: ['diffx', 'relu', 'scale', 'add', 'sub'],
    tests: [[{ zh: '方块', en: 'Square' }, P.square()], [{ zh: '亮底暗块', en: 'Dark square on light' }, P.square(4, 4, 8, 0.9, 0.1)], [{ zh: '字母 O', en: 'Letter O' }, P.glyph(GLYPHS.O)], [{ zh: '棋盘', en: 'Checkerboard' }, P.checker()]].map(([label, img]) => test(label, { in: img }, { out: absdiff(img) })),
    hidden: [
      [{ zh: '往右变暗的坡', en: 'Ramp darkening to the right' }, fromFn(16, 16, (x) => 0.85 - 0.04 * x)],
      [{ zh: '挪开的低对比圆盘', en: 'Shifted low-contrast disc' }, P.disk(10, 6, 3.5, 0.35, 0.6)],
      [{ zh: '字母 X', en: 'Letter X' }, P.glyph(GLYPHS.X, 0.8, 0.2, 4, 4)],
    ].map(([label, img]) => test(label, { in: img }, { out: absdiff(img) })),
    solution: build({ d: 'diffx', p: 'relu', n: ['scale', { k: -1 }], q: 'relu', a: 'add' }, ['in>d', 'd>p', 'd>n', 'n>q', 'p>a.a', 'q>a.b', 'a>out']),
    naive: build({ d: 'diffx' }, ['in>d', 'd>out']),
  },
  {
    id: '4-6',
    chapter: 4,
    title: { zh: '挪一格也不变', en: 'Unchanged by a one-pixel shift' },
    brief: { zh: '同一组特征点有时会偏一格。把 16×16 缩成 8×8，偏一格时结果必须完全一样。', en: 'The same set of keypoints is sometimes off by one pixel. Shrink 16×16 to 8×8; when they shift by one pixel, the result must be exactly the same.' },
    hint: { zh: '隔点取样会因为偏一格而错过亮点。有没有一种缩小，只关心“这一块里有没有”？', en: 'Downsampling misses bright points when they shift by one pixel. Is there a way to shrink that only cares whether a block contains something?' },
    after: { zh: '最大池化只问“这 2×2 里最强的是多少”，点在块内挪动不影响答案。代价是丢掉了块内的精确位置。', en: 'Max pooling only asks "what is the strongest value in this 2×2?", so a point moving within its block doesn\'t change the answer. The price is losing the exact position inside the block.' },
    requires: ['4-5', '2-8'],
    unlocks: ['maxpool'],
    palette: ['downsample', 'maxpool', 'box3', 'relu'],
    tests: [
      [{ zh: '原位', en: 'In place' }, [[4, 4], [10, 6], [6, 12]]],
      [{ zh: '偏右下', en: 'Shifted down-right' }, [[5, 5], [11, 7], [7, 13]]],
      [{ zh: '偏右', en: 'Shifted right' }, [[5, 4], [11, 6], [7, 12]]],
      [{ zh: '偏下', en: 'Shifted down' }, [[4, 5], [10, 7], [6, 13]]],
    ].map(([label, points]) => test(label, { in: dotsAt(points) }, { out: maxPool(dotsAt([[4, 4], [10, 6], [6, 12]]), 2) })),
    hidden: [
      [{ zh: '另一组 · 原位', en: 'Another set · in place' }, [0, 0]],
      [{ zh: '另一组 · 偏右下', en: 'Another set · shifted down-right' }, [1, 1]],
      [{ zh: '另一组 · 偏下', en: 'Another set · shifted down' }, [0, 1]],
    ].map(([label, [dx, dy]]) => {
      const base = [[2, 2], [12, 4], [8, 8], [14, 10], [4, 14]]
      return test(label, { in: dotsAt(base.map(([x, y]) => [x + dx, y + dy])) }, { out: maxPool(dotsAt(base), 2) })
    }),
    solution: build({ m: 'maxpool' }, ['in>m', 'm>out']),
    naive: build({ d: 'downsample' }, ['in>d', 'd>out']),
  },
]

// ---------------- chapter 6 · 认出同一个点 ----------------

const HARRIS_T = 0.22
const cornerMask = (img) => map(harrisResponse(img), (v) => (v > HARRIS_T ? 1 : 0))

export const chapter6 = [
  {
    id: '6-1',
    views: { in: 'slope', out: 'pixels', mid: 'terrain' },
    chapter: 6,
    title: { zh: '角点', en: 'Corners' },
    brief: { zh: '只在角上输出 1。直边、平坦处都是 0。', en: 'Output 1 only at corners. Straight edges and flat areas are 0.' },
    hint: { zh: '在角上，往哪个方向挪都会变；在直边上，沿着边挪不会变。分别统计 Gx²、Gy²、Gx·Gy 在 3×3 窗口里的和，再算 det − 0.05·trace²。', en: 'At a corner, moving in any direction changes what you see; on a straight edge, moving along the edge changes nothing. Sum Gx², Gy² and Gx·Gy over a 3×3 window, then compute det − 0.05·trace².' },
    after: { zh: '你搭出了 Harris 角点检测：两个方向的变化都大，才是角。直边只有一个方向大，所以 det 小、R 为负。', en: 'You have built the Harris corner detector: it is a corner only when the change is large in both directions. A straight edge is large in only one direction, so det is small and R is negative.' },
    requires: ['3-6'],
    unlocks: ['harris'],
    grants: ['mul'],
    palette: ['sobelx', 'sobely', 'mul', 'box3', 'add', 'sub', 'scale', 'threshold'],
    check: { tolerance: 0.5, mismatches: 2 },
    tests: [[{ zh: '一个角', en: 'One corner' }, P.corner()], [{ zh: '方块', en: 'Square' }, P.square(4, 4, 8)], [{ zh: '直边', en: 'Straight edge' }, P.stepX(8)], [{ zh: '字母 L', en: 'Letter L' }, P.glyph(GLYPHS.L)]].map(([label, img]) => test(label, { in: img }, { out: cornerMask(img) })),
    hidden: [[{ zh: '字母 T', en: 'Letter T' }, P.glyph(GLYPHS.T, 0.1, 0.9, 4, 3)], [{ zh: '挪开的小方块', en: 'Shifted small square' }, P.square(8, 2, 5)], [{ zh: '横边', en: 'Horizontal edge' }, P.stepY(9)]].map(([label, img]) => test(label, { in: img }, { out: cornerMask(img) })),
    solution: build(
      {
        x: 'sobelx', y: 'sobely', xx: 'mul', yy: 'mul', xy: 'mul', sxx: 'box3', syy: 'box3', sxy: 'box3',
        p: 'mul', q: 'mul', det: 'sub', tr: 'add', tt: 'mul', kt: ['scale', { k: 0.05 }], r: 'sub', s: ['scale', { k: 100 }], t: ['threshold', { t: HARRIS_T }],
      },
      ['in>x', 'in>y', 'x>xx.a', 'x>xx.b', 'y>yy.a', 'y>yy.b', 'x>xy.a', 'y>xy.b', 'xx>sxx', 'yy>syy', 'xy>sxy', 'sxx>p.a', 'syy>p.b', 'sxy>q.a', 'sxy>q.b', 'p>det.a', 'q>det.b', 'sxx>tr.a', 'syy>tr.b', 'tr>tt.a', 'tr>tt.b', 'tt>kt', 'det>r.a', 'kt>r.b', 'r>s', 's>t', 't>out'],
    ),
    naive: build({ x: 'sobelx', y: 'sobely', xx: 'mul', yy: 'mul', a: 'add', s: ['scale', { k: 100 }], t: ['threshold', { t: HARRIS_T }] }, ['in>x', 'in>y', 'x>xx.a', 'x>xx.b', 'y>yy.a', 'y>yy.b', 'xx>a.a', 'yy>a.b', 'a>s', 's>t', 't>out']),
  },
]

// ---------------- chapter 7 · 第三个维度 ----------------

// Random-dot stereo pairs: no single image shows the shape; only matching the two does.
function stereoPair(seed, region, d = 2, noise = 0) {
  const next = random(seed)
  const texture = () => Array.from({ length: 16 * 16 }, () => 0.1 + 0.8 * next())
  const near = texture()
  const far = texture()
  const truth = fromFn(16, 16, (x, y) => (region(x, y) ? d : 0))
  const left = fromFn(16, 16, (x, y) => (region(x, y) ? near : far)[y * 16 + x])
  // The right camera sees the near surface d pixels further left: left(x) = right(x − d).
  const right = fromFn(16, 16, (x, y) => (x + d < 16 && region(x + d, y) ? near[y * 16 + x + d] : far[y * 16 + x]))
  const jitter = (img, s) => (noise ? addNoise(img, s, noise) : img)
  return { left: jitter(left, seed + 50), right: jitter(right, seed + 90), truth }
}
const inSquare = (x, y) => x >= 5 && x < 11 && y >= 4 && y < 12
const inBar = (x, y) => x >= 7 && x < 10 && y >= 2 && y < 14
const inLeftBlock = (x, y) => x >= 3 && x < 10 && y >= 3 && y < 10
const inLowBlock = (x, y) => x >= 6 && x < 13 && y >= 7 && y < 14
const inLeftBar = (x, y) => x >= 4 && x < 7 && y >= 1 && y < 13

// The reference matcher for 7-1: compare the left image with the right one shifted by d = 0…3,
// optionally summing the squared error over a 3×3 window, and keep the best d.
function matcher(windowed) {
  const nodes = { argmin: 'argmin4' }
  const wires = ['argmin>out']
  for (let d = 0; d < 4; d++) {
    let last = 'right'
    for (let s = 0; s < d; s++) {
      nodes[`r${d}${s}`] = ['shift', { dir: '→' }]
      wires.push(`${last}>r${d}${s}`)
      last = `r${d}${s}`
    }
    nodes[`e${d}`] = 'sub'
    nodes[`q${d}`] = 'square'
    wires.push(`left>e${d}.a`, `${last}>e${d}.b`, `e${d}>q${d}`)
    if (windowed) {
      nodes[`b${d}`] = 'box3'
      wires.push(`q${d}>b${d}`, `b${d}>argmin.c${d}`)
    } else {
      wires.push(`q${d}>argmin.c${d}`)
    }
  }
  return build(nodes, wires, { inputs: ['left', 'right'] })
}

export const chapter7 = [
  (() => {
    const pairs = [11, 12, 13].map((seed) => stereoPair(seed, inSquare, 2, 0.1))
    return {
      id: '7-1',
      views: { out: 'terrain' },
      chapter: 7,
      title: { zh: '找视差', en: 'Find the disparity' },
      inputs: ['left', 'right'],
      brief: { zh: '两台相机拍下两张满是噪点的图，单看哪一张都没有形状。输出每个像素的视差（0–3）；允许少量像素出错。', en: 'Two cameras took two images full of random dots; neither one on its own shows any shape. Output the disparity (0–3) of every pixel. A few wrong pixels are allowed.' },
      hint: { zh: '对每个可能的 d，把右图挪一挪再和左图比。单个像素比不准时，看看它周围。', en: 'For each possible d, shift the right image and compare it with the left one. When single pixels do not compare reliably, look at what is around them.' },
      after: { zh: '形状只在“匹配”里出现：近处的方块在两张图里错开了 2 格。对应点只需在同一行里找，视差越大，物体越近。', en: 'The shape only appears through matching: the nearby square is offset by 2 pixels between the two images. Corresponding points only need to be searched for along the same row, and the larger the disparity, the nearer the object.' },
      requires: ['1-2', '0-4'],
      unlocks: ['disparity'],
      grants: ['square', 'argmin'],
      palette: ['shift', 'sub', 'square', 'box3', 'argmin4', 'add'],
      check: { tolerance: 0.1, mismatches: 34 },
      tests: pairs.map((pair, index) => test({ zh: `第 ${index + 1} 对`, en: `Pair ${index + 1}` }, { left: pair.left, right: pair.right }, { out: pair.truth })),
      hidden: [
        [{ zh: '远一点的块', en: 'A farther block' }, stereoPair(14, inLeftBlock, 1, 0.1)],
        [{ zh: '近一点的块', en: 'A nearer block' }, stereoPair(15, inLowBlock, 3, 0.1)],
      ].map(([label, pair]) => test(label, { left: pair.left, right: pair.right }, { out: pair.truth })),
      solution: matcher(true),
      naive: matcher(false),
    }
  })(),
  (() => {
    const cases = [
      [{ zh: '有噪声的方块', en: 'Noisy square' }, stereoPair(21, inSquare, 2, 0.3)],
      [{ zh: '细柱', en: 'Thin bar' }, stereoPair(22, inBar, 3)],
      [{ zh: '更近的噪声方块', en: 'Nearer noisy square' }, stereoPair(24, inSquare, 3, 0.3)],
    ]
    return {
      id: '7-2',
      views: { out: 'terrain' },
      chapter: 7,
      title: { zh: '窗口多大', en: 'How big a window?' },
      inputs: ['left', 'right'],
      brief: { zh: '用视差搜索元件。噪声图和细柱图都要算对（与真实视差相差不超过 1、错的像素不多）。', en: 'Use the Disparity search part. Get both the noisy images and the thin-bar image right (within 1 of the true disparity, with few wrong pixels).' },
      hint: { zh: '窗口小，噪声会骗过匹配；窗口大，细东西会被周围的背景淹没。', en: 'With a small window, noise fools the matching; with a large one, thin things drown in the surrounding background.' },
      after: { zh: '没有对所有图都最好的窗口：大窗口抗噪但抹掉细节，小窗口保细节但怕噪声。很多视觉问题都是这种权衡。', en: 'No window is best for every image: a large window resists noise but wipes out detail; a small one keeps detail but is vulnerable to noise. Many vision problems involve this kind of trade-off.' },
      requires: ['7-1'],
      unlocks: [],
      palette: ['disparity'],
      check: { tolerance: 1.01, mismatches: 28 },
      tests: cases.map(([label, pair]) => test(label, { left: pair.left, right: pair.right }, { out: pair.truth })),
      hidden: [
        [{ zh: '换个位置的噪声块', en: 'Noisy block, moved' }, stereoPair(25, inLowBlock, 2, 0.3)],
        [{ zh: '另一根细柱', en: 'Another thin bar' }, stereoPair(26, inLeftBar, 2)],
      ].map(([label, pair]) => test(label, { left: pair.left, right: pair.right }, { out: pair.truth })),
      solution: build({ d: ['disparity', { window: 5 }] }, ['left>d.left', 'right>d.right', 'd>out'], { inputs: ['left', 'right'] }),
      naive: build({ d: ['disparity', { window: 1 }] }, ['left>d.left', 'right>d.right', 'd>out'], { inputs: ['left', 'right'] }),
      alsoFails: [build({ d: ['disparity', { window: 3 }] }, ['left>d.left', 'right>d.right', 'd>out'], { inputs: ['left', 'right'] }), build({ d: ['disparity', { window: 7 }] }, ['left>d.left', 'right>d.right', 'd>out'], { inputs: ['left', 'right'] })],
    }
  })(),
]
