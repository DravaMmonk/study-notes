// 第 7 章 · 第三个维度 (lectures 13–14). Stereo first: search the disparity, make it robust to a camera that
// exposes differently, turn it into distance. Then geometry with three numbers per point: the cross product (a
// wrap-round shift), where two lines meet, the epipolar line and the epipole. The series is a robot vacuum that
// must stop in front of obstacles.
import { addNoise, fromFn, image, map, random, zip } from '../../kit/domains/image/engine/image.js'
import { build, test } from '../../kit/domains/image/build.js'

// ---------------- stereo scenes ----------------
// Layers painted back to front, each with its own random texture and disparity d: the right camera sees a surface
// d pixels further left, left(x) = right(x − d). The background is a far wall at disparity `far`.

function stereo(seed, layers, { far = 0, noise = 0, gain = 1, offset = 0 } = {}) {
  const next = random(seed)
  const texture = () => Array.from({ length: 256 }, () => 0.1 + 0.8 * next())
  // Textures are drawn front layers first, the wall last.
  const front = layers.map(([region, d]) => [region, d, texture()])
  const all = [[() => true, far, texture()], ...front]
  const top = (x, y) => [...all].reverse().find(([region]) => region(x, y))
  const truth = fromFn(16, 16, (x, y) => top(x, y)[1])
  const left = fromFn(16, 16, (x, y) => top(x, y)[2][y * 16 + x])
  const right = fromFn(16, 16, (x, y) => {
    const hit = [...all].reverse().find(([region, d]) => x + d < 16 && region(x + d, y))
    return hit ? hit[2][y * 16 + x + hit[1]] : all[0][2][y * 16 + x]
  })
  const jitter = (img, s) => (noise ? addNoise(img, s, noise) : img)
  return { left: jitter(left, seed + 50), right: map(jitter(right, seed + 90), (v) => v * gain + offset), truth }
}
const box = (x0, y0, x1, y1) => (x, y) => x >= x0 && x < x1 && y >= y0 && y < y1
const inSquare = box(5, 4, 11, 12)
const inBar = box(7, 2, 10, 14)
const inLeftBlock = box(3, 3, 10, 10)
const inLowBlock = box(6, 7, 13, 14)
const inLeftBar = box(4, 1, 7, 13)
const pairOf = (label, scene) => test(label, { left: scene.left, right: scene.right }, { out: scene.truth })

// ---------------- 7-0 找视差 ----------------
// Compare the left image with the right one shifted by d = 0 … 3, optionally summing the squared error over a 3×3
// window, and keep the d with the smallest error.

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
    nodes[`e${d}`] = ['arith', { op: 'sub' }]
    nodes[`q${d}`] = ['arith', { op: 'mul' }]
    wires.push(`left>e${d}.a`, `${last}>e${d}.b`, `e${d}>q${d}.a`, `e${d}>q${d}.b`)
    if (windowed) {
      nodes[`b${d}`] = 'box3'
      wires.push(`q${d}>b${d}`, `b${d}>argmin.c${d}`)
    } else {
      wires.push(`q${d}>argmin.c${d}`)
    }
  }
  return build(nodes, wires, { inputs: ['left', 'right'] })
}
const STEREO = { inputs: ['left', 'right'], inputLabels: { left: { zh: '左相机', en: 'Left camera' }, right: { zh: '右相机', en: 'Right camera' } } }

const findDisparity = {
  id: '7-1',
  ...STEREO,
  views: { out: 'terrain' },
  chapter: 7,
  title: { zh: '找视差', en: 'Find the disparity' },
  brief: { zh: '左右两台相机拍同一个场景。输出每个像素的视差 d（0 … 3）：右图里同一个点比左图往左挪了几格。', en: 'Two cameras, left and right, photograph the same scene. Output each pixel\'s disparity d (0 … 3): how many pixels further left the same point is in the right image.' },
  hint: { zh: '对每个可能的 d，把右图挪一挪再和左图比。单个像素比不准时，看看它周围。', en: 'For each possible d, shift the right image and compare it with the left one. When single pixels do not compare reliably, look at what is around them.' },
  after: { zh: '形状只在「匹配」里出现：每张图单看都只是杂点。对应点只需在同一行里找，视差越大，物体越近。你的搜索现在是现成的元件「视差搜索」。', en: 'The shape only appears through matching: each image on its own is just speckle. Corresponding points only need to be searched for along the same row, and the larger the disparity, the nearer the object. Your search is now a ready-made part, "Disparity search".' },
  unlocks: ['disparity'],
  palette: ['shift', 'arith', 'merge', 'box3', 'argmin4'],
  check: { tolerance: 0.1, mismatches: 34 },
  tests: [11, 12, 13].map((seed, i) => pairOf({ zh: `第 ${i + 1} 对`, en: `Pair ${i + 1}` }, stereo(seed, [[inSquare, 2]], { noise: 0.1 }))),
  hidden: [pairOf({ zh: '远一点的块', en: 'A farther block' }, stereo(14, [[inLeftBlock, 1]], { noise: 0.1 })), pairOf({ zh: '近一点的块', en: 'A nearer block' }, stereo(15, [[inLowBlock, 3]], { noise: 0.1 }))],
  solution: matcher(true),
  naive: matcher(false),
}

