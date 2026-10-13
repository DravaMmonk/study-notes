import { Grid3x3, Mountain, Navigation, Orbit, ScanLine } from 'lucide-react'

// Every value in a circuit is a grid of numbers. How it is drawn depends on its shape: a single
// number is a readout, a single row is a waveform, and a 2-D grid can be drawn five ways: as pixels,
// as a terrain (brightness = height), as a slope map (contours, and arrows that point uphill: the
// gradient), as a profile (the brightness along one row, as a curve) or as its spectrum.

export const kindOf = (img) => (!img ? null : img.w * img.h === 1 ? 'number' : img.h === 1 ? 'signal' : 'image')

export const IMAGE_VIEWS = {
  pixels: { label: '像素', icon: Grid3x3, hint: '亮度就是灰度' },
  terrain: { label: '地形', icon: Mountain, hint: '亮度当作高度' },
  slope: { label: '坡度', icon: Navigation, hint: '箭头指向变亮最快的方向' },
  profile: { label: '剖面', icon: ScanLine, hint: '一行像素的亮度曲线' },
  spectrum: { label: '频谱', icon: Orbit, hint: '各频率的波有多强' },
}

// The view a level starts each role in: `level.views = { in, out, mid }` (2-D values only).
export const viewFor = (level, role) => level.views?.[role] ?? (role === 'mid' ? level.views?.out : null) ?? 'pixels'

// How one card draws a 2-D value: its own choice if the player made one, else the level's default
// for its role (inputs, outputs, everything in between).
export const roleOf = (node) => (node.type === 'input' ? 'in' : node.type === 'output' ? 'out' : 'mid')
export const nodeView = (node, views) => node.view ?? views?.[roleOf(node)] ?? 'pixels'

// What the fixed cards carry, for their titles.
export const KIND_NAMES = { image: '图像', signal: '波形', number: '数值' }

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
