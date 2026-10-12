import { useEffect, useRef } from 'react'
import { rangeOf } from './display.js'

const cssColour = (name, fallback) => {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  const match = value.match(/^#([0-9a-f]{6})$/i)
  if (!match) return fallback
  const n = parseInt(match[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// One image drawn pixel-for-pixel. With `against` it draws the error map instead: wrong pixels in
// the accent colour, right ones faint.
export default function ImageView({ img, range, size = 112, against, tolerance = 0.02, onHover, label, theme }) {
  const canvas = useRef(null)

  useEffect(() => {
    const node = canvas.current
    if (!node || !img) return
    node.width = img.w
    node.height = img.h
    const context = node.getContext('2d')
    const pixels = context.createImageData(img.w, img.h)
    const { lo, hi } = range ?? rangeOf(img)
    const accent = cssColour('--accent', [214, 155, 45])
    const faint = cssColour('--line', [222, 219, 209])
    for (let i = 0; i < img.data.length; i++) {
      let rgb
      if (against) {
        const error = Math.abs(img.data[i] - against.data[i])
        rgb = error <= tolerance ? faint : accent
      } else {
        const g = Math.round(255 * Math.min(1, Math.max(0, (img.data[i] - lo) / (hi - lo))))
        rgb = [g, g, g]
      }
      pixels.data.set([...rgb, 255], i * 4)
    }
    context.putImageData(pixels, 0, 0)
  }, [img, range, against, tolerance, theme])

  if (!img) return <div className="image-empty" style={{ width: size, height: size }}>{label ?? '—'}</div>

  const hover = (event) => {
    if (!onHover) return
    const box = event.currentTarget.getBoundingClientRect()
    const x = Math.floor(((event.clientX - box.left) / box.width) * img.w)
    const y = Math.floor(((event.clientY - box.top) / box.height) * img.h)
    if (x < 0 || y < 0 || x >= img.w || y >= img.h) return
    onHover({ x, y, value: img.data[y * img.w + x], expected: against?.data[y * img.w + x] })
  }

  return (
    <canvas
      ref={canvas}
      className="image-view"
      style={{ width: size, height: size * (img.h / img.w) }}
      onPointerMove={hover}
      onPointerLeave={() => onHover?.(null)}
      aria-label={label}
    />
  )
}
