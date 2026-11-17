import { sameJson } from 'kernel/view'

import { ArrowRight, Check, Circle, RotateCcw, X } from 'lucide-react'
import { formatValue, knobKind, needText, rowValue } from '../../core/bench.js'

import { GridPicture } from 'kernel/view'

import { L, keyOf, tr } from 'kernel/view'

import { default as Knob } from './Knob.jsx'

import { TestTabs } from 'kernel/view'

import { default as Plot } from './Plot.jsx'
import { Legend } from './Plot.jsx'

import { Rich } from './Rich.jsx'


// The kernel's display items (../../core/bench.js KERNEL_DISPLAYS): each gets { params, ctx } from Bench.jsx.
// Text a param gives as { of: name } is what the model computed under that name.

const textOf = (text, q) => (text && typeof text === 'object' && 'of' in text ? q[text.of] : text)
// A model's text that may carry a tone: { text, tone }.
const toned = (x) => (x && typeof x === 'object' && 'text' in x && !('off' in x) ? x : { text: x })

/* ---------- knobs ---------- */


function Knobs({ params, ctx }) {
  // The open knobs and the fixed ones (shown, never turned), in the bench's order.
  const knobs = ctx.bench.knobs
  const names = Object.keys(knobs).filter((name) => (ctx.open.includes(name) || knobs[name].fixed) && (!params.only || params.only.includes(name)) && !knobs[name].drawn)
  // Switches side by side, everything else a row of its own.
  const groups = []
  for (const name of names) {
    const toggle = knobKind(ctx.bench.knobs[name]) === 'toggle'
    if (toggle && groups.at(-1)?.toggles) groups.at(-1).names.push(name)
    else groups.push({ toggles: toggle, names: [name] })
  }
  return groups.map((g) => (g.toggles ? <div key={g.names[0]} className="bk-row bench-toggles">{g.names.map((n) => <Knob key={n} name={n} ctx={ctx} />)}</div> : <Knob key={g.names[0]} name={g.names[0]} ctx={ctx} />))
}

function Actions({ params, ctx }) {
  const actions = (ctx.bench.actions ?? []).map((a, i) => [a, i]).filter(([, i]) => !params.only || params.only.includes(i))
  const atStart = (a) => a.reset.every((k) => sameJson(ctx.values[k], ctx.start[k]))
  return (
    <div className="bk-row bench-actions">
      {actions.map(([a, i]) => (
        <button key={i} type="button" className={`bk-btn ${a.primary ? 'is-primary' : ''} ${a.icon ? 'bench-quiet' : ''}`} disabled={(ctx.busy && !a.always) || (a.reset && atStart(a))} onClick={() => ctx.act(a)}>
          {a.icon === 'reset' && <RotateCcw size={14} />}
          <Rich text={(a.id && ctx.q.labels?.[a.id]) ?? a.label} />
        </button>
      ))}
    </div>
  )
}

/* ---------- the goal and the steps ---------- */

function Step({ ctx }) {
  const { stage, stageIndex } = ctx
  return (
    <div>
      <span className="bk-label">{tr(`第 ${stageIndex + 1} 步`, `Step ${stageIndex + 1}`)} · {L(stage.title)}</span>
      <p className="bench-note">{L(stage.note)}</p>
    </div>
  )
}

function Verdict({ params, ctx }) {
  const { stage, bench, q, pass, phone } = ctx
  if (q.say) {
    const say = q.say
    return <p className={`bk-verdict bench-say ${say.tone ? `is-${say.tone}` : ''} ${params.center ? 'is-center' : ''}`} aria-live="polite"><Rich text={phone && say.phone ? say.phone : say.text} /></p>
  }
  const text = pass ? stage?.win ?? bench.win ?? q.win : stage?.status ?? bench.status ?? q.status
  const verdict = <p className={`bk-verdict ${pass ? 'is-pass' : ''}`} aria-live="polite">{pass && <Check size={15} />}<Rich text={text} /></p>
  if (!ctx.stages) return verdict
  return (
    <div className="bench-next">
      {verdict}
      {ctx.passed[ctx.stageIndex] && ctx.stageIndex < ctx.stages.length - 1 && <button type="button" className="bk-btn is-primary" onClick={ctx.next}>{tr('下一步')} <ArrowRight size={15} /></button>}
    </div>
  )
}

