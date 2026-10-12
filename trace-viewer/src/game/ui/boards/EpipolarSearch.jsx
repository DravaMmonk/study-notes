import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, RotateCcw, X } from 'lucide-react'
import ImageView from '../ImageView.jsx'
import { PHONE, useMedia } from '../useMedia.js'
import './depthgen.css'

// 7-4 只在一条线上找: click a point in the left view, then spend a comparison budget searching the
// right view. The whole image does not fit the budget, the same row misses (the views are not
// rectified), and F·p read as a point is off; read as a line a·u′ + b·v′ + c = 0 it holds the match.

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

// A search path that draws itself in from one end (the dash trick; CSS animations beat inline styles).
function DrawnLine({ from, to }) {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1])
  return <line className="epi-line is-drawn" style={{ strokeDasharray: length, strokeDashoffset: length }} x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} />
}

const MODES = [
  ['all', '整张右图逐点比'],
  ['row', '只比同一行 v′ = v'],
  ['point', '比点 (a/c, b/c)'],
  ['line', '沿直线 a·u′ + b·v′ + c = 0'],
]

export default function EpipolarSearch({ level, onSolve, theme }) {
  const m = level.model
  const phone = useMedia(PHONE)
  const reduced = useMedia('(prefers-reduced-motion: reduce)')
  const { left, right } = useMemo(() => m.scene(), [m])
  const [point, setPoint] = useState(null) // { u, v, spent }
  const [result, setResult] = useState(null) // { id, mode, search, message }
  const [found, setFound] = useState([]) // [{ u, v, x, y, line }]
  const [note, setNote] = useState('')
  const solved = useRef(false)
  const rightView = useRef(null)

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
    const u = Math.min(m.W - 1, Math.max(0, Math.floor(((event.clientX - box.left) / box.width) * m.W)))
    const v = Math.min(m.W - 1, Math.max(0, Math.floor(((event.clientY - box.top) / box.height) * m.W)))
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
    const id = (result?.id ?? 0) + 1
    if (count > remaining) {
      setResult({ id, mode, message: `要比较 ${count} 次，预算只剩 ${remaining} 次。` })
      return
    }
    const search = m.search(point.u, point.v, mode)
    setPoint({ ...point, spent: point.spent + count })
    let message
    if (!search.best) message = '这个“点”在图外。'
    else if (search.found) message = '对上了。'
    else message = '最像的那一处不是同一点。'
    setResult({ id, mode, search, message })
    if (search.found) setFound((all) => [...all, { u: point.u, v: point.v, x: search.best.x, y: search.best.y, line: m.line(point.u, point.v) }])
    // On a phone the right view sits below the buttons: bring it up so the search is seen.
    if (phone) rightView.current?.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' })
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
  const remaining = m.BUDGET - spent
  const W = m.W
  const done = found.length >= GOAL

  const goals = (
    <section className="bk-panel epi-goals">
      <ul className="bk-goals">
        <li className={`bk-goal ${done ? 'is-pass' : ''}`}>
          {done ? <Check size={16} /> : <X size={16} />}
          <span>在右图找到同一点 <small>3 个</small></span>
          <span className="epi-pips" aria-label={`已找到 ${found.length} / ${GOAL}`}>
            {Array.from({ length: GOAL }, (_, i) => <i key={i} className={i < found.length ? 'is-on' : ''} />)}
          </span>
        </li>
      </ul>
      <div className="epi-budget">
        <span>这个点的预算</span>
        <div className="epi-meter"><i style={{ transform: `scaleX(${remaining / m.BUDGET})` }} /></div>
        <b>{remaining} / {m.BUDGET}</b>
      </div>
    </section>
  )

  const leftView = (
    <figure className="epi-view">
      <div className="epi-frame">
        <ImageView img={left} size={W * 10} range={{ lo: 0, hi: 1 }} theme={theme} />
        <svg className="epi-overlay is-clickable" viewBox={`0 0 ${W} ${W}`} onClick={pick} role="img" aria-label="左图：点一个点">
          {found.map((f, i) => (
            <g key={i}>
              <circle className="epi-mark is-found" cx={f.u + 0.5} cy={f.v + 0.5} r={0.7} />
              <text className="epi-mark-label" x={f.u + 1.5} y={f.v + 0.3}>{i + 1}</text>
            </g>
          ))}
          {point && (
            <g key={`${point.u},${point.v}`} className="epi-pick">
              <rect className="epi-window" x={point.u - m.PATCH} y={point.v - m.PATCH} width={2 * m.PATCH + 1} height={2 * m.PATCH + 1} />
              <circle className="epi-mark is-target" cx={point.u + 0.5} cy={point.v + 0.5} r={0.6} />
            </g>
          )}
        </svg>
      </div>
      <figcaption><span>左图 · 点一个点</span><b>{point ? `p = (${point.u}, ${point.v}, 1)` : '—'}</b></figcaption>
    </figure>
  )

  const lineSeg = search && result.mode === 'line' && line ? clipLine(line, W) : null
  const rightFigure = (
    <figure className="epi-view" ref={rightView}>
      <div className="epi-frame">
        <ImageView img={right} size={W * 10} range={{ lo: 0, hi: 1 }} theme={theme} />
        <svg className="epi-overlay" viewBox={`0 0 ${W} ${W}`} role="img" aria-label="右图：搜索的位置">
          {found.map((f, i) => {
            const seg = clipLine(f.line, W)
            return (
              <g key={i}>
                {seg && <line className="epi-line is-old" x1={seg[0][0]} y1={seg[0][1]} x2={seg[1][0]} y2={seg[1][1]} />}
                <circle className="epi-mark is-found" cx={f.x + 0.5} cy={f.y + 0.5} r={0.7} />
                <text className="epi-mark-label" x={f.x + 1.5} y={f.y + 0.3}>{i + 1}</text>
              </g>
            )
          })}
          {search && (
            <g key={result.id}>
              {lineSeg && <DrawnLine from={lineSeg[0]} to={lineSeg[1]} />}
              {result.mode === 'row' && <DrawnLine from={[0, point.v + 0.5]} to={[W, point.v + 0.5]} />}
              {result.mode !== 'all' && search.list.filter(([x, y]) => m.inside(x, y)).map(([x, y], i) => <circle key={i} className="epi-cand" style={{ animationDelay: `${120 + i * 8}ms` }} cx={x + 0.5} cy={y + 0.5} r={0.24} />)}
              {search.best && (
                <g className="epi-best">
                  <rect className={`epi-window ${search.found ? 'is-good' : 'is-bad'}`} x={search.best.x - m.PATCH} y={search.best.y - m.PATCH} width={2 * m.PATCH + 1} height={2 * m.PATCH + 1} />
                  <circle className={`epi-mark ${search.found ? 'is-found' : 'is-wrong'}`} cx={search.best.x + 0.5} cy={search.best.y + 0.5} r={0.6} />
                </g>
              )}
            </g>
          )}
        </svg>
      </div>
      <figcaption><span>右图 · 另一台相机，没有对齐</span><b>{search?.best ? `(${search.best.x.toFixed(1)}, ${search.best.y.toFixed(1)})` : '—'}</b></figcaption>
    </figure>
  )

  const modes = (
    <section className="bk-panel epi-modes">
      <div className="epi-fp">
        <span className="bk-label">F·p = (a, b, c)</span>
        <b>{line ? `(${line.map(fmt).join(', ')})` : '先在左图点一个点'}</b>
      </div>
      <div className="epi-mode-grid">
        {MODES.map(([mode, label]) => {
          const over = costs && costs[mode] > remaining
          return (
            <button key={mode} className={`bk-btn epi-mode ${result?.mode === mode ? 'is-current' : ''}`} disabled={!point} onClick={() => run(mode)}>
              <span>{label}</span>
              <small className={over ? 'is-over' : ''}>{costs ? `${costs[mode]} 次${over ? ' · 超预算' : ''}` : '—'}</small>
            </button>
          )
        })}
      </div>
    </section>
  )

  const best = profile && profile.length > 1 ? profile.indexOf(Math.min(...profile)) : -1
  const peak = profile ? Math.max(...profile) || 1 : 1
  const outcome = (
    <section className="bk-panel epi-result" aria-live="polite">
      <span className="bk-label">比较结果</span>
      {note && <p className="bk-verdict is-fail">{note}</p>}
      {result && <p className={`bk-verdict ${search?.found ? 'is-pass' : 'is-fail'}`}>{result.message}{result.mode === 'point' && search ? ` (${search.list[0].map((v) => v.toFixed(1)).join(', ')})` : ''}</p>}
      {!note && !result && <p className="bk-note epi-empty">{point ? '选一种找法，比较会花掉预算。' : '在左图点一个点，看它的 5×5 窗口在右图里像哪里。'}</p>}
      {windows && (
        <div className="epi-windows">
          <figure><ImageView img={windows.left} size={64} range={{ lo: 0, hi: 1 }} theme={theme} /><figcaption>左图窗口</figcaption></figure>
          <figure><ImageView img={windows.right} size={64} range={{ lo: 0, hi: 1 }} theme={theme} /><figcaption>右图最像处</figcaption></figure>
          {best >= 0 && (
            <figure className="epi-profile">
              <svg viewBox="0 0 100 40" preserveAspectRatio="none" role="img" aria-label="沿搜索路径的差异">
                <polyline points={profile.map((d, i) => `${(i / (profile.length - 1)) * 100},${38 - (d / peak) * 34}`).join(' ')} />
                <line x1={(best / (profile.length - 1)) * 100} x2={(best / (profile.length - 1)) * 100} y1={0} y2={40} />
              </svg>
              <figcaption>沿路径的差异 · 竖线是最小处</figcaption>
            </figure>
          )}
        </div>
      )}
    </section>
  )

  const math = (
    <section className="bk-panel epi-math">
      <span className="bk-label">F（已给出）</span>
      <table className="epi-matrix">
        <tbody>
          {m.F.map((row, i) => <tr key={i}>{row.map((v, j) => <td key={j}>{fmt(v)}</td>)}</tr>)}
        </tbody>
      </table>
      <button className="bk-btn epi-reset" onClick={reset}><RotateCcw size={14} /> 重来</button>
    </section>
  )

  if (phone) {
    return (
      <div className="bk epi">
        {goals}
        <section className="bk-stage">{leftView}</section>
        {modes}
        <section className="bk-stage">{rightFigure}</section>
        {outcome}
        {math}
      </div>
    )
  }

  return (
    <div className="bk epi">
      <div className="bk-split epi-split">
        <div className="bk-stack">
          <section className="bk-stage epi-pair">{leftView}{rightFigure}</section>
          {outcome}
        </div>
        <div className="bk-stack">
          {goals}
          {modes}
          {math}
        </div>
      </div>
    </div>
  )
}
