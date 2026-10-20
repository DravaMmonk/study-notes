import { GLYPHS, correlate, fromFn, image, map, patterns as P, random, zip } from '../../kit/domains/image/engine/image.js'
import { NODE_TYPES } from '../../kit/domains/image/engine/nodes.js'
import { BANDS, CURVES } from '../../kit/domains/image/engine/parts/light.js'
import { build, test } from '../../kit/domains/image/build.js'

// Chapter 3 · 光与边 (lecture 5): where the numbers in a photo come from. Steps: shade a surface from its normals
// (Lambert), turn a spectrum into R, G and B, split a photo into paint and light, then gradients and edges that do
// not care about the lamp. Challenge: white balance. Series: photometric stereo on a factory line, from telling which
// way a surface leans to finding dents and scratches on painted metal.

const S = 16
const dot = (n, l) => n[0] * l[0] + n[1] * l[1] + n[2] * l[2]

// ---------------- surfaces ----------------

// A height field h(x, y) (x right, y down, height towards the camera) and its unit normals, from the field's slope.
const normalsOf = (h) => {
  const at = (x, y) => {
    const hx = (h(x + 0.5, y) - h(x - 0.5, y))
    const hy = (h(x, y + 0.5) - h(x, y - 0.5))
    const len = Math.hypot(hx, hy, 1)
    return [-hx / len, -hy / len, 1 / len]
  }
  return [0, 1, 2].map((k) => fromFn(S, S, (x, y) => at(x, y)[k]))
}
const dome = (cx, cy, r, a) => (x, y) => {
  const d2 = ((x - cx) ** 2 + (y - cy) ** 2) / (r * r)
  return d2 < 1 ? a * (1 - d2) ** 2 : 0
}
const sum = (...fields) => (x, y) => fields.reduce((s, f) => s + f(x, y), 0)
const ridge = (y0, w, a) => (x, y) => (Math.abs(y - y0) < w ? a * (1 - ((y - y0) / w) ** 2) ** 2 : 0)
const tilt = (ax, ay) => (x, y) => ax * (x - 7.5) + ay * (y - 7.5)


// ---------------- 3-1 画一个球, 3-2 补一盏灯 ----------------

const LAMP = [0.48, -0.36, 0.8] // from the right and above
const FILL = [-0.8, 0, 0.6] // a fill light low on the left
const shaded = (normals, albedo, l) => NODE_TYPES.shade.eval({ nx: normals[0], ny: normals[1], nz: normals[2], albedo }, { lx: l[0], ly: l[1], lz: l[2] })
const SHAPES = {
  dome: dome(7.5, 7.5, 7, 3),
  bumps: sum(dome(4.5, 5, 4, 1.5), dome(11, 10, 4.5, 2)),
  ridge: ridge(8, 5, 2.5),
  wedge: tilt(0.3, -0.2),
  steep: dome(8, 8, 6, 4.5),
  pair: sum(dome(5, 8, 4, 2.5), dome(11, 8, 4, 2.5)),
}
const PAINTS = {
  white: P.blank(0.9),
  stripes: P.stripes(8, 0.4, 0.9),
  letter: P.glyph(GLYPHS.T, 0.85, 0.35),
  checker: P.checker(4, 0.45, 0.85),
}
const surfaceTest = (label, shape, paint, out) => {
  const n = normalsOf(SHAPES[shape])
  return test(label, { nx: n[0], ny: n[1], nz: n[2], albedo: PAINTS[paint] }, { out: out(n, PAINTS[paint]) })
}
const SURFACE_INPUTS = {
  inputs: ['nx', 'ny', 'nz', 'albedo'],
  inputLabels: { nx: { zh: '法线 x', en: 'Normal x' }, ny: { zh: '法线 y', en: 'Normal y' }, nz: { zh: '法线 z', en: 'Normal z' }, albedo: { zh: '反射率', en: 'Reflectance' } },
  views: { in: 'pixels', out: 'pixels', mid: 'pixels' },
}
const sfg = (nodes, wires) => build(nodes, wires, { inputs: ['nx', 'ny', 'nz', 'albedo'] })
const mainLight = (n, a) => shaded(n, a, LAMP)

const ball = {
  id: '3-1',
  chapter: 3,
  ...SURFACE_INPUTS,
  title: { zh: '画一个球', en: 'Draw a ball' },
  brief: { zh: '输入是一块表面每一点的朝向（法线的 x、y、z 三个分量）和它的反射率。灯从右上方照来，方向是 (0.48, −0.36, 0.8)（x 向右，y 向下，z 朝着相机）。画出相机拍到的样子：亮度 = 反射率 × cos θ，θ 是法线和灯的方向的夹角。', en: 'The inputs are which way each point of a surface faces (the x, y and z of its normal) and its reflectance. The lamp shines from the upper right, from direction (0.48, −0.36, 0.8) (x to the right, y down, z towards the camera). Draw what the camera sees: brightness = reflectance × cos θ, where θ is the angle between the normal and the lamp direction.' },
  hint: { zh: '两个单位长度的方向，夹角的 cos 等于它们的分量两两相乘再相加。', en: 'For two directions of unit length, the cos of the angle between them is their components multiplied pairwise and added.' },
  after: { zh: '这就是朗伯模型：哑光表面的亮度 = 灯 × 反射率 × cos θ。正对着灯最亮，越斜越暗，因为同一束光铺到了更大的面积上。你搭的电路成了「朗伯着色」元件，灯的方向可调；背光的地方，它输出 0。', en: 'This is the Lambertian model: the brightness of a matte surface = lamp × reflectance × cos θ. Facing the lamp is brightest, and the more it turns away the darker it gets, because the same beam spreads over a larger area. Your circuit is now the "Lambert shading" part, with an adjustable lamp direction; where the surface faces away, it outputs 0.' },
  unlocks: ['lambert'],
  tests: [
    [{ zh: '白球', en: 'White ball' }, 'dome', 'white'],
    [{ zh: '两个鼓包', en: 'Two bumps' }, 'bumps', 'stripes'],
    [{ zh: '横梁', en: 'A ridge' }, 'ridge', 'letter'],
  ].map(([label, shape, paint]) => surfaceTest(label, shape, paint, mainLight)),
  hidden: [
    [{ zh: '斜板', en: 'Tilted board' }, 'wedge', 'checker'],
    [{ zh: '一对鼓包', en: 'A pair of bumps' }, 'pair', 'white'],
  ].map(([label, shape, paint]) => surfaceTest(label, shape, paint, mainLight)),
  solution: sfg({ x: ['arith', { op: 'mul' }], xN: ['const', { c: 0.48 }], y: ['arith', { op: 'mul' }], yN: ['const', { c: -0.36 }], z: ['arith', { op: 'mul' }], zN: ['const', { c: 0.8 }], a: ['arith', { op: 'add' }], b: ['arith', { op: 'add' }], m: ['arith', { op: 'mul' }] }, ['nx>x.a', 'ny>y.a', 'nz>z.a', 'x>a.a', 'y>a.b', 'a>b.a', 'z>b.b', 'b>m.a', 'albedo>m.b', 'm>out', 'xN>x.b', 'yN>y.b', 'zN>z.b']),
  naive: sfg({ m: ['arith', { op: 'mul' }] }, ['nz>m.a', 'albedo>m.b', 'm>out']),
}

