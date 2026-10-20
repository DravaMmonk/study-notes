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
  K: { zh: '采样前只留 k ≤', en: 'Before sampling, keep only k ≤' },
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
            <span><i className="is-seen" />{tr('从点上看起来', 'What the points suggest')}</span>
            {s.control === 'k' && <span><i className="is-ring" />{tr('k = 3 采到的点', 'Samples of k = 3')}</span>}
            {s.control === 'K' && <span><i className="is-target" />{tr('应有的样子', 'How it should look')}</span>}
          </div>
          <p className="wv-formula">{view.readout}</p>
          {s.control === 'K' && (
            <div className="wv-chips" aria-label={tr('组成这条线的波', 'The waves that make up this line')}>
              {s.parts.map((part) => {
                const kept = part.k <= v
                const folded = kept && 2 * part.k > s.samples
                return (
                  <span key={part.k} className={`wv-chip ${kept ? '' : 'is-cut'} ${folded ? 'is-alias' : ''}`}>
                    k = {part.k}{folded ? tr(` → 冒充 ${a.aliasOf(part.k, s.samples)}`, ` → poses as ${a.aliasOf(part.k, s.samples)}`) : kept ? '' : tr(' 已滤掉', ' filtered out')}
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
      lines: [{ curve: fine(real), kind: 'faint', label: tr('真实信号', 'true signal') }, { curve: fine(throughSamples(samples)), kind: 'seen', label: tr('从点上看起来', 'what the points suggest') }],
      dots: [...dotsOf(cosine(s.reference), s.samples, 'ring').map((d) => ({ ...d, label: tr('k = 3 采到的', 'k = 3 sampled') })), ...dotsOf(real, s.samples)],
      readout: tr(`真实 k = ${v} · 16 个点看起来是 k = ${seen}`, `True k = ${v} · 16 points look like k = ${seen}`),
      status: v === s.reference.k ? tr('这就是 k = 3 本身，换一个。', 'That is k = 3 itself. Try another.') : tr('点还没和圆圈重合。', 'The dots are not on the rings yet.'),
      win: tr(`k = ${v} 采出来和 k = 3 一模一样：16 − 3 = 13，16 + 3 = 19。`, `k = ${v} samples exactly like k = 3: 16 − 3 = 13, 16 + 3 = 19.`),
    }
  }
  if (s.control === 'M') {
    const real = cosine(s.wave)
    const ok = a.faithful(s.wave, v)
    return {
      lines: [{ curve: fine(real), kind: 'faint', label: tr('真实信号', 'true signal') }, { curve: fine(throughSamples(sampleAt(real, v))), kind: 'seen', label: tr('从点上看起来', 'what the points suggest') }],
      dots: dotsOf(real, v),
      readout: tr(
        `M = ${v} · 每个周期 ${(v / s.wave.k).toFixed(1)} 个点 · ${ok ? `看起来 k = ${s.wave.k}，看对了` : a.aliasOf(s.wave.k, v) === s.wave.k ? '频率像是对的，可振幅和位置都变了' : `看起来 k = ${a.aliasOf(s.wave.k, v)}，看错了`}`,
        `M = ${v} · ${(v / s.wave.k).toFixed(1)} points per cycle · ${ok ? `looks like k = ${s.wave.k}: read correctly` : a.aliasOf(s.wave.k, v) === s.wave.k ? 'the frequency looks right, but the amplitude and position have changed' : `looks like k = ${a.aliasOf(s.wave.k, v)}: read wrongly`}`,
      ),
      status: ok ? tr('还能看对。再少几个点试试。', 'Still read correctly. Try fewer points.') : tr('看错了：点太少。', 'Read wrongly: too few points.'),
      win: tr(`${v} 个点是最少的：每个周期要多于 2 个点（M > 2k）。`, `${v} points is the fewest: each cycle needs more than 2 points (M > 2k).`),
    }
  }
  const real = a.signalOf(s.parts, v)
  const truth = a.signalOf(s.parts, s.samples / 2)
  const samples = sampleAt(real, s.samples)
  return {
    lines: [{ curve: fine(real), kind: 'faint', label: tr('真实信号', 'true signal') }, { curve: fine(truth), kind: 'target', label: tr('应有的样子', 'how it should look') }, { curve: fine(throughSamples(samples)), kind: 'seen', label: tr('从点上看起来', 'what the points suggest') }],
    dots: dotsOf(real, s.samples),
    readout: tr(`采 16 个点，能分辨到 k = 8 · 采样前保留 k ≤ ${v}`, `16 samples tell apart frequencies up to k = 8 · keep k ≤ ${v} before sampling`),
    status: s.parts.some((p) => p.k <= v && 2 * p.k > s.samples) ? tr('有快波混进来了，它们会冒充成慢波。', 'Fast waves got in: they will pose as slow ones.') : tr('滤得太多，把该留的也去掉了。', 'Too much filtered: you removed what should stay.'),
    win: tr('只留 k ≤ 8：采出来正是应有的样子。', 'Keep only k ≤ 8: the samples look just as they should.'),
  }
}
