// Scenes of light (scenes/index.js): surfaces shaded from their normals, spectra read by a camera's three sensors,
// cloths that match under one lamp only, paint and light split apart, coloured scenes under uneven light, and a
// painted metal sheet photographed under three lamps (photometric stereo).
import { S } from '../../../../engine/schema.js'
import { correlate, fromFn, image, map, random, zip } from '../../engine/image.js'
import { NODE_TYPES } from '../../engine/nodes.js'
import { CURVES } from '../../engine/parts/light.js'
import { picture } from '../pictures.js'
import { T as t } from '../../../../shell/i18n.js'

const N = 16
const num = S.num()
const vec3 = S.list(num, { min: 3 })
const dot = (n, l) => n[0] * l[0] + n[1] * l[1] + n[2] * l[2]

/* ---------- surfaces: height fields, as a sum of terms, and their normals ---------- */

const dome = (cx, cy, r, a) => (x, y) => {
  const d2 = ((x - cx) ** 2 + (y - cy) ** 2) / (r * r)
  return d2 < 1 ? a * (1 - d2) ** 2 : 0
}
const TERMS = {
  dome: (cx, cy, r, a) => dome(cx, cy, r, a),
  bowl: (cx, cy, r, depth) => (x, y) => -dome(cx, cy, r, depth)(x, y),
  ridge: (y0, w, a) => (x, y) => (Math.abs(y - y0) < w ? a * (1 - ((y - y0) / w) ** 2) ** 2 : 0),
  tilt: (ax, ay) => (x, y) => ax * (x - 7.5) + ay * (y - 7.5),
  groove: (x0, y0, x1, y1, w, depth) => (x, y) => {
    const dx = x1 - x0
    const dy = y1 - y0
    const s = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy)))
    const d = Math.hypot(x - x0 - s * dx, y - y0 - s * dy)
    return d < w ? -depth * (1 - (d / w) ** 2) ** 2 : 0
  },
  bend: (k) => (x, y) => k * ((x - 7.5) ** 2 - (y - 7.5) ** 2),
}
const HEIGHT = S.list(S.obj({
  dome: S.opt(S.list(num, { min: 4, about: t('鼓包：cx, cy, 半径, 高', 'a bump: cx, cy, radius, height') })),
  bowl: S.opt(S.list(num, { min: 4, about: t('坑：cx, cy, 半径, 深', 'a dent: cx, cy, radius, depth') })),
  ridge: S.opt(S.list(num, { min: 3, about: t('横梁：y0, 半宽, 高', 'a ridge: y0, half width, height') })),
  tilt: S.opt(S.list(num, { min: 2, about: t('斜面：x 方向和 y 方向的坡度', 'a slope: its gradient across and down') })),
  groove: S.opt(S.list(num, { min: 6, about: t('沟：x0, y0, x1, y1, 半宽, 深', 'a groove: x0, y0, x1, y1, half width, depth') })),
  bend: S.opt(S.num({ about: t('马鞍形的弯：k·((x − 7.5)² − (y − 7.5)²)', 'a saddle bend: k·((x − 7.5)² − (y − 7.5)²)') })),
}), { about: t('高度场：几项相加（每项一个键），空表是平板', 'a height field: terms added up (one key each); none is a flat sheet') })
const heightOf = (terms) => {
  const fields = terms.map((term) => {
    const [name, args] = Object.entries(term)[0]
    return TERMS[name](...[args].flat())
  })
  return (x, y) => fields.reduce((s, f) => s + f(x, y), 0)
}
// The unit normals of a height field h(x, y) (x right, y down, height towards the camera), from its slope.
const normalsOf = (h) => {
  const at = (x, y) => {
    const hx = (h(x + 0.5, y) - h(x - 0.5, y))
    const hy = (h(x, y + 0.5) - h(x, y - 0.5))
    const len = Math.hypot(hx, hy, 1)
    return [-hx / len, -hy / len, 1 / len]
  }
  return [0, 1, 2].map((k) => fromFn(N, N, (x, y) => at(x, y)[k]))
}
const shaded = (normals, albedo, l) => NODE_TYPES.shade.eval({ nx: normals[0], ny: normals[1], nz: normals[2], albedo }, { lx: l[0], ly: l[1], lz: l[2] })

