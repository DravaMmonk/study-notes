import { useEffect, useRef } from 'react'
import { tr } from '../../../../../games/kit/shell/i18n.js'
import { css, mix, tokenRGB } from './views.js'

// A 2-D value as a landscape seen from above at an angle: each pixel's value is a height. Smoothing
// rounds hills off, an edge is a cliff, a derivative is a ridge (positive) or a trench (negative).
// Signed values stand on a mid-level plane; trenches are drawn in the fail colour.
// Without a shared range (on a card), heights fill the drawing: a faint response still shows its
// shape. Signed values keep zero in the middle.
function fitRange(img) {
  let min = 0
  let max = 0
  for (const v of img.data) {
    if (v < min) min = v
    if (v > max) max = v
  }
  if (min < -1e-9) {
    const m = Math.max(-min, max, 1e-9)
    return { lo: -m, hi: m }
  }
  return { lo: 0, hi: Math.max(max, 1e-9) }
}

export default function TerrainView({ img, range, size = 112, theme }) {
  const canvas = useRef(null)
  const height = Math.round(size * 0.86)

  useEffect(() => {
    const node = canvas.current
    if (!node || !img) return
    const dpr = window.devicePixelRatio || 1
    node.width = Math.round(size * dpr)
    node.height = Math.round(height * dpr)
    const ctx = node.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size, height)

    const { w, h } = img
    const { lo, hi } = range ?? fitRange(img)
    const signed = lo < 0
    const base = signed ? 0.5 : 0 // where zero sits, as a fraction of the height range
    const t = (x, y) => (Math.min(hi, Math.max(lo, img.data[y * w + x])) - lo) / (hi - lo || 1)
    const span = w + h - 2 || 1
    const cx = (size * 0.96) / span
    const cy = cx * 0.5
    const lift = height - 10 - span * cy
    const ox = size / 2 - ((w - h) / 2) * cx
    const sx = (x, y) => ox + (x - y) * cx
    const sy = (x, y, v) => 5 + (1 - base) * lift + (x + y) * cy - (v - base) * lift

    const low = tokenRGB('--line', [222, 219, 209])
    const highUp = tokenRGB('--accent', [201, 143, 34])
    const highDown = tokenRGB('--fail', [184, 87, 63])
    const ink = tokenRGB('--ink', [40, 38, 33])
    const light = [0.25, 0.6, 1].map((v, _, a) => v / Math.hypot(...a))
    const edge = css(ink, w > 20 ? 0.04 : 0.08)

    // The zero plane, faint, for reference.
    ctx.beginPath()
    ;[[0, 0], [w - 1, 0], [w - 1, h - 1], [0, h - 1]].forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](sx(x, y), sy(x, y, base)))
    ctx.closePath()
    ctx.strokeStyle = css(ink, 0.18)
    ctx.lineWidth = 1
    ctx.stroke()

    // Quads between neighbouring pixel centres, far ones first.
    for (let s = 0; s <= w + h - 4; s++) {
      for (let x = Math.max(0, s - (h - 2)); x <= Math.min(w - 2, s); x++) {
        const y = s - x
        const c = [t(x, y), t(x + 1, y), t(x + 1, y + 1), t(x, y + 1)]
        const mean = (c[0] + c[1] + c[2] + c[3]) / 4
        // Surface normal from the quad's two slopes, in units where one cell is one height range.
        const k = lift / cx
        const dx = ((c[1] + c[2] - c[0] - c[3]) / 2) * k
        const dy = ((c[2] + c[3] - c[0] - c[1]) / 2) * k
        const n = [-dx, -dy, 1].map((v, _, a) => v / Math.hypot(...a))
        const shade = 0.68 + 0.32 * Math.max(0, n[0] * light[0] + n[1] * light[1] + n[2] * light[2])
        const up = mean - base
        const colour = signed
          ? up >= 0 ? mix(low, highUp, Math.min(1, up / (1 - base))) : mix(low, highDown, Math.min(1, -up / base))
          : mix(low, highUp, mean)
        ctx.beginPath()
        ctx.moveTo(sx(x, y), sy(x, y, c[0]))
        ctx.lineTo(sx(x + 1, y), sy(x + 1, y, c[1]))
        ctx.lineTo(sx(x + 1, y + 1), sy(x + 1, y + 1, c[2]))
        ctx.lineTo(sx(x, y + 1), sy(x, y + 1, c[3]))
        ctx.closePath()
        ctx.fillStyle = css(colour.map((v) => v * shade))
        ctx.fill()
        ctx.strokeStyle = edge
        ctx.stroke()
      }
    }
  }, [img, range, size, height, theme])

  if (!img) return null
  return <canvas ref={canvas} className="terrain-view" style={{ width: size, height }} aria-label={tr('地形图：亮度是高度', 'Terrain: brightness is height')} />
}
