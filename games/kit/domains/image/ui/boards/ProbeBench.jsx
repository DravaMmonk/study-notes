import { useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { L, tr } from '../../../../shell/i18n.js'
import { PHONE, useMedia } from '../../../../shell/useMedia.js'
import { Plot, Stages } from './WaveKit.jsx'
import './waves.css'

// The probe topic's two benches (2-3 乘了再平均, 2-4 错开的波). The input row and a probe wave are multiplied point by
// point; the product and its average are drawn under them. A step is one of:
//   find     turn the probe's frequency until the average is no longer 0
//   read     also turn a multiplier until the reading (average × multiplier) is the wave's amplitude
//   blind    shift the input until the cos probe reads 0
//   combine  pick the combination of the cos and sin readings that stays the amplitude however the input is shifted
// The level's `probe` holds the stages and the model (probe.reading, probe.combine) so the board only draws.

const fmt = (v) => (Math.abs(v) < 0.0005 ? '0.000' : v.toFixed(3))

export default function ProbeBench({ level, onSolve }) {
  const p = level.probe
  const phone = useMedia(PHONE)
  const [values, setValues] = useState(() => p.stages.map((s) => ({ ...s.start })))
  const [stage, setStage] = useState(0)
  const [passed, setPassed] = useState(() => p.stages.map(() => false))
  const [reached, setReached] = useState(0)
  const s = p.stages[stage]
  const v = values[stage]
  const match = p.solved(s, v)

  const set = (key, value) => {
    const next = { ...v, [key]: value }
    setValues(values.map((old, i) => (i === stage ? next : old)))
    if (p.solved(s, next) && !passed[stage]) {
      const now = passed.map((done, i) => done || i === stage)
      setPassed(now)
      if (now.every(Boolean)) onSolve()
    }
  }
  const advance = () => {
    setStage(stage + 1)
    setReached(Math.max(reached, stage + 1))
  }

  const width = phone ? 340 : 600
  const input = p.input(s, v)
  const probes = p.probes(s, v)
  const products = probes.map((probe) => (u) => input(u) * probe.f(u))
  const readings = probes.map((probe) => ({ ...probe, value: p.reading(input, probe.f) * (v.m ?? 2) }))
  const averages = probes.map((probe) => p.reading(input, probe.f))

  return (
    <div className="bk wv wv-bench">
      <div className="bk-split">
        <section className="bk-stage bk-stack">
          <Plot width={width} height={phone ? 150 : 170} lo={-1} hi={1} ticks={[-1, 0, 1]} label={tr('输入和探针', 'Input and probe')}
            lines={[{ curve: input, kind: 'faint', label: tr('输入', 'input') }, ...probes.map((probe) => ({ curve: probe.f, kind: 'seen', label: L(probe.name) }))]} />
          <div className="wv-legend">
            <span><i className="is-faint" />{tr('输入', 'Input')}</span>
            <span><i className="is-seen" />{probes.map((probe) => L(probe.name)).join(' · ')}</span>
          </div>
          <Plot width={width} height={phone ? 150 : 170} lo={-0.6} hi={0.6} ticks={[-0.5, 0, 0.5]} label={tr('逐点相乘和它的平均', 'The product and its average')}
            lines={products.flatMap((f, i) => [{ curve: f, kind: 'yours', label: tr('乘积', 'product') }, { curve: () => averages[i], kind: 'target', label: tr('平均', 'average') }])} />
          <div className="wv-legend">
            <span><i />{tr('逐点相乘', 'Product')}</span>
            <span><i className="is-target" />{tr('乘积的平均', 'Its average')}</span>
          </div>
          <p className="wv-formula">
            {readings.map((r, i) => (
              <span key={i}>{i ? ' · ' : ''}{L(r.name)}：{tr('平均', 'average')} <b>{fmt(averages[i])}</b>{s.kind === 'read' ? <> × {v.m} = <b>{fmt(r.value)}</b></> : null}{s.kind === 'blind' || s.kind === 'combine' ? <> → {tr('读数', 'reading')} <b>{fmt(r.value)}</b></> : null}</span>
            ))}
            {s.kind === 'combine' && v.pick && <span> · {L(p.combine[v.pick].name)} = <b>{fmt(p.combine[v.pick].f(readings[0].value, readings[1].value))}</b></span>}
          </p>
        </section>

        <div className="bk-stack">
          <section className="bk-panel bk-stack">
            <div>
              <span className="bk-label">{tr(`第 ${stage + 1} 步`, `Step ${stage + 1}`)} · {L(s.title)}</span>
              <p className="wv-stage-note">{L(s.note)}</p>
            </div>
            {(s.knobs ?? []).map((key) => {
              const { min, max, step, label, unit = '' } = p.knobs[key]
              const value = v[key]
              return (
                <label key={key} className="bk-field">
                  <span>{L(label)}</span>
                  <input className="bk-range" type="range" min={min} max={max} step={step} value={value} style={{ '--fill': `${((value - min) / (max - min)) * 100}%` }} onChange={(event) => set(key, Number(event.target.value))} />
                  <output>{value}{unit}</output>
                </label>
              )
            })}
            {s.kind === 'combine' && (
              <div className="wv-picks" role="radiogroup" aria-label={tr('把两个读数合起来', 'Combine the two readings')}>
                {Object.entries(p.combine).map(([key, c]) => (
                  <button key={key} type="button" role="radio" aria-checked={v.pick === key} className={`bk-btn ${v.pick === key ? 'is-primary' : ''}`} onClick={() => set('pick', key)}>{L(c.name)}</button>
                ))}
                {v.pick && (
                  <p className="wv-stage-note">
                    {tr('错开不同角度时：', 'Shifted by different angles: ')}
                    {s.checks.map((phase) => `${phase}° → ${fmt(p.combine[v.pick].f(...p.readingsAt(s, phase)))}`).join(' · ')}
                  </p>
                )}
              </div>
            )}
            <div className="wv-next">
              <p className={`bk-verdict ${match ? 'is-pass' : ''}`} aria-live="polite">{match ? <><Check size={15} />{L(s.win)}</> : L(s.status)}</p>
              {passed[stage] && stage < p.stages.length - 1 && <button className="bk-btn is-primary" onClick={advance}>{tr('下一步', 'Next step')} <ArrowRight size={15} /></button>}
            </div>
          </section>
          <Stages stages={p.stages} current={stage} passed={passed} reached={reached} onPick={setStage} />
        </div>
      </div>
    </div>
  )
}
