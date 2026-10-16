import { useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { L, tr } from '../../../../../games/kit/shell/i18n.js'
import { PHONE, useMedia } from '../../../../../games/kit/shell/useMedia.js'
import { useTween } from './optics-motion.js'
import { Stages } from './WaveKit.jsx'
import './waves.css'
import './light.css'

const format = (key, v) => (key === 'theta' ? `${v}°` : v.toFixed(2))

// 3-1 斜着照: tiles under a lamp, seen from the side. Each tile has the knobs its stage allows; the
// drawing shows why a slanted beam is dimmer (the same beam spreads over a longer stretch).
export default function LightTile({ level, onSolve }) {
  const m = level.tile
  const phone = useMedia(PHONE)
  const [settings, setSettings] = useState(() => m.stages.map((stage) => stage.tiles.map((t) => ({ ...t.start }))))
  const [stage, setStage] = useState(0)
  const [passed, setPassed] = useState(() => m.stages.map(() => false))
  const [reached, setReached] = useState(0)
  const s = m.stages[stage]
  const mine = settings[stage]
  const match = m.passes(s, mine)

  const turn = (tile, key, value) => {
    const next = settings.map((row, i) => (i === stage ? row.map((t, j) => (j === tile ? { ...t, [key]: value } : t)) : row))
    setSettings(next)
    if (m.passes(s, next[stage]) && !passed[stage]) {
      const now = passed.map((done, i) => done || i === stage)
      setPassed(now)
      if (now.every(Boolean)) onSolve()
    }
  }
  const advance = () => {
    setStage(stage + 1)
    setReached(Math.max(reached, stage + 1))
  }

  return (
    <div className="bk wv lt">
      <div className="bk-split">
        <section className="bk-stage">
          <div className={`lt-tiles is-${s.tiles.length}`}>
            {s.tiles.map((tile, index) => (
              <TileCard key={`${stage}-${index}`} tile={tile} value={mine[index]} m={m} target={s.target} onTurn={(key, v) => turn(index, key, v)} phone={phone} />
            ))}
          </div>
        </section>
        <div className="bk-stack">
          <section className="bk-panel bk-stack">
            <div>
              <span className="bk-label">{tr(`第 ${stage + 1} 步`, `Step ${stage + 1}`)} · {L(s.title)}</span>
              <p className="wv-stage-note">{L(s.note)}</p>
            </div>
            <p className="lt-law">{tr('亮度 = 灯的强度 × 反射率 × cos θ', 'Brightness = lamp strength × reflectance × cos θ')}</p>
            <div className="wv-next">
              <p className={`bk-verdict ${match ? 'is-pass' : ''}`} aria-live="polite">{match ? <><Check size={15} />{tr(`都是 ${s.target.toFixed(2)} 了。`, `All at ${s.target.toFixed(2)} now.`)}</> : tr(`目标亮度 ${s.target.toFixed(2)}`, `Target brightness ${s.target.toFixed(2)}`)}</p>
              {passed[stage] && stage < m.stages.length - 1 && <button className="bk-btn is-primary" onClick={advance}>{tr('下一步', 'Next')} <ArrowRight size={15} /></button>}
            </div>
          </section>
          <Stages stages={m.stages} current={stage} passed={passed} reached={reached} onPick={setStage} />
        </div>
      </div>
    </div>
  )
}

function TileCard({ tile, value, m, target, onTurn }) {
  const [theta, I, R] = useTween([value.theta, value.I, value.R])
  const b = m.brightness(value)
  const ok = Math.abs(b - target) <= m.tolerance
  return (
    <figure className={`lt-tile ${ok ? 'is-pass' : ''}`}>
      <figcaption className="bk-label">{L(tile.label)}</figcaption>
      <div className="lt-body">
        <SideView theta={theta} I={I} R={R} />
        <div className="lt-info">
        <div className="lt-reading">
          <span className="lt-swatch" style={{ background: `rgb(${Array(3).fill(Math.round(255 * Math.min(1, b))).join(',')})` }} aria-hidden="true" />
          <span>
            <small>{tr('照片里的亮度', 'Brightness in the photo')}</small>
            <b>{b.toFixed(3)}</b>
          </span>
          <span className={`lt-goal ${ok ? 'is-pass' : ''}`}>{ok ? <Check size={14} /> : null}{tr('目标', 'Target')} {target.toFixed(2)}</span>
        </div>
        <p className="lt-formula">{value.I.toFixed(2)} × {value.R.toFixed(2)} × cos {value.theta}° = {b.toFixed(3)}</p>
        {tile.knobs.map((key) => {
          const knob = m.knobs[key]
          return (
            <label key={key} className="bk-field">
              <span>{L(knob.label)}</span>
              <input className="bk-range" type="range" min={knob.min} max={knob.max} step={knob.step} value={value[key]} style={{ '--fill': `${((value[key] - knob.min) / (knob.max - knob.min)) * 100}%` }} aria-valuetext={format(key, value[key])} onChange={(event) => onTurn(key, Number(event.target.value))} />
              <output>{format(key, value[key])}</output>
            </label>
          )
        })}
        </div>
      </div>
    </figure>
  )
}

// Side view: the tile on the ground, its normal, the lamp on an arc, and a beam of parallel rays.
// The lit stretch of tile is the beam's width ÷ cos θ, so the same light is spread thinner.
function SideView({ theta, I, R }) {
  const cx = 120
  const ground = 128
  const t = theta * (Math.PI / 180)
  const d = [Math.sin(t), -Math.cos(t)] // toward the lamp
  const lamp = [cx + 92 * d[0], ground + 92 * d[1]]
  const beam = 44
  const half = Math.min(110, beam / 2 / Math.max(0.05, Math.cos(t)))
  const rays = [-2, -1, 0, 1, 2].map((i) => {
    const hit = cx + (i * beam) / 4 / Math.max(0.05, Math.cos(t))
    return Math.abs(hit - cx) <= 112 ? [hit, ground, hit + 80 * d[0], ground + 80 * d[1]] : null
  })
  const grey = Math.round(255 * R)
  const arc = `M${cx},${ground - 34} A34,34 0 0,1 ${cx + 34 * d[0]},${ground + 34 * d[1]}`
  return (
    <svg className="lt-side" viewBox="0 0 240 150" role="img" aria-label={tr(`侧视图：灯偏离正上方 ${Math.round(theta)}°`, `Side view: the lamp is ${Math.round(theta)}° from straight overhead`)}>
      <line className="lt-ground" x1={4} x2={236} y1={ground + 9} y2={ground + 9} />
      <rect className="lt-slab" x={cx - 112} y={ground} width={224} height={9} rx={2} fill={`rgb(${grey},${grey},${grey})`} />
      <rect className="lt-footprint" x={cx - half} y={ground - 3} width={half * 2} height={3} rx={1.5} style={{ opacity: 0.35 + 0.65 * I }} />
      {rays.map((r, i) => r && <line key={i} className="lt-ray" x1={r[2]} y1={r[3]} x2={r[0]} y2={r[1]} style={{ opacity: 0.25 + 0.6 * I }} />)}
      <line className="lt-normal" x1={cx} y1={ground} x2={cx} y2={ground - 100} />
      {theta > 12 && <text className="lt-text" x={cx - 6} y={ground - 70} textAnchor="end">{tr('法线', 'normal')}</text>}
      {theta > 2 && <path className="lt-arc" d={arc} />}
      {theta > 2 && <text className="lt-text is-accent" x={cx + 40 * Math.sin(t / 2) + 4} y={ground - 40 * Math.cos(t / 2)}>θ</text>}
      <circle className="lt-glow" cx={lamp[0]} cy={lamp[1]} r={10 + 8 * I} style={{ opacity: 0.15 + 0.35 * I }} />
      <circle className="lt-lamp" cx={lamp[0]} cy={lamp[1]} r={7} />
    </svg>
  )
}
