// Parts for light (视觉完备 chapter 3): Lambert shading from a surface's normals, and a camera's three colour
// sensors reading a spectrum. The spectrum is ten bands from violet to red; each sensor's curve sums to ten.
import { fromFn, image } from '../image.js'

export const BANDS = Array.from({ length: 10 }, (_, i) => 415 + 30 * i)
const SENSORS = { R: [590, 35], G: [540, 38], B: [450, 28] }
const sensitivity = (channel, nm) => Math.exp(-((nm - SENSORS[channel][0]) ** 2) / (2 * SENSORS[channel][1] ** 2))
export const CURVES = Object.fromEntries(Object.keys(SENSORS).map((c) => {
  const raw = BANDS.map((nm) => sensitivity(c, nm))
  const total = raw.reduce((a, b) => a + b, 0)
  return [c, raw.map((v) => (v * BANDS.length) / total)]
}))
const lightParam = (key, label, value) => ({ key, label, kind: 'number', min: -1, max: 1, step: 0.05, default: value })

export const LIGHT = {
  shade: {
    label: { zh: '朗伯着色', en: 'Lambert shading' },
    description: { zh: '反射率 × (法线 · 灯的方向)，背光的地方是 0', en: 'Reflectance × (normal · lamp direction), 0 where the surface faces away' },
    inputs: ['nx', 'ny', 'nz', 'albedo'],
    params: [lightParam('lx', { zh: '灯 x', en: 'Lamp x' }, 0), lightParam('ly', { zh: '灯 y', en: 'Lamp y' }, 0), lightParam('lz', { zh: '灯 z', en: 'Lamp z' }, 1)],
    eval: ({ nx, ny, nz, albedo }, p) => fromFn(nx.w, nx.h, (x, y) => {
      const i = y * nx.w + x
      return albedo.data[i] * Math.max(0, nx.data[i] * (p.lx ?? 0) + ny.data[i] * (p.ly ?? 0) + nz.data[i] * (p.lz ?? 1))
    }),
    cost: 6,
    unlock: 'lambert',
  },
  sense: {
    label: { zh: '感光', en: 'Sensor' },
    description: { zh: '一种感光元件对一条光谱的读数：光谱乘上它的灵敏度曲线，再求平均', en: 'What one kind of sensor reads from a spectrum: the spectrum times its sensitivity curve, averaged' },
    inputs: ['in'],
    params: [{ key: 'channel', label: { zh: '感光', en: 'Sensor' }, kind: 'select', options: [['R', 'R'], ['G', 'G'], ['B', 'B']], default: 'R' }],
    eval: ({ in: a }, p) => image(1, 1, a.data.reduce((s, v, b) => s + v * CURVES[p.channel ?? 'R'][b], 0) / a.data.length),
    cost: 20,
    unlock: 'sense',
  },
}