// ---------------- 7-1 窗口多大 ----------------

const windowed = (w) => build({ d: ['disparity', { window: w }] }, ['left>d.left', 'right>d.right', 'd>out'], { inputs: ['left', 'right'] })
const windowSize = {
  id: '7-2',
  ...STEREO,
  views: { out: 'terrain' },
  chapter: 7,
  title: { zh: '窗口多大', en: 'How big a window?' },
  brief: { zh: '用视差搜索元件。噪声图和细柱图都要算对（与真实视差相差不超过 1、错的像素不多）。', en: 'Use the Disparity search part. Get both the noisy images and the thin-bar image right (within 1 of the true disparity, with few wrong pixels).' },
  hint: { zh: '窗口小，噪声会骗过匹配；窗口大，细东西会被周围的背景淹没。', en: 'With a small window, noise fools the matching; with a large one, thin things drown in the surrounding background.' },
  after: { zh: '没有对所有图都最好的窗口：大窗口抗噪但抹掉细节，小窗口保细节但怕噪声。很多视觉问题都是这种权衡。', en: 'No window is best for every image: a large window resists noise but wipes out detail; a small one keeps detail but is vulnerable to noise. Many vision problems involve this kind of trade-off.' },
  unlocks: [],
  palette: ['disparity'],
  check: { tolerance: 1.01, mismatches: 28 },
  tests: [
    pairOf({ zh: '有噪声的方块', en: 'Noisy square' }, stereo(21, [[inSquare, 2]], { noise: 0.3 })),
    pairOf({ zh: '细柱', en: 'Thin bar' }, stereo(22, [[inBar, 3]])),
    pairOf({ zh: '更近的噪声方块', en: 'Nearer noisy square' }, stereo(24, [[inSquare, 3]], { noise: 0.3 })),
  ],
  hidden: [pairOf({ zh: '换个位置的噪声块', en: 'Noisy block, moved' }, stereo(25, [[inLowBlock, 2]], { noise: 0.3 })), pairOf({ zh: '另一根细柱', en: 'Another thin bar' }, stereo(26, [[inLeftBar, 2]]))],
  solution: windowed(5),
  naive: windowed(1),
  alsoFails: [windowed(3), windowed(7)],
}

// ---------------- 7-3 视差变距离 · 7-4 换一台相机 ----------------

const FB = 3 // focal length × baseline of the robot's camera, so z = 3 / d metres
const depthOf = (d, fb = FB) => map(d, (v) => fb / v)
const disparities = (seed, layers) => stereo(seed, layers, { far: 1 }).truth
const DEPTHS = [
  [{ zh: '一个箱子', en: 'A box' }, disparities(41, [[inSquare, 2]])],
  [{ zh: '近的柱子', en: 'A near post' }, disparities(42, [[inBar, 3]])],
  [{ zh: '两层', en: 'Two layers' }, disparities(43, [[inLeftBlock, 2], [inLowBlock, 3]])],
]
const toDistance = {
  id: '7-3',
  chapter: 7,
  title: { zh: '视差变距离', en: 'Disparity to distance' },
  inputs: ['d'],
  inputLabels: { d: { zh: '视差（像素）', en: 'Disparity (pixels)' } },
  views: { in: 'terrain', out: 'terrain' },
  brief: { zh: `这台双目相机的焦距 × 基线 f·b = ${FB}。把视差图换成距离图：z = f·b / d（米）。`, en: `This stereo camera's focal length × baseline is f·b = ${FB}. Turn the disparity map into a distance map: z = f·b / d (metres).` },
  hint: { zh: '一个常数除以一整张图，常数用在每一格上。', en: 'A constant divided by a whole picture applies to every cell.' },
  after: { zh: '距离和视差成反比：视差差一格，近处只差几厘米，远处可能差好几米，深度误差约是 z²/(f·b)。要让远处测得准，就要加宽基线或换长焦，可近处的视差又会大得超出搜索范围。', en: 'Distance is inversely proportional to disparity: a one-pixel slip in disparity is a few centimetres up close but can be metres far away, with a depth error of about z²/(f·b). To measure far things precisely you widen the baseline or use a longer lens, but then the disparity of near things grows past the search range.' },
  unlocks: [],
  palette: ['arith', 'merge', 'const'],
  tests: DEPTHS.map(([label, d]) => test(label, { d }, { out: depthOf(d) })),
  hidden: [[{ zh: '三层', en: 'Three layers' }, disparities(44, [[inLeftBlock, 2], [inBar, 3]])]].map(([label, d]) => test(label, { d }, { out: depthOf(d) })),
  solution: build({ k: ['const', { c: FB }], q: ['arith', { op: 'div' }] }, ['k>q.a', 'd>q.b', 'q>out'], { inputs: ['d'] }),
  naive: build({ k: ['const', { c: FB }], q: ['arith', { op: 'mul' }] }, ['k>q.a', 'd>q.b', 'q>out'], { inputs: ['d'] }),
}
const RIGS = [
  [{ zh: '长焦', en: 'A longer lens' }, 4, 1.5, DEPTHS[0][1]],
  [{ zh: '基线窄', en: 'A narrow baseline' }, 2, 0.5, DEPTHS[1][1]],
  [{ zh: '都变了', en: 'Both changed' }, 6, 0.75, DEPTHS[2][1]],
]
const rigTests = (cases) => cases.map(([label, f, b, d]) => test(label, { d, f: image(1, 1, f), b: image(1, 1, b) }, { out: depthOf(d, f * b) }))
const otherCamera = {
  id: '7-4',
  chapter: 7,
  title: { zh: '换一台相机', en: 'A different camera' },
  inputs: ['d', 'f', 'b'],
  inputLabels: { d: { zh: '视差（像素）', en: 'Disparity (pixels)' }, f: { zh: '焦距 f', en: 'Focal length f' }, b: { zh: '基线 b', en: 'Baseline b' } },
  views: { in: 'terrain', out: 'terrain' },
  brief: { zh: '换了一台双目相机，焦距 f 和基线 b 每组测试都不一样。把视差图换成距离图。', en: 'A different stereo camera: the focal length f and the baseline b change from test to test. Turn the disparity map into a distance map.' },
  hint: { zh: '上一关的 3 是哪两个数相乘来的？', en: 'Which two numbers multiplied together made last level\'s 3?' },
  after: { zh: '只有乘积 f·b 要紧：焦距翻倍、基线减半，测出来的距离一模一样。挑相机时比的是这个乘积。', en: 'Only the product f·b matters: double the focal length and halve the baseline and the distances come out exactly the same. When choosing a camera, this product is what to compare.' },
  unlocks: [],
  palette: ['arith', 'merge', 'const'],
  tests: rigTests(RIGS),
  hidden: rigTests([[{ zh: '广角', en: 'Wide angle' }, 1.5, 2, DEPTHS[0][1]]]),
  solution: build({ fb: ['arith', { op: 'mul' }], q: ['arith', { op: 'div' }] }, ['f>fb.a', 'b>fb.b', 'fb>q.a', 'd>q.b', 'q>out'], { inputs: ['d', 'f', 'b'] }),
  naive: build({ q: ['arith', { op: 'div' }] }, ['f>q.a', 'd>q.b', 'q>out'], { inputs: ['d', 'f', 'b'] }),
}

