// Chapter 3 (light and edges, lecture 5), the hands-on half, written for a player who has never
// met computer vision: why a spot in a photo is as bright as it is (3-1), how shadow and paint mix
// (3-2), what a gradient is (3-4), and what lighting changes do to edges (3-6). The existing levels
// (3-3 朗伯台, 3-5 梯度大小, 3-7 关灯也认得) build on these.
import { GLYPHS, correlate, fromFn, map, patterns as P, zip } from '../engine/image.js'
import { build, test } from './util.js'

const DEG = Math.PI / 180

// ---------------- 3-1 斜着照 ----------------

const TILE_KNOBS = {
  theta: { label: '灯的角度 θ', min: 0, max: 85, step: 5, unit: '°' },
  I: { label: '灯的强度', min: 0.2, max: 1, step: 0.05 },
  R: { label: '表面反射率', min: 0.1, max: 1, step: 0.05 },
}
const brightness = ({ theta, I, R }) => I * R * Math.cos(theta * DEG)
const TILE_TOLERANCE = 0.012
const TILE_STAGES = [
  {
    title: '斜着照',
    note: '灯可以绕着瓷砖转。灯正对着瓷砖时亮度是 1。把灯转到一个角度，让瓷砖的亮度正好是一半。',
    target: 0.5,
    tiles: [{ label: '白瓷砖', start: { theta: 0, I: 1, R: 1 }, knobs: ['theta'] }],
  },
  {
    title: '三个原因',
    note: '三块瓷砖，每块只能动一个旋钮。让它们在照片里都是 0.35：一块靠转灯，一块靠调暗灯，一块靠换一种更暗的漆。',
    target: 0.35,
    tiles: [
      { label: '只能转灯', start: { theta: 0, I: 1, R: 1 }, knobs: ['theta'] },
      { label: '只能调灯的强度', start: { theta: 0, I: 1, R: 1 }, knobs: ['I'] },
      { label: '只能换漆', start: { theta: 0, I: 1, R: 1 }, knobs: ['R'] },
    ],
  },
  {
    title: '谁更白',
    note: '同一盏灯（强度 0.9）照着两块瓷砖：一块正对着灯，一块斜了 60°。照片里两块一样亮，都是 0.45。它们各自刷的是什么漆？',
    target: 0.45,
    tiles: [
      { label: '正对着灯', start: { theta: 0, I: 0.9, R: 0.2 }, knobs: ['R'] },
      { label: '斜 60°', start: { theta: 60, I: 0.9, R: 0.2 }, knobs: ['R'] },
    ],
  },
]
const tileStagePasses = (stage, settings) => stage.tiles.every((_, i) => Math.abs(brightness(settings[i]) - stage.target) <= TILE_TOLERANCE)
const onTileGrid = (key, v) => {
  const knob = TILE_KNOBS[key]
  const steps = (v - knob.min) / knob.step
  return v >= knob.min - 1e-9 && v <= knob.max + 1e-9 && Math.abs(steps - Math.round(steps)) < 1e-6
}

