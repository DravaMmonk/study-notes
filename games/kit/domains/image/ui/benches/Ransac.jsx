import { useMemo } from 'react'
import { Check, X } from 'lucide-react'
import { L, keyOf, tr } from '../../../../shell/i18n.js'
import { Knob } from '../../../../shell/bench/items.jsx'
import './match.css'

// The consensus bench's pictures (bench model `ransac`). One trial of the case on show, its best round drawn over the
// points; and a card per outlier ratio with its own rounds knob, the budget marked on the track, the success rate and
// every trial as a cell (tap one to see it). The trial on show is the bench's `trial` (ui).

function linePath(line, reach = 40) {
  const { nx, ny, c } = line
  return `M${c * nx - ny * reach} ${c * ny + nx * reach} L${c * nx + ny * reach} ${c * ny - nx * reach}`
}

function bandPath(line, delta, reach = 40) {
  const { nx, ny, c } = line
  const at = (offset, along) => `${(c + offset) * nx - ny * along} ${(c + offset) * ny + nx * along}`
  return `M${at(-delta, -reach)} L${at(-delta, reach)} L${at(delta, reach)} L${at(delta, -reach)} Z`
}

export function RansacTrial({ ctx }) {
  const m = ctx.model
  const { delta, k } = ctx.values
  const stage = ctx.cases[ctx.caseIndex]
  const index = ctx.ui.trial ?? 0
  const trial = useMemo(() => m.trial(stage, index + 1, k[ctx.caseIndex], delta), [m, stage, index, k, ctx.caseIndex, delta])
  const sampleLine = trial.result?.sample
  const near = (p) => sampleLine && Math.abs(sampleLine.nx * p[0] + sampleLine.ny * p[1] - sampleLine.c) < delta
  const sample = trial.result ? trial.result.sampleIndex.map((i) => trial.points[i]) : []
  return (
    <figure className="mb mb-ransac-stage">
      <span className="bk-label">{L(stage.label)} · {tr(`第 ${index + 1} 次试验`, `Trial ${index + 1}`)} · {tr('最佳一轮', 'best round')}</span>
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
    </figure>
  )
}

export function RansacCases({ ctx }) {
  const { cases, views, verdicts, caseIndex, setCase, values, set, phone, model } = ctx
  const K = ctx.bench.knobs.k
  const pick = (i, trial) => {
    setCase(i)
    if (trial !== undefined) ctx.setUi({ trial })
  }
  return (
    <div className="bk-stack mb mb-cards">
      {cases.map((s, i) => {
        const run = views[i]
        const over = values.k[i] > s.budget
        const active = i === caseIndex
        return (
          <section key={keyOf(s.label)} className={`bk-panel mb-card ${active ? 'is-active' : ''} ${verdicts[i].pass ? 'is-pass' : ''}`} onPointerDown={() => pick(i)}>
            <div className="mb-card-head">
              {verdicts[i].pass ? <Check size={16} className="mb-ok" /> : <X size={16} className="mb-bad" />}
              <span>{L(s.label)}</span>
              <span className="mb-readout"><b className={run.rate >= 0.99 ? 'mb-ok' : ''}>{(run.rate * 100).toFixed(1)}%</b> <small>{run.wins}/{model.trials}</small></span>
            </div>
            <Knob name="k" ctx={ctx} value={values.k[i]} onChange={(x) => set('k', values.k.map((old, j) => (j === i ? x : old)))} mark={(s.budget - K.min) / (K.max - K.min)} output={<output className={over ? 'mb-bad' : ''}>{values.k[i]} / {s.budget}</output>} />
            <div className="mb-rate" aria-hidden="true">
              <span className={run.rate >= 0.99 ? 'is-ok' : ''} style={{ transform: `scaleX(${run.rate})` }} />
              <i />
            </div>
            <p className={`mb-card-foot ${over ? 'mb-bad' : ''}`}>{over ? tr(`k 超出预算 ${s.budget} 轮`, `k is over the budget of ${s.budget} rounds`) : tr(`预算 k ≤ ${s.budget} · 目标 ≥ 99%`, `Budget k ≤ ${s.budget} · goal ≥ 99%`)}</p>
            {(!phone || active) && (
              <div className="mb-strip" role="group" aria-label={tr(`${model.trials} 次试验`, `${model.trials} trials`)}>
                {run.outcomes.map((ok, t) => (
                  <button key={t} className={`${ok ? '' : 'is-fail'} ${active && t === (ctx.ui.trial ?? 0) ? 'is-active' : ''}`} aria-label={tr(`第 ${t + 1} 次${ok ? '成功' : '失败'}`, `Trial ${t + 1}: ${ok ? 'success' : 'failure'}`)} onClick={() => pick(i, t)} />
                ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