function Goals({ params, ctx }) {
  const { cases, verdicts, caseIndex } = ctx
  const style = params.phoneCols === 2 ? 'bk-goals is-two' : 'bk-goals'
  // Judged on submit: the goal's limits show, its readings wait for Check.
  if (!ctx.revealed) {
    return (
      <div className="bk-stack">
        <ul className={style}>
          {verdicts[0].rows.map((r) => (
            <li key={r.limit.of} className="bk-goal">
              <Circle size={14} />
              <span><Rich text={r.limit.label} />{needText(r.limit) && <> <small>{needText(r.limit)}</small></>}</span>
              <b>?</b>
            </li>
          ))}
        </ul>
        <button type="button" className="bk-btn is-primary" onClick={ctx.check}>{tr('检查这个设置')}</button>
      </div>
    )
  }
  if (cases) {
    return (
      <ul className={style}>
        {cases.map((c, i) => (
          <li key={keyOf(c.label)} className={`bk-goal ${verdicts[i].pass ? 'is-pass' : ''} ${i === caseIndex ? 'is-current' : ''}`}>
            {verdicts[i].pass ? <Check size={16} /> : <X size={16} />}
            <span><Rich text={c.label} /></span>
            <b>{verdicts[i].rows.map((r) => <span key={r.limit.of}><Rich text={r.limit.label} /> {rowValue(r.limit, r.value).replace(" / ", "/")}</span>)}</b>
          </li>
        ))}
      </ul>
    )
  }
  return (
    <ul className={style} aria-live="polite">
      {verdicts[0].rows.map((r) => (
        <li key={r.limit.of} className={`bk-goal ${r.pass ? 'is-pass' : ''}`}>
          {r.pass ? <Check size={16} /> : <X size={16} />}
          <span><Rich text={r.limit.label} />{needText(r.limit) && <> <small>{needText(r.limit)}</small></>}</span>
          <b>{rowValue(r.limit, r.value)}</b>
        </li>
      ))}
    </ul>
  )
}

// The steps of a stepped bench: passed ones ticked; any step up to the furthest reached can be reopened.
function Stages({ ctx }) {
  const { stages, stageIndex, passed, reached, setStageIndex } = ctx
  return (
    <ol className="bk-goals" aria-label={tr('步骤')}>
      {stages.map((s, i) => {
        const open = i <= reached
        return (
          <li key={i} className={`bk-goal bench-step ${passed[i] ? 'is-pass' : ''} ${i === stageIndex ? 'is-current' : ''} ${open ? '' : 'is-locked'}`}>
            {passed[i] ? <Check size={16} /> : <Circle size={14} />}
            {open && i !== stageIndex ? <button type="button" onClick={() => setStageIndex(i)}>{L(s.title)}</button> : <span>{L(s.title)}</span>}
            <small>{i + 1} / {stages.length}</small>
          </li>
        )
      })}
    </ol>
  )
}

function Cases({ params, ctx }) {
  const { cases, verdicts, caseIndex, setCase, phone } = ctx
  const states = verdicts.map(({ pass }) => pass ? 'pass' : 'fail')
  const n = states.filter((state) => state === 'pass').length
  return (
    <>
      <TestTabs tests={cases} states={states} index={caseIndex} onSelect={setCase}
        phone={phone} inline authored={false} label={(text) => <Rich text={text} />} />
      {params.passed && !phone && <span className={`bk-chip ${n === cases.length ? 'is-pass' : ''}`}>{n} / {cases.length} <Rich text={params.passed} /></span>}
    </>
  )
}

/* ---------- pictures and readings ---------- */

function PlotItem({ params, ctx }) {
  const { q, phone } = ctx
  const own = params.of ? q[params.of] : null
  const lines = own?.lines ?? params.lines.map((l) => ({ curve: q[l.of], kind: l.kind, label: l.label }))
  const legend = own?.legend ?? (params.lines ?? []).map((l) => ({ kind: l.kind, label: l.legend ?? l.label }))
  const title = textOf(params.title, q)
  const plot = (
    <Plot
      width={phone ? 340 : 600} height={params.height[phone ? 1 : 0]} lines={lines} dots={own?.dots ?? []}
      lo={params.lo ?? 0} hi={params.hi ?? 1} ticks={params.ticks ?? [0, 0.5, 1]} span={own?.span ?? params.span ?? 32} left={params.left ?? 30}
      tickLabel={params.tickFormat ? (t) => formatValue(t, params.tickFormat) : undefined} mark={params.mark ? q[params.mark] : null}
    />
  )
  return (
    <div>
      {title && <span className="bk-label"><Rich text={title} /></span>}
      {plot}
      {params.legend && <Legend entries={legend} />}
    </div>
  )
}

// Rows of pixels, darkest at 0 and lightest at 1.
function Strips({ params, ctx }) {
  return (
    <div className="bench-strips" aria-label={tr('同一行画成像素')}>
      {params.rows.map((row) => {
        const values = ctx.q[row.of]
        return (
          <figure key={row.of} className="bench-strip">
            <GridPicture value={{ w: values.length, h: 1, data: values }} scale={null} decorative />
            <figcaption><Rich text={row.label} /></figcaption>
          </figure>
        )
      })}
    </div>
  )
}

