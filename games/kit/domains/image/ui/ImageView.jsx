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
export default function ImageView({ img, range, size = 112, against, tolerance = 0.02, onHover, label, theme, grid }) {
  const canvas = useRef(null)

  useEffect(() => {
    const node = canvas.current
    if (!node || !img) return
    node.width = img.w
    node.height = img.h
    const context = node.getContext('2d')
    const pixels = context.createImageData(img.w, img.h)
    const { lo, hi } = range ?? rangeOf(img)
    const wrong = cssColour('--fail', [184, 87, 63])
    const faint = cssColour('--line', [222, 219, 209])
    const channels = img.c ?? 1
    for (let i = 0; i < img.w * img.h; i++) {
      let rgb
      if (against) {
        const error = Math.max(...Array.from({ length: channels }, (_, c) => Math.abs(img.data[i * channels + c] - against.data[i * channels + c])))
        rgb = error <= tolerance ? faint : wrong
      } else if (channels === 3) {
        rgb = Array.from({ length: 3 }, (_, c) => Math.round(255 * Math.min(1, Math.max(0, img.data[i * 3 + c]))))
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
    onHover({ x, y, w: img.w, h: img.h, value: img.c === 3 ? Array.from(img.data.slice((y * img.w + x) * 3, (y * img.w + x) * 3 + 3)) : img.data[y * img.w + x], expected: against?.data[y * img.w + x] })
  }

  const canvasEl = (
    <canvas
      ref={canvas}
      className={`image-view ${onHover ? 'is-readable' : ''}`}
      style={{ width: size, height: size * (img.h / img.w) }}
      onContextMenu={onHover ? (event) => event.preventDefault() : undefined}
      onDragStart={onHover ? (event) => event.preventDefault() : undefined}
      onPointerMove={hover}
      onPointerDown={hover}
      onPointerLeave={(event) => { if (event.pointerType !== 'touch') onHover?.(null) }}
      aria-label={label}
    />
  )
  // A faint pixel grid once each pixel is big enough to read on its own.
  if (!grid || size / img.w < 6) return canvasEl
  return (
    <span className={`image-grid ${onHover ? 'is-readable' : ''}`} style={{ '--cells': img.w, '--rows': img.h }}>
      {canvasEl}
    </span>
  )
}
