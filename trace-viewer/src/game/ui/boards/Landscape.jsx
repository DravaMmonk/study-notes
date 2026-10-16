import { useEffect, useMemo, useRef, useState } from 'react'
import { tr } from '../../../../../games/kit/shell/i18n.js'
import { css, mix, tokenRGB } from '../views/views.js'
import { useTween } from './optics-motion.js'

// The error landscape of 4-1 in 3D: the floor is the two knobs (w across, b in depth), the height is
// the error. The surface is drawn on a canvas, quad by quad from back to front, shaded by height and
// slope; everything that moves (the ball, its shadow, the path, the arrows) is drawn over it in SVG.
// Drag sideways to turn it.

const DOMAIN = { w: [-1, 2.5], b: [-0.6, 1.4] }
// Height grows with the square root of the error, so the deep valley and the steep walls both fit;
// errors above ZTOP are drawn at the top.
const ZTOP = 4
const lift = (loss) => Math.min(1, Math.sqrt(Math.max(0, loss) / ZTOP))
const NW = 34
const NB = 22
const VIEWS = [['top', ['俯视', 'Top'], { yaw: -20, pitch: 84 }], ['angle', ['斜看', 'Angled'], { yaw: -32, pitch: 34 }], ['side', ['侧视', 'Side'], { yaw: 0, pitch: 6 }]]