const tileLevel = {
  id: '3-1',
  kind: 'board',
  board: 'LightTile',
  chapter: 3,
  title: '斜着照',
  brief: '照片里一个点有多亮，取决于三件事：灯有多强、表面刷的漆有多白（反射率）、光是正着还是斜着落下来。用一块瓷砖和一盏灯，弄清楚它们怎样组合。',
  hint: '看侧视图里的光线：灯斜过去以后，同样一束光要铺满更长的一段瓷砖，每一小段分到的光就少了。',
  after: '亮度 = 灯的强度 × 反射率 × cos θ，θ 是光线和表面「正前方」（法线）的夹角。cos 60° = 0.5，所以斜 60° 时亮度减半。这三个因素在照片里只留下一个乘积：变暗可能是灯弱了、漆暗了，也可能只是表面转开了。所以同样亮的两块，可能刷的是完全不同的漆（第三步里斜着的那块其实是纯白）。这叫朗伯模型，大多数哑光表面都近似遵守它。',
  requires: ['1-5'],
  unlocks: [],
  tile: { knobs: TILE_KNOBS, stages: TILE_STAGES, brightness, tolerance: TILE_TOLERANCE, passes: tileStagePasses },
  verify() {
    for (const [index, stage] of TILE_STAGES.entries()) {
      const label = `第 ${index + 1} 步`
      const starts = stage.tiles.map((t) => t.start)
      if (tileStagePasses(stage, starts)) return `${label}一开始就过了`
      // Each tile must be solvable with its own knob, on the knob's grid.
      const solved = stage.tiles.map((t) => {
        const [key] = t.knobs
        const knob = TILE_KNOBS[key]
        const options = Array.from({ length: Math.round((knob.max - knob.min) / knob.step) + 1 }, (_, i) => knob.min + i * knob.step)
        return options.filter((v) => onTileGrid(key, v) && Math.abs(brightness({ ...t.start, [key]: v }) - stage.target) <= TILE_TOLERANCE)
      })
      if (solved.some((answers) => answers.length !== 1)) return `${label}的答案不唯一或不存在：${solved.map((a) => a.map((v) => v.toFixed(2)).join('/')).join('，')}`
    }
    // The last step's two tiles end up with very different paint although they look the same.
    const [front, slant] = TILE_STAGES[2].tiles.map((t) => (TILE_STAGES[2].target / (t.start.I * Math.cos(t.start.theta * DEG))))
    if (slant - front < 0.4) return '谁更白的两块漆差得不够多'
    return ''
  },
}

// ---------------- 3-2 阴影还是颜色 ----------------

const paint = {
  checker: P.checker(4, 0.3, 0.9),
  letter: P.glyph(GLYPHS.T, 0.85, 0.25),
  stripes: P.stripes(6, 0.35, 0.85),
  plain: P.blank(0.7),
}
// How much light reaches each spot: full sun 1, shadow 0.35, or light fading across the scene.
const light = {
  diagonal: fromFn(16, 16, (x, y) => (x + y < 16 ? 1 : 0.35)),
  fromLeft: fromFn(16, 16, (x) => 1 - 0.045 * x),
  pole: fromFn(16, 16, (x, y) => (x >= 6 && x <= 8 && y >= 4 ? 0.4 : 1)),
  corner: fromFn(16, 16, (x, y) => (x > 9 && y < 7 ? 0.45 : 0.95)),
}
const photo = (a, b) => zip(a, b, (p, q) => p * q)
const SHADOW_SCENES = [
  ['棋盘 + 斜影', paint.checker, light.diagonal],
  ['字母 T + 侧光', paint.letter, light.fromLeft],
  ['条纹 + 杆影', paint.stripes, light.pole],
  ['白墙 + 墙角阴影', paint.plain, light.corner],
]
const shadowGraph = (nodes, wires) => build(nodes, wires, { inputs: ['photo', 'light'] })

const shadowLevel = {
  id: '3-2',
  chapter: 3,
  title: '阴影还是颜色',
  inputs: ['photo', 'light'],
  inputLabels: { photo: '照片', light: '光照' },
  brief: '照片里每一点的亮度 = 表面本来的颜色（反射率）× 照到那一点的光。第二个输入告诉你每一点照到多少光（1 是满光，阴影里少得多）。去掉阴影和明暗，只输出表面本来的颜色。',
  hint: '照片 = 颜色 × 光照。已知其中两个，怎样求第三个？减法行不行，看看阴影里的格子。',
  after: '颜色 = 照片 ÷ 光照。注意第四张：一面纯色的墙，照片里却有一条很硬的边，那是阴影的边，不是物体的边。照片里的边缘只说明「这里亮度变了」，变的可能是颜色，也可能只是光。真实相机不会附送光照图，所以计算机视觉常常要猜光照，下一关就是一个这样的猜测游戏。',
  requires: ['3-1'],
  unlocks: [],
  palette: ['divide', 'sub', 'mul', 'add', 'scale', 'offset'],
  check: { tolerance: 0.02 },
  tests: SHADOW_SCENES.map(([label, colour, lit]) => test(label, { photo: photo(colour, lit), light: lit }, { out: colour })),
  solution: shadowGraph({ d: 'divide' }, ['photo>d.a', 'light>d.b', 'd>out']),
  // Taking the shadow away by subtracting: right only where the light is full.
  naive: shadowGraph({ s: 'sub', o: ['offset', { c: 1 }] }, ['photo>s.a', 'light>s.b', 's>o', 'o>out']),
  alsoFails: [
    shadowGraph({}, ['photo>out']),
    shadowGraph({ m: 'mul' }, ['photo>m.a', 'light>m.b', 'm>out']),
  ],
}