const withFill = (n, a) => zip(shaded(n, a, LAMP), shaded(n, a, FILL), (p, q) => p + 0.5 * q)

const fill = {
  id: '3-2',
  chapter: 3,
  ...SURFACE_INPUTS,
  title: { zh: '补一盏灯', en: 'Add a fill light' },
  brief: { zh: '主灯不变，再从左边低处加一盏补光，方向 (−0.8, 0, 0.6)，强度是主灯的一半。画出两盏灯一起照的样子。', en: 'Keep the main lamp and add a fill light low on the left, from direction (−0.8, 0, 0.6), at half the main lamp\'s strength. Draw what the surface looks like under both lamps.' },
  hint: { zh: '两盏灯照亮同一块表面，各自贡献的亮度会怎样合在一起？背对补光的地方呢？', en: 'Two lamps light the same surface: how do the brightnesses they each give combine? And where the surface faces away from the fill light?' },
  after: { zh: '光是相加的：两盏灯照出的亮度，等于各自照出的亮度之和。背对补光的那一面得不到补光，亮度不会变成负数，所以要在 0 截住。摄影棚里的主光加补光、游戏里的多光源，都是这样一盏一盏加起来的。', en: 'Light adds up: the brightness under two lamps is the sum of what each gives on its own. The side facing away from the fill light gets none of it, and brightness cannot be negative, so it is cut off at 0. A key light plus a fill light in a studio, or many lights in a game, are added up lamp by lamp just like this.' },
  unlocks: [],
  tests: [
    [{ zh: '高鼓包', en: 'A tall bump' }, 'steep', 'white'],
    [{ zh: '一对鼓包', en: 'A pair of bumps' }, 'pair', 'stripes'],
    [{ zh: '白球', en: 'White ball' }, 'dome', 'letter'],
  ].map(([label, shape, paint]) => surfaceTest(label, shape, paint, withFill)),
  hidden: [
    [{ zh: '横梁', en: 'A ridge' }, 'ridge', 'checker'],
    [{ zh: '两个鼓包', en: 'Two bumps' }, 'bumps', 'white'],
  ].map(([label, shape, paint]) => surfaceTest(label, shape, paint, withFill)),
  solution: sfg({ m: ['shade', { lx: 0.48, ly: -0.36, lz: 0.8 }], f: ['shade', { lx: -0.8, ly: 0, lz: 0.6 }], h: ['arith', { op: 'mul' }], hN: ['const', { c: 0.5 }], a: ['arith', { op: 'add' }] }, ['nx>m.nx', 'ny>m.ny', 'nz>m.nz', 'albedo>m.albedo', 'nx>f.nx', 'ny>f.ny', 'nz>f.nz', 'albedo>f.albedo', 'f>h.a', 'm>a.a', 'h>a.b', 'a>out', 'hN>h.b']),
  naive: sfg({ m: ['shade', { lx: 0.48, ly: -0.36, lz: 0.8 }] }, ['nx>m.nx', 'ny>m.ny', 'nz>m.nz', 'albedo>m.albedo', 'm>out']),
  alsoFails: [
    // The fill light added without cutting off at 0.
    sfg({ m: ['shade', { lx: 0.48, ly: -0.36, lz: 0.8 }], x: ['arith', { op: 'mul' }], xN: ['const', { c: -0.4 }], z: ['arith', { op: 'mul' }], zN: ['const', { c: 0.3 }], s: ['arith', { op: 'add' }], f: ['arith', { op: 'mul' }], a: ['arith', { op: 'add' }] }, ['nx>m.nx', 'ny>m.ny', 'nz>m.nz', 'albedo>m.albedo', 'nx>x.a', 'nz>z.a', 'x>s.a', 'z>s.b', 's>f.a', 'albedo>f.b', 'm>a.a', 'f>a.b', 'a>out', 'xN>x.b', 'zN>z.b']),
  ],
}

// ---------------- 3-3 相机的三个数, 3-4 换灯露馅 ----------------

// Light from 400 to 700 nm in ten bands 30 nm wide, as a waveform of 10 samples. A camera has three kinds of sensor,
// each with its own sensitivity curve; a reading is the average of spectrum × curve, scaled so an even, full
// spectrum reads 1.
const row = (values) => fromFn(values.length, 1, (x) => values[x])
const read = (spectrum, channel) => NODE_TYPES.sense.eval({ in: spectrum }, { channel })
const reading = (spectrum) => ({ ro: read(spectrum, 'R'), go: read(spectrum, 'G'), bo: read(spectrum, 'B') })

const SPECTRA = {
  daylight: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  apple: [0.1, 0.08, 0.06, 0.08, 0.1, 0.2, 0.6, 0.85, 0.9, 0.9].map((v) => v * 0.95),
  leaf: [0.05, 0.08, 0.15, 0.45, 0.6, 0.4, 0.15, 0.1, 0.1, 0.15],
  sky: [0.9, 0.85, 0.75, 0.6, 0.45, 0.35, 0.3, 0.25, 0.2, 0.2],
  sodium: [0, 0, 0, 0, 0.1, 0.4, 1, 0.3, 0, 0],
  violet: [0.8, 0.5, 0.1, 0, 0, 0, 0.1, 0.4, 0.7, 0.6],
}
const CHANNEL_OUT = { outputs: ['ro', 'go', 'bo'], outputLabels: { ro: 'R', go: 'G', bo: 'B' } }
const spectrumTest = (label, key) => test(label, { in: row(SPECTRA[key]), sr: row(CURVES.R), sg: row(CURVES.G), sb: row(CURVES.B) }, reading(row(SPECTRA[key])))
const cg = (nodes, wires) => build(nodes, wires, { inputs: ['in', 'sr', 'sg', 'sb'], outputs: ['ro', 'go', 'bo'] })

