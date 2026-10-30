import { useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { cosine, sampleAt, throughSamples } from '../../engine/waves.js'
import { L, tr } from '../../../../shell/i18n.js'
import { PHONE, useMedia } from '../../../../shell/useMedia.js'
import { Plot, Stages } from './WaveKit.jsx'
import './waves.css'

const CONTROLS = {
  k: { zh: '真实频率 k', en: 'True frequency k' },
  M: { zh: '采样点数 M', en: 'Number of samples M' },
  K: { zh: '采样前只保留 k ≤', en: 'Before sampling, keep only k ≤' },
}

// 2-7 采样: three small experiments on sampling a wave. The faint line is the real signal, the dots
// are all that sampling keeps, and the dotted line is the smoothest wave through those dots: what
// anyone looking at the samples would believe the signal was.
export default function AliasProbe({ level, onSolve }) {
  const a = level.alias
  const phone = useMedia(PHONE)
  const [values, setValues] = useState(() => a.stages.map((s) => s.start))
  const [stage, setStage] = useState(0)
  const [passed, setPassed] = useState(() => a.stages.map(() => false))
  const [reached, setReached] = useState(0)
  const s = a.stages[stage]
  const v = values[stage]
  const match = a.solved(s, v)

  const set = (value) => {
    setValues(values.map((old, i) => (i === stage ? value : old)))
    if (a.solved(s, value) && !passed[stage]) {
      const now = passed.map((done, i) => done || i === stage)
      setPassed(now)
      if (now.every(Boolean)) onSolve()
    }
  }
  const advance = () => {
    setStage(stage + 1)
    setReached(Math.max(reached, stage + 1))
  }

  const [lo, hi] = a.ranges[s.control]
  const width = phone ? 340 : 600
  const view = describe(a, s, v)

  return (
    <div className="bk wv wv-alias">
      <div className="bk-split">
        <section className="bk-stage bk-stack">
          <Plot width={width} height={phone ? 220 : 260} label={tr('信号和采样点', 'Signal and samples')} lines={view.lines} dots={view.dots} />
          <div className="wv-legend">
            <span><i className="is-faint" />{tr('真实信号', 'True signal')}</span>
            <span><i className="is-seen" />{tr('采样后看到的信号', 'Signal as sampled')}</span>
            {s.control === 'k' && <span><i className="is-ring" />{tr('k = 3 的采样点', 'Samples of k = 3')}</span>}
            {s.control === 'K' && <span><i className="is-target" />{tr('期望的信号', 'Expected signal')}</span>}
          </div>
          <p className="wv-formula">{view.readout}</p>
          {s.control === 'K' && (
            <div className="wv-chips" aria-label={tr('组成这条线的波', 'The waves that make up this line')}>
              {s.parts.map((part) => {
                const kept = part.k <= v
                const folded = kept && 2 * part.k > s.samples
                return (
                  <span key={part.k} className={`wv-chip ${kept ? '' : 'is-cut'} ${folded ? 'is-alias' : ''}`}>
                    k = {part.k}{folded ? tr(` → 混叠为 ${a.aliasOf(part.k, s.samples)}`, ` → aliases to ${a.aliasOf(part.k, s.samples)}`) : kept ? '' : tr(' 已滤除', ' filtered out')}
                  </span>
                )
              })}
            </div>
          )}
        </section>

        <div className="bk-stack">
          <section className="bk-panel bk-stack">
            <div>
              <span className="bk-label">{tr(`第 ${stage + 1} 步`, `Step ${stage + 1}`)} · {L(s.title)}</span>
              <p className="wv-stage-note">{L(s.note)}</p>
            </div>
            <label className="bk-field">
              <span>{L(CONTROLS[s.control])}</span>
              <input className="bk-range" type="range" min={lo} max={hi} step={1} value={v} style={{ '--fill': `${((v - lo) / (hi - lo)) * 100}%` }} onChange={(event) => set(Number(event.target.value))} />
              <output>{v}</output>
            </label>
            <div className="wv-next">
              <p className={`bk-verdict ${match ? 'is-pass' : ''}`} aria-live="polite">{match ? <><Check size={15} />{view.win}</> : view.status}</p>
              {passed[stage] && stage < a.stages.length - 1 && <button className="bk-btn is-primary" onClick={advance}>{tr('下一步', 'Next step')} <ArrowRight size={15} /></button>}
            </div>
          </section>
          <Stages stages={a.stages} current={stage} passed={passed} reached={reached} onPick={setStage} />
        </div>
      </div>
    </div>
  )
}

// What to draw and say for a stage at control value v.
function describe(a, s, v) {
  const fine = (f) => sampleAt(f, a.fine)
  const dotsOf = (f, n, kind = 'sample') => sampleAt(f, n).map((value, j) => ({ u: j / n, v: value, kind }))
  if (s.control === 'k') {
    const real = cosine({ ...s.reference, k: v })
    const samples = sampleAt(real, s.samples)
    const seen = a.aliasOf(v, s.samples)
    return {
      lines: [{ curve: fine(real), kind: 'faint', label: tr('真实信号', 'true signal') }, { curve: fine(throughSamples(samples)), kind: 'seen', label: tr('采样后看到的信号', 'signal as sampled') }],
      dots: [...dotsOf(cosine(s.reference), s.samples, 'ring').map((d) => ({ ...d, label: tr('k = 3 的采样点', 'sample of k = 3') })), ...dotsOf(real, s.samples)],
      readout: tr(`真实 k = ${v} · 16 个采样点呈现为 k = ${seen}`, `True k = ${v} · 16 points look like k = ${seen}`),
      status: v === s.reference.k ? tr('这是 k = 3 本身，请另选一个频率。', 'That is k = 3 itself. Pick another frequency.') : tr('采样点尚未与圆圈重合。', 'The samples are not on the rings yet.'),
      win: tr(`k = ${v} 的采样结果与 k = 3 完全相同：16 − 3 = 13，16 + 3 = 19。`, `k = ${v} gives exactly the same samples as k = 3: 16 − 3 = 13, 16 + 3 = 19.`),
    }
  }
  if (s.control === 'M') {
    const real = cosine(s.wave)
    const ok = a.faithful(s.wave, v)
    return {
      lines: [{ curve: fine(real), kind: 'faint', label: tr('真实信号', 'true signal') }, { curve: fine(throughSamples(sampleAt(real, v))), kind: 'seen', label: tr('采样后看到的信号', 'signal as sampled') }],
      dots: dotsOf(real, v),
      readout: tr(
        `M = ${v} · 每个周期 ${(v / s.wave.k).toFixed(1)} 个点 · ${ok ? `呈现为 k = ${s.wave.k}，判断正确` : a.aliasOf(s.wave.k, v) === s.wave.k ? '频率看似正确，但振幅和位置都已改变' : `呈现为 k = ${a.aliasOf(s.wave.k, v)}，判断错误`}`,
        `M = ${v} · ${(v / s.wave.k).toFixed(1)} points per cycle · ${ok ? `looks like k = ${s.wave.k}: correct` : a.aliasOf(s.wave.k, v) === s.wave.k ? 'the frequency looks right, but the amplitude and position have changed' : `looks like k = ${a.aliasOf(s.wave.k, v)}: wrong`}`,
      ),
      status: ok ? tr('仍能正确识别。尝试进一步减少采样点。', 'Still correct. Try fewer samples.') : tr('识别错误：采样点太少。', 'Misread: too few samples.'),
      win: tr(`${v} 个点是最少的点数：每个周期需要多于 2 个采样点（M > 2k）。`, `${v} is the fewest: each cycle needs more than 2 samples (M > 2k).`),
    }
  }
  const real = a.signalOf(s.parts, v)
  const truth = a.signalOf(s.parts, s.samples / 2)
  const samples = sampleAt(real, s.samples)
  return {
    lines: [{ curve: fine(real), kind: 'faint', label: tr('真实信号', 'true signal') }, { curve: fine(truth), kind: 'target', label: tr('期望的信号', 'expected signal') }, { curve: fine(throughSamples(samples)), kind: 'seen', label: tr('采样后看到的信号', 'signal as sampled') }],
    dots: dotsOf(real, s.samples),
    readout: tr(`16 个采样点可分辨到 k = 8 · 采样前保留 k ≤ ${v}`, `16 samples tell apart frequencies up to k = 8 · keep k ≤ ${v} before sampling`),
    status: s.parts.some((p) => p.k <= v && 2 * p.k > s.samples) ? tr('有高频分量混入，采样后会混叠为低频。', 'High frequencies remain; after sampling they alias to low ones.') : tr('滤除过多，连应保留的分量也去掉了。', 'Too much filtered out, including what should stay.'),
    win: tr('只保留 k ≤ 8：采样结果与期望一致。', 'Keep only k ≤ 8: the samples match what is expected.'),
  }
}
