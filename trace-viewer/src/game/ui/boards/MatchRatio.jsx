import { useMemo, useState } from 'react'
import { Check, X } from 'lucide-react'
import { greyUrl, useSolveOnce } from './matchDraw.js'
import { PHONE, useMedia } from '../useMedia.js'
import { L, keyOf, tr } from '../../i18n.js'
import './MatchBoards.css'

// 6-2 找对应: every keypoint of the left photo takes the right photo's candidate with the nearest
// 5×5 window. The player picks the rule that decides which of these nearest matches to keep.

const S = 8 // screen units per pixel
const GAP = 56 // between the photos, side by side
const GAP_V = 40 // between the photos, stacked on a phone
const LO = 0
const HI = 1.15
const BARS = 6 // candidates listed in the inspector

const RULES = [
  ['all', { zh: '全部接受', en: 'Accept all' }],
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
  const phone = useMedia(PHONE)
  const [pairIndex, setPairIndex] = useState(0)
  const [rule, setRule] = useState({ mode: 'all', t: 2, r: 1 })
  const [selected, setSelected] = useState(null)
  const verdicts = m.rows.map((rows) => m.judge(rows, rule))
  const done = verdicts.every((v) => v.pass)
  useSolveOnce(done, onSolve)

  const pair = m.pairs[pairIndex]
  const rows = m.rows[pairIndex]
  const urls = useMemo(() => m.pairs.map((p) => [greyUrl(p.a, LO, HI), greyUrl(p.b, LO, HI)]), [m.pairs])
  const pick = selected !== null && rows[selected] ? selected : null
  const row = pick === null ? null : rows[pick]

  // Side by side on a wide screen; stacked (left photo above the right one) on a phone, so the
  // photos stay large enough to tap a keypoint.
  const iw = m.W * S
  const ih = m.H * S
  const [ox, oy] = phone ? [0, ih + GAP_V] : [iw + GAP, 0]
  const fs = phone ? 11.5 : 8
  const hit = phone ? 20 : 12
  const px = (v) => (v + 0.5) * S
  const view = phone ? `-6 -${fs + 10} ${iw + 12} ${2 * ih + GAP_V + fs + 16}` : `-6 -${fs + 10} ${2 * iw + GAP + 12} ${ih + fs + 16}`
  const ranked = row ? row.ranking.slice(0, 2).map((c) => c.index) : []
  const passed = verdicts.filter((v) => v.pass).length

  const controls = (
    <section className="bk-panel mb-rules">
      <span className="bk-label">{tr('接受规则', 'Acceptance rule')}</span>
      <div className="bk-seg mb-rule-seg" role="group" aria-label={tr('接受规则', 'Acceptance rule')}>
        {RULES.map(([mode, label]) => (
          <button key={mode} aria-pressed={rule.mode === mode} onClick={() => setRule((r) => ({ ...r, mode }))}>{L(label)}</button>
        ))}
      </div>
      {rule.mode === 'dist' && (
        <label className="bk-field">
          <span>t</span>
          <input className="bk-range" type="range" min={0} max={2.5} step={0.01} value={rule.t} style={{ '--fill': `${(rule.t / 2.5) * 100}%` }} onChange={(e) => setRule((r) => ({ ...r, t: Number(e.target.value) }))} aria-label={tr('距离阈值 t', 'Distance threshold t')} />
          <output>{rule.t.toFixed(2)}</output>
        </label>
      )}
      {rule.mode === 'ratio' && (
        <label className="bk-field">
          <span>r</span>
          <input className="bk-range" type="range" min={0} max={1} step={0.01} value={rule.r} style={{ '--fill': `${rule.r * 100}%` }} onChange={(e) => setRule((r) => ({ ...r, r: Number(e.target.value) }))} aria-label={tr('比值阈值 r', 'Ratio threshold r')} />
          <output>{rule.r.toFixed(2)}</output>
        </label>
      )}
      {rule.mode === 'all' && <p className="bk-note mb-rule-note">{tr('每个关键点都收下它的第一名。', 'Every keypoint keeps its first place.')}</p>}
    </section>
  )

  const goals = (
    <section className="bk-panel">
      <span className="bk-label">{tr('目标 · 不接受错的，独特的点都找回', 'Goal · accept nothing wrong, find every distinctive point')}</span>
      <ul className="bk-goals">
        {verdicts.map((v, i) => (
          <li key={keyOf(m.pairs[i].label)} className={`bk-goal ${v.pass ? 'is-pass' : ''} ${i === pairIndex ? 'is-current' : ''}`}>
            {v.pass ? <Check size={16} /> : <X size={16} />}
            <span>{L(m.pairs[i].label)} <small>{tr('接受', 'accepted')} {v.accepted}</small></span>
            <b>
              {tr('对', 'right')} <span className={v.correct >= v.need ? 'mb-ok' : ''}>{v.correct}/{v.need}</span> · {tr('错', 'wrong')} <span className={v.wrong ? 'mb-bad' : 'mb-ok'}>{v.wrong}</span>
            </b>
          </li>
        ))}
      </ul>
    </section>
  )

  return (
    <div className="bk mb mb-match">
      <div className="mb-head">
        <div className="bk-seg" role="group" aria-label={tr('图对', 'Image pairs')}>
          {m.pairs.map((p, i) => (
            <button key={keyOf(p.label)} aria-pressed={i === pairIndex} onClick={() => { setPairIndex(i); setSelected(null) }}>
              {verdicts[i].pass ? <Check size={14} className="mb-ok" /> : <X size={14} className="mb-bad" />}
              {L(p.label)}
            </button>
          ))}
        </div>
        {!phone && <span className={`bk-chip ${done ? 'is-pass' : ''}`}>{passed} / {m.pairs.length} {tr('组通过', 'sets passed')}</span>}
      </div>

      <figure className="bk-stage mb-figure">
        <svg className="mb-svg" viewBox={view} role="img" aria-label={tr('左图、右图和每个关键点的最近匹配', 'Left image, right image and the nearest match of each keypoint')} style={{ '--fs': `${fs}px` }}>
          <text className="mb-caption" x={0} y={-8}>{tr('左图 · 关键点', 'Left image · keypoints')}</text>
          <text className="mb-caption" x={ox} y={oy - 8}>{tr('右图 · 候选窗口', 'Right image · candidate windows')}</text>
          <image className="mb-pixels" href={urls[pairIndex][0]} x={0} y={0} width={iw} height={ih} preserveAspectRatio="none" />
          <image className="mb-pixels" href={urls[pairIndex][1]} x={ox} y={oy} width={iw} height={ih} preserveAspectRatio="none" />
          <rect className="mb-frame" x={0} y={0} width={iw} height={ih} />
          <rect className="mb-frame" x={ox} y={oy} width={iw} height={ih} />
          {pair.candidates.map(([x, y], i) => (
            <rect key={i} className={`mb-cand ${ranked.includes(i) ? 'is-ranked' : ''}`} x={ox + px(x) - (m.R + 0.5) * S} y={oy + px(y) - (m.R + 0.5) * S} width={(2 * m.R + 1) * S} height={(2 * m.R + 1) * S} />
          ))}
          {rows.map((r, i) => {
            const [bx, by] = pair.candidates[r.best]
            const keep = m.accept(r, rule)
            const tone = keep ? (r.right ? 'is-good' : 'is-wrong') : 'is-off'
            return <line key={i} className={`mb-match-line ${tone} ${pick === i ? 'is-selected' : ''} ${pick !== null && pick !== i ? 'is-muted' : ''}`} x1={px(r.at[0])} y1={px(r.at[1])} x2={ox + px(bx)} y2={oy + px(by)} />
          })}
          {ranked.map((index, k) => {
            const [x, y] = pair.candidates[index]
            return <text key={`r${k}`} className="mb-rank-tag" x={ox + px(x) + (m.R + 0.5) * S + 3} y={oy + px(y) - (m.R + 0.5) * S + fs * 0.9}>{k ? 'd₂' : 'd₁'}</text>
          })}
          {rows.map((r, i) => (
            <g key={i} className="mb-key-hit" onClick={() => setSelected(pick === i ? null : i)} data-key={i}>
              <circle cx={px(r.at[0])} cy={px(r.at[1])} r={hit} fill="transparent" />
              <circle className={`mb-key ${pick === i ? 'is-selected' : ''}`} cx={px(r.at[0])} cy={px(r.at[1])} r={phone ? 6 : 5} />
            </g>
          ))}
        </svg>
        <figcaption className="bk-caption mb-match-caption">
          <span className="mb-readout">
            {row ? (
              <>
                {tr('关键点', 'Keypoint')} ({row.at[0]}, {row.at[1]}) · d₁ <b>{row.d1.toFixed(2)}</b> · d₂ <b>{row.d2.toFixed(2)}</b> · d₁/d₂ <b>{row.ratio.toFixed(2)}</b> ·{' '}
                <b className={m.accept(row, rule) ? (row.right ? 'mb-ok' : 'mb-bad') : ''}>{m.accept(row, rule) ? (row.right ? tr('接受 · 对', 'accepted · right') : tr('接受 · 错', 'accepted · wrong')) : tr('不接受', 'rejected')}</b>
              </>
            ) : (
              tr('点左图里的关键点，看它的第一名 d₁ 和第二名 d₂。', 'Click a keypoint in the left image to see its first place d₁ and second place d₂.')
            )}
          </span>
          <span className="mb-legend">
            <i className="mb-swatch is-good" />{tr('接受且对', 'accepted, right')} <i className="mb-swatch is-wrong" />{tr('接受但错', 'accepted, wrong')} <i className="mb-swatch is-off" />{tr('不接受', 'rejected')}
          </span>
        </figcaption>
      </figure>

      {phone ? (
        <>
          <div className="mb-dock">{controls}</div>
          {goals}
          <Inspector m={m} pair={pair} row={row} rule={rule} />
        </>
      ) : (
        <div className="bk-split mb-match-split">
          <Inspector m={m} pair={pair} row={row} rule={rule} />
          <div className="bk-panel mb-merged">
            {controls}
            {goals}
          </div>
        </div>
      )}
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
      <section className="bk-panel is-quiet mb-inspector">
        <span className="bk-label">{tr('关键点', 'Keypoint')}</span>
        <p className="bk-note">{tr('点左图里的一个关键点（圆圈），这里会列出它和右图每个候选窗口的距离，第一名 d₁、第二名 d₂。', 'Click a keypoint (circle) in the left image to list its distance to every candidate window in the right image, with first place d₁ and second place d₂.')}</p>
      </section>
    )
  }

  // Where the current rule draws the line on the distance axis: t itself, or r · d₂ for the ratio test.
  const cut = rule.mode === 'dist' ? rule.t : rule.mode === 'ratio' ? rule.r * row.d2 : null
  const max = Math.max(...row.ranking.slice(0, BARS).map((c) => c.d), cut ?? 0) * 1.04
  const kept = m.accept(row, rule)
  return (
    <section className="bk-panel mb-inspector">
      <span className="bk-label">{tr(`关键点 (${row.at[0]}, ${row.at[1]}) 的候选`, `Candidates for keypoint (${row.at[0]}, ${row.at[1]})`)}</span>
      <div className="mb-windows">
        <figure>
          <img className="is-key" alt="" src={windows.key} width={64} height={64} />
          <figcaption>{tr('左图窗口', 'Left window')}</figcaption>
        </figure>
        {windows.top.map((c, i) => (
          <figure key={c.index}>
            <img className={c.index === row.truth ? 'is-truth' : ''} alt="" src={c.url} width={64} height={64} />
            <figcaption>{tr(`第 ${i + 1} 名`, `No. ${i + 1}`)} · {c.d.toFixed(2)}{c.index === row.truth ? tr(' · 真', ' · true') : ''}</figcaption>
          </figure>
        ))}
      </div>
      <div className="mb-bars" role="img" aria-label={tr('到每个候选的距离', 'Distance to each candidate')}>
        {row.ranking.slice(0, BARS).map((c, i) => (
          <div key={c.index} className={`mb-bar ${i === 0 ? 'is-first' : i === 1 ? 'is-second' : ''}`}>
            <span className={c.index === row.truth ? 'mb-ok' : ''}>{i === 0 ? 'd₁' : i === 1 ? 'd₂' : ''}{c.index === row.truth ? tr(' 真', ' true') : ''}</span>
            <i><s style={{ width: `${(c.d / max) * 100}%` }} /></i>
            <b>{c.d.toFixed(2)}</b>
          </div>
        ))}
        {cut !== null && (
          <div className="mb-cut" style={{ '--at': cut / max }}>
            <span>{rule.mode === 'dist' ? 't' : 'r·d₂'}</span>
          </div>
        )}
      </div>
      <p className="bk-note">
        {tr('最近的', 'The nearest ')}{row.truth < 0 ? tr('那个不是：真的对应点不在右图里', 'is not it: the true match is not in the right image') : row.right ? tr('就是真的对应点', 'is the true match') : tr('不是真的对应点', 'is not the true match')} · {tr('规则', 'the rule ')}{kept ? <b className={row.right ? 'mb-ok' : 'mb-bad'}>{tr('接受', 'accepts')}</b> : <b>{tr('不接受', 'rejects')}</b>}{tr('它', ' it')}
      </p>
    </section>
  )
}