const camera = {
  id: '3-3',
  chapter: 3,
  ...CHANNEL_OUT,
  inputs: ['in', 'sr', 'sg', 'sb'],
  inputLabels: { in: { zh: '光谱', en: 'Spectrum' }, sr: { zh: 'R 灵敏度', en: 'R sensitivity' }, sg: { zh: 'G 灵敏度', en: 'G sensitivity' }, sb: { zh: 'B 灵敏度', en: 'B sensitivity' } },
  title: { zh: '相机的三个数', en: 'A camera\'s three numbers' },
  brief: { zh: '「光谱」是从紫（400 nm）到红（700 nm）的 10 个波段各有多少光。相机有三种感光元件，各有一条灵敏度曲线。每种的读数 = 光谱乘上它的灵敏度曲线，再求平均。输出 R、G、B 三个读数。', en: 'The "Spectrum" is how much light there is in each of 10 bands from violet (400 nm) to red (700 nm). The camera has three kinds of sensor, each with a sensitivity curve. Each sensor reads the spectrum times its sensitivity curve, averaged. Output the three readings, R, G and B.' },
  after: { zh: '一整条光谱，被三种感光元件压成三个数，这就是相机（和人眼）看到的颜色。你搭的电路成了「感光」元件：选 R、G 或 B，它就按那条曲线读数。', en: 'A whole spectrum, squeezed by three kinds of sensor into three numbers: that is the colour a camera (and an eye) sees. Your circuit is now the "Sensor" part: choose R, G or B and it reads with that curve.' },
  unlocks: ['sense'],
  check: { tolerance: 0.01 },
  tests: [[{ zh: '日光', en: 'Daylight' }, 'daylight'], [{ zh: '苹果', en: 'An apple' }, 'apple'], [{ zh: '树叶', en: 'A leaf' }, 'leaf'], [{ zh: '天空', en: 'The sky' }, 'sky']].map(([label, key]) => spectrumTest(label, key)),
  hidden: [[{ zh: '钠灯', en: 'A sodium lamp' }, 'sodium'], [{ zh: '紫色', en: 'Purple' }, 'violet']].map(([label, key]) => spectrumTest(label, key)),
  solution: cg({ mr: ['arith', { op: 'mul' }], mg: ['arith', { op: 'mul' }], mb: ['arith', { op: 'mul' }], ar: 'fqMean', ag: 'fqMean', ab: 'fqMean' }, ['in>mr.a', 'sr>mr.b', 'in>mg.a', 'sg>mg.b', 'in>mb.a', 'sb>mb.b', 'mr>ar', 'mg>ag', 'mb>ab', 'ar>ro', 'ag>go', 'ab>bo']),
  naive: cg({ m: 'fqMean' }, ['in>m', 'm>ro', 'm>go', 'm>bo']),
}

// Two cloths that match in daylight: B differs from A by a spectrum every sensor reads as 0.
const METAMER = (() => {
  const vectors = Object.values(CURVES)
  const basis = []
  for (const v of vectors) {
    let u = [...v]
    for (const b of basis) {
      const k = u.reduce((s, x, i) => s + x * b[i], 0)
      u = u.map((x, i) => x - k * b[i])
    }
    const len = Math.hypot(...u)
    basis.push(u.map((x) => x / len))
  }
  let d = [0.4, -0.3, -0.5, 0.2, 0.6, -0.6, 0.3, 0.5, -0.4, 0.1]
  for (const b of basis) {
    const k = d.reduce((s, x, i) => s + x * b[i], 0)
    d = d.map((x, i) => x - k * b[i])
  }
  const peak = Math.max(...d.map(Math.abs))
  return d.map((x) => (0.3 * x) / peak)
})()
const CLOTHS = {
  ochre: [0.3, 0.3, 0.32, 0.38, 0.45, 0.52, 0.56, 0.58, 0.6, 0.6],
  sage: [0.4, 0.42, 0.45, 0.5, 0.52, 0.5, 0.46, 0.42, 0.4, 0.4],
}
const LAMPS = {
  daylight: SPECTRA.daylight,
  warm: BANDS.map((_, i) => 0.3 + (0.7 * i) / 9),
  green: [0, 0, 0, 1, 1, 0.2, 0, 0, 0, 0],
  red: [0, 0, 0, 0, 0, 0, 0.3, 1, 1, 0.5],
  blue: [1, 1, 0.6, 0.2, 0, 0, 0, 0, 0, 0],
}
const twin = (key) => CLOTHS[key].map((v, i) => v + METAMER[i])
const lit = (cloth, lamp) => row(cloth.map((v, i) => v * lamp[i]))
const metamerTest = (label, cloth, lamp) => {
  const a = CLOTHS[cloth]
  const b = twin(cloth)
  const ra = reading(lit(a, LAMPS[lamp]))
  const rb = reading(lit(b, LAMPS[lamp]))
  const diff = Object.fromEntries(['ro', 'go', 'bo'].map((c) => [c, image(1, 1, ra[c].data[0] - rb[c].data[0])]))
  return test(label, { a: row(a), b: row(b), lamp: row(LAMPS[lamp]) }, diff)
}
const mg = (nodes, wires) => build(nodes, wires, { inputs: ['a', 'b', 'lamp'], outputs: ['ro', 'go', 'bo'] })
const senses = (from) => ({ nodes: { sr: ['sense', { channel: 'R' }], sg: ['sense', { channel: 'G' }], sb: ['sense', { channel: 'B' }] }, wires: [`${from}>sr`, `${from}>sg`, `${from}>sb`, 'sr>ro', 'sg>go', 'sb>bo'] })

const metamers = {
  id: '3-4',
  chapter: 3,
  ...CHANNEL_OUT,
  inputs: ['a', 'b', 'lamp'],
  inputLabels: { a: { zh: '布 A', en: 'Cloth A' }, b: { zh: '布 B', en: 'Cloth B' }, lamp: { zh: '灯', en: 'Lamp' } },
  title: { zh: '换灯露馅', en: 'A new lamp gives it away' },
  brief: { zh: '「布 A」「布 B」是两块布在每个波段反射多少光，「灯」是灯的光谱。照到布上再反射进相机的光 = 灯 × 布。输出这盏灯下，相机读到的布 A 减去布 B：R、G、B 三个差。', en: '"Cloth A" and "Cloth B" are how much light two cloths reflect in each band, and "Lamp" is the lamp\'s spectrum. The light that reaches the camera off a cloth = lamp × cloth. Output what the camera reads for cloth A minus cloth B under this lamp: three differences, R, G and B.' },
  hint: { zh: '日光那一组的答案全是 0。两块布的光谱明明不一样，相机为什么分不出来？', en: 'The daylight test expects all zeros. The two cloths\' spectra are plainly different, so why can the camera not tell them apart?' },
  after: { zh: '两块布在日光下读数一样，换一盏灯就不一样了：它们的光谱不同，只是差别正好落在三种感光都看不见的地方。这叫同色异谱。买衣服时在店里灯下配好的颜色，到了太阳底下对不上，就是这个原因。感光是线性的，所以「先相减再读数」和「分别读数再相减」一样。', en: 'The two cloths read the same in daylight and differently under another lamp: their spectra differ, but only where none of the three sensors can see. This is metamerism. It is why colours that match under the shop\'s lights can clash in the sun. Sensing is linear, so "subtract, then read" is the same as "read each, then subtract".' },
  unlocks: [],
  check: { tolerance: 0.01 },
  tests: [
    [{ zh: '赭色 · 日光', en: 'Ochre · daylight' }, 'ochre', 'daylight'],
    [{ zh: '赭色 · 暖白灯', en: 'Ochre · warm white' }, 'ochre', 'warm'],
    [{ zh: '赭色 · 绿灯', en: 'Ochre · green LED' }, 'ochre', 'green'],
    [{ zh: '灰绿 · 红灯', en: 'Sage · red LED' }, 'sage', 'red'],
  ].map(([label, cloth, lamp]) => metamerTest(label, cloth, lamp)),
  hidden: [
    [{ zh: '灰绿 · 日光', en: 'Sage · daylight' }, 'sage', 'daylight'],
    [{ zh: '灰绿 · 蓝灯', en: 'Sage · blue LED' }, 'sage', 'blue'],
  ].map(([label, cloth, lamp]) => metamerTest(label, cloth, lamp)),
  solution: (() => {
    const s = senses('m')
    return mg({ d: ['arith', { op: 'sub' }], m: ['arith', { op: 'mul' }], ...s.nodes }, ['a>d.a', 'b>d.b', 'd>m.a', 'lamp>m.b', ...s.wires])
  })(),
  naive: (() => {
    const s = senses('d')
    return mg({ d: ['arith', { op: 'sub' }], ...s.nodes }, ['a>d.a', 'b>d.b', ...s.wires])
  })(),
}

