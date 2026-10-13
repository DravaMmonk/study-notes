import { useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { PHONE, useMedia } from '../useMedia.js'
import { Bars, Stages } from './WaveKit.jsx'
import './waves.css'
import './light.css'

// The hue each 30 nm band looks like on its own, for the chips under the faders.
const HUES = { 415: [270, 55], 445: [235, 60], 475: [200, 60], 505: [165, 50], 535: [120, 45], 565: [70, 55], 595: [35, 60], 625: [15, 60], 655: [2, 55], 685: [355, 40] }
const CHANNEL_NAMES = { R: '红', G: '绿', B: '蓝' }

// A reading as a colour on screen. Readings of narrow spectra are dim, so every swatch is scaled by
// the same rule: the brightest channel sets the lightness, the three together the hue.
const swatch = (r) => {
  const top = Math.max(r.R, r.G, r.B)
  if (top <= 1e-6) return 'rgb(0,0,0)'
  const scale = Math.min(1, top * 2.2) / top
  return `rgb(${['R', 'G', 'B'].map((c) => Math.round(255 * Math.min(1, r[c] * scale))).join(',')})`
}

// 3-2 颜色是三个数: faders for ten bands of the spectrum, the camera's three sensitivity curves, and
// the three numbers the camera keeps, against a target colour.
export default function ColorMatch({ level, onSolve }) {
  const m = level.colour
  const phone = useMedia(PHONE)
  const blank = m.bands.map(() => 0)
  const [spectra, setSpectra] = useState(() => m.stages.map(() => blank))
  const [lamp, setLamp] = useState('day')
  const [stage, setStage] = useState(0)
  const [passed, setPassed] = useState(() => m.stages.map(() => false))
  const [reached, setReached] = useState(0)
  const s = m.stages[stage]
  // The last stage looks at the spectrum built in the one before it.
  const mine = s.goal === 'split' ? spectra[1] : spectra[stage]
  const match = m.passes(s, mine, lamp)

  const mark = (ok) => {
    if (!ok || passed[stage]) return
    const now = passed.map((done, i) => done || i === stage)
    setPassed(now)
    if (now.every(Boolean)) onSolve()
  }
  const move = (index, value) => {
    const next = spectra.map((row, i) => (i === stage ? row.map((v, b) => (b === index ? value : v)) : row))
    setSpectra(next)
    mark(m.passes(s, next[stage], lamp))
  }
  const pickLamp = (key) => {
    setLamp(key)
    mark(m.passes(s, mine, key))
  }
  const advance = () => {
    setStage(stage + 1)
    setReached(Math.max(reached, stage + 1))
  }

  const light = m.lamps.find((l) => l.key === lamp).spectrum
  const target = m.reading(s.target, s.goal === 'split' ? light : null)
  const yours = m.reading(mine, s.goal === 'split' ? light : null)
  const width = phone ? 340 : 520
  const labels = m.bands.map((nm, i) => (phone && i % 2 ? '' : String(nm)))

  return (
    <div className="bk wv cm">
      <div className="bk-split">
        <section className="bk-stage bk-stack">
          <div className="cm-swatches">
            <Swatch title={s.goal === 'split' ? '纯黄光那块布' : '目标'} reading={target} />
            <Swatch title={s.goal === 'split' ? '你调的那块布' : '你调的光'} reading={yours} compare={target} tolerance={s.goal === 'split' ? null : m.tolerance} />
          </div>
          {s.goal !== 'split' ? (
            <div>
              <span className="bk-label">光谱：每种波长的光有多少（nm）</span>
              <Bars
                values={mine}
                onChange={move}
                min={0}
                max={1}
                step={0.05}
                labels={labels}
                ghosts={s.locked ? s.target : null}
                locked={s.locked ?? []}
                width={width}
                height={phone ? 200 : 220}
                label="光谱推杆"
                valueText={(b, v) => `${m.bands[b]} nm ${v.toFixed(2)}`}
                under={({ x, y, w, h, index }) => <rect className="cm-chip" x={x + 2} y={y + 2} width={w - 4} height={Math.max(6, h - 4)} rx={3} fill={`hsl(${HUES[m.bands[index]][0]} ${HUES[m.bands[index]][1]}% 52%)`} />}
              />
            </div>
          ) : (
            <div className="cm-lamps">
              <span className="bk-label">用哪盏灯照</span>
              <div className="bk-seg" role="radiogroup" aria-label="灯">
                {m.lamps.map((l) => (
                  <button key={l.key} role="radio" aria-checked={lamp === l.key} aria-pressed={lamp === l.key} onClick={() => pickLamp(l.key)}>{l.label}</button>
                ))}
              </div>
              <Bars values={light} readOnly min={0} max={1} labels={labels} width={width} height={phone ? 110 : 120} label="灯的光谱" under={({ x, y, w, h, index }) => <rect className="cm-chip" x={x + 2} y={y + 2} width={w - 4} height={Math.max(6, h - 4)} rx={3} fill={`hsl(${HUES[m.bands[index]][0]} ${HUES[m.bands[index]][1]}% 52%)`} />} />
              <p className="bk-caption">灯的光谱：每种波长有多少。布反射回来的光 = 灯的光 × 布的颜色。</p>
            </div>
          )}
          <div>
            <span className="bk-label">相机的三种感光元件各自对哪些波长敏感</span>
            <Sensitivity m={m} width={width} height={phone ? 70 : 80} />
          </div>
        </section>
        <div className="bk-stack">
          <section className="bk-panel bk-stack">
            <div>
              <span className="bk-label">第 {stage + 1} 步 · {s.title}</span>
              <p className="wv-stage-note">{s.note}</p>
            </div>
            <div className="wv-next">
              <p className={`bk-verdict ${match ? 'is-pass' : ''}`} aria-live="polite">{match ? <><Check size={15} />{s.goal === 'split' ? '这盏灯下，两块布不一样了。' : '相机分不出来了。'}</> : s.goal === 'split' ? '这盏灯下它们还一样。' : '三个读数还没全对上。'}</p>
              {passed[stage] && stage < m.stages.length - 1 && <button className="bk-btn is-primary" onClick={advance}>下一步 <ArrowRight size={15} /></button>}
            </div>
          </section>
          <Stages stages={m.stages} current={stage} passed={passed} reached={reached} onPick={setStage} />
        </div>
      </div>
    </div>
  )
}

function Swatch({ title, reading, compare, tolerance }) {
  return (
    <figure className="cm-swatch">
      <span className="cm-patch" style={{ background: swatch(reading) }} aria-hidden="true" />
      <figcaption>
        <span className="bk-label">{title}</span>
        {['R', 'G', 'B'].map((c) => {
          const ok = compare && tolerance ? Math.abs(reading[c] - compare[c]) <= tolerance : null
          return (
            <span key={c} className={`cm-read is-${c} ${ok === false ? 'is-off' : ''}`}>
              <i>{CHANNEL_NAMES[c]} {c}</i>
              <span className="cm-meter"><b style={{ width: `${Math.min(100, reading[c] * 100)}%` }} /></span>
              <em>{reading[c].toFixed(3)}</em>
            </span>
          )
        })}
      </figcaption>
    </figure>
  )
}

// The three sensitivity curves over the same columns as the faders.
function Sensitivity({ m, width, height }) {
  const n = m.bands.length
  const col = width / n
  const x = (nm) => ((nm - (m.bands[0] - 15)) / (n * 30)) * width
  const y = (v) => height - 6 - v * (height - 12)
  const path = (c) => Array.from({ length: 61 }, (_, i) => {
    const nm = m.bands[0] - 15 + (i / 60) * n * 30
    return `${i ? 'L' : 'M'}${x(nm).toFixed(1)},${y(m.sensitivity(c, nm)).toFixed(1)}`
  }).join('')
  return (
    <svg className="cm-sens" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="红、绿、蓝三种感光元件的灵敏度曲线">
      {m.bands.map((nm, i) => <line key={nm} className="wv-grid" x1={(i + 0.5) * col} x2={(i + 0.5) * col} y1={4} y2={height - 6} />)}
      {m.channels.map((c) => <path key={c} className={`cm-curve is-${c}`} d={path(c)} />)}
    </svg>
  )
}
