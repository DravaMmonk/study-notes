import { useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { L, tr } from '../../i18n.js'
import { PHONE, useMedia } from '../useMedia.js'
import { Stages } from './WaveKit.jsx'
import './waves.css'
import './train.css'

const GRID = 28 // background cells per side

// 4-3 一个神经元: letters as points on two features; the neuron's score shades the plane (warm = "X",
// cool = "O") and its 0.5 line is drawn. In the last step a hidden layer can be switched on, and the
// same points are shown again in the hidden layer's coordinates, where one line suffices.
export default function Neuron({ level, onSolve }) {
  const m = level.neuron
  const phone = useMedia(PHONE)
  const [s, setS] = useState(m.start)
  const [stage, setStage] = useState(0)
  const [passed, setPassed] = useState(() => m.stages.map(() => false))
  const [reached, setReached] = useState(0)
  const st = m.stages[stage]
  const points = m.letters[st.data]
  const match = m.passes(st, s)
  const hiddenOn = st.hidden && s.hidden

  const update = (next) => {
    setS(next)
    if (m.passes(st, next) && !passed[stage]) {
      const now = passed.map((done, i) => done || i === stage)
      setPassed(now)
      if (now.every(Boolean)) onSolve()
    }
  }
  // The settings carry over between steps; if they already meet the next step, it counts at once.
  const go = (index) => {
    setStage(index)
    if (m.passes(m.stages[index], s) && !passed[index]) {
      const now = passed.map((done, i) => done || i === index)
      setPassed(now)
      if (now.every(Boolean)) onSolve()
    }
  }
  const right = (label) => points.filter((p) => p[0] === label && m.pointOk(st, s, p)).length
  const total = (label) => points.filter((p) => p[0] === label).length
  const keys = hiddenOn ? ['v1', 'v2', 'c'] : ['w1', 'w2', 'b']
  const size = phone ? 290 : 300

  return (
    <div className="bk wv nr">
      <div className="bk-split">
        <section className="bk-stage bk-stack">
          <div className="nr-plots">
            <Scatter
              title={hiddenOn ? tr('原来的两个数（分数由整个网络算出）', 'The original two numbers (scored by the whole network)') : tr('每张字母图 = 一个点', 'Each letter image = one point')}
              xLabel={tr('斜笔画', 'diagonal stroke')}
              yLabel={tr('弯笔画', 'curved stroke')}
              points={points.map(([label, f1, f2]) => ({ label, x: f1, y: f2, ok: m.pointOk(st, s, [label, f1, f2]) }))}
              score={(x, y) => m.score(st, s, x, y)}
              size={size}
            />
            {hiddenOn && (
              <Scatter
                title={tr('隐藏层眼里的同一批点', 'The same points, as the hidden layer sees them')}
                xLabel={tr('隐藏 1 = ReLU(斜 − 弯)', 'hidden 1 = ReLU(diag − curve)')}
                yLabel={tr('隐藏 2 = ReLU(弯 − 斜)', 'hidden 2 = ReLU(curve − diag)')}
                points={points.map(([label, f1, f2]) => {
                  const [h1, h2] = m.hidden(f1, f2)
                  return { label, x: h1, y: h2, ok: m.pointOk(st, s, [label, f1, f2]) }
                })}
                score={(x, y) => 1 / (1 + Math.exp(-(s.v1 * x + s.v2 * y + s.c)))}
                size={size}
              />
            )}
          </div>
          <p className="nr-formula">
            {hiddenOn ? tr('分数 = σ( v1 · 隐藏1 + v2 · 隐藏2 + c )', 'score = σ( v1 · hidden1 + v2 · hidden2 + c )') : tr('分数 = σ( w1 · 斜 + w2 · 弯 + b )', 'score = σ( w1 · diag + w2 · curve + b )')}
            <small>{tr('σ 把任意的数压到 0 和 1 之间：0 处正好是 0.5', 'σ squashes any number to between 0 and 1; at 0 it gives exactly 0.5')}</small>
          </p>
          <div className="bk-stats">
            <div className={`bk-stat ${right('X') === total('X') ? 'is-pass' : 'is-fail'}`}><b>{right('X')} / {total('X')}</b><span>{tr(`X 的分数 > ${st.margin}`, `X scores > ${st.margin}`)}</span></div>
            <div className={`bk-stat ${right('O') === total('O') ? 'is-pass' : 'is-fail'}`}><b>{right('O')} / {total('O')}</b><span>{tr(`O 的分数 < ${(1 - st.margin).toFixed(1)}`, `O scores < ${(1 - st.margin).toFixed(1)}`)}</span></div>
          </div>
        </section>
        <div className="bk-stack">
          <section className="bk-panel bk-stack">
            <div>
              <span className="bk-label">{tr(`第 ${stage + 1} 步`, `Step ${stage + 1}`)} · {L(st.title)}</span>
              <p className="wv-stage-note">{L(st.note)}</p>
            </div>
            {st.hidden && (
              <label className="bk-check nr-hidden">
                <input type="checkbox" checked={s.hidden} onChange={(event) => update({ ...s, hidden: event.target.checked })} />
                {tr('加一层隐藏层（两个 ReLU 神经元）', 'Add a hidden layer (two ReLU neurons)')}
              </label>
            )}
            <div>
              {keys.map((key) => {
                const knob = m.knobs[key]
                return (
                  <label key={key} className="bk-field">
                    <span>{L(knob.label)}</span>
                    <input className="bk-range" type="range" min={knob.min} max={knob.max} step={knob.step} value={s[key]} style={{ '--fill': `${((s[key] - knob.min) / (knob.max - knob.min)) * 100}%` }} onChange={(event) => update({ ...s, [key]: Number(event.target.value) })} />
                    <output>{s[key].toFixed(1)}</output>
                  </label>
                )
              })}
            </div>
            <div className="wv-next">
              <p className={`bk-verdict ${match ? 'is-pass' : ''}`} aria-live="polite">{match ? <><Check size={15} />{tr('全部分对了。', 'Every point is on the right side.')}</> : tr('还有点在错的一边，或者不够肯定。', 'Some points are still on the wrong side, or not sure enough.')}</p>
              {passed[stage] && stage < m.stages.length - 1 && <button className="bk-btn is-primary" onClick={() => { go(stage + 1); setReached(Math.max(reached, stage + 1)) }}>{tr('下一步', 'Next step')} <ArrowRight size={15} /></button>}
            </div>
          </section>
          <Stages stages={m.stages} current={stage} passed={passed} reached={reached} onPick={go} />
        </div>
      </div>
    </div>
  )
}

// A unit square of two features with the points, shaded by the score and with the 0.5 line.
function Scatter({ title, xLabel, yLabel, points, score, size }) {
  const pad = 30
  const inner = size - pad - 8
  const X = (v) => pad + v * inner
  const Y = (v) => 8 + (1 - v) * inner
  const cell = 1 / GRID
  const cells = []
  for (let j = 0; j < GRID; j++) {
    for (let i = 0; i < GRID; i++) {
      const p = score((i + 0.5) * cell, (j + 0.5) * cell)
      cells.push(<rect key={`${i}-${j}`} x={X(i * cell)} y={Y((j + 1) * cell)} width={inner * cell + 0.5} height={inner * cell + 0.5} className={p >= 0.5 ? 'nr-x' : 'nr-o'} style={{ opacity: Math.abs(p - 0.5) * 0.9 }} />)
    }
  }
  return (
    <figure className="nr-scatter">
      <span className="bk-label">{title}</span>
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={title}>
        <rect className="nr-frame" x={pad} y={8} width={inner} height={inner} />
        {cells}
        <path className="nr-line" d={halfLine(score, X, Y)} />
        {points.map((p, i) => (
          <g key={i} className={`nr-point ${p.ok ? 'is-ok' : 'is-bad'}`} transform={`translate(${X(p.x)} ${Y(p.y)})`}>
            {p.label === 'X' ? <path d="M-6,-6L6,6M6,-6L-6,6" /> : <circle r={6} />}
          </g>
        ))}
        <text className="nr-axis" x={pad + inner / 2} y={size - 2} textAnchor="middle">{xLabel} →</text>
        <text className="nr-axis" x={10} y={8 + inner / 2} textAnchor="middle" transform={`rotate(-90 10 ${8 + inner / 2})`}>{yLabel} →</text>
      </svg>
    </figure>
  )
}

// Where the score crosses 0.5, by marching squares on a fine grid (straight for one neuron, bent
// once the hidden layer is on).
function halfLine(score, X, Y) {
  const n = 48
  const at = (i, j) => score(i / n, j / n) - 0.5
  let d = ''
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const corners = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]]
      const hits = []
      for (let k = 0; k < 4; k++) {
        const [a, b] = [corners[k], corners[(k + 1) % 4]]
        const [va, vb] = [at(...a), at(...b)]
        if ((va < 0) !== (vb < 0)) {
          const t = va / (va - vb)
          hits.push([X((a[0] + (b[0] - a[0]) * t) / n), Y((a[1] + (b[1] - a[1]) * t) / n)])
        }
      }
      for (let k = 0; k + 1 < hits.length; k += 2) d += `M${hits[k][0].toFixed(1)},${hits[k][1].toFixed(1)}L${hits[k + 1][0].toFixed(1)},${hits[k + 1][1].toFixed(1)}`
    }
  }
  return d
}