// ---------------- 7-5 三个数的叉积 · 7-6 两线交点 ----------------
// A point or a line is three numbers in a row. (a × b)ᵢ = aᵢ₊₁·bᵢ₊₂ − aᵢ₊₂·bᵢ₊₁, indices going round: a shift that
// wraps round brings element i + 1 to place i.

const vec = (...v) => ({ w: 3, h: 1, data: Float32Array.from(v) })
const cross = (a, b) => vec(a.data[1] * b.data[2] - a.data[2] * b.data[1], a.data[2] * b.data[0] - a.data[0] * b.data[2], a.data[0] * b.data[1] - a.data[1] * b.data[0])
const crossGraph = (wrap = true) =>
  build(
    {
      a1: ['shift', { dir: '←', border: wrap ? 'wrap' : 'zero' }], a2: ['shift', { dir: '←', border: wrap ? 'wrap' : 'zero' }],
      b1: ['shift', { dir: '←', border: wrap ? 'wrap' : 'zero' }], b2: ['shift', { dir: '←', border: wrap ? 'wrap' : 'zero' }],
      p: ['arith', { op: 'mul' }], q: ['arith', { op: 'mul' }], c: ['arith', { op: 'sub' }],
    },
    ['a>a1', 'a1>a2', 'b>b1', 'b1>b2', 'a1>p.a', 'b2>p.b', 'a2>q.a', 'b1>q.b', 'p>c.a', 'q>c.b', 'c>out'],
    { inputs: ['a', 'b'] },
  )
