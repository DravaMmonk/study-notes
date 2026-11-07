import { useEffect, useState } from 'react'

// Small drawing helpers shared by the chapter 6 benches' pictures.

// Any w×h RGBA picture as a data URL; `paint` fills the ImageData array.
export function pixelUrl(w, h, paint) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const context = canvas.getContext('2d')
  const pixels = context.createImageData(w, h)
  paint(pixels.data)
  context.putImageData(pixels, 0, 0)
  return canvas.toDataURL()
}

// A colour token from the current theme as [r, g, b].
export function tokenColour(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  const match = value.match(/^#([0-9a-f]{6})$/i)
  if (!match) return fallback
  const n = parseInt(match[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// Client coordinates → the user units of an SVG element.
export function svgPoint(svg, event) {
  const point = svg.createSVGPoint()
  point.x = event.clientX
  point.y = event.clientY
  const local = point.matrixTransform(svg.getScreenCTM().inverse())
  return [local.x, local.y]
}

// The rendered width of an element in CSS px, kept current with a ResizeObserver. Overlays use it as
// their viewBox so text and markers stay a fixed screen size however wide the card is.
export function useWidth(ref) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const node = ref.current
    if (!node) return undefined
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(node)
    return () => observer.disconnect()
  }, [ref])
  return width
}
