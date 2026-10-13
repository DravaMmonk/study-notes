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
export default function CurveView({ img, expected, tolerance, width = 112, height = 70, range }) {
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

