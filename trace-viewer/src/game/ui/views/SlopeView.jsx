import { useEffect, useRef } from 'react'
import { correlate } from '../../engine/image.js'
import { tr } from '../../i18n.js'
import { rangeOf } from '../display.js'
import { css, mix, tokenRGB } from './views.js'

const SOBEL_X = [-1, 0, 1, -2, 0, 2, -1, 0, 1].map((v) => v / 8)
const SOBEL_Y = [-1, -2, -1, 0, 0, 0, 1, 2, 1].map((v) => v / 8)
const LEVELS = 5

// A 2-D value as a map: the picture faded, contour lines of equal brightness, and at every pixel an
// arrow for the gradient (Sobel): it points toward brighter, and its length is how steep it is
// there. Arrows always cross the contours at right angles and are longest where contours crowd.
export default function SlopeView({ img, range, size = 112, theme, onHover }) {
  const canvas = useRef(null)

  useEffect(() => {
    const node = canvas.current
    if (!node || !img) return
    const dpr = window.devicePixelRatio || 1
    node.width = Math.round(size * dpr)
    node.height = Math.round(size * (img.h / img.w) * dpr)
    const ctx = node.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const { w, h } = img
    const cell = size / w
    const { lo, hi } = range ?? rangeOf(img)
    const t = (v) => Math.min(1, Math.max(0, (v - lo) / (hi - lo || 1)))

    const paper = tokenRGB('--paper', [250, 249, 245])
    const ink = tokenRGB('--ink', [40, 38, 33])
    const rule = tokenRGB('--rule', [191, 185, 172])
    const arrow = tokenRGB('--accent-ink', [143, 95, 18])

    // The picture itself, faded back so the arrows read first.
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const g = t(img.data[y * w + x]) * 255
        ctx.fillStyle = css(mix([g, g, g], paper, 0.62))
        ctx.fillRect(x * cell, y * cell, cell + 0.5, cell + 0.5)
      }
    }

    // Contours by marching squares on the grid of pixel centres.
    ctx.strokeStyle = css(rule)
    ctx.lineWidth = 1
    const at = (x, y) => img.data[y * w + x]
    const px = (x) => (x + 0.5) * cell
    for (let k = 1; k <= LEVELS; k++) {
      const level = lo + ((hi - lo) * k) / (LEVELS + 1)
      ctx.beginPath()
      for (let y = 0; y < h - 1; y++) {
        for (let x = 0; x < w - 1; x++) {
          const corners = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]]
          const points = []
          for (let i = 0; i < 4; i++) {
            const [ax, ay] = corners[i]
            const [bx, by] = corners[(i + 1) % 4]
            const a = at(ax, ay) - level
            const b = at(bx, by) - level
            if ((a < 0) !== (b < 0)) {
              const f = a / (a - b)
              points.push([px(ax + (bx - ax) * f), px(ay + (by - ay) * f)])
            }
          }
          for (let i = 0; i + 1 < points.length; i += 2) {
            ctx.moveTo(...points[i])
            ctx.lineTo(...points[i + 1])
          }
        }
      }
      ctx.stroke()
    }

    // Gradient arrows. On larger images, one arrow per 2×2 block keeps them legible.
    const gx = correlate(img, SOBEL_X, 'edge')
    const gy = correlate(img, SOBEL_Y, 'edge')
    let peak = 1e-9
    for (let i = 0; i < gx.data.length; i++) peak = Math.max(peak, Math.hypot(gx.data[i], gy.data[i]))
    const step = w > 20 ? 2 : 1
    ctx.strokeStyle = css(arrow)
    ctx.fillStyle = css(arrow)
    ctx.lineWidth = Math.max(1, cell * step * 0.09)
    ctx.lineCap = 'round'
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const i = y * w + x
        const m = Math.hypot(gx.data[i], gy.data[i])
        if (m < peak * 0.08) continue
        const length = (m / peak) * cell * step * 0.92
        const [ux, uy] = [gx.data[i] / m, gy.data[i] / m]
        const [cx, cy] = [(x + step / 2) * cell, (y + step / 2) * cell]
        const tail = [cx - (ux * length) / 2, cy - (uy * length) / 2]
        const tip = [cx + (ux * length) / 2, cy + (uy * length) / 2]
        ctx.beginPath()
        ctx.moveTo(...tail)
        ctx.lineTo(...tip)
        ctx.stroke()
        const head = Math.min(length * 0.45, cell * step * 0.32)
        ctx.beginPath()
        ctx.moveTo(...tip)
        ctx.lineTo(tip[0] - ux * head - uy * head * 0.6, tip[1] - uy * head + ux * head * 0.6)
        ctx.lineTo(tip[0] - ux * head + uy * head * 0.6, tip[1] - uy * head - ux * head * 0.6)
        ctx.closePath()
        ctx.fill()
      }
    }
    ctx.strokeStyle = css(ink, 0.12)
    ctx.lineWidth = 1
    ctx.strokeRect(0.5, 0.5, size - 1, size * (h / w) - 1)
  }, [img, range, size, theme])

  if (!img) return null
  const hover = (event) => {
    if (!onHover) return
    const box = event.currentTarget.getBoundingClientRect()
    const x = Math.floor(((event.clientX - box.left) / box.width) * img.w)
    const y = Math.floor(((event.clientY - box.top) / box.height) * img.h)
    if (x >= 0 && y >= 0 && x < img.w && y < img.h) onHover({ x, y, value: img.data[y * img.w + x] })
  }
  return <canvas ref={canvas} className="slope-view" style={{ width: size, height: size * (img.h / img.w) }} onPointerMove={hover} onPointerLeave={() => onHover?.(null)} aria-label={tr('坡度图：箭头指向变亮最快的方向，越长越陡', 'Slope map: arrows point where it brightens fastest; longer is steeper')} />
}