const CROSS = [
  [{ zh: 'x 叉 y', en: 'x cross y' }, vec(1, 0, 0), vec(0, 1, 0)],
  [{ zh: '两个点', en: 'Two points' }, vec(2, 1, 1), vec(5, 3, 1)],
  [{ zh: '一般的', en: 'General' }, vec(0.5, -1, 2), vec(1.5, 2, -0.5)],
]
const crossLevel = {
  id: '7-5',
  chapter: 7,
  title: { zh: '三个数的叉积', en: 'Cross product of three numbers' },
  inputs: ['a', 'b'],
  inputLabels: { a: { zh: 'a（三个数）', en: 'a (three numbers)' }, b: { zh: 'b（三个数）', en: 'b (three numbers)' } },
  brief: { zh: '输出 a × b：第 i 个数 = a 的第 i+1 个 × b 的第 i+2 个 − a 的第 i+2 个 × b 的第 i+1 个，下标数到头就从第一个接着数。', en: 'Output a × b: number i = a\'s number i+1 × b\'s number i+2 − a\'s number i+2 × b\'s number i+1, with the count going round to the first again past the end.' },
  hint: { zh: '平移的「边界」设置多了「循环」：挪出去的从另一头回来。', en: 'Shift\'s "Border" setting now has "Wrap round": what moves out comes back in at the other end.' },
  after: { zh: '叉积和两个向量都垂直。在齐次坐标里，一个点 (x, y, 1) 和一条线 (a, b, c) 都是三个数：两点的叉积是过它们的线，两线的叉积是它们的交点。你的电路现在是元件「叉积」。', en: 'The cross product is perpendicular to both vectors. In homogeneous coordinates a point (x, y, 1) and a line (a, b, c) are both three numbers: the cross product of two points is the line through them, and of two lines it is the point where they meet. Your circuit is now the part "Cross product".' },
  packs: { name: { zh: '叉积', en: 'Cross product' }, desc: { zh: '你在「三个数的叉积」里搭的：a × b', en: 'What you built in "Cross product of three numbers": a × b' } },
  grants: ['wrap'],
  unlocks: ['wrap'],
  palette: ['shift', 'arith', 'merge', 'const'],
  tests: CROSS.map(([label, a, b]) => test(label, { a, b }, { out: cross(a, b) })),
  hidden: [[{ zh: '反过来', en: 'The other way round' }, vec(1.5, 2, -0.5), vec(0.5, -1, 2)]].map(([label, a, b]) => test(label, { a, b }, { out: cross(a, b) })),
  solution: crossGraph(),
  naive: crossGraph(false),
}

const point = (x, y) => vec(x, y, 1)
const MEETS = [
  [{ zh: '十字', en: 'A cross' }, point(0, 2), point(4, 2), point(1, 0), point(1, 5)],
  [{ zh: '两条斜线', en: 'Two slants' }, point(0, 0), point(4, 4), point(0, 4), point(4, 0)],
  [{ zh: '交在外面', en: 'Meeting outside' }, point(0, 0), point(1, 2), point(3, 0), point(4, 1)],
]
const meetTests = (cases) => cases.map(([label, p, q, r, s]) => test(label, { p, q, r, s }, { out: cross(cross(p, q), cross(r, s)) }))
const meet = {
  id: '7-6',
  chapter: 7,
  title: { zh: '两线交点', en: 'Where two lines meet' },
  inputs: ['p', 'q', 'r', 's'],
  inputLabels: { p: { zh: '线一上的点 p', en: 'Point p on line 1' }, q: { zh: '线一上的点 q', en: 'Point q on line 1' }, r: { zh: '线二上的点 r', en: 'Point r on line 2' }, s: { zh: '线二上的点 s', en: 'Point s on line 2' } },
  brief: { zh: '每个点写成 (x, y, 1)。线一过 p、q，线二过 r、s。输出两条线的交点，也写成三个数（不必把第三个数化成 1）。', en: 'Each point is written (x, y, 1). Line 1 passes through p and q, line 2 through r and s. Output where the two lines meet, also as three numbers (no need to make the third one 1).' },
  hint: { zh: '叉积能从两个点得到一条线。', en: 'The cross product turns two points into a line.' },
  after: { zh: '两次叉积就找到了交点，不用解方程。三个数 (X, Y, W) 表示点 (X/W, Y/W)；两条线平行时 W = 0，交点在无穷远处，齐次坐标照样写得出来。', en: 'Two cross products find the meeting point with no equations to solve. Three numbers (X, Y, W) stand for the point (X/W, Y/W); when the lines are parallel W = 0 and they meet at infinity, which homogeneous coordinates can still write down.' },
  unlocks: [],
  palette: ['own-7-5', 'arith', 'merge', 'const'],
  tests: meetTests(MEETS),
  hidden: meetTests([[{ zh: '一般的', en: 'General' }, point(1, 1), point(3, 2), point(0, 5), point(2, 1)]]),
  solution: build({ l1: 'own-7-5', l2: 'own-7-5', x: 'own-7-5' }, ['p>l1.a', 'q>l1.b', 'r>l2.a', 's>l2.b', 'l1>x.a', 'l2>x.b', 'x>out'], { inputs: ['p', 'q', 'r', 's'] }),
  naive: build({ l1: 'own-7-5' }, ['p>l1.a', 'q>l1.b', 'l1>out'], { inputs: ['p', 'q', 'r', 's'] }),
}

// ---------------- 7-7 极线计算器 · 7-8 点在线上吗 · 7-9 极点在哪 ----------------
// A fundamental matrix F of rank 2, given by its columns (or rows). The epipolar line of p = (x, y, 1) in the right
// image is l′ = F·p = x·column 1 + y·column 2 + column 3.

