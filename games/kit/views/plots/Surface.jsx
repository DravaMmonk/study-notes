import { tr } from '../../shell/i18n.js'
import { mix, rgba, token, useCanvas } from './paint.js'
import { rangeOf } from './range.js'

// A grey grid as a landscape seen from above at an angle (the view `surface`, games/DESIGN.md 6.9): each cell's
// value is a height. Smoothing rounds hills off, an edge is a cliff, a derivative a ridge (positive) or a trench
// (negative, in the fail colour); signed values stand on a mid-level plane.

export default function Surface({ value, size = 220 }) {
  const height = Math.round(size * 0.72)
  const canvas = useCanvas((ctx) => {
    const { w, h } = value
    const { lo, hi } = rangeOf(value)
    const base = lo < 0 ? 0.5 : 0
    const t = (x, y) => (value.data[y * w + x] - lo) / (hi - lo || 1)
    const span = w + h - 2 || 1
    const cx = (size * 0.96) / span
    const cy = cx * 0.5
    const lift = height - 10 - span * cy
    const ox = size / 2 - ((w - h) / 2) * cx
    const sx = (x, y) => ox + (x - y) * cx
    const sy = (x, y, v) => 5 + (1 - base) * lift + (x + y) * cy - (v - base) * lift
    const [low, up, down, ink] = ['--line', '--accent', '--fail', '--ink'].map(token)
    const light = [0.25, 0.6, 1].map((v, _, a) => v / Math.hypot(...a))
    // The zero plane, faint, for reference.
    ctx.beginPath()
    ;[[0, 0], [w - 1, 0], [w - 1, h - 1], [0, h - 1]].forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](sx(x, y), sy(x, y, base)))
    ctx.closePath()
    ctx.strokeStyle = rgba(ink, 0.18)
    ctx.stroke()
    // Quads between neighbouring cell centres, far ones first.
    for (let s = 0; s <= w + h - 4; s++) {
      for (let x = Math.max(0, s - (h - 2)); x <= Math.min(w - 2, s); x++) {
        const y = s - x
        const c = [t(x, y), t(x + 1, y), t(x + 1, y + 1), t(x, y + 1)]
        const mean = (c[0] + c[1] + c[2] + c[3]) / 4
        const k = lift / cx
        const n = [-((c[1] + c[2] - c[0] - c[3]) / 2) * k, -((c[2] + c[3] - c[0] - c[1]) / 2) * k, 1]
        const len = Math.hypot(...n)
        const shade = 0.68 + 0.32 * Math.max(0, (n[0] * light[0] + n[1] * light[1] + n[2] * light[2]) / len)
        const rise = mean - base
        const colour = base ? (rise >= 0 ? mix(low, up, Math.min(1, rise / (1 - base))) : mix(low, down, Math.min(1, -rise / base))) : mix(low, up, mean)
        ctx.beginPath()
        ctx.moveTo(sx(x, y), sy(x, y, c[0]))
        ctx.lineTo(sx(x + 1, y), sy(x + 1, y, c[1]))
        ctx.lineTo(sx(x + 1, y + 1), sy(x + 1, y + 1, c[2]))
        ctx.lineTo(sx(x, y + 1), sy(x, y + 1, c[3]))
        ctx.closePath()
        ctx.fillStyle = rgba(colour.map((v) => v * shade))
        ctx.fill()
        ctx.strokeStyle = rgba(ink, w > 20 ? 0.04 : 0.08)
        ctx.stroke()
      }
    }
  }, size, height, [value])
  return <canvas ref={canvas} className="sf" style={{ width: size, height }} aria-label={tr('地形：数值是高度', 'Terrain: a value is a height')} />
}
