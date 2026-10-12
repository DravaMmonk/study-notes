import { useMemo, useState } from 'react'
import { Check, X } from 'lucide-react'
import ImageView from '../ImageView.jsx'
import './SpectrumMatch.css'

const FULL = { lo: 0, hi: 1 }

// 2-2 看频谱: pair six pictures with their six magnitude spectra. A small bench on the side lets the
// player turn and squeeze a grating and watch its spectrum, so the rule is found by experiment.
export default function SpectrumMatch({ level, onSolve, theme }) {
  const [selected, setSelected] = useState(null) // { picture: key } or { spectrum: index }
  const [pairs, setPairs] = useState({}) // spectrum index → picture key
  const [verdict, setVerdict] = useState(null)
  const [periodIndex, setPeriodIndex] = useState(3)
  const [angle, setAngle] = useState(0)
  const period = level.labPeriods[periodIndex]
  const lab = useMemo(() => level.lab(period, angle), [level, period, angle])

  const pair = (spectrum, key) => {
    setPairs((current) => {
      const next = Object.fromEntries(Object.entries(current).filter(([s, k]) => k !== key && Number(s) !== spectrum))
      return { ...next, [spectrum]: key }
    })
    setSelected(null)
    setVerdict(null)
  }

  const choosePicture = (key) => {
    if (selected?.spectrum !== undefined) pair(selected.spectrum, key)
    else setSelected(selected?.picture === key ? null : { picture: key })
  }

  const chooseSpectrum = (index) => {
    if (selected?.picture) pair(index, selected.picture)
    else if (pairs[index] && selected?.spectrum === index) {
      setPairs((current) => Object.fromEntries(Object.entries(current).filter(([s]) => Number(s) !== index)))
      setSelected(null)
      setVerdict(null)
    } else setSelected(selected?.spectrum === index ? null : { spectrum: index })
  }

  const total = level.spectra.length
  const count = Object.keys(pairs).length
  const complete = count === total
  const check = () => {
    const right = level.spectra.filter((s, index) => pairs[index] === s.answer).length
    setVerdict(right)
    if (right === total) onSolve()
  }
  const spectrumOf = (key) => Object.entries(pairs).find(([, k]) => k === key)?.[0]
  const periodText = Math.abs(lab.period - Math.round(lab.period)) < 1e-6 ? `${Math.round(lab.period)}` : `≈ ${lab.period.toFixed(1)}`
  const allRight = verdict === total
  const message = verdict === null
    ? selected ? (selected.picture ? `再点图 ${selected.picture} 的频谱。` : `再点频谱 ${selected.spectrum + 1} 对应的图。`) : complete ? '六对都配上了，核对一下。' : '先点一张图，再点它的频谱（或者反过来）。'
    : allRight ? '全部配对正确。' : `对了 ${verdict} / ${total} 对，换一换再核对。`

  return (
    <div className="bk spec">
      <div className="bk-split spec-split">
        <section className="bk-stage spec-stage">
          <span className="bk-label">图</span>
          <div className="spec-row">
            {level.pictures.map(({ key, img }) => {
              const paired = spectrumOf(key)
              const on = selected?.picture === key
              return (
                <button key={key} className={`spec-card ${on ? 'is-selected' : ''} ${paired !== undefined ? 'is-paired' : ''}`} onClick={() => choosePicture(key)} aria-pressed={on} aria-label={`图 ${key}${paired !== undefined ? `，已配频谱 ${Number(paired) + 1}` : ''}`}>
                  <ImageView img={img} range={FULL} size={104} theme={theme} />
                  <span className="spec-tag"><b>{key}</b><i className="spec-slot">{paired !== undefined ? `→ ${Number(paired) + 1}` : ''}</i></span>
                </button>
              )
            })}
          </div>

          <span className="bk-label spec-label-gap">频谱</span>
          <div className="spec-row">
            {level.spectra.map(({ img }, index) => {
              const on = selected?.spectrum === index
              return (
                <button key={index} className={`spec-card ${on ? 'is-selected' : ''} ${pairs[index] ? 'is-paired' : ''}`} onClick={() => chooseSpectrum(index)} aria-pressed={on} aria-label={`频谱 ${index + 1}${pairs[index] ? `，已配图 ${pairs[index]}` : ''}`}>
                  <ImageView img={img} range={FULL} size={104} theme={theme} />
                  <span className="spec-tag"><b>{index + 1}</b><i className="spec-slot">{pairs[index] ?? '?'}</i></span>
                </button>
              )
            })}
          </div>

          <div className="spec-actions">
            <span className="bk-chip spec-count">已配 {count} / {total}</span>
            <p className={`bk-verdict ${verdict === null ? '' : allRight ? 'is-pass' : 'is-fail'}`} aria-live="polite">
              {verdict !== null && (allRight ? <Check size={15} /> : <X size={15} />)}
              {message}
            </p>
            <button className="bk-btn is-primary spec-check" disabled={!complete} onClick={check}>核对</button>
          </div>
        </section>

        <aside className="bk-panel spec-lab" aria-label="试验台">
          <span className="bk-label">试验台</span>
          <div className="spec-lab-images">
            <figure>
              <ImageView img={lab.img} range={FULL} size={110} theme={theme} />
              <figcaption className="bk-caption">条纹</figcaption>
            </figure>
            <figure>
              <ImageView img={lab.spectrum} range={FULL} size={110} theme={theme} />
              <figcaption className="bk-caption">它的频谱</figcaption>
            </figure>
          </div>
          <div className="bk-stack spec-lab-controls">
            <label className="bk-field">
              <span>周期</span>
              <input className="bk-range" type="range" min="0" max={level.labPeriods.length - 1} step="1" value={periodIndex} style={{ '--fill': `${(periodIndex / (level.labPeriods.length - 1)) * 100}%` }} aria-valuetext={`${periodText} 像素`} onChange={(e) => setPeriodIndex(Number(e.target.value))} />
              <output>{periodText} px</output>
            </label>
            <label className="bk-field">
              <span>转角</span>
              <input className="bk-range" type="range" min="0" max="165" step="15" value={angle} style={{ '--fill': `${(angle / 165) * 100}%` }} aria-valuetext={`${lab.angle}°`} onChange={(e) => setAngle(Number(e.target.value))} />
              <output>{lab.angle}°</output>
            </label>
            <p className="bk-note">转一转、调一调：亮点怎样跟着动？</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