const LOOKS = { legend: 'bk-caption bench-legend-line', label: 'bk-label', note: 'bk-note', caption: 'bk-caption', mono: 'bench-mono', serif: 'bench-serif', small: 'bench-small', lede: 'bench-lede', title: 'bk-title bench-title', line: 'bench-line-text' }

function Text({ params, ctx }) {
  const value = params.of ? ctx.q[params.of] : params.text
  if (value === null || value === undefined) return null
  const { text, tone } = toned(value)
  const look = params.look ?? 'mono'
  const Tag = look === 'label' ? 'span' : 'p'
  return <Tag className={`${LOOKS[look]} ${tone ? `is-${tone}` : ''}`}><Rich text={text} /></Tag>
}

function Stats({ params, ctx }) {
  const { q, pass, phone } = ctx
  const value = (s) => formatValue(q[s.of], s.format ?? 'raw', s.unit ?? '')
  if (phone && params.phone === 'line') {
    return <p className="bench-readout bench-stat-line">{params.of.map((s, i) => <span key={s.of}>{i ? ' · ' : ''}<Rich text={s.label} /> <b>{value(s)}</b></span>)}</p>
  }
  return (
    <div className="bk-stats">
      {params.of.map((s) => <div key={s.of} className={`bk-stat ${s.goal && pass ? 'is-pass' : ''}`}><b>{value(s)}</b><span><Rich text={s.label} /></span></div>)}
    </div>
  )
}

function Chips({ params, ctx }) {
  const value = ctx.q[params.of]
  if (!value) return null
  const list = Array.isArray(value) ? value : [{ text: value }]
  if (params.look === 'wave') return <div className="bench-chips">{list.map((c, i) => <span key={i} className={`bench-chip ${c.tone ? `is-${c.tone}` : ''}`}><Rich text={c.text} /></span>)}</div>
  return <div className="bk-row bench-plain-chips">{list.map((c, i) => <span key={i} className={`bk-chip ${c.tone ? `is-${c.tone}` : ''}`}><Rich text={c.text} /></span>)}</div>
}

// A small curve on its own scale with a caption; an empty box until it has two points.
function Curve({ params, ctx }) {
  const values = ctx.q[params.of]
  const caption = ctx.q[params.caption]
  if (values.length < 2) return <p className="bk-note bench-curve-empty"><Rich text={caption} /></p>
  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = Math.max(1e-9, max - min)
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 200},${56 - ((v - min) / span) * 52}`)
  return (
    <figure className="bench-curve">
      <svg viewBox="0 0 200 60" preserveAspectRatio="none" role="img" aria-label={tr('曲线')}><polyline points={points.join(' ')} /></svg>
      <figcaption className="bk-caption"><Rich text={caption} /></figcaption>
    </figure>
  )
}

// A table the model computes: { head: [text], rows: [{ cells: [text | { text, tone }], dim? }] }.
function Table({ params, ctx }) {
  const { head, rows } = ctx.q[params.of]
  return (
    <table className="bench-table">
      <thead><tr>{head.map((h, i) => <th key={i}><Rich text={h} /></th>)}</tr></thead>
      <tbody>
        {rows.map((row, r) => (
          <tr key={r} className={row.dim ? 'is-dim' : ''}>
            {row.cells.map((cell, i) => {
              const { text, tone } = toned(cell)
              return <td key={i} className={tone ? `is-${tone}` : ''}><Rich text={text} /></td>
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// A row of dots, one per round: 'right', 'wrong', 'now' or not yet.
function Progress({ params, ctx }) {
  const dots = ctx.q[params.of]
  return <div className="bench-progress" style={{ '--n': dots.length }} role="img" aria-label={tr(`${dots.filter((d) => d === 'right').length} 对`, `${dots.filter((d) => d === 'right').length} right`)}>{dots.map((d, i) => <i key={i} className={d ? `is-${d}` : ''} />)}</div>
}

export const displays = {
  'image:display-step': Step,
  'image:display-knobs': Knobs,
  'image:display-actions': Actions,
  'image:display-verdict': Verdict,
  'image:display-goals': Goals,
  'image:display-stages': Stages,
  'image:display-cases': Cases,
  'image:display-plot': PlotItem,
  'image:display-strips': Strips,
  'image:display-text': Text,
  'image:display-stats': Stats,
  'image:display-chips': Chips,
  'image:display-curve': Curve,
  'image:display-table': Table,
  'image:display-progress': Progress,
}
