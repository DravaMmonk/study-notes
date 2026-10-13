import ImageView from '../ImageView.jsx'
import SlopeView from './SlopeView.jsx'
import TerrainView from './TerrainView.jsx'
import { formatNumber, kindOf } from './views.js'
import './views.css'

// Draw any value: a number as a readout, a row as a waveform, a 2-D grid in the chosen view.
export default function ValueView({ img, view = 'pixels', size = 112, range, theme, onHover, label, grid }) {
  const kind = kindOf(img)
  if (!kind) return <div className="image-empty" style={{ width: size, height: size * 0.62 }}>{label ?? '—'}</div>
  if (kind === 'number') return <NumberView value={img.data[0]} size={size} />
  if (kind === 'signal') return <CurveView img={img} width={size} height={Math.round(size * 0.62)} range={range} />
  if (view === 'terrain') return <TerrainView img={img} range={range} size={size} theme={theme} />
  if (view === 'slope') return <SlopeView img={img} range={range} size={size} theme={theme} onHover={onHover} />
  return <ImageView img={img} range={range} size={size} theme={theme} onHover={onHover} label={label} grid={grid} />
}

export function NumberView({ value, size = 112 }) {
  return (
    <div className="number-view" style={{ width: size }}>
      <b>{formatNumber(value)}</b>
    </div>
  )
}

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
// dashed inside its tolerance band, so a miss shows exactly where.
export function CurveView({ img, expected, tolerance, width = 112, height = 70, range }) {
  const { lo, hi } = range && !expected ? range : signalRange(img, expected)
  const n = (img ?? expected).w
  const pad = 4
  const x = (j) => pad + ((j + 0.5) / n) * (width - 2 * pad)
  const y = (v) => pad + (1 - (Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo || 1)) * (height - 2 * pad)
  const line = (s) => Array.from(s.data, (v, j) => `${j ? 'L' : 'M'}${x(j).toFixed(1)},${y(v).toFixed(1)}`).join('')
  const band = expected && tolerance
    ? `${Array.from(expected.data, (v, j) => `${j ? 'L' : 'M'}${x(j).toFixed(1)},${y(v + tolerance).toFixed(1)}`).join('')}${Array.from(expected.data, (v, j) => `L${x(n - 1 - j).toFixed(1)},${y(expected.data[n - 1 - j] - tolerance).toFixed(1)}`).join('')}Z`
    : null
  return (
    <svg className="curve-view" viewBox={`0 0 ${width} ${height}`} style={{ width, height }} role="img" aria-label="波形">
      {lo < 0 && <line className="curve-zero" x1={pad} x2={width - pad} y1={y(0)} y2={y(0)} />}
      <line className="curve-floor" x1={pad} x2={width - pad} y1={height - pad} y2={height - pad} />
      {band && <path className="curve-band" d={band} />}
      {expected && <path className="curve-expected" d={line(expected)} />}
      {img && <path className="curve-line" d={line(img)} />}
      {img && n <= 40 && Array.from(img.data, (v, j) => <circle key={j} className="curve-dot" cx={x(j)} cy={y(v)} r={Math.min(2.2, width / n / 3)} />)}
    </svg>
  )
}

// A number output against its expected value: a scale with the allowed band and both marks.
export function NumberCompare({ actual, expected, tolerance, pass }) {
  const values = [expected, actual].filter(Number.isFinite)
  const lo = Math.min(0, ...values.map((v) => v - 0.2))
  const hi = Math.max(1, ...values.map((v) => v + 0.2))
  const at = (v) => `${((v - lo) / (hi - lo)) * 100}%`
  return (
    <div className={`number-compare ${pass ? 'is-pass' : 'is-fail'}`}>
      <div className="number-pair">
        <div><span>期望</span><b>{formatNumber(expected)}</b></div>
        <div><span>你的输出</span><b>{Number.isFinite(actual) ? formatNumber(actual) : '—'}</b></div>
        <div><span>相差</span><b>{Number.isFinite(actual) ? formatNumber(Math.abs(actual - expected)) : '—'}</b></div>
      </div>
      <div className="number-scale" aria-hidden="true">
        <i className="number-band" style={{ left: at(expected - tolerance), width: `calc(${at(expected + tolerance)} - ${at(expected - tolerance)})` }} />
        <i className="number-mark is-expected" style={{ left: at(expected) }} />
        {Number.isFinite(actual) && <i className="number-mark is-actual" style={{ left: at(Math.min(hi, Math.max(lo, actual))) }} />}
      </div>
      <p className="number-legend">允许误差 ± {tolerance}</p>
    </div>
  )
}
