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
    title: '缩小一半',
    brief: '把 32×32 的图缩成 16×16，看起来要和原图一样（只是变小）。',
    hint: '隔点取样把每行 32 个点变成 16 个。上一关说过：16 个点能分辨到哪个频率？更快的纹会怎样？在扔掉点之前，先做点什么。',
    after: '直接隔点取样，频率高于 8 的细纹会折回来，冒充成原图里没有的粗纹（莫尔纹），这就是混叠。先用高斯模糊把这些频率压下去，再取样：抗混叠必须发生在采样之前。拍照、缩略图、CNN 里的步长卷积，都会遇到同一个问题。',
    requires: ['2-7'],
    unlocks: [],
    grants: ['edge-pad'],
    palette: ['downsample', 'gauss', 'box3'],
    check: { tolerance: 0.12, mismatches: 6 },
    tests: [
      ['斑马板', P.zonePlate(32, 32, 0.06)],
      ['细条纹', P.stripes(2.5, 0.1, 0.9, 32, 32)],
      ['大圆盘', fromFn(32, 32, (x, y) => ((x - 15.5) ** 2 + (y - 15.5) ** 2 < 100 ? 0.9 : 0.1))],
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
    title: '梯度大小',
    brief: '上一关你在一个点上量出 gx、gy，拼成箭头。现在要在每个像素上都量，并输出箭头有多长：√(gx² + gy²)。不管边是横的、竖的还是斜的，越陡的地方越亮。',
    hint: 'Sobel x 在每个像素量 gx，Sobel y 量 gy（第 1 章搭过）。箭头长度怎么从两个分量算出来？想想勾股定理。',
    after: '两个方向的坡度合成一个长度，边缘强度就和边的方向无关了：横边、竖边、斜边一样亮。方向本身是 atan2(gy, gx)，后面找角点会用到。切到「地形」视图看：输出在每条边上隆起一道山脊。',
    requires: ['3-5'],
    unlocks: ['gradmag'],
    grants: ['square'],
    palette: ['sobelx', 'sobely', 'square', 'sqrt', 'add', 'scale'],
    tests: [['方块', P.square()], ['圆盘', P.disk()], ['字母 X', P.glyph(GLYPHS.X)], ['角', P.corner()]].map(([label, img]) => test(label, { in: img }, { out: gradmag(img) })),
    solution: build({ x: 'sobelx', y: 'sobely', xx: 'square', yy: 'square', a: 'add', r: 'sqrt' }, ['in>x', 'in>y', 'x>xx', 'y>yy', 'xx>a.a', 'yy>a.b', 'a>r', 'r>out']),
  },
  {
    id: '3-8',
    views: { in: 'slope', out: 'pixels', mid: 'terrain' },
    chapter: 3,
    title: '关灯也认得',
    brief: '同一个物体在不同灯光下拍了几次：有的整体变亮，有的灯暗了一半。每次都要标出同一组边。上一关你发现，灯一暗，坡度就一起变小，固定门槛会漏边。',
    hint: '不知道灯暗了多少，就拿图里最陡的那条边当尺子：所有坡度都除以它。灯暗一半，尺子也短一半，比值不变。',
    after: '求坡度去掉了整体加亮（偏置），除以最陡的坡度去掉了整体倍数（增益）。设计特征时先问：哪些变化不应该改变答案？这叫不变性。注意图外补的数：补 0 会在图边造出一条随灯光变化的假边，所以要复制边缘。',
    requires: ['3-7', '1-7'],
    unlocks: ['normalize'],
    grants: ['normalize', 'edge-pad'],
    palette: ['gradmag', 'globalMax', 'divide', 'threshold', 'scale', 'offset'],
    tests: [[1, 0], [0.45, 0.05], [1.6, -0.1], [0.7, 0.3]].map(([gain, offset]) => {
      const scene = P.glyph(GLYPHS.F, 0.15, 0.55)
      return test(`灯光 ×${gain}${offset ? ` ${offset > 0 ? '+' : ''}${offset}` : ''}`, { in: lit(scene, gain, offset) }, { out: edgeMask(scene) })
    }),
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
    title: '让机器调旋钮',
    brief: '上一关你用一个、两个旋钮下过山。这次是一个未知的 3×3 核：九个旋钮，数字很乱，凭眼睛猜不出来。接上可学习核，按「训练」。',
    hint: '每按一次，九个旋钮一起往下坡挪一步（和上一关的「走一步」一样，只是旋钮多了）。看损失曲线往下走。',
    after: '你没有设计这个核，它是从例子里学出来的。卷积网络里成千上万个核都是这样来的：手工设计的特征被学到的特征取代了。',
    requires: ['4-1'],
    unlocks: ['learn3'],
    palette: ['learn3'],
    check: { tolerance: 0.02 },
    tests: [1, 2, 3, 4].map((seed) => test(`样本 ${seed}`, { in: noiseScene(seed) }, { out: correlate(noiseScene(seed), HIDDEN) })),
    solution: build({ k: ['learn3', { w: HIDDEN }] }, ['in>k', 'k>out']),
    naive: build({ k: 'learn3' }, ['in>k', 'k>out']),
  },
  {
    id: '4-4',
    chapter: 4,
    title: '两种边都要',
    brief: '暗→亮的边和亮→暗的边都要输出正的强度（输出 = |右边 − 自己|）。',
    hint: '只用加减和乘系数，无论怎么组合，暗→亮和亮→暗都会得到相反的符号。新元件 ReLU 把负数变成 0。',
    after: '任何只含加减乘系数的组合都是线性的，正负号必然对称。中间插一个非线性（ReLU），网络才能表达“两种都要”。这就是神经网络需要激活函数的原因。',
    requires: ['1-4', '4-3'],
    unlocks: ['relu'],
    palette: ['diffx', 'relu', 'scale', 'add', 'sub'],
    tests: [['方块', P.square()], ['亮底暗块', P.square(4, 4, 8, 0.9, 0.1)], ['字母 O', P.glyph(GLYPHS.O)], ['棋盘', P.checker()]].map(([label, img]) => test(label, { in: img }, { out: absdiff(img) })),
    solution: build({ d: 'diffx', p: 'relu', n: ['scale', { k: -1 }], q: 'relu', a: 'add' }, ['in>d', 'd>p', 'd>n', 'n>q', 'p>a.a', 'q>a.b', 'a>out']),
    naive: build({ d: 'diffx' }, ['in>d', 'd>out']),
  },
  {
    id: '4-6',
    chapter: 4,
    title: '挪一格也不变',
    brief: '同一组特征点有时会偏一格。把 16×16 缩成 8×8，偏一格时结果必须完全一样。',
    hint: '隔点取样会因为偏一格而错过亮点。有没有一种缩小，只关心“这一块里有没有”？',
    after: '最大池化只问“这 2×2 里最强的是多少”，点在块内挪动不影响答案。代价是丢掉了块内的精确位置。',
    requires: ['4-5', '2-8'],
    unlocks: ['maxpool'],
    palette: ['downsample', 'maxpool', 'box3', 'relu'],
    tests: [
      ['原位', [[4, 4], [10, 6], [6, 12]]],
      ['偏右下', [[5, 5], [11, 7], [7, 13]]],
      ['偏右', [[5, 4], [11, 6], [7, 12]]],
      ['偏下', [[4, 5], [10, 7], [6, 13]]],
    ].map(([label, points]) => test(label, { in: dotsAt(points) }, { out: maxPool(dotsAt([[4, 4], [10, 6], [6, 12]]), 2) })),
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
    title: '角点',
    brief: '只在角上输出 1。直边、平坦处都是 0。',
    hint: '在角上，往哪个方向挪都会变；在直边上，沿着边挪不会变。分别统计 Gx²、Gy²、Gx·Gy 在 3×3 窗口里的和，再算 det − 0.05·trace²。',
    after: '你搭出了 Harris 角点检测：两个方向的变化都大，才是角。直边只有一个方向大，所以 det 小、R 为负。',
    requires: ['3-6'],
    unlocks: ['harris'],
    grants: ['mul'],
    palette: ['sobelx', 'sobely', 'mul', 'box3', 'add', 'sub', 'scale', 'threshold'],
    check: { tolerance: 0.5, mismatches: 2 },
    tests: [['一个角', P.corner()], ['方块', P.square(4, 4, 8)], ['直边', P.stepX(8)], ['字母 L', P.glyph(GLYPHS.L)]].map(([label, img]) => test(label, { in: img }, { out: cornerMask(img) })),
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
      title: '找视差',
      inputs: ['left', 'right'],
      brief: '两台相机拍下两张满是噪点的图，单看哪一张都没有形状。输出每个像素的视差（0–3）；允许少量像素出错。',
      hint: '把右图往右挪 d 格，和左图逐像素比差的平方，在 3×3 窗口里加起来；对 d = 0、1、2、3 各做一遍，取最小的那个 d。',
      after: '形状只在“匹配”里出现：近处的方块在两张图里错开了 2 格。对应点只需在同一行里找，视差越大，物体越近。',
      requires: ['1-2', '0-4'],
      unlocks: ['disparity'],
      grants: ['square', 'argmin'],
      palette: ['shift', 'sub', 'square', 'box3', 'argmin4', 'add'],
      check: { tolerance: 0.1, mismatches: 34 },
      tests: pairs.map((pair, index) => test(`第 ${index + 1} 对`, { left: pair.left, right: pair.right }, { out: pair.truth })),
      solution: matcher(true),
      naive: matcher(false),
    }
  })(),
  (() => {
    const cases = [
      ['有噪声的方块', stereoPair(21, inSquare, 2, 0.3)],
      ['细柱', stereoPair(22, inBar, 3)],
      ['更近的噪声方块', stereoPair(24, inSquare, 3, 0.3)],
    ]
    return {
      id: '7-2',
      views: { out: 'terrain' },
      chapter: 7,
      title: '窗口多大',
      inputs: ['left', 'right'],
      brief: '用视差搜索元件。噪声图和细柱图都要算对（与真实视差相差不超过 1、错的像素不多）。',
      hint: '窗口小，噪声会骗过匹配；窗口大，细东西会被周围的背景淹没。',
      after: '没有对所有图都最好的窗口：大窗口抗噪但抹掉细节，小窗口保细节但怕噪声。很多视觉问题都是这种权衡，后面的方法（多尺度、全局优化）都在试图同时要两者。',
      requires: ['7-1'],
      unlocks: [],
      palette: ['disparity'],
      check: { tolerance: 1.01, mismatches: 28 },
      tests: cases.map(([label, pair]) => test(label, { left: pair.left, right: pair.right }, { out: pair.truth })),
      solution: build({ d: ['disparity', { window: 5 }] }, ['left>d.left', 'right>d.right', 'd>out'], { inputs: ['left', 'right'] }),
      naive: build({ d: ['disparity', { window: 1 }] }, ['left>d.left', 'right>d.right', 'd>out'], { inputs: ['left', 'right'] }),
      alsoFails: [build({ d: ['disparity', { window: 3 }] }, ['left>d.left', 'right>d.right', 'd>out'], { inputs: ['left', 'right'] }), build({ d: ['disparity', { window: 7 }] }, ['left>d.left', 'right>d.right', 'd>out'], { inputs: ['left', 'right'] })],
    }
  })(),
]
