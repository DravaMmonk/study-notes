import { useMemo, useState } from 'react'
import { Check, X } from 'lucide-react'
import { greyUrl, useSolveOnce } from './matchDraw.js'
import './MatchBoards.css'

// 6-2 找对应: every keypoint of the left photo takes the right photo's candidate with the nearest
// 5×5 window. The player picks the rule that decides which of these nearest matches to keep.

const S = 8 // screen units per pixel
const GAP = 56
const LO = 0
const HI = 1.15

const RULES = [
  ['all', '全部接受'],
  ['dist', 'd₁ < t'],
  ['ratio', 'd₁ / d₂ < r'],
]

function crop(img, [cx, cy], r) {
  const n = 2 * r + 1
  const data = new Float32Array(n * n)
  for (let v = 0; v < n; v++) for (let u = 0; u < n; u++) data[v * n + u] = img.data[(cy - r + v) * img.w + cx - r + u]
  return { w: n, h: n, data }
}

export default function MatchRatio({ level, onSolve }) {
  const m = level.model
  const [pairIndex, setPairIndex] = useState(0)
  const [rule, setRule] = useState({ mode: 'all', t: 2, r: 1 })
  const [selected, setSelected] = useState(null)
  const verdicts = m.rows.map((rows) => m.judge(rows, rule))
  const done = verdicts.every((v) => v.pass)
  useSolveOnce(done, onSolve)

  const pair = m.pairs[pairIndex]
  const rows = m.rows[pairIndex]
  const urls = useMemo(() => m.pairs.map((p) => [greyUrl(p.a, LO, HI), greyUrl(p.b, LO, HI)]), [m.pairs])
  const offset = m.W * S + GAP
  const px = (v) => (v + 0.5) * S
  const pick = selected !== null && rows[selected] ? selected : null

  return (
    <div className="mb mb-match">
      <div className="mb-tabs" role="tablist" aria-label="图对">
        {m.pairs.map((p, i) => (
          <button key={p.label} className="mb-tab" role="tab" aria-selected={i === pairIndex} onClick={() => { setPairIndex(i); setSelected(null) }}>
            {verdicts[i].pass ? <Check size={13} className="is-ok" /> : <X size={13} className="is-bad" />}
            {p.label}
          </button>
        ))}
      </div>

      <svg className="mb-stage" viewBox={`-6 -22 ${2 * m.W * S + GAP + 12} ${m.H * S + 30}`} role="img" aria-label="左图、右图和每个关键点的最近匹配">
        <text className="mb-caption" x={0} y={-8}>左图 · 关键点</text>
        <text className="mb-caption" x={offset} y={-8}>右图 · 候选点</text>
        <image className="mb-pixels" href={urls[pairIndex][0]} x={0} y={0} width={m.W * S} height={m.H * S} preserveAspectRatio="none" />
        <image className="mb-pixels" href={urls[pairIndex][1]} x={offset} y={0} width={m.W * S} height={m.H * S} preserveAspectRatio="none" />
        <rect className="mb-frame" x={0} y={0} width={m.W * S} height={m.H * S} />
        <rect className="mb-frame" x={offset} y={0} width={m.W * S} height={m.H * S} />
        {pair.candidates.map(([x, y], i) => (
          <rect key={i} className="mb-cand" x={offset + px(x) - (m.R + 0.5) * S} y={px(y) - (m.R + 0.5) * S} width={(2 * m.R + 1) * S} height={(2 * m.R + 1) * S} />
        ))}
        {rows.map((row, i) => {
          const [bx, by] = pair.candidates[row.best]
          const keep = m.accept(row, rule)
          const tone = keep ? (row.right ? 'mb-good' : 'mb-wrong') : 'mb-dim'
          return <line key={i} className={`mb-match-line ${tone} ${pick === i ? 'is-selected' : ''}`} x1={px(row.at[0])} y1={px(row.at[1])} x2={offset + px(bx)} y2={px(by)} />
        })}
        {rows.map((row, i) => (
          <g key={i} onClick={() => setSelected(i)} style={{ cursor: 'pointer' }} data-key={i}>
            <circle cx={px(row.at[0])} cy={px(row.at[1])} r={11} fill="transparent" />
            <circle className={`mb-key ${pick === i ? 'is-selected' : ''}`} cx={px(row.at[0])} cy={px(row.at[1])} r={5} />
          </g>
        ))}
      </svg>

      <div className="mb-row">
        <Inspector m={m} pair={pair} row={pick === null ? null : rows[pick]} rule={rule} />
        <section className="mb-panel">
          <p className="mb-label">接受规则</p>
          <div className="mb-segment">
            {RULES.map(([mode, label]) => (
              <button key={mode} aria-pressed={rule.mode === mode} onClick={() => setRule((r) => ({ ...r, mode }))}>{label}</button>
            ))}
          </div>
          {rule.mode === 'dist' && (
            <label className="mb-slider">
              <span>t</span>
              <input type="range" min={0} max={2.5} step={0.01} value={rule.t} onChange={(e) => setRule((r) => ({ ...r, t: Number(e.target.value) }))} aria-label="距离阈值 t" />
              <output>{rule.t.toFixed(2)}</output>
            </label>
          )}
          {rule.mode === 'ratio' && (
            <label className="mb-slider">
              <span>r</span>
              <input type="range" min={0} max={1} step={0.01} value={rule.r} onChange={(e) => setRule((r) => ({ ...r, r: Number(e.target.value) }))} aria-label="比值阈值 r" />
              <output>{rule.r.toFixed(2)}</output>
            </label>
          )}
          <table className="mb-table">
            <thead>
              <tr><th /><th>接受</th><th>正确</th><th>错误</th><th>要找回</th></tr>
            </thead>
            <tbody>
              {verdicts.map((v, i) => (
                <tr key={m.pairs[i].label} className={i === pairIndex ? 'is-active' : ''}>
                  <td>{m.pairs[i].label}</td>
                  <td>{v.accepted}</td>
                  <td className={v.correct >= v.need ? 'mb-ok' : ''}>{v.correct}</td>
                  <td className={v.wrong ? 'mb-bad' : 'mb-ok'}>{v.wrong}</td>
                  <td>{v.need}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mb-note">线：<span className="mb-ok">绿</span> 接受且对，<span className="mb-bad">红</span> 接受但错，虚线 不接受。</p>
        </section>
      </div>
    </div>
  )
}

function Inspector({ m, pair, row, rule }) {
  const windows = useMemo(() => {
    if (!row) return null
    return {
      key: greyUrl(crop(pair.a, row.at, m.R), LO, HI),
      top: row.ranking.slice(0, 3).map((c) => ({ ...c, url: greyUrl(crop(pair.b, pair.candidates[c.index], m.R), LO, HI) })),
    }
  }, [m.R, pair, row])

  if (!row) {
    return (
      <section className="mb-panel">
        <p className="mb-label">关键点</p>
        <p className="mb-note">点左图里的一个关键点，看它和右图每个候选窗口的距离。</p>
      </section>
    )
  }

  const max = Math.max(...row.ranking.map((c) => c.d))
  const kept = m.accept(row, rule)
  return (
    <section className="mb-panel">
      <p className="mb-label">关键点 ({row.at[0]}, {row.at[1]})</p>
      <div className="mb-windows">
        <figure>
          <img className="is-key" alt="" src={windows.key} width={64} height={64} />
          <figcaption>左图窗口</figcaption>
        </figure>
        {windows.top.map((c, i) => (
          <figure key={c.index}>
            <img alt="" src={c.url} width={64} height={64} />
            <figcaption>第 {i + 1} 名 · d = {c.d.toFixed(2)}{c.index === row.truth ? ' · 真' : ''}</figcaption>
          </figure>
        ))}
      </div>
      <svg className="mb-bars" viewBox={`0 0 300 ${row.ranking.length * 14 + 4}`} role="img" aria-label="到每个候选的距离">
        {row.ranking.map((c, i) => (
          <g key={c.index} transform={`translate(0 ${i * 14 + 2})`}>
            <text x={0} y={9} className={c.index === row.truth ? 'is-truth' : ''}>{i === 0 ? 'd₁' : i === 1 ? 'd₂' : ''}{c.index === row.truth ? ' 真' : ''}</text>
            <rect className={i === 0 ? 'is-first' : i === 1 ? 'is-second' : ''} x={44} y={1} width={Math.max(1, (c.d / max) * 210)} height={10} />
            <text x={44 + (c.d / max) * 210 + 4} y={9}>{c.d.toFixed(2)}</text>
          </g>
        ))}
      </svg>
      <p className="mb-readout">
        d₁ = <b>{row.d1.toFixed(2)}</b> · d₂ = <b>{row.d2.toFixed(2)}</b> · d₁ / d₂ = <b>{row.ratio.toFixed(2)}</b>
        <br />
        最近的{row.truth < 0 ? '（真的对应点不在右图里）' : row.right ? '是对的' : '不是真的对应点'} · {kept ? '接受' : '不接受'}
      </p>
    </section>
  )
}
