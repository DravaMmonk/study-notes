import { useMemo, useState } from 'react'
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

  const complete = Object.keys(pairs).length === level.spectra.length
  const check = () => {
    const right = level.spectra.filter((s, index) => pairs[index] === s.answer).length
    setVerdict(right)
    if (right === level.spectra.length) onSolve()
  }
  const spectrumOf = (key) => Object.entries(pairs).find(([, k]) => k === key)?.[0]

  return (
    <div className="spec-board">
      <div className="spec-main">
        <section>
          <h3 className="panel-label">图</h3>
          <div className="spec-row">
            {level.pictures.map(({ key, img }) => {
              const paired = spectrumOf(key)
              return (
                <button key={key} className={`spec-card ${selected?.picture === key ? 'is-selected' : ''}`} onClick={() => choosePicture(key)} aria-pressed={selected?.picture === key} aria-label={`图 ${key}${paired !== undefined ? `，已配频谱 ${Number(paired) + 1}` : ''}`}>
                  <ImageView img={img} range={FULL} size={104} theme={theme} />
                  <span className="spec-tag"><b>{key}</b>{paired !== undefined ? <i>→ {Number(paired) + 1}</i> : null}</span>
                </button>
              )
            })}
          </div>
        </section>

        <section>
          <h3 className="panel-label">频谱</h3>
          <div className="spec-row">
            {level.spectra.map(({ img }, index) => (
              <button key={index} className={`spec-card is-spectrum ${selected?.spectrum === index ? 'is-selected' : ''} ${pairs[index] ? 'is-paired' : ''}`} onClick={() => chooseSpectrum(index)} aria-pressed={selected?.spectrum === index} aria-label={`频谱 ${index + 1}${pairs[index] ? `，已配图 ${pairs[index]}` : ''}`}>
                <ImageView img={img} range={FULL} size={104} theme={theme} />
                <span className="spec-tag"><b>{index + 1}</b><i className="spec-slot">{pairs[index] ?? '?'}</i></span>
              </button>
            ))}
          </div>
        </section>

        <div className="spec-actions">
          <button className="spec-check" disabled={!complete} onClick={check}>核对</button>
          <p className="spec-verdict" aria-live="polite">
            {verdict === null ? (complete ? '' : '先点一张图，再点它的频谱（或者反过来）。') : verdict === level.spectra.length ? '全部配对正确。' : `对了 ${verdict} / ${level.spectra.length} 对。`}
          </p>
        </div>
      </div>

      <aside className="spec-lab" aria-label="试验台">
        <h3 className="panel-label">试验台</h3>
        <div className="spec-lab-images">
          <figure>
            <ImageView img={lab.img} range={FULL} size={110} theme={theme} />
            <figcaption>条纹</figcaption>
          </figure>
          <figure>
            <ImageView img={lab.spectrum} range={FULL} size={110} theme={theme} />
            <figcaption>它的频谱</figcaption>
          </figure>
        </div>
        <label className="spec-slider">
          <span>周期 <output>{Math.abs(lab.period - Math.round(lab.period)) < 1e-6 ? Math.round(lab.period) : `≈ ${lab.period.toFixed(1)}`} 像素</output></span>
          <input type="range" min="0" max={level.labPeriods.length - 1} step="1" value={periodIndex} onChange={(e) => setPeriodIndex(Number(e.target.value))} />
        </label>
        <label className="spec-slider">
          <span>转角 <output>{lab.angle}°</output></span>
          <input type="range" min="0" max="165" step="15" value={angle} onChange={(e) => setAngle(Number(e.target.value))} />
        </label>
      </aside>
    </div>
  )
}
