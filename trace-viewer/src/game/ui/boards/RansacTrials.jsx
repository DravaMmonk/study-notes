import { useMemo, useState } from 'react'
import { Check, X } from 'lucide-react'
import { useSolveOnce } from './matchDraw.js'
import './MatchBoards.css'

// 6-4 共识: RANSAC for a line. The player sets one inlier threshold δ (it depends on the noise) and a
// number of rounds k per outlier ratio; each setting is judged over 200 seeded trials.

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

  return (
    <div className="mb mb-ransac">
      <section className="mb-panel">
        <p className="mb-label">内点阈值 δ（三种比例共用）</p>
        <label className="mb-slider">
          <span>δ</span>
          <input type="range" min={0.1} max={6} step={0.05} value={delta} onChange={(e) => setDelta(Number(e.target.value))} aria-label="内点阈值 δ" />
          <output>{delta.toFixed(2)} px</output>
        </label>
      </section>

      <div className="mb-row">
        <figure style={{ margin: 0 }}>
          <svg className="mb-stage" viewBox="-25 -25 50 50" role="img" aria-label="一次试验：点、抽中的两点和找到的直线">
            <defs>
              <clipPath id="mb-ransac-clip"><rect x={-24} y={-24} width={48} height={48} /></clipPath>
            </defs>
            <g clipPath="url(#mb-ransac-clip)">
              {sampleLine && <path className="mb-band" d={bandPath(sampleLine, delta)} />}
              <path className="mb-target" d={linePath(trial.truth)} />
              {trial.points.map((p, i) => <circle key={i} className={`mb-dot ${near(p) ? 'is-in' : 'is-faint'}`} cx={p[0]} cy={p[1]} r={0.6} />)}
              {sample.map((p, i) => <circle key={`s${i}`} className="mb-peak" cx={p[0]} cy={p[1]} r={1.4} />)}
              {trial.result && <path className={`mb-found ${trial.ok ? '' : 'mb-wrong'}`} d={linePath(trial.result.line)} />}
            </g>
          </svg>
          <figcaption className="mb-readout" style={{ marginTop: 6 }}>
            {stage.label} · 第 {trialIndex + 1} 次：{trial.ok ? <span className="mb-ok">成功</span> : <span className="mb-bad">失败</span>} · 支持 {trial.result?.inliers ?? 0} 个点（真内点 {trial.inliers} 个）
            <br />虚线是真的直线；圈出的是最佳一轮抽中的两点，色带宽 2δ
          </figcaption>
        </figure>

        <div style={{ display: 'grid', gap: 10 }}>
          {m.stages.map((s, i) => {
            const run = runs[i]
            const over = ks[i] > s.budget
            return (
              <section key={s.label} className={`mb-stage-card ${i === stageIndex ? 'is-active' : ''}`} onPointerDown={() => setStageIndex(i)}>
                <div className="mb-stage-head">
                  <span>{run.pass ? <Check size={13} className="mb-ok" /> : <X size={13} className="mb-bad" />} {s.label}</span>
                  <span className="mb-readout">成功 <b>{run.wins}</b> / {m.trials} = <b>{(run.rate * 100).toFixed(1)}%</b></span>
                </div>
                <label className="mb-slider">
                  <span>k</span>
                  <input type="range" min={1} max={120} step={1} value={ks[i]} onChange={(e) => setKs((all) => all.map((k, j) => (j === i ? Number(e.target.value) : k)))} aria-label={`${s.label} 的轮数 k`} />
                  <output className={over ? 'mb-bad' : ''}>{ks[i]} 轮</output>
                </label>
                <p className={over ? 'mb-warn' : 'mb-readout'}>预算 k ≤ {s.budget}{over ? ' · 超出预算' : ''}</p>
                <div className="mb-rate" aria-hidden="true"><span className={run.rate >= 0.99 ? 'is-ok' : ''} style={{ width: `${run.rate * 100}%` }} /><i /></div>
                <div className="mb-strip" role="group" aria-label="200 次试验">
                  {run.outcomes.map((ok, t) => (
                    <button key={t} className={`${ok ? '' : 'is-fail'} ${i === stageIndex && t === trialIndex ? 'is-active' : ''}`} aria-label={`第 ${t + 1} 次${ok ? '成功' : '失败'}`} onClick={() => { setStageIndex(i); setTrialIndex(t) }} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