// ---------------- 3-5 阴影还是颜色, 3-6 只认颜色 ----------------

const paint = {
  checker: P.checker(4, 0.3, 0.9),
  letter: P.glyph(GLYPHS.T, 0.85, 0.25),
  stripes: P.stripes(6, 0.35, 0.85),
  plain: P.blank(0.7),
}
// How much light reaches each spot: full sun 1, shadow 0.35, or light fading across the scene.
const light = {
  diagonal: fromFn(S, S, (x, y) => (x + y < 16 ? 1 : 0.35)),
  fromLeft: fromFn(S, S, (x) => 1 - 0.045 * x),
  pole: fromFn(S, S, (x, y) => (x >= 6 && x <= 8 && y >= 4 ? 0.4 : 1)),
  corner: fromFn(S, S, (x, y) => (x > 9 && y < 7 ? 0.45 : 0.95)),
}
const photo = (a, b) => zip(a, b, (p, q) => p * q)
const SHADOW_SCENES = [
  [{ zh: '棋盘 + 斜影', en: 'Checkerboard + slanted shadow' }, paint.checker, light.diagonal],
  [{ zh: '字母 T + 侧光', en: 'Letter T + side light' }, paint.letter, light.fromLeft],
  [{ zh: '条纹 + 杆影', en: 'Stripes + pole shadow' }, paint.stripes, light.pole],
  [{ zh: '白墙 + 墙角阴影', en: 'White wall + corner shadow' }, paint.plain, light.corner],
]
// Held back: new paint under light that changes top to bottom, in patches, and down to 0.25.
const SHADOW_HIDDEN = [
  [{ zh: '字母 L + 顶光', en: 'Letter L + overhead light' }, P.glyph(GLYPHS.L, 0.2, 0.8, 4, 2), fromFn(S, S, (x, y) => 0.3 + 0.045 * y)],
  [{ zh: '圆盘 + 树影', en: 'Disc + tree shadow' }, P.disk(8, 7, 5, 0.8, 0.3), fromFn(S, S, (x, y) => ((3 * x + 5 * y) % 7 < 3 ? 0.25 : 0.9))],
  [{ zh: '斑点墙 + 两道影', en: 'Speckled wall + two shadows' }, (() => {
    const next = random(77)
    return fromFn(S, S, () => 0.2 + 0.7 * next())
  })(), fromFn(S, S, (x) => (x % 8 < 3 ? 0.3 : 1))],
]
const shadowGraph = (nodes, wires) => build(nodes, wires, { inputs: ['photo', 'light'] })

const shadow = {
  id: '3-5',
  chapter: 3,
  title: { zh: '阴影还是颜色', en: 'Shadow or colour' },
  inputs: ['photo', 'light'],
  inputLabels: { photo: { zh: '照片', en: 'Photo' }, light: { zh: '光照', en: 'Lighting' } },
  brief: { zh: '照片里每一点的亮度 = 表面本来的颜色（反射率）× 照到那一点的光。第二个输入告诉你每一点照到多少光（1 是满光，阴影里少得多）。去掉阴影和明暗，只输出表面本来的颜色。', en: "The brightness of each point in a photo = the surface's own colour (its reflectance) × the light reaching that point. The second input tells you how much light each point gets (1 is full light; in shadow it is much less). Remove the shadows and shading and output only the surface's own colour." },
  hint: { zh: '照片 = 颜色 × 光照。已知其中两个，怎样求第三个？减法行不行，看看阴影里的格子。', en: 'Photo = colour × lighting. If you know two of them, how do you find the third? To see whether subtracting works, look at the squares in the shadow.' },
  after: { zh: '颜色 = 照片 ÷ 光照。注意第四张：一面纯色的墙，照片里却有一条很硬的边，那是阴影的边，不是物体的边。照片里的边缘只说明「这里亮度变了」，变的可能是颜色，也可能只是光。', en: 'Colour = photo ÷ lighting. Look at the fourth scene: a plain wall, yet the photo has a hard edge in it. That is the edge of a shadow, not of an object. An edge in a photo only says "the brightness changes here"; what changed may be the colour, or just the light.' },
  unlocks: [],
  tests: SHADOW_SCENES.map(([label, colour, lit]) => test(label, { photo: photo(colour, lit), light: lit }, { out: colour })),
  hidden: SHADOW_HIDDEN.map(([label, colour, lit]) => test(label, { photo: photo(colour, lit), light: lit }, { out: colour })),
  solution: shadowGraph({ d: ['arith', { op: 'div' }] }, ['photo>d.a', 'light>d.b', 'd>out']),
  // Taking the shadow away by subtracting: right only where the light is full.
  naive: shadowGraph({ s: ['arith', { op: 'sub' }], o: ['arith', { op: 'add' }], oN: ['const', { c: 1 }] }, ['photo>s.a', 'light>s.b', 's>o.a', 'o>out', 'oN>o.b']),
  alsoFails: [shadowGraph({}, ['photo>out']), shadowGraph({ m: ['arith', { op: 'mul' }] }, ['photo>m.a', 'light>m.b', 'm>out'])],
}

// A scene in three channels: objects of some colour, lit by light that varies from place to place.
const RGB = { inputs: ['r', 'g', 'b'], inputLabels: { r: 'R', g: 'G', b: 'B' } }
const COLOURS = { red: [0.8, 0.18, 0.15], darkRed: [0.45, 0.1, 0.12], green: [0.2, 0.7, 0.25], white: [0.85, 0.85, 0.82], yellow: [0.85, 0.8, 0.2], blue: [0.15, 0.25, 0.8], grey: [0.45, 0.45, 0.45] }
const scene = (layout, lighting) => {
  const colourAt = (x, y) => COLOURS[layout(x, y)]
  const channel = (k) => fromFn(S, S, (x, y) => colourAt(x, y)[k] * lighting(x, y))
  return { r: channel(0), g: channel(1), b: channel(2), colourAt }
}
const isRed = (c) => c[0] / (c[0] + c[1] + c[2]) > 0.5
const rgbGraph = (nodes, wires, outputs = ['out']) => build(nodes, wires, { inputs: ['r', 'g', 'b'], outputs })
const redLayouts = {
  apples: (x, y) => ((x - 4) ** 2 + (y - 5) ** 2 < 9 ? 'red' : (x - 11) ** 2 + (y - 10) ** 2 < 10 ? 'darkRed' : x > 9 && y < 5 ? 'white' : 'green'),
  flags: (x, y) => (y < 5 ? 'red' : y < 10 ? 'white' : x < 8 ? 'blue' : 'red'),
  flowers: (x, y) => ((x * 3 + y * 5) % 11 < 3 ? 'yellow' : (x + y) % 7 < 2 ? 'red' : 'green'),
  stall: (x, y) => (x < 5 ? 'red' : x < 10 ? 'yellow' : y < 8 ? 'white' : 'darkRed'),
  street: (x, y) => (y > 11 ? 'grey' : x % 5 === 0 ? 'red' : 'blue'),
}
const lights = {
  window: (x) => 1 - 0.05 * x,
  shade: (x, y) => (x + 2 * y < 20 ? 1 : 0.35),
  dusk: (x, y) => 0.3 + 0.03 * y,
  patchy: (x, y) => ((x + y) % 6 < 3 ? 0.95 : 0.45),
  noon: () => 1,
}
const redTest = (label, layout, lighting) => {
  const s = scene(redLayouts[layout], lights[lighting])
  return test(label, { r: s.r, g: s.g, b: s.b }, { out: fromFn(S, S, (x, y) => (isRed(s.colourAt(x, y)) ? 1 : 0)) })
}