// ---------------- 3-4 坡有多陡 ----------------

// Fields are smooth brightness landscapes over a 16 × 16 picture, f(x, y) with x right and y down.
// The slope at a pixel is measured the way a filter would: half the difference of the two
// neighbours, across (gx) and down (gy).
const sigmoid = (t) => 1 / (1 + Math.exp(-t))
const EDGE_N = [Math.cos(30 * DEG), Math.sin(30 * DEG)]
const FIELDS = {
  ramp: (x) => 0.2 + 0.04 * x,
  tilt: (x, y) => 0.5 + 0.03 * (x - 8) - 0.05 * (y - 8),
  hill: (x, y) => 0.1 + 0.8 * Math.exp(-((x - 10) ** 2 + (y - 6) ** 2) / (2 * 3 * 3)),
  edge: (x, y) => 0.2 + 0.6 * sigmoid(((x - 8) * EDGE_N[0] + (y - 8) * EDGE_N[1]) / 1.5),
}
const slopeAt = (f, x, y) => ({ gx: (f(x + 1, y) - f(x - 1, y)) / 2, gy: (f(x, y + 1) - f(x, y - 1)) / 2 })
const SLOPE_KNOBS = {
  gx: { label: '横向坡度 gx', min: -0.3, max: 0.3, step: 0.01 },
  gy: { label: '纵向坡度 gy', min: -0.3, max: 0.3, step: 0.01 },
}
const SLOPE_TOLERANCE = 0.012
const SLOPE_STAGES = [
  {
    title: '横着的坡',
    note: '这张图从左往右一点点变亮。下面是穿过十字的那一行的亮度（横剖面）。拨动 gx，让金色斜线贴住曲线：每往右走一格，亮度涨多少？',
    field: 'ramp',
    probe: [8, 8],
    knobs: ['gx'],
  },
  {
    title: '斜坡',
    note: '现在往右变亮，往下变暗。横剖面量 gx，竖剖面量 gy。两个数合起来就是图上的箭头。',
    field: 'tilt',
    probe: [8, 8],
    knobs: ['gx', 'gy'],
  },
  {
    title: '山坡上',
    note: '一座亮的小山。十字在山坡上，箭头该指向哪里？先猜，再用两条剖面量出来。',
    field: 'hill',
    probe: [6, 9],
    knobs: ['gx', 'gy'],
  },
  {
    title: '边缘',
    note: '一条斜着的边：一侧暗、一侧亮。站在边上量坡度。箭头和边是什么关系？',
    field: 'edge',
    probe: [8, 8],
    knobs: ['gx', 'gy'],
  },
]
const slopeTruth = (stage) => slopeAt(FIELDS[stage.field], ...stage.probe)
const slopePasses = (stage, g) => {
  const t = slopeTruth(stage)
  return Math.abs(g.gx - t.gx) <= SLOPE_TOLERANCE && Math.abs(g.gy - t.gy) <= SLOPE_TOLERANCE
}