export default function Landscape({ m, rule, state, trail, rail, next, grad, width, theme, solved }) {
  const canvas = useRef(null)
  const height = Math.round(width * 0.72)
  const [turn, setTurn] = useState(VIEWS[1][2])
  const drag = useRef(null)
  const [dragging, setDragging] = useState(false)
  // Presets glide; a drag follows the finger at once.
  const [yawShown, pitchShown] = useTween([turn.yaw, turn.pitch], { ms: 420, instant: dragging })
  const pose = { yaw: yawShown, pitch: pitchShown }

  // World units: w spans x ∈ [−1, 1]; b spans the same scale in depth; error rises to 0.85.
  const span = DOMAIN.w[1] - DOMAIN.w[0]
  const toWorld = (w, b, z) => [((w - DOMAIN.w[0]) / span) * 2 - 1, ((b - DOMAIN.b[0]) / span) * 2 - (DOMAIN.b[1] - DOMAIN.b[0]) / span, lift(z) * 0.85]
  const project = useMemo(() => {
    const yaw = (pose.yaw * Math.PI) / 180
    const pitch = (pose.pitch * Math.PI) / 180
    const scale = width * 0.36
    const cx = width / 2
    const cy = height * 0.6
    return ([x, y, z]) => {
      const rx = x * Math.cos(yaw) - y * Math.sin(yaw)
      const ry = x * Math.sin(yaw) + y * Math.cos(yaw)
      return { x: cx + rx * scale, y: cy - (z * Math.cos(pitch) + ry * Math.sin(pitch)) * scale, depth: ry * Math.cos(pitch) - z * Math.sin(pitch) }
    }
  }, [pose.yaw, pose.pitch, width, height])
  const at = (w, b, z) => project(toWorld(w, b, z))

  // Contour lines on the floor, worked out once per landscape.
  const contours = useMemo(() => floorContours(m, rule), [m, rule])

  useEffect(() => {
    const node = canvas.current
    if (!node) return
    const dpr = window.devicePixelRatio || 1
    node.width = Math.round(width * dpr)
    node.height = Math.round(height * dpr)
    const ctx = node.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)
    const low = tokenRGB('--fam-size', [95, 132, 166])
    const high = tokenRGB('--line', [222, 219, 209])
    const ink = tokenRGB('--ink', [40, 38, 33])
    const rule0 = tokenRGB('--rule', [191, 185, 172])

    // The floor and its contours: where you are on the knobs, read from above.
    const corner = (w, b) => at(w, b, 0)
    ctx.beginPath()
    ;[[DOMAIN.w[0], DOMAIN.b[0]], [DOMAIN.w[1], DOMAIN.b[0]], [DOMAIN.w[1], DOMAIN.b[1]], [DOMAIN.w[0], DOMAIN.b[1]]].forEach(([w, b], i) => {
      const p = corner(w, b)
      ctx[i ? 'lineTo' : 'moveTo'](p.x, p.y)
    })
    ctx.closePath()
    ctx.fillStyle = css(tokenRGB('--canvas', [243, 241, 235]))
    ctx.fill()
    ctx.strokeStyle = css(rule0)
    ctx.stroke()
    ctx.strokeStyle = css(rule0, 0.8)
    ctx.beginPath()
    for (const [[w1, b1], [w2, b2]] of contours) {
      const p = corner(w1, b1)
      const q = corner(w2, b2)
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(q.x, q.y)
    }
    ctx.stroke()

    // The surface, far quads first.
    const quads = []
    for (let j = 0; j < NB; j++) {
      for (let i = 0; i < NW; i++) {
        const w0 = DOMAIN.w[0] + (i / NW) * span
        const w1 = DOMAIN.w[0] + ((i + 1) / NW) * span
        const b0 = DOMAIN.b[0] + (j / NB) * (DOMAIN.b[1] - DOMAIN.b[0])
        const b1 = DOMAIN.b[0] + ((j + 1) / NB) * (DOMAIN.b[1] - DOMAIN.b[0])
        const z = [m.loss(rule, w0, b0), m.loss(rule, w1, b0), m.loss(rule, w1, b1), m.loss(rule, w0, b1)]
        const pts = [at(w0, b0, z[0]), at(w1, b0, z[1]), at(w1, b1, z[2]), at(w0, b1, z[3])]
        const h = z.map(lift)
        const mean = (h[0] + h[1] + h[2] + h[3]) / 4
        const tilt = Math.min(1, Math.hypot(h[1] + h[2] - h[0] - h[3], h[2] + h[3] - h[0] - h[1]) * 4)
        quads.push({ pts, depth: pts.reduce((s, p) => s + p.depth, 0) / 4, mean, tilt })
      }
    }
    quads.sort((a, b) => b.depth - a.depth)
    for (const q of quads) {
      const t = q.mean
      const shade = 1 - 0.28 * q.tilt
      ctx.beginPath()
      q.pts.forEach((p, i) => ctx[i ? 'lineTo' : 'moveTo'](p.x, p.y))
      ctx.closePath()
      ctx.fillStyle = css(mix(low, high, t).map((v) => v * shade), 0.94)
      ctx.fill()
      ctx.strokeStyle = css(ink, 0.07)
      ctx.stroke()
    }
  }, [m, rule, width, height, theme, project, contours, span]) // eslint-disable-line react-hooks/exhaustive-deps

  const onPointerDown = (event) => {
    if (event.target.closest('button')) return
    drag.current = { x: event.clientX, yaw: turn.yaw }
    setDragging(true)
  }
  const onPointerMove = (event) => {
    if (!drag.current) return
    setTurn((t) => ({ ...t, yaw: Math.max(-90, Math.min(90, drag.current.yaw + (event.clientX - drag.current.x) * 0.4)) }))
  }
  const end = () => {
    drag.current = null
    setDragging(false)
  }

  // What moves.
  const height3 = (p) => m.loss(rule, p.w, p.b)
  const pathOn = trail.filter((p) => Number.isFinite(p.w) && Number.isFinite(p.b) && p.w >= DOMAIN.w[0] - 1 && p.w <= DOMAIN.w[1] + 1)
  const line = (points) => points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('')
  const clampW = (w) => Math.max(DOMAIN.w[0], Math.min(DOMAIN.w[1], w))
  const clampB = (b) => Math.max(DOMAIN.b[0], Math.min(DOMAIN.b[1], b))
  const ball = at(clampW(state.w), clampB(state.b), height3(state))
  const shadow = at(clampW(state.w), clampB(state.b), 0)
  const railLine = rail ? Array.from({ length: 61 }, (_, i) => { const w = DOMAIN.w[0] + (i / 60) * span; return at(w, 0, m.loss(rule, w, 0)) }) : null
  const g = Math.hypot(grad.gw, rail ? 0 : grad.gb)
  const uphill = g > 1e-6 ? { w: grad.gw / g, b: rail ? 0 : grad.gb / g } : null
  const arrowTip = uphill ? at(clampW(state.w + uphill.w * 0.35), clampB(state.b + uphill.b * 0.35), 0) : null
  const landing = next && Number.isFinite(next.w) ? next : null
  const minimum = rule === 'two' ? { w: 0.5, b: 0.2 } : { w: 0.6, b: 0 }
  const axis = (label, w, b, z) => {
    const p = at(w, b, z)
    return <text className="ls-axis" x={p.x} y={p.y}>{label}</text>
  }

  return (
    <div className="ls" style={{ aspectRatio: `${width} / ${height}` }} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={end} onPointerCancel={end} onPointerLeave={end}>
      <canvas ref={canvas} aria-hidden="true" />
      <div className="ls-views bk-seg" role="radiogroup" aria-label={tr('视角', 'View')}>
        {VIEWS.map(([key, label, preset]) => (
          <button key={key} role="radio" aria-checked={turn.yaw === preset.yaw && turn.pitch === preset.pitch} aria-pressed={turn.yaw === preset.yaw && turn.pitch === preset.pitch} onClick={() => setTurn(preset)}>{tr(...label)}</button>
        ))}
      </div>
      <span className="ls-hint" aria-hidden="true">{tr('左右拖动可以转', 'Drag sideways to turn')}</span>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={tr('误差地形：地面是两个旋钮 w 和 b，高度是误差', 'Error landscape: the floor is the two knobs w and b, the height is the error')}>
        {axis('w →', DOMAIN.w[1] + 0.15, DOMAIN.b[0], 0)}
        {axis('b →', DOMAIN.w[0], DOMAIN.b[1] + 0.15, 0)}
        {(() => {
          const base = at(DOMAIN.w[0], DOMAIN.b[0], 0)
          const top = at(DOMAIN.w[0], DOMAIN.b[0], ZTOP)
          return (
            <g className="ls-zaxis">
              <line x1={base.x} y1={base.y} x2={top.x} y2={top.y} />
              <text x={top.x - 4} y={top.y - 6}>{tr('误差 ↑', 'error ↑')}</text>
            </g>
          )
        })()}
        {railLine && <path className="ls-rail" d={line(railLine)} />}
        {pathOn.length > 1 && <path className="ls-path-floor" d={line(pathOn.map((p) => at(clampW(p.w), clampB(p.b), 0)))} />}
        {pathOn.length > 1 && <path className="ls-path" d={line(pathOn.map((p) => at(clampW(p.w), clampB(p.b), height3(p))))} />}
        {solved && (() => { const p = at(minimum.w, minimum.b, 0); return <circle className="ls-min" cx={p.x} cy={p.y} r={7} /> })()}
        {arrowTip && (
          <g className="ls-grad">
            <line x1={shadow.x} y1={shadow.y} x2={arrowTip.x} y2={arrowTip.y} />
            <circle cx={arrowTip.x} cy={arrowTip.y} r={3.5} />
            <text x={arrowTip.x + 6} y={arrowTip.y - 4}>{tr('上坡', 'uphill')}</text>
          </g>
        )}
        {landing && (() => {
          const lw = clampW(landing.w)
          const lb = clampB(landing.b)
          const floor = at(lw, lb, 0)
          const ghost = at(lw, lb, height3(landing))
          const off = lw !== landing.w || lb !== landing.b
          return (
            <g className={`ls-next ${off ? 'is-off' : ''}`}>
              <path d={`M${shadow.x},${shadow.y} Q${(shadow.x + floor.x) / 2},${Math.min(shadow.y, floor.y) - 26} ${floor.x},${floor.y}`} />
              <circle className="ls-ghost" cx={ghost.x} cy={ghost.y} r={7} />
              <text x={floor.x + 8} y={floor.y + 14}>{off ? tr('冲出地图', 'off the map') : tr('下一步落在这', 'next step lands here')}</text>
            </g>
          )
        })()}
        <line className="ls-drop" x1={shadow.x} y1={shadow.y} x2={ball.x} y2={ball.y} />
        <ellipse className="ls-shadow" cx={shadow.x} cy={shadow.y} rx={9} ry={4} />
        <circle className="ls-ball" cx={ball.x} cy={ball.y} r={9} />
        <circle className="ls-ball-shine" cx={ball.x - 3} cy={ball.y - 3} r={3} />
      </svg>
    </div>
  )
}

