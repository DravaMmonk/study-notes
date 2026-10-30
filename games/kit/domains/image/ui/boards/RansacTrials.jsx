import { useMemo, useState } from 'react'
import { Check, X } from 'lucide-react'
import { useSolveOnce } from './matchDraw.js'
import { PHONE, useMedia } from '../../../../shell/useMedia.js'
import { L, keyOf, tr } from '../../../../shell/i18n.js'
import './MatchBoards.css'

// 6-4 共识: RANSAC for a line. The player sets one inlier threshold δ (it depends on the noise) and a
// number of rounds k per outlier ratio; each setting is judged over 200 seeded trials.

const K_MAX = 120
const D_MIN = 0.1
const D_MAX = 6

function linePath(line, reach = 40) {
  const { nx, ny, c } = line
  return `M${c * nx - ny * reach} ${c * ny + nx * reach} L${c * nx + ny * reach} ${c * ny - nx * reach}`
}

function bandPath(line, delta, reach = 40) {
  const { nx, ny, c } = line
  const at = (offset, along) => `${(c + offset) * nx - ny * along} ${(c + offset) * ny + nx * along}`
  return `M${at(-delta, -reach)} L${at(-delta, reach)} L${at(delta, reach)} L${at(delta, -reach)} Z`
}

export default function RansacTrials({ level, onSolve }) {
  const m = level.model
  const phone = useMedia(PHONE)
  const [delta, setDelta] = useState(3)
  const [ks, setKs] = useState(() => m.stages.map(() => 5))
  const [stageIndex, setStageIndex] = useState(0)
  const [trialIndex, setTrialIndex] = useState(0)
  const runs = useMemo(() => m.stages.map((stage, i) => m.rate(stage, ks[i], delta)), [m, ks, delta])
  const done = runs.every((r) => r.pass)
  useSolveOnce(done, onSolve)

  const stage = m.stages[stageIndex]
  const trial = useMemo(() => m.trial(stage, trialIndex + 1, ks[stageIndex], delta), [m, stage, trialIndex, ks, stageIndex, delta])
  const sampleLine = trial.result?.sample
  const near = (p) => sampleLine && Math.abs(sampleLine.nx * p[0] + sampleLine.ny * p[1] - sampleLine.c) < delta
  const sample = trial.result ? trial.result.sampleIndex.map((i) => trial.points[i]) : []
  const choose = (i) => setStageIndex(i)

  return (
    <div className="bk mb mb-ransac">
      <div className="mb-head">
        <div className="bk-seg" role="group" aria-label={tr('外点比例', 'Outlier ratio')}>
          {m.stages.map((s, i) => (
            <button key={keyOf(s.label)} aria-pressed={i === stageIndex} onClick={() => choose(i)}>
              {runs[i].pass ? <Check size={14} className="mb-ok" /> : <X size={14} className="mb-bad" />}
              {L(s.label)}
            </button>
          ))}
        </div>
        {!phone && <span className={`bk-chip ${done ? 'is-pass' : ''}`}>{runs.filter((r) => r.pass).length} / {m.stages.length} {tr('种比例通过', 'ratios passed')}</span>}
      </div>

      <div className="bk-split mb-ransac-split">
        <figure className="bk-stage mb-ransac-stage">
          <span className="bk-label">{L(stage.label)} · {tr(`第 ${trialIndex + 1} 次试验`, `Trial ${trialIndex + 1}`)} · {tr('最佳一轮', 'best round')}</span>
          <svg className="mb-svg" viewBox="-25 -25 50 50" role="img" aria-label={tr('一次试验：点、抽中的两点和找到的直线', 'One trial: the points, the two drawn points and the line found')}>
            <defs>
              <clipPath id="mb-ransac-clip"><rect x={-24} y={-24} width={48} height={48} /></clipPath>
            </defs>
            <g clipPath="url(#mb-ransac-clip)">
              {sampleLine && <path className="mb-band" d={bandPath(sampleLine, delta)} />}
              <path className="mb-target" d={linePath(trial.truth)} />
              {trial.points.map((p, i) => <circle key={i} className={`mb-dot ${near(p) ? 'is-in' : 'is-out'}`} cx={p[0]} cy={p[1]} r={0.55} />)}
              {trial.result && <path className={`mb-found ${trial.ok ? '' : 'is-wrong'}`} d={linePath(trial.result.line)} />}
              {sample.map((p, i) => <circle key={`s${i}`} className="mb-sample" cx={p[0]} cy={p[1]} r={1.5} />)}
            </g>
          </svg>
          <p className="mb-trial-verdict">
            {trial.ok ? <Check size={15} className="mb-ok" /> : <X size={15} className="mb-bad" />}
            <span className={trial.ok ? 'mb-ok' : 'mb-bad'}>{trial.ok ? tr('成功', 'Success') : tr('失败', 'Failure')}</span>
            <span className="mb-readout">{tr('支持', 'Support')} <b>{trial.result?.inliers ?? 0}</b> {tr('个点', 'points')} · {tr('真内点', 'true inliers')} <b>{trial.inliers}</b>{tr(' 个', '')}</span>
          </p>
          <label className="bk-field mb-delta">
            <span>δ</span>
            <input className="bk-range" type="range" min={D_MIN} max={D_MAX} step={0.05} value={delta} style={{ '--fill': `${((delta - D_MIN) / (D_MAX - D_MIN)) * 100}%` }} onChange={(e) => setDelta(Number(e.target.value))} aria-label={tr('内点阈值 δ', 'Inlier threshold δ')} />
            <output>{delta.toFixed(2)} px</output>
          </label>
          <figcaption className="bk-caption">{tr('δ 由三种比例共用。色带是与直线距离小于 δ 的范围；虚线是真实直线，圆圈标出抽中的两点', 'δ is shared by all three ratios. The band covers everything closer than δ to the line; the dashed line is the true line, and the circled points are the two drawn')}</figcaption>
        </figure>

        <div className="bk-stack mb-cards">
          {m.stages.map((s, i) => {
            const run = runs[i]
            const over = ks[i] > s.budget
            const active = i === stageIndex
            return (
              <section key={keyOf(s.label)} className={`bk-panel mb-card ${active ? 'is-active' : ''} ${run.pass ? 'is-pass' : ''}`} onPointerDown={() => choose(i)}>
                <div className="mb-card-head">
                  {run.pass ? <Check size={16} className="mb-ok" /> : <X size={16} className="mb-bad" />}
                  <span>{L(s.label)}</span>
                  <span className="mb-readout"><b className={run.rate >= 0.99 ? 'mb-ok' : ''}>{(run.rate * 100).toFixed(1)}%</b> <small>{run.wins}/{m.trials}</small></span>
                </div>
                <label className="bk-field">
                  <span>k</span>
                  <span className="mb-k-track" style={{ '--budget': (s.budget - 1) / (K_MAX - 1) }}>
                    <i title={tr(`预算 ${s.budget} 轮`, `Budget ${s.budget} rounds`)} />
                    <input className="bk-range" type="range" min={1} max={K_MAX} step={1} value={ks[i]} style={{ '--fill': `${((ks[i] - 1) / (K_MAX - 1)) * 100}%` }} onChange={(e) => setKs((all) => all.map((k, j) => (j === i ? Number(e.target.value) : k)))} aria-label={tr(`${L(s.label)} 的轮数 k`, `Rounds k for ${L(s.label)}`)} />
                  </span>
                  <output className={over ? 'mb-bad' : ''}>{ks[i]} / {s.budget}</output>
                </label>
                <div className="mb-rate" aria-hidden="true">
                  <span className={run.rate >= 0.99 ? 'is-ok' : ''} style={{ transform: `scaleX(${run.rate})` }} />
                  <i />
                </div>
                <p className={`mb-card-foot ${over ? 'mb-bad' : ''}`}>{over ? tr(`k 超出预算 ${s.budget} 轮`, `k is over the budget of ${s.budget} rounds`) : tr(`预算 k ≤ ${s.budget} · 目标 ≥ 99%`, `Budget k ≤ ${s.budget} · goal ≥ 99%`)}</p>
                {(!phone || active) && (
                  <div className="mb-strip" role="group" aria-label={tr(`${m.trials} 次试验`, `${m.trials} trials`)}>
                    {run.outcomes.map((ok, t) => (
                      <button key={t} className={`${ok ? '' : 'is-fail'} ${active && t === trialIndex ? 'is-active' : ''}`} aria-label={tr(`第 ${t + 1} 次${ok ? '成功' : '失败'}`, `Trial ${t + 1}: ${ok ? 'success' : 'failure'}`)} onClick={() => { choose(i); setTrialIndex(t) }} />
                    ))}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