/* ---------- spectra ---------- */

const row = (values) => fromFn(values.length, 1, (x) => values[x])
const reading = (spectrum) => Object.fromEntries([['ro', 'R'], ['go', 'G'], ['bo', 'B']].map(([out, channel]) => [out, NODE_TYPES.sense.eval({ in: spectrum }, { channel })]))
// A spectrum every sensor reads as 0: a fixed wiggle with the three curves taken out of it, at most 0.3.
const METAMER = (() => {
  const basis = []
  for (const v of Object.values(CURVES)) {
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
const SPECTRUM = S.list(num, { min: 10, about: t('十个波段（400–700 nm，每段 30 nm）的强度', 'the strength in ten bands (400–700 nm, 30 nm each)') })

/* ---------- light and paint ---------- */

// How much light reaches each spot of a scene.
const LIGHTS = {
  diagonal: (x, y) => (x + y < 16 ? 1 : 0.35),
  fromLeft: (x) => 1 - 0.045 * x,
  pole: (x, y) => (x >= 6 && x <= 8 && y >= 4 ? 0.4 : 1),
  corner: (x, y) => (x > 9 && y < 7 ? 0.45 : 0.95),
  overhead: (x, y) => 0.3 + 0.045 * y,
  leaves: (x, y) => ((3 * x + 5 * y) % 7 < 3 ? 0.25 : 0.9),
  bars: (x) => (x % 8 < 3 ? 0.3 : 1),
}
// Coloured scenes: where each colour is, and the light over them.
const COLOURS = { red: [0.8, 0.18, 0.15], darkRed: [0.45, 0.1, 0.12], green: [0.2, 0.7, 0.25], white: [0.85, 0.85, 0.82], yellow: [0.85, 0.8, 0.2], blue: [0.15, 0.25, 0.8], grey: [0.45, 0.45, 0.45] }
const LAYOUTS = {
  apples: (x, y) => ((x - 4) ** 2 + (y - 5) ** 2 < 9 ? 'red' : (x - 11) ** 2 + (y - 10) ** 2 < 10 ? 'darkRed' : x > 9 && y < 5 ? 'white' : 'green'),
  flags: (x, y) => (y < 5 ? 'red' : y < 10 ? 'white' : x < 8 ? 'blue' : 'red'),
  flowers: (x, y) => ((x * 3 + y * 5) % 11 < 3 ? 'yellow' : (x + y) % 7 < 2 ? 'red' : 'green'),
  stall: (x, y) => (x < 5 ? 'red' : x < 10 ? 'yellow' : y < 8 ? 'white' : 'darkRed'),
  street: (x, y) => (y > 11 ? 'grey' : x % 5 === 0 ? 'red' : 'blue'),
  desk: (x, y) => (x > 10 && y > 10 ? 'white' : x < 6 ? 'red' : y < 7 ? 'blue' : 'green'),
  market: (x, y) => (x < 4 && y < 4 ? 'white' : (x + y) % 5 < 2 ? 'yellow' : x > 8 ? 'red' : 'grey'),
  poster: (x, y) => (y < 3 ? 'white' : x < 8 ? 'blue' : 'darkRed'),
  garden: (x, y) => ((x - 8) ** 2 + (y - 8) ** 2 < 6 ? 'white' : y > 9 ? 'green' : 'yellow'),
  kitchen: (x, y) => (x > 12 ? 'white' : y > 12 ? 'grey' : 'red'),
}
const COLOUR_LIGHTS = {
  window: (x) => 1 - 0.05 * x,
  shade: (x, y) => (x + 2 * y < 20 ? 1 : 0.35),
  dusk: (x, y) => 0.3 + 0.03 * y,
  patchy: (x, y) => ((x + y) % 6 < 3 ? 0.95 : 0.45),
  noon: () => 1,
}
const coloured = (layout, lighting) => {
  const colourAt = (x, y) => COLOURS[LAYOUTS[layout](x, y)]
  const channel = (k) => fromFn(N, N, (x, y) => colourAt(x, y)[k] * lighting(x, y))
  return { r: channel(0), g: channel(1), b: channel(2), colourAt }
}
const isRed = (c) => c[0] / (c[0] + c[1] + c[2]) > 0.5
const LAMP_TINT = [1, 0.82, 0.5] // a warm, yellowish lamp

/* ---------- photometric stereo ---------- */

// A painted metal sheet photographed under a lamp from the right, one from below and one from the front: every photo
// is reflectance × (normal · lamp), never facing away from any lamp.
const STEREO_LAMPS = [[0.6, 0, 0.8], [0, 0.6, 0.8], [0, 0, 1]]
const stains = (seed) => {
  const next = random(seed)
  const blobs = Array.from({ length: 4 }, () => [next() * 16, next() * 16, 1.5 + 2 * next(), 0.25 + 0.3 * next()])
  return fromFn(N, N, (x, y) => Math.max(0.2, 0.8 - blobs.reduce((s, [cx, cy, r, d]) => s + ((x - cx) ** 2 + (y - cy) ** 2 < r * r ? d : 0), 0) * 0.8))
}
const sheet = (height, paint) => {
  const n = normalsOf(height)
  const photos = STEREO_LAMPS.map((l) => fromFn(N, N, (x, y) => {
    const i = y * N + x
    return paint.data[i] * Math.max(0, dot([n[0].data[i], n[1].data[i], n[2].data[i]], l))
  }))
  return { n, photos: { p1: photos[0], p2: photos[1], p3: photos[2] } }
}
// What the stereo station is asked for: where the sheet leans right (nx / nz above the threshold), the paint, or where
// it tilts any way more steeply than the threshold.
const STEREO_EXPECTS = {
  lean: ({ n }, _, above) => fromFn(N, N, (x, y) => (n[0].data[y * N + x] / n[2].data[y * N + x] > above ? 1 : 0)),
  albedo: (_, paint) => paint,
  steep: ({ n }, _, above) => fromFn(N, N, (x, y) => (Math.hypot(n[0].data[y * N + x], n[1].data[y * N + x]) / n[2].data[y * N + x] > above ? 1 : 0)),
}

export const LIGHT = {
  surface: {
    about: t('一块表面：它的法线和反射率；期望是灯光下的样子（朗伯着色，可以再加一盏半亮的补光）', 'a surface, its normals and its reflectance; how it looks under the lamp (Lambert shading, maybe with a half-strength fill light) is expected'),
    setup: S.obj({ lamp: vec3, fill: S.opt(vec3) }),
    test: S.obj({ height: HEIGHT, paint: S.call('picture') }),
    make: ({ height, paint }, { lamp, fill }) => {
      const n = normalsOf(heightOf(height))
      const albedo = picture(paint)
      const out = fill ? zip(shaded(n, albedo, lamp), shaded(n, albedo, fill), (p, q) => p + 0.5 * q) : shaded(n, albedo, lamp)
      return { inputs: { nx: n[0], ny: n[1], nz: n[2], albedo }, expected: { out } }
    },
  },
  spectrum: {
    about: t('一条光谱和三种感光元件的灵敏度曲线；期望是 R、G、B 三个读数', 'a spectrum and the sensitivity curves of three sensors; the R, G and B readings are expected'),
    test: S.obj({ light: SPECTRUM }),
    make: ({ light }) => ({ inputs: { in: row(light), sr: row(CURVES.R), sg: row(CURVES.G), sb: row(CURVES.B) }, expected: reading(row(light)) }),
  },
  metamer: {
    about: t('两块布（日光下一样）和一盏灯；期望是相机读出的两块布 R、G、B 之差', 'two cloths that match in daylight, and a lamp; what the camera reads of their R, G and B differences is expected'),
    test: S.obj({ cloth: SPECTRUM, lamp: SPECTRUM }),
    make: ({ cloth, lamp }) => {
      const twin = cloth.map((v, i) => v + METAMER[i])
      const lit = (c) => row(c.map((v, i) => v * lamp[i]))
      const ra = reading(lit(cloth))
      const rb = reading(lit(twin))
      return { inputs: { a: row(cloth), b: row(twin), lamp: row(lamp) }, expected: Object.fromEntries(['ro', 'go', 'bo'].map((c) => [c, image(1, 1, ra[c].data[0] - rb[c].data[0])])) }
    },
  },
  shadow: {
    about: t('照片 = 油漆 × 光照，光照另给；期望是油漆本来的颜色', 'a photo = paint × light, the light given too; the paint itself is expected'),
    test: S.obj({ paint: S.call('picture'), light: S.oneOf(Object.keys(LIGHTS)) }),
    make: ({ paint, light }) => {
      const colour = picture(paint)
      const lit = fromFn(N, N, LIGHTS[light])
      return { inputs: { photo: zip(colour, lit, (p, q) => p * q), light: lit }, expected: { out: colour } }
    },
  },
  redObjects: {
    about: t('一个彩色场景（R、G、B 三张图），光照不均；期望是红色东西的掩膜（R 占三者之和一半以上）', 'a coloured scene (R, G, B), lit unevenly; the mask of what is red (R over half of the three’s sum) is expected'),
    test: S.obj({ layout: S.oneOf(Object.keys(LAYOUTS)), light: S.oneOf(Object.keys(COLOUR_LIGHTS)) }),
    make: ({ layout, light }) => {
      const s = coloured(layout, COLOUR_LIGHTS[light])
      return { inputs: { r: s.r, g: s.g, b: s.b }, expected: { out: fromFn(N, N, (x, y) => (isRed(s.colourAt(x, y)) ? 1 : 0)) } }
    },
  },
  whiteBalance: {
    about: t('暖黄的灯下拍的彩色场景，亮度为 strength；期望是每个通道除以它自己的最大值', 'a coloured scene under a warm yellow lamp at brightness strength; each channel divided by its own maximum is expected'),
    test: S.obj({ layout: S.oneOf(Object.keys(LAYOUTS)), strength: num }),
    make: ({ layout, strength }) => {
      const s = coloured(layout, () => strength)
      const tint = (k, img) => map(img, (v) => v * LAMP_TINT[k])
      const ins = { r: tint(0, s.r), g: tint(1, s.g), b: tint(2, s.b) }
      const peak = (img) => Math.max(...img.data)
      return { inputs: ins, expected: { ro: map(ins.r, (v) => v / peak(ins.r)), go: map(ins.g, (v) => v / peak(ins.g)), bo: map(ins.b, (v) => v / peak(ins.b)) } }
    },
  },
  relit: {
    about: t('同一个物体换了灯光：亮度 × gain + offset；期望是它的边（梯度大于最大值一半的地方）', 'one object under other light, brightness × gain + offset; its edges (where the gradient is over half its maximum) are expected'),
    test: S.obj({ subject: S.call('picture'), gain: num, offset: num }),
    make: ({ subject, gain, offset }) => {
      const img = picture(subject)
      const SOBEL_X = [-1, 0, 1, -2, 0, 2, -1, 0, 1].map((v) => v / 8)
      const SOBEL_Y = [-1, -2, -1, 0, 0, 0, 1, 2, 1].map((v) => v / 8)
      const g = zip(correlate(img, SOBEL_X, 'edge'), correlate(img, SOBEL_Y, 'edge'), Math.hypot)
      const peak = Math.max(...g.data)
      return { inputs: { in: map(img, (v) => v * gain + offset) }, expected: { out: map(g, (v) => (v / peak > 0.5 ? 1 : 0)) } }
    },
  },
  photometric: {
    about: t('光度立体：一张有污渍的金属板，三盏已知方向的灯各拍一张；期望是它朝右倾的地方、它的反射率，或它陡的地方', 'photometric stereo: a stained metal sheet photographed under three lamps of known direction; where it leans right, its reflectance, or where it is steep, is expected'),
    setup: S.obj({ expect: S.oneOf(Object.keys(STEREO_EXPECTS)), above: S.opt(S.num({ about: t('倾斜的门槛（lean：nx / nz；steep：坡度）', 'the threshold of the tilt (lean: nx / nz; steep: the slope)') })) }),
    test: S.obj({ height: HEIGHT, seed: S.int({ about: t('污渍的种子', 'the stains’ seed') }) }),
    make: ({ height, seed }, { expect, above }) => {
      const paint = stains(seed)
      const made = sheet(heightOf(height), paint)
      return { inputs: made.photos, expected: { out: STEREO_EXPECTS[expect](made, paint, above) } }
    },
  },
}