const slopeLevel = {
  id: '3-4',
  kind: 'board',
  board: 'GradientProbe',
  chapter: 3,
  title: '坡有多陡',
  brief: '把图像想成一片地形：越亮越高。图上有个十字，量出那里往右和往下各陡多少，合成一支箭头。这支箭头叫梯度。',
  hint: '只看一条剖面：曲线在十字那一点往上走还是往下走？走得多快？斜线贴住曲线时，它的斜率就是答案。',
  after: '梯度是一个箭头 (gx, gy)：gx 是往右每走一格亮度变多少，gy 是往下。箭头总指向变亮最快的方向（山坡上指向山顶），长度 √(gx² + gy²) 说明有多陡。在边上，箭头又长又垂直于边：边缘就是梯度很大的地方。你在第 1 章搭的横向差分和 Sobel，就是在每个像素同时量 gx 或 gy。',
  requires: ['3-3'],
  unlocks: [],
  slope: { knobs: SLOPE_KNOBS, stages: SLOPE_STAGES, fields: FIELDS, truth: slopeTruth, passes: slopePasses, tolerance: SLOPE_TOLERANCE },
  verify() {
    for (const [index, stage] of SLOPE_STAGES.entries()) {
      const label = `第 ${index + 1} 步`
      const t = slopeTruth(stage)
      for (const key of ['gx', 'gy']) {
        const v = t[key]
        if (Math.abs(v) > 0.3) return `${label}的 ${key} 超出旋钮范围`
        // Only the stage's knobs move; the others stay at 0 and must already be right.
        if (!stage.knobs.includes(key) && Math.abs(v) > SLOPE_TOLERANCE) return `${label}的 ${key} 不是 0，可旋钮动不了`
        // The nearest knob step must fall within tolerance.
        if (Math.abs(Math.round(v / 0.01) * 0.01 - v) > SLOPE_TOLERANCE) return `${label}的 ${key} 拨不准`
      }
      if (slopePasses(stage, { gx: 0, gy: 0 })) return `${label}一开始就过了`
    }
    // On the edge, the arrow crosses the edge: it is parallel to the edge's normal.
    const e = slopeTruth(SLOPE_STAGES[3])
    const cross = Math.abs(e.gx * EDGE_N[1] - e.gy * EDGE_N[0]) / Math.hypot(e.gx, e.gy)
    if (cross > 0.01) return '边上的梯度不垂直于边'
    // On the hill, the arrow points uphill (toward the top at (10, 6)).
    const h = slopeTruth(SLOPE_STAGES[2])
    if (h.gx <= 0 || h.gy >= 0) return '山坡上的箭头没有指向山顶'
    return ''
  },
}

// ---------------- 3-6 整体变亮 ----------------

const SOBEL_X = [-1, 0, 1, -2, 0, 2, -1, 0, 1].map((v) => v / 8)
const SOBEL_Y = [-1, -2, -1, 0, 0, 0, 1, 2, 1].map((v) => v / 8)
const gradmag = (img) => zip(correlate(img, SOBEL_X, 'edge'), correlate(img, SOBEL_Y, 'edge'), Math.hypot)
const SCENE = P.glyph(GLYPHS.F, 0.15, 0.55)
const relit = ({ a, b }) => map(SCENE, (v) => a * v + b)
const edgesOf = (img, t) => map(gradmag(img), (v) => (v > t + 1e-9 ? 1 : 0))
const ORIGINAL_T = 0.1
const ORIGINAL_EDGES = edgesOf(SCENE, ORIGINAL_T)
const sameMask = (m, n) => m.data.every((v, i) => v === n.data[i])
const LIGHT_KNOBS = {
  b: { label: '整体加亮 b', min: -0.2, max: 0.3, step: 0.05 },
  a: { label: '对比度 a', min: 0.25, max: 1.5, step: 0.05 },
  t: { label: '边缘门槛 t', min: 0.01, max: 0.2, step: 0.01 },
}
const LIGHT_START = { a: 1, b: 0, t: ORIGINAL_T }
const LIGHT_STAGES = [
  {
    title: '整体加亮',
    note: '每个像素都加上同一个数 b，整张图变亮。让你的图和「目标照片」一样，同时盯住右边的边缘图。',
    knobs: ['b'],
    goal: 'photo',
    target: { a: 1, b: 0.2 },
  },
  {
    title: '灯暗了一半',
    note: '这次灯只有一半亮：每个像素都乘 a。让你的图和目标照片一样。边缘图怎么了？',
    knobs: ['a', 'b'],
    goal: 'photo',
    target: { a: 0.5, b: 0 },
  },
  {
    title: '修好门槛',
    note: '灯还是暗的，可我们要的边一条也不能少。只能动边缘门槛 t：坡度大于 t 的地方才算边。',
    knobs: ['t'],
    goal: 'edges',
  },
]
const photoMatches = (s, target) => Math.abs(s.a - target.a) < 1e-6 && Math.abs(s.b - target.b) < 1e-6
const lightPasses = (stage, s) => (stage.goal === 'photo' ? photoMatches(s, stage.target) : sameMask(edgesOf(relit(s), s.t), ORIGINAL_EDGES))