const F = [
  [0, -0.02, 0.4],
  [0.03, 0, -0.5],
  [-0.38, 0.47, 0.12],
]
// Make F exactly rank 2: its third row is a mix of the first two plus nothing else.
F[2] = F[0].map((v, j) => -2 * v + 0.5 * F[1][j])
const column = (j) => vec(F[0][j], F[1][j], F[2][j])
const epiline = (x, y) => vec(...F.map((r) => r[0] * x + r[1] * y + r[2]))
const EPI = { c1: column(0), c2: column(1), c3: column(2) }
const EPI_INPUTS = ['c1', 'c2', 'c3', 'px', 'py']
const EPI_LABELS = { c1: { zh: 'F 的第一列', en: 'Column 1 of F' }, c2: { zh: 'F 的第二列', en: 'Column 2 of F' }, c3: { zh: 'F 的第三列', en: 'Column 3 of F' }, px: { zh: '左图点的 x', en: 'x of the left point' }, py: { zh: '左图点的 y', en: 'y of the left point' } }
const epiTests = (cases) => cases.map(([label, x, y]) => test(label, { ...EPI, px: image(1, 1, x), py: image(1, 1, y) }, { out: epiline(x, y) }))
const epipolar = {
  id: '7-7',
  chapter: 7,
  title: { zh: '极线计算器', en: 'Epipolar line calculator' },
  inputs: EPI_INPUTS,
  inputLabels: EPI_LABELS,
  brief: { zh: '左图的点 p = (x, y, 1)。输出它在右图的极线 l′ = F·p，三个数。F 按列给出。', en: 'A point in the left image is p = (x, y, 1). Output its epipolar line in the right image, l′ = F·p, three numbers. F is given column by column.' },
  hint: { zh: '矩阵乘一个向量，就是把矩阵的列按向量的数加权相加。', en: 'A matrix times a vector is the matrix\'s columns added up, weighted by the vector\'s numbers.' },
  after: { zh: '左图的一个点，在右图里只可能落在一条线上：这条线就是极线 l′ = F·p。匹配时只沿这条线搜，就从整张图缩成了一条线；两台相机平行时，极线正好是同一行，所以前几关只在同一行里找。你的电路现在是元件「极线」。', en: 'A point in the left image can only land on one line in the right image: the epipolar line l′ = F·p. Searching only along it shrinks the search from a whole image to a line; when the two cameras are parallel the epipolar lines are exactly the rows, which is why the earlier levels searched within one row. Your circuit is now the part "Epipolar line".' },
  packs: { name: { zh: '极线', en: 'Epipolar line' }, desc: { zh: '你在「极线计算器」里搭的：F 的三列和点 (x, y) → 极线 F·p', en: 'What you built in "Epipolar line calculator": the columns of F and a point (x, y) → the line F·p' } },
  unlocks: [],
  palette: ['arith', 'merge', 'const'],
  tests: epiTests([[{ zh: '点 (2, 3)', en: 'Point (2, 3)' }, 2, 3], [{ zh: '点 (10, 4)', en: 'Point (10, 4)' }, 10, 4], [{ zh: '点 (6, 12)', en: 'Point (6, 12)' }, 6, 12]]),
  hidden: epiTests([[{ zh: '点 (14, 1)', en: 'Point (14, 1)' }, 14, 1]]),
  solution: build({ a: ['arith', { op: 'mul' }], b: ['arith', { op: 'mul' }], s: 'merge' }, ['c1>a.a', 'px>a.b', 'c2>b.a', 'py>b.b', 'a>s.a', 'b>s.b', 'c3>s.c', 's>out'], { inputs: EPI_INPUTS }),
  naive: build({ a: ['arith', { op: 'mul' }], b: ['arith', { op: 'mul' }], s: 'merge' }, ['c1>a.a', 'px>a.b', 'c2>b.a', 'py>b.b', 'a>s.a', 'b>s.b', 's>out'], { inputs: EPI_INPUTS }),
}

const ON_LINE = 0.05
const onTests = (cases) =>
  cases.map(([label, x, y, qx, qy]) => {
    const l = epiline(x, y).data
    const v = l[0] * qx + l[1] * qy + l[2]
    return test(label, { ...EPI, px: image(1, 1, x), py: image(1, 1, y), q: point(qx, qy) }, { on: image(1, 1, Math.abs(v) < ON_LINE ? 1 : 0) })
  })
