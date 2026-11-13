import { useEffect, useMemo, useRef, useState } from 'react'
import { tokenColour, useWidth } from './matchDraw.js'
import { tr } from '../../../../shell/i18n.js'
import './match.css'

// The voting bench's two pictures (bench model `hough`), for the case on show: the edge points with the two lines to
// find and the two strongest peaks drawn back as lines, and the (θ, ρ) accumulator, whole or zoomed to where the
// bins show. The accumulator is a raster with an overlay no plot can draw.

function linePath(theta, rho, reach = 40) {
  const t = (theta * Math.PI) / 180
  const c = Math.cos(t)
  const s = Math.sin(t)
  const x0 = rho * c
  const y0 = rho * s
  return `M${x0 + s * reach} ${y0 - c * reach} L${x0 - s * reach} ${y0 + c * reach}`
}

const NAMES = ['A', 'B']
const ASPECT = 180 / 68 // degrees per ρ pixel of the full accumulator view, kept when zoomed

// A (θ, ρ) window around both target lines with some margin, at the full view's aspect.
function zoomWindow(lines, rhoMax) {
  const thetas = lines.map((l) => l.theta)
  const rhos = lines.map((l) => l.rho)
  let t0 = Math.min(...thetas) - 10
  let t1 = Math.max(...thetas) + 10
  let r0 = Math.min(...rhos) - 6
  let r1 = Math.max(...rhos) + 6
  const grow = (lo, hi, span) => [(lo + hi) / 2 - span / 2, (lo + hi) / 2 + span / 2]
  if ((t1 - t0) / (r1 - r0) < ASPECT) [t0, t1] = grow(t0, t1, (r1 - r0) * ASPECT)
  else [r0, r1] = grow(r0, r1, (t1 - t0) / ASPECT)
  const shift = (lo, hi, min, max) => (lo < min ? [min, hi + min - lo] : hi > max ? [lo - hi + max, max] : [lo, hi])
  ;[t0, t1] = shift(t0, t1, 0, 180)
  ;[r0, r1] = shift(r0, r1, -rhoMax, rhoMax)
  return { t0, t1, r0, r1 }
}