const changeLevel = {
  id: '3-6',
  kind: 'board',
  board: 'LightChange',
  chapter: 3,
  title: '整体变亮',
  brief: '同一个物体，开灯、关灯、换个灯泡拍出来的照片都不一样。边缘检测要找的是物体的边，不该跟着灯变。看看两种灯光变化各对边缘做了什么。',
  hint: '剖面图里，加亮是把整条曲线往上抬，调暗是把曲线压扁。哪一种会改变曲线的「陡」？',
  after: '整体加亮（每个像素 + b）只把地形整体抬高，坡度一点没变，所以边缘图不受影响：梯度对加亮是不变的。灯变暗（每个像素 × a）把所有坡度都乘了 a，固定的门槛就会漏掉边。把门槛也乘 a 就修好了，但我们不知道 a 是多少。下一关的办法：用图里最陡的那条边当尺子，把所有坡度除以它，结果就和 a 无关了。',
  requires: ['3-5'],
  unlocks: [],
  change: { knobs: LIGHT_KNOBS, start: LIGHT_START, stages: LIGHT_STAGES, scene: SCENE, relit, edgesOf, gradmag, original: ORIGINAL_EDGES, originalT: ORIGINAL_T, passes: lightPasses },
  verify() {
    let state = { ...LIGHT_START }
    for (const [index, stage] of LIGHT_STAGES.entries()) {
      const label = `第 ${index + 1} 步`
      if (lightPasses(stage, state)) return `${label}一开始就过了`
      const grid = (key) => {
        const k = LIGHT_KNOBS[key]
        return Array.from({ length: Math.round((k.max - k.min) / k.step) + 1 }, (_, i) => Math.round((k.min + i * k.step) * 100) / 100)
      }
      if (stage.goal === 'photo') {
        state = { ...state, ...stage.target }
        if (!stage.knobs.every((key) => grid(key).some((v) => Math.abs(v - state[key]) < 1e-6))) return `${label}的目标不在刻度上`
      } else {
        const good = grid('t').filter((t) => lightPasses(stage, { ...state, t }))
        if (!good.length) return `${label}没有能用的门槛`
        if (good.includes(ORIGINAL_T)) return `${label}原来的门槛就能用`
        state = { ...state, t: good[0] }
      }
      if (index === 0 && !sameMask(edgesOf(relit(state), ORIGINAL_T), ORIGINAL_EDGES)) return '加亮改变了边缘图'
      if (index === 1 && sameMask(edgesOf(relit(state), ORIGINAL_T), ORIGINAL_EDGES)) return '灯暗了边缘图却没变'
    }
    return ''
  },
}

export const nodes = {}
export const levels = [tileLevel, shadowLevel, slopeLevel, changeLevel]