// Contours of the error on the floor, at a few fixed heights (marching squares in knob space).
function floorContours(m, rule) {
  const levels = [0.004, 0.015, 0.04, 0.1, 0.2, 0.4, 0.7]
  const n = 60
  const nb = 36
  const w = (i) => DOMAIN.w[0] + (i / n) * (DOMAIN.w[1] - DOMAIN.w[0])
  const b = (j) => DOMAIN.b[0] + (j / nb) * (DOMAIN.b[1] - DOMAIN.b[0])
  const segments = []
  for (const level of levels) {
    for (let j = 0; j < nb; j++) {
      for (let i = 0; i < n; i++) {
        const corners = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]]
        const hits = []
        for (let k = 0; k < 4; k++) {
          const [p, q] = [corners[k], corners[(k + 1) % 4]]
          const vp = m.loss(rule, w(p[0]), b(p[1])) - level
          const vq = m.loss(rule, w(q[0]), b(q[1])) - level
          if ((vp < 0) !== (vq < 0)) {
            const t = vp / (vp - vq)
            hits.push([w(p[0] + (q[0] - p[0]) * t), b(p[1] + (q[1] - p[1]) * t)])
          }
        }
        for (let k = 0; k + 1 < hits.length; k += 2) segments.push([hits[k], hits[k + 1]])
      }
    }
  }
  return segments
}
