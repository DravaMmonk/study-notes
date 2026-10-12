import { useEffect, useMemo, useRef, useState } from 'react'
import ImageView from '../ImageView.jsx'
import './depthgen.css'

// 7-4 只在一条线上找: click a point in the left view, then spend a comparison budget searching the
// right view. The whole image does not fit the budget, the same row misses (the views are not
// rectified), and F·p read as a point is off; read as a line a·u′ + b·v′ + c = 0 it holds the match.

const SCALE = 10
const GOAL = 3
const fmt = (v) => (Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 1 ? v.toFixed(2) : v.toPrecision(2))

// The part of the line a·x + b·y + c = 0 inside [0, W]² (pixel centres sit at u + 0.5 on screen).
function clipLine([a, b, c], W) {
  const points = []
  const add = (x, y) => {
    if (x >= -0.5 - 1e-9 && x <= W - 0.5 + 1e-9 && y >= -0.5 - 1e-9 && y <= W - 0.5 + 1e-9) points.push([x + 0.5, y + 0.5])
  }
  if (Math.abs(b) > 1e-12) {
    add(-0.5, -(a * -0.5 + c) / b)
    add(W - 0.5, -(a * (W - 0.5) + c) / b)
  }
  if (Math.abs(a) > 1e-12) {
    add(-(b * -0.5 + c) / a, -0.5)
    add(-(b * (W - 0.5) + c) / a, W - 0.5)
  }
  if (points.length < 2) return null
  points.sort((p, q) => p[0] - q[0] || p[1] - q[1])
  return [points[0], points[points.length - 1]]
}