export function HoughPlanes({ ctx }) {
  const { scene, run, bin: [dTheta, dRho] } = ctx.view
  const { rhoMax } = ctx.model
  const canvas = useRef(null)
  const box = useRef(null)
  const width = useWidth(box)

  // The accumulator view: all of (θ, ρ), or a window around the two target lines where the bins themselves are
  // visible. Both keep the full view's aspect, so a degree is as wide in either.
  const [zoom, setZoom] = useState(true)
  const view = useMemo(() => (zoom ? zoomWindow(scene.lines, rhoMax) : { t0: 0, t1: 180, r0: -rhoMax, r1: rhoMax }), [zoom, scene, rhoMax])

  useEffect(() => {
    const node = canvas.current
    if (!node) return
    const { votes, nT, nR } = run.acc
    // Full view: one canvas pixel per bin. Zoomed: a fixed raster that shows each bin as a block.
    const W = zoom ? 540 : nT
    const H = zoom ? 360 : nR
    node.width = W
    node.height = H
    const context = node.getContext('2d')
    const pixels = context.createImageData(W, H)
    const lo = tokenColour('--paper', [251, 250, 246])
    const hi = tokenColour('--ink', [40, 40, 36])
    const max = Math.max(1, ...votes)
    for (let y = 0; y < H; y++) {
      const rho = view.r1 - ((y + 0.5) / H) * (view.r1 - view.r0)
      const r = Math.floor((rho + rhoMax) / dRho)
      for (let x = 0; x < W; x++) {
        const theta = view.t0 + ((x + 0.5) / W) * (view.t1 - view.t0)
        const t = Math.floor(theta / dTheta)
        const v = t >= 0 && t < nT && r >= 0 && r < nR ? votes[r * nT + t] : 0
        const f = Math.sqrt(v / max)
        pixels.data.set([0, 1, 2].map((k) => Math.round(lo[k] + (hi[k] - lo[k]) * f)).concat(255), (y * W + x) * 4)
      }
    }
    context.putImageData(pixels, 0, 0)
  }, [run, ctx.theme, view, zoom, dTheta, dRho, rhoMax])

  // The accumulator overlay works in CSS px (its viewBox is the box's own size), so markers and labels keep one
  // screen size on a phone and on a wide desktop.
  const aw = width || 300
  const ah = (aw * 2) / 3
  const ax = (theta) => ((theta - view.t0) / (view.t1 - view.t0)) * aw
  const ay = (rho) => ((view.r1 - rho) / (view.r1 - view.r0)) * ah
  const top = run.peaks.slice(0, 2)
  const fmt = (v) => String(Math.abs(v - Math.round(v)) < 0.05 ? Math.round(v) : v.toFixed(1)).replace('-', '−')

  return (
    <div className="mb mb-hough-stage">
      <figure className="mb-hough-points">
        <div className="mb-fig-head"><span className="bk-label">{tr('边缘点 · 图像空间')}</span></div>
        <svg className="mb-svg" viewBox="-25 -25 50 50" role="img" aria-label={tr('边缘点和找到的直线')}>
          <defs>
            <clipPath id="mb-hough-clip"><rect x={-25} y={-25} width={50} height={50} /></clipPath>
          </defs>
          <rect className="mb-frame" x={-25} y={-25} width={50} height={50} />
          <g clipPath="url(#mb-hough-clip)">
            {scene.lines.map((line, i) => <path key={`t${i}`} className="mb-target" d={linePath(line.theta, line.rho)} />)}
            {scene.points.map(([x, y], i) => <circle key={i} className="mb-dot" cx={x} cy={y} r={0.55} />)}
            {top.map((p, i) => <path key={`p${i}`} className={`mb-found ${run.found.includes(i) ? '' : 'is-wrong'}`} d={linePath(p.theta, p.rho)} />)}
          </g>
          {scene.lines.map((line, i) => {
            const t = (line.theta * Math.PI) / 180
            const s = i ? -19 : 19
            return <text key={`n${i}`} className="mb-line-name" x={line.rho * Math.cos(t) - Math.sin(t) * s} y={line.rho * Math.sin(t) + Math.cos(t) * s}>{NAMES[i]}</text>
          })}
        </svg>
        <figcaption className="bk-caption">{tr('虚线 A、B 是要找的两条线；实线是票数最高的两个峰（红色：未匹配）')}</figcaption>
      </figure>

      <figure className="mb-hough-acc">
        <div className="mb-fig-head">
          <span className="bk-label">{tr('累加器 · (θ, ρ) 参数空间')}</span>
          <div className="bk-seg mb-zoom" role="group" aria-label={tr('累加器视图')}>
            <button aria-pressed={zoom} onClick={() => setZoom(true)}>{tr('放大')}</button>
            <button aria-pressed={!zoom} onClick={() => setZoom(false)}>{tr('全图')}</button>
          </div>
        </div>
        <div className="mb-acc" ref={box}>
          <canvas ref={canvas} aria-label={tr('累加器')} />
          <svg viewBox={`0 0 ${aw} ${ah}`} aria-hidden="true">
            {scene.lines.map((line, i) => (
              <g key={i} className="mb-acc-target" style={{ transform: `translate(${ax(line.theta)}px, ${ay(line.rho)}px)` }}>
                <path d="M-8 0 H8 M0 -8 V8" />
                <text x={i ? 10 : -10} y={-10} textAnchor={i ? 'start' : 'end'}>{NAMES[i]}</text>
              </g>
            ))}
            {top.map((p, i) => (
              <g key={i} className={`mb-acc-peak ${run.found.includes(i) ? '' : 'is-wrong'}`} style={{ transform: `translate(${ax(p.theta)}px, ${ay(p.rho)}px)` }}>
                <circle r={10} />
                <text x={i ? 13 : -13} y={21} textAnchor={i ? 'start' : 'end'}>{i + 1}</text>
              </g>
            ))}
          </svg>
          <span className="mb-axis is-x">θ {fmt(view.t0)}° → {fmt(view.t1)}°</span>
          <span className="mb-axis is-y">ρ {fmt(view.r1)} ↓ {fmt(view.r0)}</span>
        </div>
        <figcaption className="bk-caption">{tr('每个边缘点在此沿一条曲线投票，格子颜色越深票数越多；圆圈 1、2 是两个最高峰，十字标出 A、B 的位置')}</figcaption>
      </figure>
    </div>
  )
}
