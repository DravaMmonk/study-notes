import { useState } from 'react'
import { Check } from 'lucide-react'
import { PHONE, useMedia } from '../useMedia.js'
import { Bars, Plot } from './WaveKit.jsx'
import './waves.css'

const MODES = [
  ['free', '手动'],
  ['hard', '一刀切'],
  ['gauss', '高斯'],
]
const RANGES = { hard: { min: 0, max: 16, step: 1 }, gauss: { min: 0.5, max: 8, step: 0.1 } }

// 2-5 调音台: one gain per frequency on a noisy row of pixels. The panel shows the row, the
// amplitudes before and after, and the spatial kernel the gain curve amounts to.
export default function Equalizer({ level, onSolve }) {
  const q = level.eq
  const phone = useMedia(PHONE)
  const [mode, setMode] = useState('free')
  const [R, setR] = useState({ hard: 8, gauss: 6 })
  const [gains, setGains] = useState(() => Array(q.bins).fill(1))
  const [done, setDone] = useState(false)

  const apply = (next) => {
    setGains(next)
    if (!done && q.error(next) <= q.tolerance) {
      setDone(true)
      onSolve()
    }
  }
  const choose = (next) => {
    setMode(next)
    if (next !== 'free') apply(q.presets[next](R[next]))
  }
  const setRadius = (value) => {
    setR({ ...R, [mode]: value })
    apply(q.presets[mode](value))
  }
  const drag = (index, value) => {
    setMode('free')
    apply(gains.map((g, i) => (i === index ? value : g)))
  }

  const output = q.apply(q.input, gains)
  const error = q.error(gains)
  const pass = error <= q.tolerance
  const before = q.amplitudes(q.input)
  const after = q.amplitudes(output)
  const kernel = q.kernelOf(gains, q.n)
  const width = phone ? 340 : 600
  const range = RANGES[mode]
  const labels = Array.from({ length: q.bins }, (_, k) => (k % 2 === 0 || !phone ? `${k}` : ''))

  const row = (
    <div>
      <span className="bk-label">一行像素</span>
      <Plot width={width} height={phone ? 160 : 220} lo={0} hi={1} label="输入、输出和目标" lines={[{ curve: q.input, kind: 'faint', steps: true, label: '输入' }, { curve: q.target, kind: 'target', steps: true }, { curve: output, kind: 'yours', steps: true, label: '输出' }]} />
      <div className="wv-legend"><span><i className="is-faint" />输入（有噪点）</span><span><i className="is-target" />目标</span><span><i />输出</span></div>
    </div>
  )
  const meter = (
    <div className={`wv-meter ${pass ? 'is-pass' : ''}`}>
      <div className="wv-meter-track" aria-hidden="true">
        <div className="wv-meter-fill" style={{ width: `${Math.min(100, (error / q.tolerance) * 40)}%` }} />
        <div className="wv-meter-mark" style={{ left: '40%' }} />
      </div>
      <span>误差 <b>{error.toFixed(4)}</b> / 需 ≤ {q.tolerance}</span>
    </div>
  )
  const kernelView = (
    <div>
      <span className="bk-label">等效的核：输出 = 输入 ⊛ 这个核</span>
      <Kernel taps={kernel} width={width} height={phone ? 120 : 130} />
      <p className="bk-caption">中间是自己，两边是左右邻居；红色是负的权重。</p>
    </div>
  )
  const controls = (
    <>
      <div>
        <span className="bk-label">增益曲线</span>
        <div className="bk-seg" role="radiogroup" aria-label="增益形状">
          {MODES.map(([key, text]) => (
            <button key={key} role="radio" aria-checked={mode === key} aria-pressed={mode === key} onClick={() => choose(key)}>{text}</button>
          ))}
        </div>
      </div>
      {mode !== 'free' && (
        <label className="bk-field">
          <span>宽度 R</span>
          <input className="bk-range" type="range" min={range.min} max={range.max} step={range.step} value={R[mode]} style={{ '--fill': `${((R[mode] - range.min) / (range.max - range.min)) * 100}%` }} onChange={(event) => setRadius(Number(event.target.value))} />
          <output>{mode === 'hard' ? R[mode] : R[mode].toFixed(1)}</output>
        </label>
      )}
      {mode === 'gauss' && <p className="bk-caption">同一个效果的空间高斯模糊：σ = N/(2πR) ≈ {q.sigmaOf(R.gauss).toFixed(2)} px</p>}
      <Bars values={gains} onChange={drag} min={0} max={1} step={0.02} labels={labels} width={phone ? 340 : 380} height={phone ? 170 : 200} label="每个频率的增益" valueText={(k, v) => `频率 ${k} 增益 ${v.toFixed(2)}`} />
      <p className="bk-caption">横轴：频率 k（0 是平均亮度）。拖动可以直接画增益。</p>
    </>
  )
  const amplitudesView = (
    <section className="bk-panel">
      <span className="bk-label">各频率的振幅 · 灰 = 输入，金 = 输出</span>
      <Bars values={after} shadows={before} readOnly min={0} max={0.5} labels={labels} width={phone ? 340 : 380} height={phone ? 130 : 140} label="输入和输出的振幅" />
      <p className={`bk-verdict ${pass ? 'is-pass' : ''}`} aria-live="polite">{pass ? <><Check size={15} />输出和目标重合了。</> : '噪点在哪些频率？压掉它们，同时别让边缘起波纹。'}</p>
    </section>
  )

  // On a phone the gain curve sits right under the row it filters, in one card.
  if (phone) {
    return (
      <div className="bk wv wv-eq">
        <section className="bk-stage bk-stack">{row}{meter}{controls}</section>
        <section className="bk-panel">{kernelView}</section>
        {amplitudesView}
      </div>
    )
  }
  return (
    <div className="bk wv wv-eq">
      <div className="bk-split">
        <section className="bk-stage bk-stack">{row}{meter}{kernelView}</section>
        <div className="bk-stack">
          <section className="bk-panel bk-stack">{controls}</section>
          {amplitudesView}
        </div>
      </div>
    </div>
  )
}