const onlyRed = {
  id: '3-6',
  chapter: 3,
  ...RGB,
  title: { zh: '只认颜色', en: 'Colour, not brightness' },
  brief: { zh: '三张输入是同一个场景的 R、G、B。标出红色的东西：亮处的、阴影里的都要；白纸、黄花不算。', en: 'The three inputs are the R, G and B of one scene. Mark the red things, in the light and in the shade alike; white paper and yellow flowers do not count.' },
  hint: { zh: '阴影里的红苹果，R 并不大；阳光下的白纸，R 却很大。光照把三个数一起放大缩小，什么量不受它影响？', en: 'A red apple in the shade has a small R; white paper in the sun has a big one. Lighting scales all three numbers together, so what stays the same?' },
  after: { zh: '光照让 R、G、B 一起变大变小，三者的比例却不变。r = R ÷ (R + G + B) 只看颜色、不看明暗，是一种色度。HSV、Lab 这些颜色空间也是同一个想法：把「什么颜色」和「多亮」分开放。', en: 'Lighting scales R, G and B together, but their proportions stay the same. r = R ÷ (R + G + B) sees the colour and not the brightness: it is a chromaticity. Colour spaces such as HSV and Lab follow the same idea: they keep "which colour" apart from "how bright".' },
  unlocks: [],
  tests: [
    [{ zh: '苹果', en: 'Apples' }, 'apples', 'window'],
    [{ zh: '旗子', en: 'Flags' }, 'flags', 'shade'],
    [{ zh: '花丛', en: 'Flowers' }, 'flowers', 'dusk'],
  ].map(([label, layout, lighting]) => redTest(label, layout, lighting)),
  hidden: [
    [{ zh: '水果摊', en: 'A fruit stall' }, 'stall', 'patchy'],
    [{ zh: '街道', en: 'A street' }, 'street', 'noon'],
  ].map(([label, layout, lighting]) => redTest(label, layout, lighting)),
  solution: rgbGraph({ s1: ['arith', { op: 'add' }], s2: ['arith', { op: 'add' }], q: ['arith', { op: 'div' }], t: ['threshold', { t: 0.5 }] }, ['r>s1.a', 'g>s1.b', 's1>s2.a', 'b>s2.b', 'r>q.a', 's2>q.b', 'q>t', 't>out']),
  naive: rgbGraph({ t: ['threshold', { t: 0.4 }] }, ['r>t', 't>out']),
  alsoFails: [rgbGraph({ d: ['arith', { op: 'sub' }], t: ['threshold', { t: 0.25 }] }, ['r>d.a', 'g>d.b', 'd>t', 't>out'])],
}

// ---------------- 3-7 梯度大小, 3-8 关灯也认得 ----------------

const SOBEL_X = [-1, 0, 1, -2, 0, 2, -1, 0, 1].map((v) => v / 8)
const SOBEL_Y = [-1, -2, -1, 0, 0, 0, 1, 2, 1].map((v) => v / 8)
const gradmag = (img, border = 'zero') => zip(correlate(img, SOBEL_X, border), correlate(img, SOBEL_Y, border), Math.hypot)

const gradient = {
  id: '3-7',
  views: { in: 'slope', out: 'terrain', mid: 'terrain' },
  chapter: 3,
  title: { zh: '梯度大小', en: 'Gradient magnitude' },
  brief: { zh: '坡度有两个分量：Sobel x 量往右走亮度变多少（gx），Sobel y 量往下走（gy）。两个合成一个箭头，在每个像素输出箭头有多长：√(gx² + gy²)。不管边是横的、竖的还是斜的，越陡的地方越亮。', en: 'A slope has two components: Sobel x measures how much the brightness changes going right (gx), and Sobel y going down (gy). Together they make an arrow; at every pixel, output how long that arrow is: √(gx² + gy²). Whether an edge is horizontal, vertical or diagonal, the steeper it is, the brighter.' },
  hint: { zh: '箭头的长度怎么从两个分量算出来？想想勾股定理。', en: 'How do you get the arrow\'s length from its two components? Think of Pythagoras.' },
  after: { zh: '两个方向的坡度合成一个长度，边缘强度就和边的方向无关了：横边、竖边、斜边一样亮。方向本身是 atan2(gy, gx)，箭头总指向变亮最快的方向，在边上和边垂直。切到「坡度」画法看输入：箭头就画在每个像素上。', en: 'Combining the slopes in two directions into one length makes edge strength independent of edge direction: horizontal, vertical and diagonal edges are equally bright. The direction itself is atan2(gy, gx); the arrow always points where the brightness rises fastest, and on an edge it is perpendicular to the edge. Draw the input in the "Slope" view: the arrows are drawn at every pixel.' },
  unlocks: ['gradmag'],
  tests: [[{ zh: '方块', en: 'Square' }, P.square()], [{ zh: '圆盘', en: 'Disc' }, P.disk()], [{ zh: '字母 X', en: 'Letter X' }, P.glyph(GLYPHS.X)], [{ zh: '角', en: 'Corner' }, P.corner()]].map(([label, img]) => test(label, { in: img }, { out: gradmag(img) })),
  hidden: [[{ zh: '低对比圆盘', en: 'Low-contrast disc' }, P.disk(9, 6, 4, 0.4, 0.65)], [{ zh: '挪开的字母 T', en: 'Shifted letter T' }, P.glyph(GLYPHS.T, 0.2, 0.75, 5, 4)], [{ zh: '斜坡', en: 'Ramp' }, fromFn(S, S, (x, y) => 0.1 + 0.03 * x + 0.02 * y)]].map(([label, img]) => test(label, { in: img }, { out: gradmag(img) })),
  solution: build({ x: 'sobelx', y: 'sobely', xx: ['arith', { op: 'mul' }], yy: ['arith', { op: 'mul' }], a: ['arith', { op: 'add' }], r: 'sqrt' }, ['in>x', 'in>y', 'x>xx.a', 'x>xx.b', 'y>yy.a', 'y>yy.b', 'xx>a.a', 'yy>a.b', 'a>r', 'r>out']),
  naive: build({ x: 'sobelx', y: 'sobely', a: ['arith', { op: 'add' }] }, ['in>x', 'in>y', 'x>a.a', 'y>a.b', 'a>out']),
}

