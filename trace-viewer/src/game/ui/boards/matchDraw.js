import { useEffect, useRef } from 'react'

// Small drawing helpers shared by the chapter 6 boards.

// A greyscale image { w, h, data } as a PNG data URL, values lo…hi mapped to black…white.
export function greyUrl(img, lo = 0, hi = 1) {
  return pixelUrl(img.w, img.h, (target) => {
    for (let i = 0; i < img.data.length; i++) {
      const g = Math.round(255 * Math.min(1, Math.max(0, (img.data[i] - lo) / (hi - lo))))
      target.set([g, g, g, 255], i * 4)
    }
  })
}

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

// Call onSolve once, the first time `done` becomes true.
export function useSolveOnce(done, onSolve) {
  const fired = useRef(false)
  useEffect(() => {
    if (done && !fired.current) {
      fired.current = true
      onSolve()
    }
  }, [done, onSolve])
}

// Client coordinates → the user units of an SVG element.
export function svgPoint(svg, event) {
  const point = svg.createSVGPoint()
  point.x = event.clientX
  point.y = event.clientY
  const local = point.matrixTransform(svg.getScreenCTM().inverse())
  return [local.x, local.y]
}
