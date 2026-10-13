import { useState } from 'react'
import { formatNumber } from './views.js'

const signalRange = (...signals) => {
  const values = signals.filter(Boolean).flatMap((s) => [...s.data])
  let lo = Math.min(0, ...values)
  let hi = Math.max(1, ...values)
  if (lo < -0.02) {
    const m = Math.max(-lo, hi)
    ;[lo, hi] = [-m, m]
  }
  return { lo, hi }
}

// A row of samples as a curve with a dot per sample. With `expected`, the expected curve is drawn
// dashed inside its tolerance band, so a miss shows exactly where. Pointing at the curve (or tapping
// it) picks the nearest sample and shows its value, and the expected value beside it.
export default function CurveView({ img, expected, tolerance, width = 112, height = 70, range, onHover }) {
  const [at, setAt] = useState(null)
  const { lo, hi } = range && !expected ? range : signalRange(img, expected)
  const n = (img ?? expected).w
  const pad = 4
  const x = (j) => pad + ((j + 0.5) / n) * (width - 2 * pad)
  const y = (v) => pad + (1 - (Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo || 1)) * (height - 2 * pad)
  const line = (s) => Array.from(s.data, (v, j) => `${j ? 'L' : 'M'}${x(j).toFixed(1)},${y(v).toFixed(1)}`).join('')
  const band = expected && tolerance
    ? `${Array.from(expected.data, (v, j) => `${j ? 'L' : 'M'}${x(j).toFixed(1)},${y(v + tolerance).toFixed(1)}`).join('')}${Array.from(expected.data, (v, j) => `L${x(n - 1 - j).toFixed(1)},${y(expected.data[n - 1 - j] - tolerance).toFixed(1)}`).join('')}Z`
    : null

  const pick = (event) => {
    const box = event.currentTarget.getBoundingClientRect()
    const u = (((event.clientX - box.left) / box.width) * width - pad) / (width - 2 * pad)
    const j = Math.min(n - 1, Math.max(0, Math.floor(u * n)))
    setAt(j)
    onHover?.({ x: j, y: 0, value: (img ?? expected).data[j], expected: img && expected ? expected.data[j] : undefined })
  }
  const leave = (event) => {
    if (event.pointerType !== 'mouse') return
    setAt(null)
    onHover?.(null)
  }
  const value = at === null ? null : img?.data[at]
  const want = at === null ? null : expected?.data[at]
  const shown = value ?? want
  return (
    <div className="curve-wrap" style={{ width }}>
      <svg className="curve-view" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="波形：指向一个点看它的数值" onPointerMove={pick} onPointerDown={pick} onPointerLeave={leave}>
        {lo < 0 && <line className="curve-zero" x1={pad} x2={width - pad} y1={y(0)} y2={y(0)} />}
        <line className="curve-floor" x1={pad} x2={width - pad} y1={height - pad} y2={height - pad} />
        {band && <path className="curve-band" d={band} />}
        {expected && <path className="curve-expected" d={line(expected)} />}
        {img && <path className="curve-line" d={line(img)} />}
        {img && n <= 40 && Array.from(img.data, (v, j) => <circle key={j} className="curve-dot" cx={x(j)} cy={y(v)} r={Math.min(2.2, width / n / 3)} />)}
        {at !== null && (
          <g className="curve-pick">
            <line x1={x(at)} x2={x(at)} y1={pad} y2={height - pad} />
            {want !== null && want !== undefined && <circle className="is-expected" cx={x(at)} cy={y(want)} r={3.2} />}
            {value !== null && value !== undefined && <circle cx={x(at)} cy={y(value)} r={3.6} />}
          </g>
        )}
      </svg>
      {at !== null && shown !== undefined && (
        <span className={`curve-tip ${x(at) > width / 2 ? 'is-left' : ''}`} style={{ left: `${(x(at) / width) * 100}%`, top: `${(y(shown) / height) * 100}%` }}>
          <i>x = {at}</i>
          {value !== null && value !== undefined && <b>{formatNumber(value)}</b>}
          {img && want !== null && want !== undefined && <small>期望 {formatNumber(want)}</small>}
        </span>
      )}
    </div>
  )
}