const edgeMask = (img) => {
  const g = gradmag(img, 'edge')
  const peak = Math.max(...g.data)
  return map(g, (v) => (v / peak > 0.5 ? 1 : 0))
}
const relight = (img, gain, offset) => map(img, (v) => v * gain + offset)

const dimLight = {
  id: '3-8',
  views: { in: 'slope', out: 'pixels', mid: 'terrain' },
  chapter: 3,
  title: { zh: '关灯也认得', en: 'Seen even in dim light' },
  brief: { zh: '同一个物体在不同灯光下拍了几次：有的整体变亮，有的灯暗了一半。每次都要标出同一组边：梯度大小超过这张图里最陡处一半的像素输出 1。', en: 'The same object was photographed several times under different lighting: in some shots it is brighter overall, in others the light is half as strong. Each time, mark the same set of edges: output 1 at pixels whose gradient magnitude is more than half that of the steepest spot in the picture.' },
  hint: { zh: '不知道灯暗了多少，能不能在图里找一把跟着灯光一起变长变短的尺子？', en: 'You don\'t know how much the light dimmed. Can you find a ruler inside the image that grows and shrinks with the light?' },
  after: { zh: '求坡度去掉了整体加亮（偏置），除以最陡的坡度去掉了整体倍数（增益）。设计特征时先问：哪些变化不应该改变答案？这叫不变性。注意图外补的数：补 0 会在图边造出一条随灯光变化的假边，所以要复制边缘。', en: 'Taking slopes removes an overall brightening (the offset); dividing by the steepest slope removes an overall scaling (the gain). When you design a feature, first ask: which changes should not change the answer? This is called invariance. Mind the padding outside the image: padding with 0 creates a fake edge at the border that changes with the lighting, so replicate the edge instead.' },
  unlocks: [],
  adds: ['globalMax'],
  tests: [[1, 0], [0.45, 0.05], [1.6, -0.1], [0.7, 0.3]].map(([gain, offset]) => {
    const subject = P.glyph(GLYPHS.F, 0.15, 0.55)
    const extra = offset ? ` ${offset > 0 ? '+' : ''}${offset}` : ''
    return test({ zh: `灯光 ×${gain}${extra}`, en: `Light ×${gain}${extra}` }, { in: relight(subject, gain, offset) }, { out: edgeMask(subject) })
  }),
  hidden: [
    [{ zh: '换个物体 · 弱光', en: 'Another object · dim light' }, P.glyph(GLYPHS.T, 0.2, 0.6, 4, 3), 0.35, 0.02],
    [{ zh: '换个物体 · 强光', en: 'Another object · bright light' }, P.square(3, 5, 7, 0.1, 0.5), 1.8, 0.1],
    [{ zh: '换个物体 · 灰蒙蒙', en: 'Another object · hazy' }, P.glyph(GLYPHS.L, 0.15, 0.55, 6, 4), 0.5, 0.45],
  ].map(([label, subject, gain, offset]) => test(label, { in: relight(subject, gain, offset) }, { out: edgeMask(subject) })),
  solution: build({ g: ['gradmag', { border: 'edge' }], m: 'globalMax', d: ['arith', { op: 'div' }], t: ['threshold', { t: 0.5 }] }, ['in>g', 'g>m', 'g>d.a', 'm>d.b', 'd>t', 't>out']),
  naive: build({ g: 'gradmag', t: ['threshold', { t: 0.1 }] }, ['in>g', 'g>t', 't>out']),
}

// ---------------- 3-9 白平衡 (challenge) ----------------

const LAMP_TINT = [1, 0.82, 0.5] // a warm, yellowish lamp
const balanceLayouts = {
  desk: (x, y) => (x > 10 && y > 10 ? 'white' : x < 6 ? 'red' : y < 7 ? 'blue' : 'green'),
  market: (x, y) => (x < 4 && y < 4 ? 'white' : (x + y) % 5 < 2 ? 'yellow' : x > 8 ? 'red' : 'grey'),
  poster: (x, y) => (y < 3 ? 'white' : x < 8 ? 'blue' : 'darkRed'),
  garden: (x, y) => ((x - 8) ** 2 + (y - 8) ** 2 < 6 ? 'white' : y > 9 ? 'green' : 'yellow'),
  kitchen: (x, y) => (x > 12 ? 'white' : y > 12 ? 'grey' : 'red'),
}
const balanceTest = (label, layout, strength) => {
  const s = scene(balanceLayouts[layout], () => strength)
  const tint = (k, img) => map(img, (v) => v * LAMP_TINT[k])
  const ins = { r: tint(0, s.r), g: tint(1, s.g), b: tint(2, s.b) }
  const peak = (img) => Math.max(...img.data)
  return test(label, ins, { ro: map(ins.r, (v) => v / peak(ins.r)), go: map(ins.g, (v) => v / peak(ins.g)), bo: map(ins.b, (v) => v / peak(ins.b)) })
}
const RGB_OUT = CHANNEL_OUT

const balance = {
  id: '3-9',
  chapter: 3,
  ...RGB,
  ...RGB_OUT,
  title: { zh: '白平衡', en: 'White balance' },
  brief: { zh: '这些照片是在偏黄的灯下拍的，白纸看上去发黄。每张照片里都有一块白纸，而且它在 R、G、B 里都是最亮的。把三个通道各自调整，让白纸变成纯白 (1, 1, 1)，其余颜色跟着一起还原。', en: 'These photos were taken under a yellowish lamp, so white paper looks yellow. Every photo has a patch of white paper in it, the brightest thing in each of R, G and B. Adjust each channel so the paper becomes pure white (1, 1, 1), and every other colour is restored along with it.' },
  hint: { zh: '白纸本来应该是什么颜色？', en: 'What colour should the white paper really be?' },
  after: { zh: '每个通道除以白纸在这个通道的读数，灯的颜色就抵消了。相机的「白平衡」做的就是这件事：找一个应该是白色的东西，按它把三个通道拉齐。照片里最亮的东西当白色，叫「白块假设」；照片里没有白东西时，它就会出错。', en: 'Divide each channel by the white paper\'s reading in that channel, and the colour of the lamp cancels out. A camera\'s "white balance" does exactly this: find something that ought to be white and even up the three channels by it. Taking the brightest thing as white is called the "white patch" assumption; it fails when nothing in the photo is white.' },
  unlocks: [],
  tests: [
    [{ zh: '书桌', en: 'A desk' }, 'desk', 1],
    [{ zh: '集市', en: 'A market' }, 'market', 0.8],
    [{ zh: '海报', en: 'A poster' }, 'poster', 0.6],
  ].map(([label, layout, strength]) => balanceTest(label, layout, strength)),
  hidden: [
    [{ zh: '花园', en: 'A garden' }, 'garden', 0.9],
    [{ zh: '厨房', en: 'A kitchen' }, 'kitchen', 0.5],
  ].map(([label, layout, strength]) => balanceTest(label, layout, strength)),
  solution: rgbGraph({ mr: 'globalMax', mg: 'globalMax', mb: 'globalMax', dr: ['arith', { op: 'div' }], dg: ['arith', { op: 'div' }], db: ['arith', { op: 'div' }] }, ['r>mr', 'g>mg', 'b>mb', 'r>dr.a', 'mr>dr.b', 'g>dg.a', 'mg>dg.b', 'b>db.a', 'mb>db.b', 'dr>ro', 'dg>go', 'db>bo'], ['ro', 'go', 'bo']),
  naive: rgbGraph({ m: 'globalMax', dr: ['arith', { op: 'div' }], dg: ['arith', { op: 'div' }], db: ['arith', { op: 'div' }] }, ['r>m', 'r>dr.a', 'm>dr.b', 'g>dg.a', 'm>dg.b', 'b>db.a', 'm>db.b', 'dr>ro', 'dg>go', 'db>bo'], ['ro', 'go', 'bo']),
}

