import { useEffect, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import { tokenColour, useSolveOnce } from './matchDraw.js'
import './MatchBoards.css'

// 6-3 投票: edge points vote into a (θ, ρ) accumulator. One dial sets the bin size; the two highest
// peaks are drawn back as lines. Too fine splits a line's noisy votes, too coarse merges two lines.

const AW = 300 // accumulator overlay units
const AH = 200

function linePath(theta, rho, reach = 40) {
  const t = (theta * Math.PI) / 180
  const c = Math.cos(t)
  const s = Math.sin(t)
  const x0 = rho * c
  const y0 = rho * s
  return `M${x0 + s * reach} ${y0 - c * reach} L${x0 - s * reach} ${y0 + c * reach}`
}

export default function HoughVote({ level, onSolve, theme }) {
  const m = level.model
  const [sceneIndex, setSceneIndex] = useState(0)
  const [step, setStep] = useState(1)
  const runs = m.scenes.map((scene) => m.run(scene, step))
  const done = runs.every((r) => r.pass)
  useSolveOnce(done, onSolve)

  const scene = m.scenes[sceneIndex]
  const run = runs[sceneIndex]
  const [dTheta, dRho] = m.steps[step]
  const canvas = useRef(null)

  useEffect(() => {
    const node = canvas.current
    if (!node) return
    const { votes, nT, nR } = run.acc
    node.width = nT
    node.height = nR
    const context = node.getContext('2d')
    const pixels = context.createImageData(nT, nR)
    const lo = tokenColour('--paper', [251, 250, 246])
    const hi = tokenColour('--ink', [40, 40, 36])
    const max = Math.max(1, ...votes)
    for (let r = 0; r < nR; r++) {
      for (let t = 0; t < nT; t++) {
        const f = Math.sqrt(votes[r * nT + t] / max)
        const i = ((nR - 1 - r) * nT + t) * 4
        pixels.data.set([0, 1, 2].map((k) => Math.round(lo[k] + (hi[k] - lo[k]) * f)).concat(255), i)
      }
    }
    context.putImageData(pixels, 0, 0)
  }, [run, theme])

  const ax = (theta) => (theta / 180) * AW
  const ay = (rho) => (1 - (rho + m.rhoMax) / (2 * m.rhoMax)) * AH
  const top = run.peaks.slice(0, 2)
  const names = ['A', 'B']

  return (
    <div className="mb mb-hough-board">
      <div className="mb-tabs" role="tablist" aria-label="边缘图">
        {m.scenes.map((s, i) => (
          <button key={s.label} className="mb-tab" role="tab" aria-selected={i === sceneIndex} onClick={() => setSceneIndex(i)}>
            {runs[i].pass ? <Check size={13} className="is-ok" /> : <X size={13} className="is-bad" />}
            {s.label}
          </button>
        ))}
      </div>

      <div className="mb-hough">
        <figure>
          <svg className="mb-stage" viewBox="-26 -26 52 52" role="img" aria-label="边缘点和找到的直线">
            <defs>
              <clipPath id="mb-hough-clip"><rect x={-25} y={-25} width={50} height={50} /></clipPath>
            </defs>
            <g clipPath="url(#mb-hough-clip)">
              {scene.lines.map((line, i) => <path key={`t${i}`} className="mb-target" d={linePath(line.theta, line.rho)} />)}
              {scene.points.map(([x, y], i) => <circle key={i} className="mb-dot" cx={x} cy={y} r={0.55} />)}
              {top.map((p, i) => <path key={`p${i}`} className="mb-found" d={linePath(p.theta, p.rho)} />)}
            </g>
            {top.map((p, i) => {
              const t = (p.theta * Math.PI) / 180
              return <text key={`l${i}`} className="mb-peak-label" x={p.rho * Math.cos(t) + 1} y={p.rho * Math.sin(t) - 1} style={{ fontSize: 3 }}>{i + 1}</text>
            })}
          </svg>
          <figcaption>边缘点 · 虚线是要找的两条线（A、B），实线是前两个峰</figcaption>
        </figure>

        <figure>
          <div className="mb-acc">
            <canvas ref={canvas} aria-label="累加器" />
            <svg viewBox={`0 0 ${AW} ${AH}`} preserveAspectRatio="none" aria-hidden="true">
              {scene.lines.map((line, i) => (
                <g key={i} transform={`translate(${ax(line.theta)} ${ay(line.rho)})`}>
                  <path className="mb-target" d="M-5 0 H5 M0 -5 V5" />
                  <text className="mb-caption" x={6} y={-4} style={{ fontSize: 9 }}>{names[i]}</text>
                </g>
              ))}
              {top.map((p, i) => (
                <g key={i} transform={`translate(${ax(p.theta)} ${ay(p.rho)})`}>
                  <circle className="mb-peak" r={7} />
                  <text className="mb-peak-label" x={8} y={12}>{i + 1}</text>
                </g>
              ))}
            </svg>
          </div>
          <figcaption>累加器：横轴 θ 0°–180°，纵轴 ρ −{m.rhoMax}…{m.rhoMax}；越深票越多</figcaption>
        </figure>
      </div>

      <div className="mb-row">
        <section className="mb-panel">
          <p className="mb-label">分箱大小</p>
          <label className="mb-slider">
            <span>细</span>
            <input type="range" min={0} max={m.steps.length - 1} step={1} value={step} onChange={(e) => setStep(Number(e.target.value))} aria-label="分箱大小" />
            <span>粗</span>
          </label>
          <p className="mb-readout">Δθ = <b>{dTheta}°</b> · Δρ = <b>{dRho} px</b> · {run.acc.nT} × {run.acc.nR} 格</p>
        </section>
        <section className="mb-panel">
          <p className="mb-label">峰</p>
          <table className="mb-table">
            <thead>
              <tr><th /><th>θ</th><th>ρ</th><th>票</th><th>对上</th></tr>
            </thead>
            <tbody>
              {run.peaks.map((p, i) => {
                const hit = run.found.indexOf(i)
                return (
                  <tr key={i} className={i < 2 ? '' : 'mb-dim-row'}>
                    <td>{i + 1}</td>
                    <td>{p.theta.toFixed(1)}°</td>
                    <td>{p.rho.toFixed(1)}</td>
                    <td>{p.votes}</td>
                    <td className={i < 2 ? (hit >= 0 ? 'mb-ok' : 'mb-bad') : ''}>{i < 2 ? (hit >= 0 ? names[hit] : '—') : ''}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="mb-note">前两个峰要分别对上 A 和 B（相差不超过 {m.tol.theta}°、{m.tol.rho} px）。</p>
        </section>
      </div>
    </div>
  )
}