// The right point on the epipolar line of (x, y), at a given x′.
const onLineAt = (x, y, qx) => {
  const l = epiline(x, y).data
  return [qx, -(l[0] * qx + l[2]) / l[1]]
}
const onLine = {
  id: '7-8',
  chapter: 7,
  title: { zh: '点在线上吗', en: 'Is the point on the line?' },
  inputs: [...EPI_INPUTS, 'q'],
  outputs: ['on'],
  inputLabels: { ...EPI_LABELS, q: { zh: '右图的点 q = (x′, y′, 1)', en: 'Right point q = (x′, y′, 1)' } },
  outputLabels: { on: { zh: '配得上', en: 'Can match' } },
  brief: { zh: `右图的点 q 能和左图的点 p 对应吗？q 落在 p 的极线上（|q·l′| < ${ON_LINE}）输出 1，否则输出 0。`, en: `Can the right point q correspond to the left point p? Output 1 if q lies on p's epipolar line (|q·l′| < ${ON_LINE}), otherwise 0.` },
  hint: { zh: '点乘就是逐个相乘再加起来；三个数的平均乘 3 就是它们的和。', en: 'A dot product multiplies number by number and adds up; the average of three numbers times 3 is their sum.' },
  after: { zh: '一个点在线上，当且仅当 q·l′ = qᵀF p = 0：这就是对极约束。它不告诉你配的是哪个点，只排除不可能的点，所以常用来筛掉错配。', en: 'A point lies on the line exactly when q·l′ = qᵀF p = 0: this is the epipolar constraint. It does not say which point is the match, only rules out impossible ones, so it is often used to throw out wrong matches.' },
  unlocks: [],
  palette: ['own-7-7', 'arith', 'merge', 'const', 'fqMean', 'max', 'threshold'],
  tests: onTests([
    [{ zh: '在线上', en: 'On the line' }, 2, 3, ...onLineAt(2, 3, 5)],
    [{ zh: '差得远', en: 'Far off' }, 10, 4, 3, 9],
    [{ zh: '另一个在线上', en: 'Another on the line' }, 6, 12, ...onLineAt(6, 12, 9)],
    [{ zh: '差一点', en: 'Just off' }, 6, 12, onLineAt(6, 12, 9)[0], onLineAt(6, 12, 9)[1] + 3],
  ]),
  hidden: onTests([[{ zh: '又在线上', en: 'On the line again' }, 14, 1, ...onLineAt(14, 1, 2)], [{ zh: '又差得远', en: 'Far off again' }, 14, 1, 8, 1]]),
  solution: build(
    { l: 'own-7-7', m: ['arith', { op: 'mul' }], a: 'fqMean', k: ['const', { c: 3 }], s: ['arith', { op: 'mul' }], n: ['const', { c: -1 }], ns: ['arith', { op: 'mul' }], ab: 'max', lim: ['const', { c: ON_LINE }], g: ['arith', { op: 'sub' }], t: ['threshold', { t: 0 }] },
    ['c1>l.c1', 'c2>l.c2', 'c3>l.c3', 'px>l.px', 'py>l.py', 'l>m.a', 'q>m.b', 'm>a', 'a>s.a', 'k>s.b', 's>ns.a', 'n>ns.b', 's>ab.a', 'ns>ab.b', 'lim>g.a', 'ab>g.b', 'g>t', 't>on'],
    { inputs: [...EPI_INPUTS, 'q'], outputs: ['on'] },
  ),
  naive: build(
    { l: 'own-7-7', m: ['arith', { op: 'mul' }], a: 'fqMean', k: ['const', { c: 3 }], s: ['arith', { op: 'mul' }], lim: ['const', { c: ON_LINE }], g: ['arith', { op: 'sub' }], t: ['threshold', { t: 0 }] },
    ['c1>l.c1', 'c2>l.c2', 'c3>l.c3', 'px>l.px', 'py>l.py', 'l>m.a', 'q>m.b', 'm>a', 'a>s.a', 'k>s.b', 'lim>g.a', 's>g.b', 'g>t', 't>on'],
    { inputs: [...EPI_INPUTS, 'q'], outputs: ['on'] },
  ),
}

// The epipole e′ (where every epipolar line in the right image meets) is the null vector of Fᵀ: perpendicular to
// every column of F, so the cross product of two columns.
const epipole = (() => {
  const e = cross(column(0), column(1))
  return vec(e.data[0] / e.data[2], e.data[1] / e.data[2], 1)
})()
const thirdOne = vec(0, 0, 1)
const pole = {
  id: '7-9',
  chapter: 7,
  title: { zh: '极点在哪', en: 'Where is the epipole?' },
  inputs: ['c1', 'c2', 'c3', 'z'],
  inputLabels: { c1: EPI_LABELS.c1, c2: EPI_LABELS.c2, c3: EPI_LABELS.c3, z: { zh: '(0, 0, 1)', en: '(0, 0, 1)' } },
  brief: { zh: '右图里所有的极线都交于同一点，叫极点。只用 F 算出它，写成 (x, y, 1)。', en: 'In the right image every epipolar line passes through one point, the epipole. Work it out from F alone, written as (x, y, 1).' },
  hint: { zh: '每条极线都是 F 的列的组合。两条极线交在哪里，你会算。', en: 'Every epipolar line is a mix of the columns of F. You know how to find where two lines meet.' },
  after: { zh: '极点是另一台相机的光心在这张图里的位置：所有极线都从它发出。它垂直于 F 的每一列，所以是两列的叉积，也就是 Fᵀe′ = 0 的解。', en: "The epipole is where the other camera's centre appears in this image: every epipolar line comes out of it. It is perpendicular to every column of F, so it is the cross product of two columns: the solution of Fᵀe′ = 0." },
  unlocks: [],
  palette: ['own-7-5', 'own-7-7', 'arith', 'merge', 'const', 'fqMean'],
  tests: [test({ zh: '这台相机', en: 'This camera' }, { c1: column(0), c2: column(1), c3: column(2), z: thirdOne }, { out: epipole })],
  hidden: [test({ zh: '列换了顺序', en: 'Columns reordered' }, { c1: column(1), c2: column(0), c3: column(2), z: thirdOne }, { out: epipole })],
  solution: build(
    { e: 'own-7-5', m: ['arith', { op: 'mul' }], a: 'fqMean', k: ['const', { c: 3 }], w: ['arith', { op: 'mul' }], q: ['arith', { op: 'div' }] },
    ['c1>e.a', 'c2>e.b', 'e>m.a', 'z>m.b', 'm>a', 'a>w.a', 'k>w.b', 'e>q.a', 'w>q.b', 'q>out'],
    { inputs: ['c1', 'c2', 'c3', 'z'] },
  ),
  naive: build({ e: 'own-7-5' }, ['c1>e.a', 'c2>e.b', 'e>out'], { inputs: ['c1', 'c2', 'c3', 'z'] }),
}