// ---------------- 3-10 … 3-12 光度立体质检 (series) ----------------

// A painted metal sheet on a line, photographed three times: under a lamp from the right, one from below and one from
// the front. Every photo is reflectance × (normal · lamp), never facing away from any lamp.
const STEREO_LAMPS = [[0.6, 0, 0.8], [0, 0.6, 0.8], [0, 0, 1]]
const STEREO = {
  inputs: ['p1', 'p2', 'p3'],
  inputLabels: { p1: { zh: '右灯', en: 'Lamp right' }, p2: { zh: '下灯', en: 'Lamp below' }, p3: { zh: '正面灯', en: 'Lamp front' } },
}
const stains = (seed) => {
  const next = random(seed)
  const blobs = Array.from({ length: 4 }, () => [next() * 16, next() * 16, 1.5 + 2 * next(), 0.25 + 0.3 * next()])
  return fromFn(S, S, (x, y) => Math.max(0.2, 0.8 - blobs.reduce((s, [cx, cy, r, d]) => s + ((x - cx) ** 2 + (y - cy) ** 2 < r * r ? d : 0), 0) * 0.8))
}
const bowl = (cx, cy, r, depth) => (x, y) => -dome(cx, cy, r, depth)(x, y)
const groove = (x0, y0, x1, y1, w, depth) => (x, y) => {
  const dx = x1 - x0
  const dy = y1 - y0
  const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy)))
  const d = Math.hypot(x - x0 - t * dx, y - y0 - t * dy)
  return d < w ? -depth * (1 - (d / w) ** 2) ** 2 : 0
}
const sheet = (height, paint) => {
  const n = normalsOf(height)
  const photos = STEREO_LAMPS.map((l) => fromFn(S, S, (x, y) => {
    const i = y * S + x
    return paint.data[i] * Math.max(0, dot([n[0].data[i], n[1].data[i], n[2].data[i]], l))
  }))
  return { n, photos: { p1: photos[0], p2: photos[1], p3: photos[2] } }
}
const sg = (nodes, wires) => build(nodes, wires, { inputs: ['p1', 'p2', 'p3'] })
// ρ·n from the three photos: the front lamp gives ρ·nz; the side lamps give 0.6·ρ·n(x or y) + 0.8·ρ·nz.
const RHO_N = {
  nodes: { f8: ['arith', { op: 'mul' }], f8N: ['const', { c: 0.8 }], ux: ['arith', { op: 'sub' }], uy: ['arith', { op: 'sub' }], gx: ['arith', { op: 'mul' }], gxN: ['const', { c: 1 / 0.6 }], gy: ['arith', { op: 'mul' }], gyN: ['const', { c: 1 / 0.6 }] },
  wires: ['p3>f8.a', 'p1>ux.a', 'f8>ux.b', 'p2>uy.a', 'f8>uy.b', 'ux>gx.a', 'uy>gy.a', 'f8N>f8.b', 'gxN>gx.b', 'gyN>gy.b'],
}

const LEAN = 0.15
const leanTest = (label, height, seed) => {
  const { n, photos } = sheet(height, stains(seed))
  return test(label, photos, { out: fromFn(S, S, (x, y) => (n[0].data[y * S + x] / n[2].data[y * S + x] > LEAN ? 1 : 0)) })
}

const leaning = {
  id: '3-10',
  chapter: 3,
  ...STEREO,
  title: { zh: '一个亮度不够', en: 'One brightness is not enough' },
  brief: { zh: '产线上的金属板刷了漆，漆色深浅不一。同一块板在三盏灯下各拍一张：灯从右边 (0.6, 0, 0.8)、下边 (0, 0.6, 0.8) 和正面 (0, 0, 1) 照来。标出朝右倾斜的地方：法线的 x 分量超过 z 分量的 0.15 倍。', en: 'Metal sheets on the line are painted unevenly, some patches darker than others. Each sheet is photographed under three lamps: from the right (0.6, 0, 0.8), from below (0, 0.6, 0.8) and from the front (0, 0, 1). Mark where the surface leans to the right: where the normal\'s x component is more than 0.15 times its z component.' },
  hint: { zh: '一张照片里暗，可能是漆深，也可能是朝向。三张照片里，什么是一样的？', en: 'Dark in one photo may mean dark paint or a turned-away surface. What is the same in all three photos?' },
  after: { zh: '一张照片只给出一个亮度，它同时取决于漆色和朝向，分不开。换一盏灯再拍一张，漆色在两张里一样，比一比就消掉了，剩下的只和朝向有关。这就是光度立体：用几盏已知的灯，从明暗里解出表面的朝向。', en: 'One photo gives one brightness, which depends on both the paint and the facing, and the two cannot be told apart. Take another photo under another lamp: the paint is the same in both, so comparing them cancels it, and what is left depends only on the facing. This is photometric stereo: with a few known lamps, the facing of a surface is solved from its shading.' },
  unlocks: [],
  check: { tolerance: 0.02, mismatches: 2 },
  tests: [
    [{ zh: '一个鼓包', en: 'A bump' }, dome(7.5, 7.5, 6, 2.5), 3],
    [{ zh: '斜着的板', en: 'A sloping sheet' }, sum(tilt(-0.3, 0), dome(4, 11, 3, 1)), 4],
    [{ zh: '一道沟', en: 'A groove' }, groove(3, 2, 12, 13, 3, 1.5), 5],
  ].map(([label, height, seed]) => leanTest(label, height, seed)),
  hidden: [
    [{ zh: '两个坑', en: 'Two dents' }, sum(bowl(5, 5, 4, 1.5), bowl(11, 11, 4, 1.5)), 6],
    [{ zh: '平板', en: 'A flat sheet' }, () => 0, 7],
  ].map(([label, height, seed]) => leanTest(label, height, seed)),
  solution: sg({ f8: ['arith', { op: 'mul' }], f8N: ['const', { c: 0.8 }], ux: ['arith', { op: 'sub' }], q: ['arith', { op: 'div' }], t: ['threshold', { t: 0.6 * LEAN }] }, ['p3>f8.a', 'p1>ux.a', 'f8>ux.b', 'ux>q.a', 'p3>q.b', 'q>t', 't>out', 'f8N>f8.b']),
  naive: sg({ t: ['threshold', { t: 0.55 }] }, ['p1>t', 't>out']),
  alsoFails: [sg({ d: ['arith', { op: 'sub' }], t: ['threshold', { t: 0 }] }, ['p1>d.a', 'p3>d.b', 'd>t', 't>out'])],
}

