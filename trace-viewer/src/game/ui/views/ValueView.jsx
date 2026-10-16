import ImageView from '../ImageView.jsx'
import CurveView from './CurveView.jsx'
import ProfileView from './ProfileView.jsx'
import SlopeView from './SlopeView.jsx'
import SpectrumView from './SpectrumView.jsx'
import TerrainView from './TerrainView.jsx'
import { tr } from '../../i18n.js'
import { formatNumber, kindOf } from './views.js'
import './views.css'

// Draw any value: a number as a readout, a row as a waveform, a 2-D grid in the chosen view.
// Views fade in when they change, so a switch reads as the same value drawn another way.
export default function ValueView(props) {
  const { img, view = 'pixels' } = props
  const kind = kindOf(img)
  return (
    <div className="value-view" key={kind === 'image' ? view : kind}>
      <Drawing {...props} />
    </div>
  )
}

function Drawing({ img, view = 'pixels', size = 112, range, theme, onHover, label, grid, scan, onScan, compact }) {
  const kind = kindOf(img)
  if (!kind) return <div className="image-empty" style={{ width: size, height: size * 0.62 }}>{label ?? '—'}</div>
  if (kind === 'number') return <NumberView value={img.data[0]} size={size} />
  if (kind === 'signal') return <CurveView img={img} width={size} height={Math.round(size * 0.62)} range={range} />
  if (view === 'terrain') return <TerrainView img={img} range={range} size={size} theme={theme} />
  if (view === 'slope') return <SlopeView img={img} range={range} size={size} theme={theme} onHover={onHover} />
  if (view === 'profile') return <ProfileView img={img} range={range} size={size} theme={theme} onHover={onHover} scan={scan} onScan={onScan} compact={compact} />
  if (view === 'spectrum') return <SpectrumView img={img} size={size} theme={theme} onHover={onHover} />
  return <ImageView img={img} range={range} size={size} theme={theme} onHover={onHover} label={label} grid={grid} />
}

export function NumberView({ value, size = 112 }) {
  return (
    <div className="number-view" style={{ width: size }}>
      <b>{formatNumber(value)}</b>
    </div>
  )
}

// A number output against its expected value: a scale with the allowed band and both marks.
export function NumberCompare({ actual, expected, tolerance, pass }) {
  const values = [expected, actual].filter(Number.isFinite)
  const lo = Math.min(0, ...values.map((v) => v - 0.2))
  const hi = Math.max(1, ...values.map((v) => v + 0.2))
  const at = (v) => `${((v - lo) / (hi - lo)) * 100}%`
  return (
    <div className={`number-compare ${pass === null ? '' : pass ? 'is-pass' : 'is-fail'}`}>
      <div className="number-pair">
        <div><span>{tr('期望', 'Expected')}</span><b>{formatNumber(expected)}</b></div>
        <div><span>{tr('你的输出', 'Your output')}</span><b>{Number.isFinite(actual) ? formatNumber(actual) : '—'}</b></div>
        <div><span>{tr('相差', 'Difference')}</span><b>{Number.isFinite(actual) ? formatNumber(Math.abs(actual - expected)) : '—'}</b></div>
      </div>
      <div className="number-scale" aria-hidden="true">
        <i className="number-band" style={{ left: at(expected - tolerance), width: `calc(${at(expected + tolerance)} - ${at(expected - tolerance)})` }} />
        <i className="number-mark is-expected" style={{ left: at(expected) }} />
        {Number.isFinite(actual) && <i className="number-mark is-actual" style={{ left: at(Math.min(hi, Math.max(lo, actual))) }} />}
      </div>
      <p className="number-legend">{tr('允许误差', 'Tolerance')} ± {tolerance}</p>
    </div>
  )
}
