import { tr } from '../../shell/i18n.js'
import { mix, rgba, token, useCanvas } from './paint.js'
import { rangeOf } from './range.js'

// A grey grid as a map (the view `slope`, games/DESIGN.md 6.10): the picture faded, contour lines of equal value, and
// arrows for the gradient (Sobel): each points toward larger values, as long as it is steep there. Arrows cross the
// contours at right angles and are longest where contours crowd.

const CONTOURS = 5

/** The Sobel gradient at a cell, the edge cells repeated past the border. */
function sobel(g, x, y) {
  const at = (u, v) => g.data[Math.min(g.h - 1, Math.max(0, y + v)) * g.w + Math.min(g.w - 1, Math.max(0, x + u))]
  const gx = (at(1, -1) + 2 * at(1, 0) + at(1, 1) - at(-1, -1) - 2 * at(-1, 0) - at(-1, 1)) / 8
  const gy = (at(-1, 1) + 2 * at(0, 1) + at(1, 1) - at(-1, -1) - 2 * at(0, -1) - at(1, -1)) / 8
  return [gx, gy]
}

export default function Slope({ value, size = 220 }) {
  const { w, h } = value
  const height = Math.round(size * (h / w))
  const canvas = useCanvas((ctx) => {
    const cell = size / w
    const { lo, hi } = rangeOf(value)
    const at = (x, y) => value.data[y * w + x]
    const [paper, rule, arrow] = ['--paper', '--rule', '--accent-ink'].map(token)
    // The picture, faded back so the arrows read first.
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const g = ((at(x, y) - lo) / (hi - lo || 1)) * 255
      ctx.fillStyle = rgba(mix([g, g, g], paper, 0.62))
      ctx.fillRect(x * cell, y * cell, cell + 0.5, cell + 0.5)
    }
    // Contours, by marching squares on the grid of cell centres.
    const px = (v) => (v + 0.5) * cell
    ctx.strokeStyle = rgba(rule)
    ctx.lineWidth = 1
    for (let k = 1; k <= CONTOURS; k++) {
      const level = lo + ((hi - lo) * k) / (CONTOURS + 1)
      ctx.beginPath()
      for (let y = 0; y < h - 1; y++) for (let x = 0; x < w - 1; x++) {
        const corners = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]]
        const cuts = []
        corners.forEach(([ax, ay], i) => {
          const [bx, by] = corners[(i + 1) % 4]
          const a = at(ax, ay) - level
          const b = at(bx, by) - level
          if ((a < 0) !== (b < 0)) cuts.push([px(ax + (bx - ax) * (a / (a - b))), px(ay + (by - ay) * (a / (a - b)))])
        })
        for (let i = 0; i + 1 < cuts.length; i += 2) {
          ctx.moveTo(...cuts[i])
          ctx.lineTo(...cuts[i + 1])
        }
      }
      ctx.stroke()
    }
    // One arrow a block of cells at least 8 px across, from the gradient at the block's centre.
    const step = Math.max(1, Math.ceil(8 / cell))
    const blocks = []
    for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) {
      const [cx, cy] = [Math.min(w - 1, x + (step >> 1)), Math.min(h - 1, y + (step >> 1))]
      blocks.push({ x, y, g: sobel(value, cx, cy) })
    }
    const peak = Math.max(1e-9, ...blocks.map(({ g }) => Math.hypot(...g)))
    const span = cell * step
    ctx.strokeStyle = ctx.fillStyle = rgba(arrow)
    ctx.lineWidth = Math.max(1, span * 0.09)
    ctx.lineCap = 'round'
    for (const { x, y, g } of blocks) {
      const m = Math.hypot(...g)
      if (m < peak * 0.08) continue
      const length = (m / peak) * span * 0.92
      const [ux, uy] = [g[0] / m, g[1] / m]
      const [cx, cy] = [(x + Math.min(step, w - x) / 2) * cell, (y + Math.min(step, h - y) / 2) * cell]
      const tip = [cx + (ux * length) / 2, cy + (uy * length) / 2]
      ctx.beginPath()
      ctx.moveTo(cx - (ux * length) / 2, cy - (uy * length) / 2)
      ctx.lineTo(...tip)
      ctx.stroke()
      const head = Math.min(length * 0.45, span * 0.32)
      ctx.beginPath()
      ctx.moveTo(...tip)
      ctx.lineTo(tip[0] - ux * head - uy * head * 0.6, tip[1] - uy * head + ux * head * 0.6)
      ctx.lineTo(tip[0] - ux * head + uy * head * 0.6, tip[1] - uy * head - ux * head * 0.6)
      ctx.closePath()
      ctx.fill()
    }
  }, size, height, [value])
  return <canvas ref={canvas} className="sl" style={{ width: size, height }} aria-label={tr('坡度：箭头指向变大最快的方向，越长越陡', 'Slope: arrows point where values rise fastest; longer is steeper')} />
}