const albedoTest = (label, height, seed) => {
  const paint = stains(seed)
  return test(label, sheet(height, paint).photos, { out: paint })
}
const albedo = {
  id: '3-11',
  chapter: 3,
  ...STEREO,
  title: { zh: '三盏灯', en: 'Three lamps' },
  brief: { zh: '同样的三张照片。这次输出漆色本身：每一点的反射率，和表面朝哪边无关。', en: 'The same three photos. This time output the paint itself: the reflectance at every point, whichever way the surface faces.' },
  hint: { zh: '正面灯的照片是反射率 × nz。另两张各多了一个分量。', en: 'The front lamp\'s photo is reflectance × nz. The other two each bring in one more component.' },
  after: { zh: '三张照片按固定的系数相减，得到反射率乘上法线的三个分量 ρ·(nx, ny, nz)。法线长度是 1，所以这个向量的长度就是反射率 ρ，方向就是法线。三盏灯，三个方程，三个未知数（加上 ρ 一共四个数，靠「长度为 1」补上最后一个）。', en: 'Subtracting the three photos with fixed weights gives the reflectance times each component of the normal: ρ·(nx, ny, nz). A normal has length 1, so the length of this vector is the reflectance ρ and its direction is the normal. Three lamps, three equations, three unknowns (with ρ there are four numbers, and "length 1" supplies the last one).' },
  unlocks: [],
  tests: [
    [{ zh: '一个鼓包', en: 'A bump' }, dome(7.5, 7.5, 6, 2.5), 8],
    [{ zh: '斜着的板', en: 'A sloping sheet' }, sum(tilt(0.2, -0.25), dome(11, 5, 3, 1)), 9],
    [{ zh: '一道沟', en: 'A groove' }, groove(2, 12, 13, 3, 3, 1.5), 10],
  ].map(([label, height, seed]) => albedoTest(label, height, seed)),
  hidden: [
    [{ zh: '两个坑', en: 'Two dents' }, sum(bowl(5, 10, 4, 1.2), bowl(11, 5, 4, 1.2)), 11],
    [{ zh: '平板', en: 'A flat sheet' }, () => 0, 12],
  ].map(([label, height, seed]) => albedoTest(label, height, seed)),
  solution: sg(
    { ...RHO_N.nodes, xx: ['arith', { op: 'mul' }], yy: ['arith', { op: 'mul' }], zz: ['arith', { op: 'mul' }], a: ['arith', { op: 'add' }], b: ['arith', { op: 'add' }], r: 'sqrt' },
    [...RHO_N.wires, 'gx>xx.a', 'gx>xx.b', 'gy>yy.a', 'gy>yy.b', 'p3>zz.a', 'p3>zz.b', 'xx>a.a', 'yy>a.b', 'a>b.a', 'zz>b.b', 'b>r', 'r>out'],
  ),
  naive: sg({}, ['p3>out']),
}

const STEEP = 0.3
const defectTest = (label, height, seed) => {
  const { n, photos } = sheet(height, stains(seed))
  const tilted = (i) => Math.hypot(n[0].data[i], n[1].data[i]) / n[2].data[i] > STEEP
  return test(label, photos, { out: fromFn(S, S, (x, y) => (tilted(y * S + x) ? 1 : 0)) })
}
const SHEET_BEND = (x, y) => 0.004 * ((x - 7.5) ** 2 - (y - 7.5) ** 2)

const dents = {
  id: '3-12',
  chapter: 3,
  ...STEREO,
  title: { zh: '凹坑检测', en: 'Dent detector' },
  brief: { zh: '同样的三盏灯。金属板本该是平的（允许轻微弯曲），磕出的凹坑和划痕都会让表面倾斜。标出倾斜得太厉害的地方：表面的坡度（法线水平分量的长度 ÷ nz）超过 0.3。漆色深浅不能误报。', en: 'The same three lamps. A sheet should be flat (a slight bend is allowed); dents and scratches make the surface tilt. Mark where it tilts too much: where the slope (the length of the normal\'s horizontal part ÷ nz) is above 0.3. Uneven paint must not raise an alarm.' },
  hint: { zh: '上两关各求出了一部分。坡度只和朝向有关。', en: 'The last two levels each worked out part of it. The slope depends only on the facing.' },
  after: { zh: '凹坑检测台用的就是光度立体：几盏灯轮流打光，解出每一点的朝向，坑和划痕在朝向图里一目了然，漆色深浅完全不影响。手机拍证件、工厂查钢板表面，都有这样的做法。', en: 'This dent detector is photometric stereo at work: a few lamps light the part in turn, the facing at every point is solved, and dents and scratches stand out in the map of facings, whatever the paint does. Document scanning on phones and steel-sheet inspection in factories use the same approach.' },
  unlocks: [],
  check: { tolerance: 0.02, mismatches: 3 },
  tests: [
    [{ zh: '一个坑', en: 'One dent' }, sum(SHEET_BEND, bowl(7, 8, 4, 1.6)), 13],
    [{ zh: '一道划痕', en: 'A scratch' }, sum(SHEET_BEND, groove(2, 4, 14, 11, 2, 0.8)), 14],
    [{ zh: '坑和划痕', en: 'A dent and a scratch' }, sum(SHEET_BEND, bowl(4, 4, 3, 1.2), groove(9, 3, 9, 14, 2, 0.8)), 15],
  ].map(([label, height, seed]) => defectTest(label, height, seed)),
  hidden: [
    [{ zh: '合格的板', en: 'A good sheet' }, SHEET_BEND, 16],
    [{ zh: '两个小坑', en: 'Two small dents' }, sum(SHEET_BEND, bowl(4, 11, 3, 1), bowl(12, 5, 3, 1)), 17],
  ].map(([label, height, seed]) => defectTest(label, height, seed)),
  solution: sg(
    { ...RHO_N.nodes, xx: ['arith', { op: 'mul' }], yy: ['arith', { op: 'mul' }], zz: ['arith', { op: 'mul' }], a: ['arith', { op: 'add' }], q: ['arith', { op: 'div' }], t: ['threshold', { t: STEEP * STEEP }] },
    [...RHO_N.wires, 'gx>xx.a', 'gx>xx.b', 'gy>yy.a', 'gy>yy.b', 'p3>zz.a', 'p3>zz.b', 'xx>a.a', 'yy>a.b', 'a>q.a', 'zz>q.b', 'q>t', 't>out'],
  ),
  naive: sg({ g: ['gradmag', { border: 'edge' }], t: ['threshold', { t: 0.05 }] }, ['p3>g', 'g>t', 't>out']),
}

export const levels = [ball, fill, camera, metamers, shadow, onlyRed, gradient, dimLight, balance, leaning, albedo, dents]
