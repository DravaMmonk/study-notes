import { Grid3x3, Mountain, Navigation } from 'lucide-react'

// Every value in a circuit is a grid of numbers. How it is drawn depends on its shape: a single
// number is a readout, a single row is a waveform, and a 2-D grid can be drawn three ways:
// as pixels, as a terrain (brightness = height) or as a slope map (contours, and arrows that point
// uphill: the gradient).

export const kindOf = (img) => (!img ? null : img.w * img.h === 1 ? 'number' : img.h === 1 ? 'signal' : 'image')

export const IMAGE_VIEWS = {
  pixels: { label: '像素', icon: Grid3x3 },
  terrain: { label: '地形', icon: Mountain },
  slope: { label: '坡度', icon: Navigation },
}
export const nextView = (view) => {
  const keys = Object.keys(IMAGE_VIEWS)
  return keys[(keys.indexOf(view) + 1) % keys.length] ?? 'pixels'
}

// The view a level starts each role in: `level.views = { in, out, mid }` (2-D values only).
export const viewFor = (level, role) => level.views?.[role] ?? (role === 'mid' ? level.views?.out : null) ?? 'pixels'

// Names for the fixed input and output cards, by the kind of value they carry.
export const SOURCE_NAMES = { image: '相机', signal: '信号源', number: '数值' }
export const SINK_NAMES = { image: '显示屏', signal: '示波器', number: '读数表' }

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