// The kernel as stems around the centre tap, ±8 neighbours. Pointing at a stem reads its weight.
function Kernel({ taps, width, height }) {
  const [hot, setHot] = useState(null)
  const n = taps.length
  const reach = 8
  const shown = Array.from({ length: 2 * reach + 1 }, (_, i) => taps[n / 2 - reach + i])
  const hi = Math.max(0.3, ...shown)
  const lo = Math.min(-0.12, ...shown)
  const left = 12
  const col = (width - 2 * left) / shown.length
  const y = (v) => 8 + ((hi - v) / (hi - lo)) * (height - 26)
  const pick = (event) => {
    const box = event.currentTarget.getBoundingClientRect()
    const px = ((event.clientX - box.left) / box.width) * width
    setHot(Math.min(shown.length - 1, Math.max(0, Math.floor((px - left) / col))))
  }
  const sx = hot === null ? 0 : left + col * (hot + 0.5)
  return (
    <div className="wv-plot-wrap">
      <svg className="wv-plot wv-stems" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="等效的空间核：指向一根读权重" onPointerMove={pick} onPointerDown={pick} onPointerLeave={(event) => event.pointerType === 'mouse' && setHot(null)}>
        <line className="wv-grid is-zero" x1={left} x2={width - left} y1={y(0)} y2={y(0)} />
        {shown.map((v, i) => {
          const x = left + col * (i + 0.5)
          const sign = v < -1e-4 ? 'is-neg' : 'is-pos'
          return (
            <g key={i}>
              <line className={sign} x1={x} x2={x} y1={y(0)} y2={y(v)} />
              <circle className={sign} cx={x} cy={y(v)} r={i === hot ? 4.6 : 3} />
              {(i - reach) % 4 === 0 && <text className="wv-tick" x={x + 4} y={height - 4}>{i - reach}</text>}
            </g>
          )
        })}
      </svg>
      {hot !== null && (
        <div className={`wv-tip ${hot > reach ? 'is-left' : ''}`} style={{ left: `${(sx / width) * 100}%` }}>
          <i>{hot === reach ? '自己' : `${hot < reach ? '左' : '右'}边第 ${Math.abs(hot - reach)} 个邻居`}</i>
          <span><em className={shown[hot] < -1e-4 ? 'is-error' : ''} />权重<b>{shown[hot].toFixed(3)}</b></span>
        </div>
      )}
    </div>
  )
}
