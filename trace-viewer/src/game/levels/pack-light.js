// Chapter 3 (light and edges, lecture 5), written for a player who has never met computer vision.
// It follows the lecture: why a spot in a photo is as bright as it is (3-1), what a colour is to a
// camera (3-2), why one brightness cannot tell which way a surface faces (3-3), how shadow and
// paint mix (3-4), what a gradient is (3-5), and what lighting does to edges (3-7). 3-6 梯度大小 and
// 3-8 关灯也认得 (in ch2-7.js) turn these into an edge detector.
import { GLYPHS, correlate, fromFn, map, patterns as P, random, zip } from '../engine/image.js'
import { build, test } from './util.js'

const DEG = Math.PI / 180

// ---------------- 3-1 斜着照 ----------------

const TILE_KNOBS = {
  theta: { label: { zh: '灯的角度 θ', en: 'Lamp angle θ' }, min: 0, max: 85, step: 5, unit: '°' },
  I: { label: { zh: '灯的强度', en: 'Lamp strength' }, min: 0.2, max: 1, step: 0.05 },
  R: { label: { zh: '表面反射率', en: 'Surface reflectance' }, min: 0.1, max: 1, step: 0.05 },
}
const brightness = ({ theta, I, R }) => I * R * Math.cos(theta * DEG)
const TILE_TOLERANCE = 0.012
const TILE_STAGES = [
  {
    title: { zh: '斜着照', en: 'Light at a slant' },
    note: { zh: '灯可以绕着瓷砖转。灯正对着瓷砖时亮度是 1。把灯转到一个角度，让瓷砖的亮度正好是一半。', en: 'The lamp can swing around the tile. With the lamp straight over the tile, the brightness is 1. Turn the lamp to an angle that makes the tile exactly half as bright.' },
    target: 0.5,
    tiles: [{ label: { zh: '白瓷砖', en: 'White tile' }, start: { theta: 0, I: 1, R: 1 }, knobs: ['theta'] }],
  },
  {
    title: { zh: '三个原因', en: 'Three causes' },
    note: { zh: '三块瓷砖，每块只能动一个旋钮。让它们在照片里都是 0.35：一块靠转灯，一块靠调暗灯，一块靠换一种更暗的漆。', en: 'Three tiles, each with only one knob. Make all three read 0.35 in the photo: one by turning the lamp, one by dimming the lamp, one by switching to a darker paint.' },
    target: 0.35,
    tiles: [
      { label: { zh: '只能转灯', en: 'Only turn the lamp' }, start: { theta: 0, I: 1, R: 1 }, knobs: ['theta'] },
      { label: { zh: '只能调灯的强度', en: 'Only change the lamp strength' }, start: { theta: 0, I: 1, R: 1 }, knobs: ['I'] },
      { label: { zh: '只能换漆', en: 'Only change the paint' }, start: { theta: 0, I: 1, R: 1 }, knobs: ['R'] },
    ],
  },
  {
    title: { zh: '谁更白', en: 'Which is whiter' },
    note: { zh: '同一盏灯（强度 0.9）照着两块瓷砖：一块正对着灯，一块斜了 60°。照片里两块一样亮，都是 0.45。它们各自刷的是什么漆？', en: 'One lamp (strength 0.9) lights two tiles: one faces the lamp, the other is tilted 60°. In the photo they are equally bright, both 0.45. What paint is each one painted with?' },
    target: 0.45,
    tiles: [
      { label: { zh: '正对着灯', en: 'Facing the lamp' }, start: { theta: 0, I: 0.9, R: 0.2 }, knobs: ['R'] },
      { label: { zh: '斜 60°', en: 'Tilted 60°' }, start: { theta: 60, I: 0.9, R: 0.2 }, knobs: ['R'] },
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
  title: { zh: '斜着照', en: 'Light at a slant' },
  brief: { zh: '照片里一个点有多亮，取决于三件事：灯有多强、表面刷的漆有多白（反射率）、光是正着还是斜着落下来。用一块瓷砖和一盏灯，弄清楚它们怎样组合。', en: "How bright a spot in a photo is depends on three things: how strong the lamp is, how white the surface's paint is (its reflectance), and whether the light falls on it straight or at a slant. With one tile and one lamp, work out how they combine." },
  hint: { zh: '看侧视图里的光线：灯斜过去以后，同样一束光要铺满更长的一段瓷砖，每一小段分到的光就少了。', en: 'Watch the rays in the side view: once the lamp tilts, the same beam has to cover a longer stretch of tile, so each small piece gets less light.' },
  after: { zh: '亮度 = 灯的强度 × 反射率 × cos θ，θ 是光线和表面「正前方」（法线）的夹角。cos 60° = 0.5，所以斜 60° 时亮度减半。这三个因素在照片里只留下一个乘积：变暗可能是灯弱了、漆暗了，也可能只是表面转开了。所以同样亮的两块，可能刷的是完全不同的漆（第三步里斜着的那块其实是纯白）。这叫朗伯模型，大多数哑光表面都近似遵守它。', en: 'Brightness = lamp strength × reflectance × cos θ, where θ is the angle between the light and the direction the surface faces "straight out" (its normal). cos 60° = 0.5, so tilting by 60° halves the brightness. The photo keeps only the product of the three: a darker spot may mean a weaker lamp, a darker paint, or just a surface turned away. So two equally bright tiles can wear completely different paints (in step 3 the tilted one is actually pure white). This is the Lambertian model, and most matte surfaces roughly follow it.' },
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

// ---------------- 3-2 颜色是三个数 ----------------

// Light is a mix of wavelengths, 400–700 nm, here ten bands 30 nm wide. A camera has three kinds
// of sensor (like the eye's three cones), each summing the light with its own sensitivity curve;
// those three sums are all it keeps. Readings are scaled so an even, full spectrum reads (1, 1, 1).
const BANDS = Array.from({ length: 10 }, (_, i) => 415 + 30 * i)
const SENSORS = { R: [590, 35], G: [540, 38], B: [450, 28] }
const CHANNELS = ['R', 'G', 'B']
const sensitivity = (channel, nm) => Math.exp(-((nm - SENSORS[channel][0]) ** 2) / (2 * SENSORS[channel][1] ** 2))
const CHANNEL_SUM = Object.fromEntries(CHANNELS.map((c) => [c, BANDS.reduce((sum, nm) => sum + sensitivity(c, nm), 0)]))
const reading = (spectrum, lamp) => Object.fromEntries(CHANNELS.map((c) => [c, BANDS.reduce((sum, nm, b) => sum + spectrum[b] * (lamp?.[b] ?? 1) * sensitivity(c, nm), 0) / CHANNEL_SUM[c]]))
const readingGap = (a, b) => Math.max(...CHANNELS.map((c) => Math.abs(a[c] - b[c])))
const COLOUR_TOLERANCE = 0.03
const YELLOW_BANDS = [5, 6] // 565 and 595 nm
const LAMPS = [
  { key: 'day', label: { zh: '日光', en: 'Daylight' }, spectrum: BANDS.map(() => 1) },
  { key: 'warm', label: { zh: '暖白灯', en: 'Warm white lamp' }, spectrum: BANDS.map((_, i) => 0.3 + (0.7 * i) / 9) },
  { key: 'green', label: { zh: '绿色 LED', en: 'Green LED' }, spectrum: BANDS.map((nm) => (nm === 505 || nm === 535 ? 1 : 0)) },
  { key: 'red', label: { zh: '红色 LED', en: 'Red LED' }, spectrum: BANDS.map((nm) => (nm === 625 || nm === 655 ? 1 : 0)) },
]
const SPLIT = 0.1 // how far apart two readings must be to look different
const COLOUR_STAGES = [
  {
    title: { zh: '调出这个颜色', en: 'Mix this colour' },
    note: { zh: '每根推杆是一种波长的光有多少，从紫到红。相机只记下 R、G、B 三个读数。把推杆调到三个读数和目标一样。', en: 'Each fader is how much light there is at one wavelength, from violet to red. The camera keeps only three readings: R, G and B. Set the faders so all three readings match the target.' },
    target: [0, 0, 0, 0, 0.1, 0.4, 0.8, 0.9, 0.7, 0.5],
    goal: 'match',
  },
  {
    title: { zh: '没有黄光的黄色', en: 'Yellow without yellow light' },
    note: { zh: '目标是纯黄光（只有 565 nm 一种波长）。可黄色和橙色的推杆坏了，只能用别的光。能让相机看到同一个黄色吗？', en: 'The target is pure yellow light (a single wavelength, 565 nm). But the yellow and orange faders are broken, so you can only use other light. Can you make the camera see the same yellow?' },
    target: [0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
    locked: YELLOW_BANDS,
    goal: 'match',
  },
  {
    title: { zh: '换盏灯就露馅', en: 'A new lamp gives it away' },
    note: { zh: '上一步你调的光谱和纯黄光，在日光下相机分不出来。把它们当成两块布的颜色，换几盏灯照照看：哪盏灯下它们不一样了？', en: 'In daylight the camera cannot tell the spectrum you mixed in the last step from pure yellow light. Treat them as the colours of two pieces of cloth and try a few lamps on them: under which lamp do they stop matching?' },
    target: [0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
    goal: 'split',
  },
]
const colourPasses = (stage, spectrum, lamp = 'day') => {
  if (stage.goal === 'match') return readingGap(reading(spectrum), reading(stage.target)) <= COLOUR_TOLERANCE && (stage.locked ?? []).every((b) => spectrum[b] === 0)
  const light = LAMPS.find((l) => l.key === lamp).spectrum
  return readingGap(reading(spectrum, light), reading(stage.target, light)) >= SPLIT
}
// A reference answer for the yellow made of green and red light, found by a small grid search.
const yellowMetamer = (() => {
  const target = reading(COLOUR_STAGES[1].target)
  let best = null
  const steps = Array.from({ length: 21 }, (_, i) => i * 0.05)
  for (const g of steps) for (const r of steps) {
    const spectrum = BANDS.map((nm) => (nm === 535 ? g : nm === 625 ? r : 0))
    const gap = readingGap(reading(spectrum), target)
    if (!best || gap < best.gap) best = { spectrum, gap }
  }
  return best.spectrum
})()

const colourLevel = {
  id: '3-2',
  kind: 'board',
  board: 'ColorMatch',
  chapter: 3,
  title: { zh: '颜色是三个数', en: 'Colour is three numbers' },
  brief: { zh: '光不是一种颜色，而是许多波长的混合（像彩虹那样从紫到红）。相机和人眼一样，只有三种感光元件，各自对一段波长敏感，最后只记下 R、G、B 三个数。用推杆调配光谱，看看这三个数丢掉了什么。', en: 'Light is not one colour but a mix of many wavelengths (from violet to red, like a rainbow). A camera, like the human eye, has only three kinds of sensor, each sensitive to a range of wavelengths, and in the end it keeps just three numbers: R, G and B. Mix spectra with the faders and see what those three numbers throw away.' },
  hint: { zh: '看下面三条灵敏度曲线：每个读数是推杆高度乘上曲线、再加起来。黄光同时碰到了哪两条曲线？', en: 'Look at the three sensitivity curves below: each reading is the fader heights times a curve, added up. Which two curves does yellow light touch at once?' },
  after: { zh: '整条光谱被压成 3 个数，许多完全不同的光谱会得到同样的 R、G、B，这叫同色异谱。屏幕就是靠这一点，用红光加绿光让你「看到」黄色。可是换一盏灯，物体反射回来的光谱变了，两块在日光下一样的布就可能不一样了。', en: 'A whole spectrum is squeezed into 3 numbers, so many completely different spectra give the same R, G and B. This is called metamerism. Screens rely on it: red light plus green light makes you "see" yellow. But change the lamp and the spectrum an object reflects changes too, so two cloths that match in daylight may no longer match.' },
  requires: ['3-1'],
  unlocks: [],
  colour: { bands: BANDS, channels: CHANNELS, sensitivity, reading, gap: readingGap, tolerance: COLOUR_TOLERANCE, lamps: LAMPS, split: SPLIT, stages: COLOUR_STAGES, passes: colourPasses },
  verify() {
    const blank = BANDS.map(() => 0)
    if (colourPasses(COLOUR_STAGES[0], blank)) return '第 1 步一开始就过了'
    if (!colourPasses(COLOUR_STAGES[0], COLOUR_STAGES[0].target)) return '第 1 步的目标自己都对不上'
    if (!colourPasses(COLOUR_STAGES[1], yellowMetamer)) return `没有黄光拼不出黄色（差 ${readingGap(reading(yellowMetamer), reading(COLOUR_STAGES[1].target)).toFixed(3)}）`
    if (colourPasses(COLOUR_STAGES[1], COLOUR_STAGES[1].target)) return '黄光推杆没有锁住'
    // In daylight the two must look the same; some other lamp must tell them apart.
    if (colourPasses(COLOUR_STAGES[2], yellowMetamer, 'day')) return '日光下就分得开'
    const splits = LAMPS.filter((l) => colourPasses(COLOUR_STAGES[2], yellowMetamer, l.key)).map((l) => l.key)
    if (!splits.length) return '换哪盏灯都分不开'
    return ''
  },
}

// ---------------- 3-3 一个亮度不够 ----------------

// A surface's facing (its normal) is drawn as a point on a disc seen from above: the centre faces
// straight up, the rim faces sideways; (x, y) with x to the right and y down the screen. Lit by a
// lamp from direction L, it reads max(0, N·L) (white paint, lamp strength 1).
const lampDir = (azimuth, elevation) => [Math.cos(elevation * DEG) * Math.cos(azimuth * DEG), Math.cos(elevation * DEG) * Math.sin(azimuth * DEG), Math.sin(elevation * DEG)]
const NORMAL_LAMPS = { A: { label: { zh: '左边的灯', en: 'left lamp' }, dir: lampDir(180, 40) }, B: { label: { zh: '上边的灯', en: 'top lamp' }, dir: lampDir(270, 40) } }
const normalOf = ([x, y]) => [x, y, Math.sqrt(Math.max(0, 1 - x * x - y * y))]
const shade = (point, lamp) => {
  const n = normalOf(point)
  const l = NORMAL_LAMPS[lamp].dir
  return Math.max(0, n[0] * l[0] + n[1] * l[1] + n[2] * l[2])
}
const NORMAL_TRUTH = [-0.45, 0.35]
const NORMAL_TOLERANCE = 0.02
const PHOTO = { A: shade(NORMAL_TRUTH, 'A'), B: shade(NORMAL_TRUTH, 'B') }
const NORMAL_STAGES = [
  {
    title: { zh: '对上亮度', en: 'Match the brightness' },
    note: { zh: '盘上每一点代表一种朝向：中心是脸朝天，越往外越歪，边缘是朝着侧面。盘的明暗就是每种朝向在左灯下有多亮。拖动圆点，让这块表面在照片里的亮度对上。', en: "Each point on the disc stands for one facing: the centre faces straight up, points further out lean more, and the rim faces sideways. The disc's shading is how bright each facing is under the left lamp. Drag the dot until this surface's brightness matches the photo." },
    lamps: ['A'],
  },
  {
    title: { zh: '再找一个', en: 'Find another' },
    note: { zh: '照片还是同一张。找一个和刚才很不一样的朝向，亮度也对得上。', en: 'Same photo. Find a facing very different from the last one whose brightness also matches.' },
    lamps: ['A'],
    apart: 0.35,
  },
  {
    title: { zh: '开第二盏灯', en: 'Turn on a second lamp' },
    note: { zh: '又从上边打了一盏灯拍了一张。现在两张照片的亮度都要对上：表面到底朝哪边？', en: 'A second photo was taken with a lamp from the top. Now the brightness must match in both photos: which way does the surface really face?' },
    lamps: ['A', 'B'],
  },
]
const insideDisc = ([x, y]) => x * x + y * y <= 0.97 * 0.97
const normalPasses = (stage, point, first) =>
  insideDisc(point) && stage.lamps.every((lamp) => Math.abs(shade(point, lamp) - PHOTO[lamp]) <= NORMAL_TOLERANCE) && (!stage.apart || !first || Math.hypot(point[0] - first[0], point[1] - first[1]) >= stage.apart)

const normalLevel = {
  id: '3-3',
  kind: 'board',
  board: 'NormalProbe',
  chapter: 3,
  title: { zh: '一个亮度不够', en: 'One brightness is not enough' },
  brief: { zh: '一块白色的表面，我们只拍到了它在照片里有多亮。能不能反过来，算出它朝哪个方向？在「朝向盘」上拖动，试试看。', en: 'All we have of a white surface is how bright it looks in a photo. Can we work backwards and find which way it faces? Drag on the "facing disc" and try.' },
  hint: { zh: '盘上亮度一样的点连成一条线。你要找的朝向在那条线上的哪儿？第二盏灯给了第二条线。', en: 'Points on the disc with the same brightness form a line. Where on that line is the facing you want? The second lamp gives you a second line.' },
  after: { zh: '一个亮度只告诉你表面和灯之间的夹角，满足这个夹角的朝向是一整圈（盘上那条等亮线），所以单张照片恢复不出唯一的朝向。从明暗推形状（shape from shading）必须靠额外的假设：颜色均匀、灯已知、表面平滑。换灯再拍一张，第二条等亮线和第一条相交，答案只剩一两个点；用三盏灯就能连颜色一起解出来，这叫光度立体。', en: 'One brightness only tells you the angle between the surface and the lamp, and a whole ring of facings has that angle (the equal-brightness line on the disc), so a single photo cannot recover a unique facing. Working out shape from shading needs extra assumptions: an even colour, a known lamp, a smooth surface. Change the lamp and take another photo, and the second equal-brightness line crosses the first, leaving only one or two points; with three lamps you can solve for the colour as well. This is called photometric stereo.' },
  requires: ['3-2'],
  unlocks: [],
  normal: { lamps: NORMAL_LAMPS, photo: PHOTO, shade, stages: NORMAL_STAGES, tolerance: NORMAL_TOLERANCE, passes: normalPasses, start: [0, 0], truth: NORMAL_TRUTH },
  verify() {
    if (normalPasses(NORMAL_STAGES[0], [0, 0])) return '一开始就对上了'
    // Sample the disc: one lamp must allow far-apart answers, two lamps only answers near the truth.
    const grid = []
    for (let x = -0.96; x <= 0.96; x += 0.02) for (let y = -0.96; y <= 0.96; y += 0.02) grid.push([x, y])
    const one = grid.filter((p) => normalPasses(NORMAL_STAGES[0], p))
    const spread = Math.max(...one.map((p) => Math.hypot(p[0] - NORMAL_TRUTH[0], p[1] - NORMAL_TRUTH[1])))
    if (spread < 0.6) return `一盏灯的答案不够多（最远 ${spread.toFixed(2)}）`
    const two = grid.filter((p) => normalPasses(NORMAL_STAGES[2], p))
    if (!two.length) return '两盏灯都对上的点不存在'
    const far = Math.max(...two.map((p) => Math.hypot(p[0] - NORMAL_TRUTH[0], p[1] - NORMAL_TRUTH[1])))
    if (far > 0.12) return `两盏灯后还有别的答案（离真值 ${far.toFixed(2)}）`
    return ''
  },
}

// ---------------- 3-4 阴影还是颜色 ----------------

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
  [{ zh: '棋盘 + 斜影', en: 'Checkerboard + slanted shadow' }, paint.checker, light.diagonal],
  [{ zh: '字母 T + 侧光', en: 'Letter T + side light' }, paint.letter, light.fromLeft],
  [{ zh: '条纹 + 杆影', en: 'Stripes + pole shadow' }, paint.stripes, light.pole],
  [{ zh: '白墙 + 墙角阴影', en: 'White wall + corner shadow' }, paint.plain, light.corner],
]
// Held back: new paint under light that changes top to bottom, in patches, and down to 0.25, so a
// circuit tuned to the visible light levels (or to light that only changes left to right) shows.
const SHADOW_HIDDEN = [
  [{ zh: '字母 L + 顶光', en: 'Letter L + overhead light' }, P.glyph(GLYPHS.L, 0.2, 0.8, 4, 2), fromFn(16, 16, (x, y) => 0.3 + 0.045 * y)],
  [{ zh: '圆盘 + 树影', en: 'Disc + tree shadow' }, P.disk(8, 7, 5, 0.8, 0.3), fromFn(16, 16, (x, y) => ((3 * x + 5 * y) % 7 < 3 ? 0.25 : 0.9))],
  [{ zh: '斑点墙 + 两道影', en: 'Speckled wall + two shadows' }, (() => {
    const next = random(77)
    return fromFn(16, 16, () => 0.2 + 0.7 * next())
  })(), fromFn(16, 16, (x) => (x % 8 < 3 ? 0.3 : 1))],
]
const shadowGraph = (nodes, wires) => build(nodes, wires, { inputs: ['photo', 'light'] })

const shadowLevel = {
  id: '3-4',
  chapter: 3,
  title: { zh: '阴影还是颜色', en: 'Shadow or colour' },
  inputs: ['photo', 'light'],
  inputLabels: { photo: { zh: '照片', en: 'Photo' }, light: { zh: '光照', en: 'Lighting' } },
  brief: { zh: '照片里每一点的亮度 = 表面本来的颜色（反射率）× 照到那一点的光。第二个输入告诉你每一点照到多少光（1 是满光，阴影里少得多）。去掉阴影和明暗，只输出表面本来的颜色。', en: "The brightness of each point in a photo = the surface's own colour (its reflectance) × the light reaching that point. The second input tells you how much light each point gets (1 is full light; in shadow it is much less). Remove the shadows and shading and output only the surface's own colour." },
  hint: { zh: '照片 = 颜色 × 光照。已知其中两个，怎样求第三个？减法行不行，看看阴影里的格子。', en: 'Photo = colour × lighting. If you know two of them, how do you find the third? To see whether subtracting works, look at the squares in the shadow.' },
  after: { zh: '颜色 = 照片 ÷ 光照。注意第四张：一面纯色的墙，照片里却有一条很硬的边，那是阴影的边，不是物体的边。照片里的边缘只说明「这里亮度变了」，变的可能是颜色，也可能只是光。', en: 'Colour = photo ÷ lighting. Look at the fourth scene: a plain wall, yet the photo has a hard edge in it. That is the edge of a shadow, not of an object. An edge in a photo only says "the brightness changes here"; what changed may be the colour, or just the light.' },
  requires: ['3-3'],
  unlocks: [],
  palette: ['divide', 'sub', 'mul', 'add', 'scale', 'offset'],
  check: { tolerance: 0.02 },
  tests: SHADOW_SCENES.map(([label, colour, lit]) => test(label, { photo: photo(colour, lit), light: lit }, { out: colour })),
  hidden: SHADOW_HIDDEN.map(([label, colour, lit]) => test(label, { photo: photo(colour, lit), light: lit }, { out: colour })),
  solution: shadowGraph({ d: 'divide' }, ['photo>d.a', 'light>d.b', 'd>out']),
  // Taking the shadow away by subtracting: right only where the light is full.
  naive: shadowGraph({ s: 'sub', o: ['offset', { c: 1 }] }, ['photo>s.a', 'light>s.b', 's>o', 'o>out']),
  alsoFails: [
    shadowGraph({}, ['photo>out']),
    shadowGraph({ m: 'mul' }, ['photo>m.a', 'light>m.b', 'm>out']),
  ],
}

// ---------------- 3-5 坡有多陡 ----------------

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
  gx: { label: { zh: '横向坡度 gx', en: 'Horizontal slope gx' }, min: -0.3, max: 0.3, step: 0.01 },
  gy: { label: { zh: '纵向坡度 gy', en: 'Vertical slope gy' }, min: -0.3, max: 0.3, step: 0.01 },
}
const SLOPE_TOLERANCE = 0.012
const SLOPE_STAGES = [
  {
    title: { zh: '横着的坡', en: 'A slope across' },
    note: { zh: '这张图从左往右一点点变亮。下面是穿过十字的那一行的亮度（横剖面）。拨动 gx，让金色斜线贴住曲线：每往右走一格，亮度涨多少？', en: 'This picture gets brighter bit by bit from left to right. Below is the brightness along the row through the cross (the horizontal cross-section). Turn gx until the gold line lies along the curve: for each step to the right, how much does the brightness rise?' },
    field: 'ramp',
    probe: [8, 8],
    knobs: ['gx'],
  },
  {
    title: { zh: '斜坡', en: 'A tilted slope' },
    note: { zh: '现在往右变亮，往下变暗。横剖面量 gx，竖剖面量 gy。两个数合起来就是图上的箭头。', en: 'Now it gets brighter to the right and darker going down. The horizontal cross-section measures gx, the vertical one gy. Together the two numbers make the arrow on the picture.' },
    field: 'tilt',
    probe: [8, 8],
    knobs: ['gx', 'gy'],
  },
  {
    title: { zh: '山坡上', en: 'On a hillside' },
    note: { zh: '一座亮的小山。十字在山坡上，箭头该指向哪里？先猜，再用两条剖面量出来。', en: 'A small bright hill. The cross is on its slope: where should the arrow point? Guess first, then measure it with the two cross-sections.' },
    field: 'hill',
    probe: [6, 9],
    knobs: ['gx', 'gy'],
  },
  {
    title: { zh: '边缘', en: 'An edge' },
    note: { zh: '一条斜着的边：一侧暗、一侧亮。站在边上量坡度。箭头和边是什么关系？', en: 'A slanted edge: dark on one side, bright on the other. Stand on the edge and measure the slope. How does the arrow relate to the edge?' },
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
  id: '3-5',
  kind: 'board',
  board: 'GradientProbe',
  chapter: 3,
  title: { zh: '坡有多陡', en: 'How steep is the slope' },
  brief: { zh: '把图像想成一片地形：越亮越高。图上有个十字，量出那里往右和往下各陡多少，合成一支箭头。这支箭头叫梯度。', en: 'Think of the image as a landscape: brighter is higher. There is a cross on the picture; measure how steep it is there going right and going down, and combine the two into an arrow. This arrow is called the gradient.' },
  hint: { zh: '只看一条剖面：曲线在十字那一点往上走还是往下走？走得多快？斜线贴住曲线时，它的斜率就是答案。', en: 'Look at one cross-section at a time: at the cross, does the curve go up or down? How fast? When the slanted line lies along the curve, its slope is the answer.' },
  after: { zh: '梯度是一个箭头 (gx, gy)：gx 是往右每走一格亮度变多少，gy 是往下。箭头总指向变亮最快的方向（山坡上指向山顶），长度 √(gx² + gy²) 说明有多陡。在边上，箭头又长又垂直于边：边缘就是梯度很大的地方。你搭过的横向差分和 Sobel，就是在每个像素同时量 gx 或 gy。', en: 'The gradient is an arrow (gx, gy): gx is how much the brightness changes for each step to the right, gy the same going down. The arrow always points the way the brightness rises fastest (on a hillside, towards the top), and its length √(gx² + gy²) says how steep it is. On an edge the arrow is long and perpendicular to the edge: an edge is where the gradient is large. The horizontal difference and Sobel you built measure gx or gy at every pixel at once.' },
  requires: ['3-4'],
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

// ---------------- 3-7 整体变亮 ----------------

// One scene (an F with faint surface texture) photographed under four lightings. An edge detector
// marks pixels whose slope is above a threshold; the right answer is the F's outline. Adding light
// leaves every slope alone, dimming scales them all, so one fixed threshold cannot serve every
// photo, until each photo's slopes are measured against its own steepest edge.
const SOBEL_X = [-1, 0, 1, -2, 0, 2, -1, 0, 1].map((v) => v / 8)
const SOBEL_Y = [-1, -2, -1, 0, 0, 0, 1, 2, 1].map((v) => v / 8)
const gradmag = (img) => zip(correlate(img, SOBEL_X, 'edge'), correlate(img, SOBEL_Y, 'edge'), Math.hypot)
const CLEAN = P.glyph(GLYPHS.F, 0.2, 0.6)
const TEXTURE = (() => {
  const next = random(17)
  return fromFn(16, 16, () => (next() - 0.5) * 0.08)
})()
const SCENE = zip(CLEAN, TEXTURE, (a, b) => a + b)
const TRUE_EDGES = (() => {
  const g = gradmag(CLEAN)
  const peak = Math.max(...g.data)
  return map(g, (v) => (v > 0.5 * peak ? 1 : 0))
})()
const PHOTOS = [
  { key: 'A', label: { zh: '原图', en: 'Original' }, a: 1, b: 0 },
  { key: 'B', label: { zh: '整体加亮 +0.25', en: 'Brightened +0.25' }, a: 1, b: 0.25 },
  { key: 'C', label: { zh: '灯暗到 40%', en: 'Lamp dimmed to 40%' }, a: 0.4, b: 0 },
  { key: 'D', label: { zh: '不知道灯怎么变了', en: 'Lighting changed, unknown how' }, a: 0.6, b: 0.15 },
].map((p) => ({ ...p, img: map(SCENE, (v) => p.a * v + p.b) }))
const MISS_ALLOWED = 3
// Edges of a photo at an absolute threshold, or relative to its steepest slope when `relative`.
const edgesAt = (img, t, relative) => {
  const g = gradmag(img)
  const peak = relative ? Math.max(...g.data) : 1
  return map(g, (v) => (v / peak > t ? 1 : 0))
}
const misses = (mask) => mask.data.reduce((n, v, i) => n + (v !== TRUE_EDGES.data[i] ? 1 : 0), 0)
const CHANGE_STAGES = [
  {
    title: { zh: '加亮不怕', en: 'Brightening does no harm' },
    note: { zh: '坡度大于门槛 t 的像素算作边。拖动 t，先让原图的边缘图和「要找的边」一样；再看看加亮的那张。', en: 'Pixels whose slope is above the threshold t count as edges. Drag t until the original\'s edge map matches "Edges to find"; then look at the brightened one.' },
    photos: ['A', 'B'],
    controls: ['t'],
  },
  {
    title: { zh: '灯暗了', en: 'The lamp dims' },
    note: { zh: '灯暗到 40% 后，原来的门槛漏掉了很多边。给暗的那张单独一个门槛 tC，让三张都对。看看 tC 和 t 的比值。', en: 'With the lamp dimmed to 40%, the old threshold misses many edges. Give the dark photo its own threshold tC so all three come out right. Look at the ratio of tC to t.' },
    photos: ['A', 'B', 'C'],
    controls: ['t', 'tC'],
  },
  {
    title: { zh: '不知道灯怎么变', en: "When you don't know the lighting" },
    note: { zh: '第四张照片，灯怎么变的没人告诉你。现在所有照片只能共用一个门槛。打开「用最陡的边当尺子」：每张图的坡度先除以它自己最陡的那一处，再比门槛。', en: 'For the fourth photo, nobody tells you how the lighting changed. Now every photo has to share one threshold. Switch on "Use the steepest edge as a ruler": each picture\'s slopes are first divided by its own steepest spot, then compared with the threshold.' },
    photos: ['A', 'B', 'C', 'D'],
    controls: ['relative', 'r'],
  },
]
const CHANGE_KNOBS = {
  t: { label: { zh: '门槛 t', en: 'Threshold t' }, min: 0.01, max: 0.25, step: 0.005 },
  tC: { label: { zh: '暗照片的门槛 tC', en: "Dark photo's threshold tC" }, min: 0.01, max: 0.25, step: 0.005 },
  r: { label: { zh: '门槛（占最陡的比例）', en: 'Threshold (share of the steepest)' }, min: 0.05, max: 1, step: 0.01 },
}
const CHANGE_START = { t: 0.02, tC: 0.02, relative: false, r: 0.2 }
// The threshold each photo is checked at, for a stage and the player's settings.
const thresholdFor = (stage, key, s) => {
  if (stage.controls.includes('relative')) return s.relative ? { t: s.r, relative: true } : { t: s.t, relative: false }
  return { t: key === 'C' && stage.controls.includes('tC') ? s.tC : s.t, relative: false }
}
const photoOk = (stage, photo, s) => {
  const { t, relative } = thresholdFor(stage, photo.key, s)
  return misses(edgesAt(photo.img, t, relative)) <= MISS_ALLOWED
}
const changePasses = (stage, s) => stage.photos.every((key) => photoOk(stage, PHOTOS.find((p) => p.key === key), s))

const changeLevel = {
  id: '3-7',
  kind: 'board',
  board: 'LightChange',
  chapter: 3,
  title: { zh: '整体变亮', en: 'Brighter all over' },
  brief: { zh: '边缘检测器的规则很简单：坡度大于门槛的像素就是边。可同一个物体，开灯、关灯拍出来的坡度不一样。你来定门槛，让四种灯光下都找出同一组边（字母 F 的轮廓），而不是表面的细纹。', en: "An edge detector's rule is simple: a pixel whose slope is above the threshold is an edge. But the same object, photographed with the light on or off, gives different slopes. You set the threshold so that under all four lightings it finds the same set of edges (the outline of the letter F), not the fine texture on the surface." },
  hint: { zh: '看下面的坡度剖面：加亮的那条和原图完全重合，暗的那条被压扁了。门槛太低会把细纹当成边，太高会漏掉真正的边。', en: 'Look at the slope cross-section below: the brightened curve lies exactly on the original, while the dim one is squashed flat. Too low a threshold takes the fine texture for edges; too high misses real edges.' },
  after: { zh: '整体加亮（每个像素 + b）只把地形整体抬高，坡度一点没变，所以同一个门槛照样能用：梯度对加亮是不变的。灯变暗（每个像素 × a）把所有坡度都乘了 a，门槛也得乘 a 才行，你在第二步看到 tC ÷ t ≈ 0.4。不知道 a 的时候，就用每张图里最陡的坡度当尺子：坡度 ÷ 最陡坡度和 a 无关，一个门槛就能管所有灯光。', en: "Brightening everything (+ b on every pixel) just lifts the whole landscape and leaves every slope as it was, so the same threshold still works: the gradient is unchanged by brightening. Dimming the lamp (× a on every pixel) multiplies every slope by a, so the threshold must be multiplied by a too; in step 2 you saw tC ÷ t ≈ 0.4. When you don't know a, use the steepest slope in each picture as a ruler: slope ÷ steepest slope does not depend on a, so one threshold serves every lighting." },
  requires: ['3-6'],
  unlocks: [],
  change: { knobs: CHANGE_KNOBS, start: CHANGE_START, stages: CHANGE_STAGES, photos: PHOTOS, truth: TRUE_EDGES, gradmag, edgesAt, misses, missAllowed: MISS_ALLOWED, thresholdFor, photoOk, passes: changePasses },
  verify() {
    const grid = (key) => {
      const k = CHANGE_KNOBS[key]
      return Array.from({ length: Math.round((k.max - k.min) / k.step) + 1 }, (_, i) => Math.round((k.min + i * k.step) * 1000) / 1000)
    }
    const [one, two, three] = CHANGE_STAGES
    if (changePasses(one, CHANGE_START)) return '第 1 步一开始就过了'
    const good1 = grid('t').filter((t) => changePasses(one, { ...CHANGE_START, t }))
    if (!good1.length) return '第 1 步没有能用的门槛'
    // Brightening never changes the answer: A and B agree at every threshold.
    if (grid('t').some((t) => photoOk(one, PHOTOS[0], { t }) !== photoOk(one, PHOTOS[1], { t }))) return '加亮改变了边缘图'
    // Step 2: one threshold cannot serve A and C, two can.
    if (grid('t').some((t) => changePasses(two, { ...CHANGE_START, t, tC: t }))) return '第 2 步一个门槛就够了'
    const pairs = good1.flatMap((t) => grid('tC').filter((tC) => changePasses(two, { ...CHANGE_START, t, tC })).map((tC) => tC / t))
    if (!pairs.length) return '第 2 步没有能用的两个门槛'
    // Step 3: without the ruler no single threshold works; with it, some do.
    if (grid('t').some((t) => changePasses(three, { ...CHANGE_START, relative: false, t }))) return '第 3 步不用尺子也能过'
    if (!grid('r').some((r) => changePasses(three, { ...CHANGE_START, relative: true, r }))) return '第 3 步用了尺子也过不了'
    return ''
  },
}

export const nodes = {}
export const levels = [tileLevel, colourLevel, normalLevel, shadowLevel, slopeLevel, changeLevel]