export default function EpipolarSearch({ level, onSolve, theme }) {
  const m = level.model
  const { left, right } = useMemo(() => m.scene(), [m])
  const [point, setPoint] = useState(null) // { u, v, spent }
  const [result, setResult] = useState(null) // { mode, search, message }
  const [found, setFound] = useState([]) // [{ u, v, x, y, line }]
  const [note, setNote] = useState('')
  const solved = useRef(false)

  useEffect(() => {
    if (found.length >= GOAL && !solved.current) {
      solved.current = true
      onSolve()
    }
  }, [found, onSolve])

  const line = point ? m.line(point.u, point.v) : null
  const costs = point
    ? { all: m.candidates.all().length, row: m.candidates.row(point.u, point.v).length, point: 1, line: m.candidates.line(point.u, point.v).length }
    : null

  const pick = (event) => {
    const box = event.currentTarget.getBoundingClientRect()
    const u = Math.floor(((event.clientX - box.left) / box.width) * m.W)
    const v = Math.floor(((event.clientY - box.top) / box.height) * m.W)
    if (found.some((f) => f.u === u && f.v === v)) {
      setNote('这个点已经找到了，换一个。')
      return
    }
    if (!m.truth(u, v)) {
      setPoint(null)
      setResult(null)
      setNote('这一点在右图里看不到，或者窗口跨在木板边上。换一个。')
      return
    }
    setNote('')
    setResult(null)
    setPoint({ u, v, spent: 0 })
  }

  const run = (mode) => {
    if (!point) return
    const count = costs[mode]
    const remaining = m.BUDGET - point.spent
    if (count > remaining) {
      setResult({ mode, message: `要比较 ${count} 次，预算只剩 ${remaining} 次。` })
      return
    }
    const search = m.search(point.u, point.v, mode)
    setPoint({ ...point, spent: point.spent + count })
    let message
    if (!search.best) message = '这个“点”在图外。'
    else if (search.found) message = '对上了。'
    else message = '最像的那一处不是同一点。'
    setResult({ mode, search, message })
    if (search.found) setFound((all) => [...all, { u: point.u, v: point.v, x: search.best.x, y: search.best.y, line: m.line(point.u, point.v) }])
  }

  const reset = () => {
    setPoint(null)
    setResult(null)
    setFound([])
    setNote('')
  }

  const search = result?.search
  const windows = point && search?.best ? m.windows(point.u, point.v, search.best.x, search.best.y) : null
  const profile = point && search && (result.mode === 'row' || result.mode === 'line') ? m.profile(point.u, point.v, search.list) : null
  const spent = point?.spent ?? 0
  const W = m.W

  const modes = [
    ['all', '整张右图逐点比'],
    ['row', '只比同一行 v′ = v'],
    ['point', '比点 (a/c, b/c)'],
    ['line', '沿直线 a·u′ + b·v′ + c = 0'],
  ]

  return (
    <div className="dg dg-epi">
      <div className="dg-views">
        <figure className="dg-view">
          <div className="dg-frame" style={{ width: W * SCALE, height: W * SCALE }}>
            <ImageView img={left} size={W * SCALE} range={{ lo: 0, hi: 1 }} theme={theme} />
            <svg className="dg-overlay is-clickable" viewBox={`0 0 ${W} ${W}`} onClick={pick} role="img" aria-label="左图：点一个点">
              {found.map((f, i) => (
                <g key={i}>
                  <circle className="dg-mark is-found" cx={f.u + 0.5} cy={f.v + 0.5} r={0.7} />
                  <text className="dg-mark-label" x={f.u + 1.4} y={f.v + 0.2}>{i + 1}</text>
                </g>
              ))}
              {point && (
                <>
                  <rect className="dg-window" x={point.u - m.PATCH} y={point.v - m.PATCH} width={2 * m.PATCH + 1} height={2 * m.PATCH + 1} />
                  <circle className="dg-mark is-target" cx={point.u + 0.5} cy={point.v + 0.5} r={0.6} />
                </>
              )}
            </svg>
          </div>
          <figcaption>左图 · 点一个点 {point ? `p = (${point.u}, ${point.v}, 1)` : ''}</figcaption>
        </figure>

        <figure className="dg-view">
          <div className="dg-frame" style={{ width: W * SCALE, height: W * SCALE }}>
            <ImageView img={right} size={W * SCALE} range={{ lo: 0, hi: 1 }} theme={theme} />
            <svg className="dg-overlay" viewBox={`0 0 ${W} ${W}`} role="img" aria-label="右图：搜索的位置">
              {found.map((f, i) => {
                const seg = clipLine(f.line, W)
                return (
                  <g key={i}>
                    {seg && <line className="dg-line is-old" x1={seg[0][0]} y1={seg[0][1]} x2={seg[1][0]} y2={seg[1][1]} />}
                    <circle className="dg-mark is-found" cx={f.x + 0.5} cy={f.y + 0.5} r={0.7} />
                    <text className="dg-mark-label" x={f.x + 1.4} y={f.y + 0.2}>{i + 1}</text>
                  </g>
                )
              })}
              {search && result.mode === 'line' && line && (() => {
                const seg = clipLine(line, W)
                return seg && <line className="dg-line" x1={seg[0][0]} y1={seg[0][1]} x2={seg[1][0]} y2={seg[1][1]} />
              })()}
              {search && result.mode === 'row' && <line className="dg-line" x1={0} y1={point.v + 0.5} x2={W} y2={point.v + 0.5} />}
              {search && result.mode !== 'all' && search.list.filter(([x, y]) => m.inside(x, y)).map(([x, y], i) => <circle key={i} className="dg-cand" cx={x + 0.5} cy={y + 0.5} r={0.22} />)}
              {search?.best && (
                <>
                  <rect className={`dg-window ${search.found ? 'is-good' : 'is-bad'}`} x={search.best.x - m.PATCH} y={search.best.y - m.PATCH} width={2 * m.PATCH + 1} height={2 * m.PATCH + 1} />
                  <circle className={`dg-mark ${search.found ? 'is-found' : 'is-wrong'}`} cx={search.best.x + 0.5} cy={search.best.y + 0.5} r={0.6} />
                </>
              )}
            </svg>
          </div>
          <figcaption>右图 · 另一台相机，没有对齐</figcaption>
        </figure>
      </div>

      <section className="dg-panel">
        <div className="dg-math">
          <div>
            <span className="dg-label">F（已给出）</span>
            <table className="dg-matrix">
              <tbody>
                {m.F.map((row, i) => <tr key={i}>{row.map((v, j) => <td key={j}>{fmt(v)}</td>)}</tr>)}
              </tbody>
            </table>
          </div>
          <div>
            <span className="dg-label">F·p = (a, b, c)</span>
            <p className="dg-vector">{line ? `(${line.map(fmt).join(', ')})` : '先在左图点一个点'}</p>
          </div>
        </div>

        <div className="dg-budget" aria-label="比较预算">
          <span className="dg-label">这个点的预算</span>
          <div className="dg-bar"><i style={{ width: `${(100 * (m.BUDGET - spent)) / m.BUDGET}%` }} /></div>
          <span className="dg-num">{m.BUDGET - spent} / {m.BUDGET} 次</span>
        </div>

        <div className="dg-modes">
          {modes.map(([mode, label]) => (
            <button key={mode} className="dg-button" disabled={!point} onClick={() => run(mode)}>
              <span>{label}</span>
              <small>{costs ? `${costs[mode]} 次` : '—'}</small>
            </button>
          ))}
        </div>

        <div className="dg-result" aria-live="polite">
          {note && <p className="dg-message">{note}</p>}
          {result && <p className={`dg-message ${search?.found ? 'is-good' : 'is-bad'}`}>{result.message}{result.mode === 'point' && search ? ` (${search.list[0].map((v) => v.toFixed(1)).join(', ')})` : ''}</p>}
          {windows && (
            <div className="dg-windows">
              <figure><ImageView img={windows.left} size={60} range={{ lo: 0, hi: 1 }} theme={theme} /><figcaption>左图窗口</figcaption></figure>
              <figure><ImageView img={windows.right} size={60} range={{ lo: 0, hi: 1 }} theme={theme} /><figcaption>右图最像处</figcaption></figure>
              {profile && profile.length > 1 && (
                <figure className="dg-profile">
                  <svg viewBox="0 0 100 40" preserveAspectRatio="none" role="img" aria-label="沿搜索路径的差异">
                    <polyline points={profile.map((d, i) => `${(i / (profile.length - 1)) * 100},${38 - (d / Math.max(...profile)) * 36}`).join(' ')} />
                  </svg>
                  <figcaption>沿路径的差异</figcaption>
                </figure>
              )}
            </div>
          )}
        </div>

        <div className="dg-footer">
          <span className="dg-num">已找到 {found.length} / {GOAL}</span>
          <button className="dg-link" onClick={reset}>重来</button>
        </div>
      </section>
    </div>
  )
}
