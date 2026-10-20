import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import { tokenColour, useSolveOnce, useWidth } from './matchDraw.js'
import { PHONE, useMedia } from '../../../../shell/useMedia.js'
import { L, keyOf, tr } from '../../../../shell/i18n.js'
import './MatchBoards.css'

// 6-3 投票: edge points vote into a (θ, ρ) accumulator. One dial sets the bin size; the two highest
// peaks are drawn back as lines. Too fine splits a line's noisy votes, too coarse merges two lines.

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

export default function HoughVote({ level, onSolve, theme }) {
  const m = level.model
  const phone = useMedia(PHONE)
  const [sceneIndex, setSceneIndex] = useState(0)
  const [step, setStep] = useState(1)
  const runs = m.scenes.map((scene) => m.run(scene, step))
  const done = runs.every((r) => r.pass)
  useSolveOnce(done, onSolve)

  const scene = m.scenes[sceneIndex]
  const run = runs[sceneIndex]
  const [dTheta, dRho] = m.steps[step]
  const canvas = useRef(null)
  const box = useRef(null)
  const width = useWidth(box)

  // The accumulator view: all of (θ, ρ), or a window around the two target lines where the bins
  // themselves are visible. Both keep the full view's aspect, so a degree is as wide in either.
  const [zoom, setZoom] = useState(true)
  const view = useMemo(() => (zoom ? zoomWindow(scene.lines, m.rhoMax) : { t0: 0, t1: 180, r0: -m.rhoMax, r1: m.rhoMax }), [zoom, scene, m.rhoMax])

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
      const r = Math.floor((rho + m.rhoMax) / dRho)
      for (let x = 0; x < W; x++) {
        const theta = view.t0 + ((x + 0.5) / W) * (view.t1 - view.t0)
        const t = Math.floor(theta / dTheta)
        const v = t >= 0 && t < nT && r >= 0 && r < nR ? votes[r * nT + t] : 0
        const f = Math.sqrt(v / max)
        pixels.data.set([0, 1, 2].map((k) => Math.round(lo[k] + (hi[k] - lo[k]) * f)).concat(255), (y * W + x) * 4)
      }
    }
    context.putImageData(pixels, 0, 0)
  }, [run, theme, view, zoom, dTheta, dRho, m.rhoMax])

  // The accumulator overlay works in CSS px (its viewBox is the box's own size), so markers and
  // labels keep one screen size on a phone and on a wide desktop.
  const aw = width || 300
  const ah = (aw * 2) / 3
  const ax = (theta) => ((theta - view.t0) / (view.t1 - view.t0)) * aw
  const ay = (rho) => ((view.r1 - rho) / (view.r1 - view.r0)) * ah
  const top = run.peaks.slice(0, 2)
  const passed = runs.filter((r) => r.pass).length

  const fmt = (v) => String(Math.abs(v - Math.round(v)) < 0.05 ? Math.round(v) : v.toFixed(1)).replace('-', '−')

  const binControl = (
    <section className="bk-panel">
      <span className="bk-label">{tr('分箱大小', 'Bin size')}</span>
      <label className="bk-field mb-coarse">
        <span>{tr('细', 'Fine')}</span>
        <input className="bk-range" type="range" min={0} max={m.steps.length - 1} step={1} value={step} style={{ '--fill': `${(step / (m.steps.length - 1)) * 100}%` }} onChange={(e) => setStep(Number(e.target.value))} aria-label={tr('分箱大小', 'Bin size')} />
        <span>{tr('粗', 'Coarse')}</span>
      </label>
      {phone ? (
        <p className="mb-readout mb-bin-line">Δθ <b>{dTheta}°</b> · Δρ <b>{dRho} px</b> · <b>{run.acc.nT}×{run.acc.nR}</b> {tr('格', 'cells')}</p>
      ) : (
        <div className="bk-stats">
          <div className="bk-stat"><b>{dTheta}°</b><span>Δθ</span></div>
          <div className="bk-stat"><b>{dRho} px</b><span>Δρ</span></div>
          <div className="bk-stat"><b>{run.acc.nT}×{run.acc.nR}</b><span>{tr('格', 'cells')}</span></div>
        </div>
      )}
    </section>
  )

  const goals = (
    <section className="bk-panel">
      <span className="bk-label">{tr('目标 · 前两个峰分别对上 A 和 B', 'Goal · the top two peaks match A and B')}</span>
      <ul className="bk-goals">
        {m.scenes.map((s, i) => {
          const hits = runs[i].found.filter((f) => f >= 0).length
          return (
            <li key={keyOf(s.label)} className={`bk-goal ${runs[i].pass ? 'is-pass' : ''} ${i === sceneIndex ? 'is-current' : ''}`}>
              {runs[i].pass ? <Check size={16} /> : <X size={16} />}
              <span>{L(s.label)}</span>
              <b>{tr('对上', 'matched')} {hits}/2</b>
            </li>
          )
        })}
      </ul>
    </section>
  )

  const peaks = (
    <section className="bk-panel">
      <span className="bk-label">{L(scene.label)} · {tr('票数最高的峰', 'peaks with the most votes')}</span>
      <table className="mb-table">
        <thead>
          <tr><th>{tr('峰', 'Peak')}</th><th>θ</th><th>ρ</th><th>{tr('票', 'Votes')}</th><th>{tr('对上', 'Matches')}</th></tr>
        </thead>
        <tbody>
          {run.peaks.slice(0, 3).map((p, i) => {
            const hit = run.found.indexOf(i)
            return (
              <tr key={i} className={i < 2 ? '' : 'is-dim'}>
                <td>{i + 1}</td>
                <td>{p.theta.toFixed(1)}°</td>
                <td>{p.rho.toFixed(1)}</td>
                <td>{p.votes}</td>
                <td className={i < 2 ? (hit >= 0 ? 'mb-ok' : 'mb-bad') : ''}>{i < 2 ? (hit >= 0 ? NAMES[hit] : '—') : ''}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="bk-note">{tr(`容差 ${m.tol.theta}°、${m.tol.rho} px。`, `Tolerance ${m.tol.theta}°, ${m.tol.rho} px.`)}</p>
    </section>
  )

  return (
    <div className="bk mb mb-hough">
      <div className="mb-head">
        <div className="bk-seg" role="group" aria-label={tr('边缘图', 'Edge images')}>
          {m.scenes.map((s, i) => (
            <button key={keyOf(s.label)} aria-pressed={i === sceneIndex} onClick={() => setSceneIndex(i)}>
              {runs[i].pass ? <Check size={14} className="mb-ok" /> : <X size={14} className="mb-bad" />}
              {L(s.label)}
            </button>
          ))}
        </div>
        {!phone && <span className={`bk-chip ${done ? 'is-pass' : ''}`}>{passed} / {m.scenes.length} {tr('张图通过', 'images passed')}</span>}
      </div>

      <div className="bk-stage mb-hough-stage">
        <figure className="mb-hough-points">
          <div className="mb-fig-head"><span className="bk-label">{tr('边缘点 · 图像空间', 'Edge points · image space')}</span></div>
          <svg className="mb-svg" viewBox="-25 -25 50 50" role="img" aria-label={tr('边缘点和找到的直线', 'Edge points and the lines found')}>
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
          <figcaption className="bk-caption">{tr('虚线 A、B 是要找的两条线；实线是票数最高的两个峰（红色：没对上）', 'Dashed A and B are the two lines to find; solid lines are the two peaks with the most votes (red: no match)')}</figcaption>
        </figure>

        <figure className="mb-hough-acc">
          <div className="mb-fig-head">
            <span className="bk-label">{tr('累加器 · (θ, ρ) 参数空间', 'Accumulator · (θ, ρ) parameter space')}</span>
            <div className="bk-seg mb-zoom" role="group" aria-label={tr('累加器视图', 'Accumulator view')}>
              <button aria-pressed={zoom} onClick={() => setZoom(true)}>{tr('放大', 'Zoom in')}</button>
              <button aria-pressed={!zoom} onClick={() => setZoom(false)}>{tr('全图', 'Full view')}</button>
            </div>
          </div>
          <div className="mb-acc" ref={box}>
            <canvas ref={canvas} aria-label={tr('累加器', 'Accumulator')} />
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
          <figcaption className="bk-caption">{tr('每个点在这里投出一条曲线，格子越浓票越多；圆圈 1、2 是两个最高峰，十字是 A、B 的位置', 'Each point votes along a curve here; the darker a cell, the more votes. Circles 1 and 2 are the two highest peaks; the crosses mark A and B')}</figcaption>
        </figure>
      </div>

      {phone ? (
        <>
          <div className="mb-dock">{binControl}</div>
          {goals}
          {peaks}
        </>
      ) : (
        <div className="mb-hough-row">
          {binControl}
          {goals}
          {peaks}
        </div>
      )}
    </div>
  )
}
