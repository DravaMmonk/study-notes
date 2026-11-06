import { useEffect, useRef, useState } from 'react'

// What the canvas views share (Surface, Slope, Spectrum): the theme's colours as numbers, and a canvas drawn at the
// screen's pixel density, drawn again when the theme changes.

/** A colour token as [r, g, b]. */
export function token(name) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  const hex = value.match(/^#([0-9a-f]{6})$/i)
  if (hex) return [16, 8, 0].map((s) => (parseInt(hex[1], 16) >> s) & 255)
  return (value.match(/rgba?\(([^)]+)\)/)?.[1].split(',').slice(0, 3) ?? [0, 0, 0]).map(Number)
}
export const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t)
export const rgba = (c, alpha = 1) => `rgba(${c.map((v) => Math.round(Math.max(0, Math.min(255, v)))).join(',')},${alpha})`

/** A ref for a `width` × `height` canvas that `draw(ctx)` paints in CSS pixels whenever `deps` or the theme change. */
export function useCanvas(draw, width, height, deps) {
  const canvas = useRef(null)
  const [theme, setTheme] = useState(0)
  useEffect(() => {
    const redraw = () => setTheme((n) => n + 1)
    window.addEventListener('themechange', redraw)
    return () => window.removeEventListener('themechange', redraw)
  }, [])
  useEffect(() => {
    const node = canvas.current
    if (!node) return
    const dpr = window.devicePixelRatio || 1
    node.width = Math.round(width * dpr)
    node.height = Math.round(height * dpr)
    const ctx = node.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)
    draw(ctx)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, width, height, theme])
  return canvas
}
