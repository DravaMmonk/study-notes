import { Grid3x3, Mountain, Navigation, Orbit, ScanLine } from 'lucide-react'

// Every value in a circuit is a grid of numbers. How it is drawn depends on its shape: a single
// number is a readout, a single row is a waveform, and a 2-D grid can be drawn five ways: as pixels,
// as a terrain (brightness = height), as a slope map (contours, and arrows that point uphill: the
// gradient), as a profile (the brightness along one row, as a curve) or as its spectrum.

export const kindOf = (img) => (!img ? null : img.w * img.h === 1 ? 'number' : img.h === 1 ? 'signal' : 'image')

export const IMAGE_VIEWS = {
  pixels: { label: { zh: '像素', en: 'Pixels' }, icon: Grid3x3, hint: { zh: '亮度就是灰度', en: 'brightness as grey level' } },
  terrain: { label: { zh: '地形', en: 'Terrain' }, icon: Mountain, hint: { zh: '亮度当作高度', en: 'brightness as height' } },
  slope: { label: { zh: '坡度', en: 'Slope' }, icon: Navigation, hint: { zh: '箭头指向变亮最快的方向', en: 'arrows point where it brightens fastest' } },
  profile: { label: { zh: '剖面', en: 'Profile' }, icon: ScanLine, hint: { zh: '一行像素的亮度曲线', en: 'the brightness along one row of pixels' } },
  spectrum: { label: { zh: '频谱', en: 'Spectrum' }, icon: Orbit, hint: { zh: '各频率的波有多强', en: 'how strong the wave at each frequency is' } },
}

// The view a level starts each role in: `level.views = { in, out, mid }` (2-D values only).
export const viewFor = (level, role) => level.views?.[role] ?? (role === 'mid' ? level.views?.out : null) ?? 'pixels'

// How one card draws a 2-D value: its own choice if the player made one, else the level's default
// for its role (inputs, outputs, everything in between); pixels when that view has not come in yet (`views.shows`).
export const roleOf = (node) => (node.type === 'input' ? 'in' : node.type === 'output' ? 'out' : 'mid')
export const nodeView = (node, views) => {
  const view = node.view ?? views?.[roleOf(node)] ?? 'pixels'
  return !views?.shows || views.shows.includes(view) ? view : 'pixels'
}
/** The views a level offers (all of them without a list), in the usual order. */
export const viewsIn = (shows) => Object.entries(IMAGE_VIEWS).filter(([key]) => !shows || shows.includes(key))

// What the fixed cards carry, for their titles.
export const KIND_NAMES = { image: { zh: '图像', en: 'image' }, signal: { zh: '波形', en: 'waveform' }, number: { zh: '数值', en: 'number' } }

// A theme colour as [r, g, b], read from a CSS custom property (hex or rgb()).
export function tokenRGB(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  const hex = value.match(/^#([0-9a-f]{6})$/i)
  if (hex) {
    const n = parseInt(hex[1], 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  const rgb = value.match(/rgba?\(([^)]+)\)/)
  if (rgb) return rgb[1].split(',').slice(0, 3).map((v) => Number(v.trim()))
  return fallback
}

export const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t)
export const css = (rgb, alpha = 1) => `rgba(${rgb.map((v) => Math.round(Math.max(0, Math.min(255, v)))).join(',')},${alpha})`

export const formatNumber = (v) => (!Number.isFinite(v) ? '—' : Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(3))

// One row of an image as a signal (w × 1).
export const rowOf = (img, y) => ({ w: img.w, h: 1, data: img.data.slice(y * img.w, (y + 1) * img.w) })