// ---------------- 7-10 前方多远 · 7-11 只看前方 1 米 · 7-12 避障警报 ----------------
// A robot vacuum's stereo camera: a far wall, a textureless floor in the bottom rows, and obstacles. The region of
// interest is what is above the floor.

const NEAR = 1.2
const WIN = 3
const FLOOR = 12 // rows from here down are floor
const region = fromFn(16, 16, (x, y) => (y < FLOOR ? 1 : 0))
function room(seed, obstacles, noise = 0.05) {
  const scene = stereo(seed, obstacles, { far: 1, noise })
  // The floor has no texture: flat grey in both cameras.
  const flat = (img) => fromFn(16, 16, (x, y) => (y >= FLOOR ? 0.5 : img.data[y * 16 + x]))
  return { left: flat(scene.left), right: flat(scene.right), truth: scene.truth, z: depthOf(scene.truth) }
}
const stopOf = (z) => zip(z, region, (v, r) => (v < NEAR && r ? 1 : 0))
const ROOMS = [
  [{ zh: '一个箱子', en: 'A box' }, room(61, [[box(4, 3, 10, 12), 3]])],
  [{ zh: '远的箱子', en: 'A far box' }, room(62, [[box(6, 2, 12, 12), 2]])],
  [{ zh: '一远一近', en: 'One far, one near' }, room(63, [[box(1, 4, 7, 12), 2], [box(9, 5, 14, 12), 3]])],
]
const ROOMS_HIDDEN = [[{ zh: '细的椅腿', en: 'A thin chair leg' }, room(64, [[box(7, 1, 10, 12), 3]])]]

const howFar = {
  id: '7-10',
  inputs: ['left', 'right', 'region'],
  inputLabels: { ...STEREO.inputLabels, region: { zh: '地面以上', en: 'Above the floor' } },
  chapter: 7,
  title: { zh: '前方多远', en: 'How far ahead' },
  views: { out: 'terrain' },
  brief: { zh: `扫地机器人的双目相机（f·b = ${FB}）。输出地面以上每个像素的距离（米），地面那几行输出 0。`, en: `A robot vacuum's stereo camera (f·b = ${FB}). Output the distance in metres of every pixel above the floor, and 0 on the floor rows.` },
  hint: { zh: '前面几关的几步，接起来。', en: 'The steps of the earlier levels, joined up.' },
  after: { zh: '搜视差、换成距离、只留地面以上：每一步都是前面单独练过的，接起来就是一台测距仪。', en: 'Search the disparity, convert to distance, keep only what is above the floor: each step was practised on its own earlier, and joined up they make a rangefinder.' },
  unlocks: [],
  palette: ['disparity', 'box3', 'arith', 'merge', 'const'],
  // The leftmost columns have no partner in the right image, and edges of near things smear a little: some cells
  // always come out wrong.
  check: { tolerance: 0.05, mismatches: 40 },
  tests: ROOMS.map(([label, r]) => test(label, { left: r.left, right: r.right, region }, { out: zip(r.z, region, (v, k) => (k ? v : 0)) })),
  hidden: ROOMS_HIDDEN.map(([label, r]) => test(label, { left: r.left, right: r.right, region }, { out: zip(r.z, region, (v, k) => (k ? v : 0)) })),
  solution: build(
    { d: ['disparity', { window: WIN }], k: ['const', { c: FB }], z: ['arith', { op: 'div' }], m: ['arith', { op: 'mul' }] },
    ['left>d.left', 'right>d.right', 'k>z.a', 'd>z.b', 'z>m.a', 'region>m.b', 'm>out'],
    { inputs: ['left', 'right', 'region'] },
  ),
  naive: build({ d: ['disparity', { window: WIN }], m: ['arith', { op: 'mul' }] }, ['left>d.left', 'right>d.right', 'd>m.a', 'region>m.b', 'm>out'], { inputs: ['left', 'right', 'region'] }),
}

// What a search gives on the floor: no texture, so any distance at all.
const withFloor = (z, seed) => {
  const next = random(seed)
  return fromFn(16, 16, (x, y) => (y >= FLOOR ? 0.8 + 2.5 * next() : z.data[y * 16 + x]))
}
const zTests = (cases) => cases.map(([label, r], i) => test(label, { z: withFloor(r.z, 70 + i), region }, { stop: stopOf(r.z) }))
const nearOnly = {
  id: '7-11',
  chapter: 7,
  title: { zh: '只看前方 1 米', en: 'Only the metre in front' },
  inputs: ['z', 'region'],
  outputs: ['stop'],
  inputLabels: { z: { zh: '距离（米）', en: 'Distance (m)' }, region: { zh: '地面以上', en: 'Above the floor' } },
  outputLabels: { stop: { zh: '要停', en: 'Stop' } },
  views: { in: 'terrain' },
  brief: { zh: `距离近于 ${NEAR} 米、又在地面以上的像素输出 1，其余 0。`, en: `Output 1 for pixels closer than ${NEAR} m that are above the floor, otherwise 0.` },
  hint: { zh: '阈值留下的是「大于」的那边。', en: 'A threshold keeps the "greater than" side.' },
  after: { zh: '地板本来就在前面，算进来机器人就永远停着；所以只看可能有障碍的区域。真实的避障还会用相机的高度和角度，从深度算出每一点离地多高。', en: 'The floor is always in front, so counting it would keep the robot stopped for ever; only the region where obstacles can be is checked. Real obstacle avoidance also uses the camera\'s height and angle to work out how high above the floor each point is.' },
  unlocks: [],
  palette: ['arith', 'merge', 'const', 'threshold'],
  tests: zTests(ROOMS),
  hidden: zTests(ROOMS_HIDDEN),
  solution: build({ k: ['const', { c: NEAR }], g: ['arith', { op: 'sub' }], t: ['threshold', { t: 0 }], m: ['arith', { op: 'mul' }] }, ['k>g.a', 'z>g.b', 'g>t', 't>m.a', 'region>m.b', 'm>stop'], { inputs: ['z', 'region'], outputs: ['stop'] }),
  naive: build({ k: ['const', { c: NEAR }], g: ['arith', { op: 'sub' }], t: ['threshold', { t: 0 }] }, ['k>g.a', 'z>g.b', 'g>t', 't>stop'], { inputs: ['z', 'region'], outputs: ['stop'] }),
}

const alarmTests = (cases) => cases.map(([label, r]) => test(label, { left: r.left, right: r.right, region }, { stop: stopOf(r.z) }))
const alarm = {
  id: '7-12',
  chapter: 7,
  title: { zh: '避障警报', en: 'Obstacle alarm' },
  inputs: ['left', 'right', 'region'],
  outputs: ['stop'],
  inputLabels: { ...STEREO.inputLabels, region: { zh: '地面以上', en: 'Above the floor' } },
  outputLabels: { stop: { zh: '要停', en: 'Stop' } },
  brief: { zh: `扫地机器人的双目相机（f·b = ${FB}，地板没有纹理，画面有噪声）。标出地面以上、近于 ${NEAR} 米、要停下来的区域。`, en: `A robot vacuum's stereo camera (f·b = ${FB}, a floor with no texture, a noisy picture). Mark the region above the floor, closer than ${NEAR} m, where it must stop.` },
  hint: { zh: '没有纹理的地方，视差搜索什么也配不上。', en: 'Where there is no texture, disparity search cannot match anything.' },
  after: { zh: '窗口、距离换算、感兴趣区域，一个都不能少：这是一台最简单的双目避障系统。真实的扫地机器人还会结合激光或结构光，补上没有纹理的地方。', en: 'Window, distance conversion, region of interest: none can be left out. This is the simplest stereo obstacle-avoidance system; real robot vacuums also use a laser or structured light to fill in where there is no texture.' },
  unlocks: [],
  palette: ['disparity', 'box3', 'arith', 'merge', 'const', 'threshold'],
  // A near thing hides a strip of the wall behind it from one camera; that strip and the thin edges may go wrong.
  check: { tolerance: 0.1, mismatches: 18 },
  tests: alarmTests(ROOMS),
  hidden: alarmTests(ROOMS_HIDDEN),
  solution: build(
    { d: ['disparity', { window: WIN }], k: ['const', { c: FB }], z: ['arith', { op: 'div' }], n: ['const', { c: NEAR }], g: ['arith', { op: 'sub' }], t: ['threshold', { t: 0 }], m: ['arith', { op: 'mul' }] },
    ['left>d.left', 'right>d.right', 'k>z.a', 'd>z.b', 'n>g.a', 'z>g.b', 'g>t', 't>m.a', 'region>m.b', 'm>stop'],
    { inputs: ['left', 'right', 'region'], outputs: ['stop'] },
  ),
  naive: build(
    { d: ['disparity', { window: 5 }], k: ['const', { c: FB }], z: ['arith', { op: 'div' }], n: ['const', { c: NEAR }], g: ['arith', { op: 'sub' }], t: ['threshold', { t: 0 }], m: ['arith', { op: 'mul' }] },
    ['left>d.left', 'right>d.right', 'k>z.a', 'd>z.b', 'n>g.a', 'z>g.b', 'g>t', 't>m.a', 'region>m.b', 'm>stop'],
    { inputs: ['left', 'right', 'region'], outputs: ['stop'] },
  ),
}

export const levels = [findDisparity, windowSize, toDistance, otherCamera, crossLevel, meet, epipolar, onLine, pole, howFar, nearOnly, alarm]
