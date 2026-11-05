// The studio's generic controls: one per kind of field (form.js), for any domain's content. A field's label is its
// key; the vocabulary's `about` shows while the field is in use. What a field may hold comes from its schema alone: a
// choice offers the vocabulary's items or the game's levels (searchable, each with what it is), a call picks an item
// and gives its parameters' fields, a number steps (and slides where its range is known), a list folds its items into
// one-line summaries and reorders them by dragging, cells and ticks are edited as cells (Cells.jsx), text as text with
// its links as chips (TextField.jsx), and a board is drawn (../circuit/svg.js) and edited as blueprint text or in the
// game's own circuit editor. On a wide form a field's label sits beside it (what it means under the label while it is
// in use), and runs of short fields sit several to a row.
//
//   <Field field label onEdit ctx />   onEdit(path, { set } | { unset: true }, type)
//   ctx: { vocabulary, levels, levelOptions, names, onBoard(path), findings: Map(showPath → [says]),
//          before(path) → [had, value] (the field before the pending changes), tests: { of(path), run(path) } }
import { useEffect, useRef, useState } from 'react'
import { ChevronRight, Copy, GripVertical, Minus, Pencil, Play, Plus, RotateCcw, X } from 'lucide-react'
import { L, tr } from '../shell/i18n.js'
import { boardSvg } from '../circuit/svg.js'
import { showPath } from '../engine/ops/edit.js'
import { blank, moved, recast, revertOf, shapeName, summaryOf } from './form.js'
import { Chips, Choice, Picker } from './Picker.jsx'
import { TextField } from './TextField.jsx'
import { GridField, NumbersField, TableField, TicksField, WaveField } from './Cells.jsx'
import { ExprField, IconField } from './PartFields.jsx'
import { useDraft } from './draft.js'


/** Grows with what it holds. */
function Area({ value, onChange, bind, className = '', ...rest }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight + 2}px`
  }, [value])
  return <textarea ref={ref} rows={1} className={`field-area ${className}`} value={value} onChange={(e) => onChange(e.target.value)} {...bind} {...rest} />
}

/** A number: typed, stepped, and slid along its range where both ends are known. */
function NumberField({ field, onSet, label }) {
  const [draft, setDraft, bind] = useDraft(field.value)
  const range = field.min !== undefined && field.max !== undefined && field.max - field.min <= 1000
  const put = (v) => {
    const n = Math.min(field.max ?? Infinity, Math.max(field.min ?? -Infinity, v))
    const round = field.int ? Math.round(n) : Number(n.toFixed(6))
    setDraft(round)
    onSet(round)
  }
  const now = Number(draft)
  return (
    <div className="num">
      <button type="button" className="num-step" onClick={() => put((Number.isFinite(now) ? now : 0) - field.step)} aria-label={tr('减', 'Less')} disabled={field.min !== undefined && now <= field.min}><Minus size={12} /></button>
      <input
        className="field-input is-num" type="number" value={draft ?? ''} min={field.min} max={field.max} step={field.int ? 1 : 'any'} aria-label={label} {...bind}
        onChange={(e) => {
          setDraft(e.target.value)
          if (e.target.value !== '' && Number.isFinite(Number(e.target.value))) onSet(Number(e.target.value))
        }}
      />
      <button type="button" className="num-step" onClick={() => put((Number.isFinite(now) ? now : 0) + field.step)} aria-label={tr('加', 'More')} disabled={field.max !== undefined && now >= field.max}><Plus size={12} /></button>
      {range && <input className="num-slide" type="range" min={field.min} max={field.max} step={field.int ? 1 : field.step === 1 ? (field.max - field.min) / 100 : field.step} value={Number.isFinite(now) ? now : field.min} onChange={(e) => put(Number(e.target.value))} aria-label={label} />}
    </div>
  )
}

function StringField({ field, onSet, label }) {
  const [draft, setDraft, bind] = useDraft(field.value)
  const bad = field.pattern && typeof draft === 'string' && !new RegExp(field.pattern).test(draft)
  return <input className={`field-input ${bad ? 'is-bad' : ''}`} value={draft ?? ''} aria-label={label} spellCheck={false} {...bind} onChange={(e) => { setDraft(e.target.value); onSet(e.target.value) }} />
}

/** JSON, for a value the schema says nothing more about: written when it reads as JSON. */
function AnyField({ field, onSet, label }) {
  const [draft, setDraft, bind] = useDraft(JSON.stringify(field.value, null, 1))
  const [bad, setBad] = useState(false)
  return (
    <Area
      className={`is-code ${bad ? 'is-bad' : ''}`} value={draft ?? ''} bind={bind} aria-label={label} spellCheck={false}
      onChange={(v) => {
        setDraft(v)
        try {
          onSet(JSON.parse(v))
          setBad(false)
        } catch {
          setBad(true)
        }
      }}
    />
  )
}

/** A board: its drawing (open it in the game's circuit editor, in place), and its blueprint text. */
function BoardField({ field, onSet, ctx, label }) {
  const lines = Array.isArray(field.value) ? field.value : []
  const [text, setText] = useState(false)
  const [draft, setDraft, bind] = useDraft(lines.join('\n'))
  let svg = null
  let wrong = null
  try {
    svg = boardSvg(lines)
  } catch (error) {
    wrong = `${tr('第', 'line ')}${error.line}${tr(' 行：', ': ')}${L(error) ?? error.message}`
  }
  return (
    <div className="field-board">
      {svg && (
        <button type="button" className="board-svg is-thumb" onClick={() => ctx.onBoard?.(field.path)} aria-label={tr(`在电路编辑器里改 ${label}`, `Edit ${label} in the circuit editor`)} disabled={!ctx.onBoard}>
          <span dangerouslySetInnerHTML={{ __html: svg }} />
          {ctx.onBoard && <span className="board-edit"><Pencil size={13} aria-hidden="true" /></span>}
        </button>
      )}
      {wrong && <p className="field-bad">{wrong}</p>}
      <button type="button" className={`kit-btn is-label board-text ${text ? 'is-on' : ''}`} onClick={() => setText(!text)}>{tr('蓝图文本', 'Blueprint text')}</button>
      {text && <Area className="is-code" value={draft} aria-label={label} spellCheck={false} bind={{ ...bind, onBlur: () => { bind.onBlur(); if (draft !== lines.join('\n')) onSet(draft.replace(/\n+$/, '').split('\n')) } }} onChange={setDraft} />}
    </div>
  )
}

const CONTAINERS = ['list', 'map', 'obj', 'call']

/** A field's control, its label, what it means (while it is in use), what the check finds on it, and its undo. */
export function Field({ field, label, onEdit, ctx, onRemove = null }) {
  const set = (value) => onEdit(field.path, { set: value }, field.kind)
  const key = showPath(field.path)
  const found = ctx.findings?.get(key) ?? []
  const [had, before] = ctx.before?.(field.path) ?? [false, undefined]
  const changed = ctx.before && !CONTAINERS.includes(field.kind) && JSON.stringify(had ? before : undefined) !== JSON.stringify(field.value)
  const revert = () => onEdit(field.path, revertOf(had ? before : undefined), field.kind)
  const name = label ?? ''
  const body = (() => {
    switch (field.kind) {
      case 'text': return <TextField value={field.value} onSet={set} label={name} field={ctx.textField?.(field.path) ?? ''} names={ctx.names} findings={found} />
      case 'num': return <NumberField field={field} onSet={set} label={name} />
      case 'bool': return <input type="checkbox" className="field-check" checked={Boolean(field.value)} onChange={(e) => set(e.target.checked)} aria-label={name} />
      case 'str': return <StringField field={field} onSet={set} label={name} />
      case 'expr': return <ExprField field={field} onSet={set} ctx={ctx} label={name} />
      case 'icon': return <IconField field={field} onSet={set} label={name} />
      case 'choice': return <Choice options={field.of === 'level' && ctx.levelOptions ? ctx.levelOptions : field.options} value={field.value} onPick={set} label={name} />
      case 'chips': return <Chips options={field.of === 'level' && ctx.levelOptions ? ctx.levelOptions : field.options} values={Array.isArray(field.value) ? field.value : []} onSet={set} label={name} />
      case 'board': return <BoardField field={field} onSet={set} ctx={ctx} label={name} />
      case 'grid': return <GridField field={field} onSet={set} label={name} />
      case 'numbers': return <NumbersField field={field} onSet={set} label={name} />
      case 'table': return <TableField field={field} onSet={set} label={name} />
      case 'ticks': return <TicksField field={field} onSet={set} label={name} />
      case 'wave': return <WaveField field={field} onEdit={onEdit} label={name} />
      case 'call': return <CallField field={field} onEdit={onEdit} ctx={ctx} label={name} />
      case 'list': return <ListField field={field} onEdit={onEdit} ctx={ctx} />
      case 'map': return <MapField field={field} onEdit={onEdit} ctx={ctx} />
      case 'obj': return <ObjField field={field} onEdit={onEdit} ctx={ctx} />
      default: return <AnyField field={field} onSet={set} label={name} />
    }
  })()
  const head = (label !== null || onRemove || field.tags || field.shapes?.length > 1 || changed) && (
    <div className="field-head">
      {label !== null && <span className="field-key" title={field.about ? L(field.about) : undefined}>{label}</span>}
      {field.tags && <TagChoice field={field} onEdit={onEdit} ctx={ctx} />}
      {field.shapes?.length > 1 && <Shapes field={field} onEdit={onEdit} ctx={ctx} />}
      {changed && <button type="button" className="field-undo" onClick={revert} title={tr('改回去', 'Put it back')} aria-label={tr(`把 ${name} 改回去`, `Put ${name} back`)}><RotateCcw size={12} /></button>}
      {onRemove && <button type="button" className="field-x" onClick={onRemove} aria-label={tr('去掉', 'Remove')}><X size={13} /></button>}
      {label !== null && field.about && <span className="field-help">{L(field.about)}</span>}
    </div>
  )
  return (
    <div className={`field is-${field.kind} ${CONTAINERS.includes(field.kind) ? 'is-nested' : ''} ${head ? 'has-head' : ''} ${changed ? 'is-changed' : ''} ${found.length ? 'is-wrong' : ''}`} data-path={key}>
      {head}
      <div className="field-body">
        {body}
        {field.kind !== 'text' && found.length > 0 && <ul className="field-findings">{found.map((f) => <li key={f}>{f}</li>)}</ul>}
      </div>
    </div>
  )
}

/** A by's shape (a level's kind, say; nested bys one after another): picking another keeps the fields the shapes share. */
export function TagChoice({ field, onEdit, ctx }) {
  return (
    <span className="field-tag">
      {field.tags.map((tag) => <Choice key={tag.key} options={tag.options} value={tag.value} label={tag.key} onPick={(to) => onEdit(field.path, { set: recast(tag, field.value, to, ctx) }, 'obj')} />)}
    </span>
  )
}

/** An either's shapes, when it has several: switching starts the other shape blank. */
export function Shapes({ field, onEdit, ctx }) {
  return (
    <span className="field-shapes">
      {field.shapes.map((shape, k) => (
        <button key={k} type="button" className={k === field.shape ? 'is-on' : ''} onClick={() => k !== field.shape && onEdit(field.path, { set: blank(shape, ctx) }, null)}>{shapeName(shape, field.shapes)}</button>
      ))}
    </span>
  )
}

function CallField({ field, onEdit, ctx, label }) {
  const choose = (item) => {
    const it = ctx.vocabulary.kinds[field.of][item]
    onEdit(field.path, { set: it.params ? { [item]: blank(it.params, ctx) } : item }, 'call')
  }
  return (
    <>
      <Picker options={field.options} value={field.item ?? undefined} onPick={choose} label={label} />
      {field.params && <Field field={field.params} label={null} onEdit={onEdit} ctx={ctx} />}
    </>
  )
}

const SCALARS = ['text', 'num', 'bool', 'str', 'choice', 'chips', 'numbers', 'ticks', 'board', 'any']

/**
 * A list: each item with a handle to drag it elsewhere (or Alt+↑ / Alt+↓), a copy and a remove. Items that are
 * objects fold into a one-line summary. A level's tests (section 'tests') are cards that show what the level's screen
 * shows of each and how its reference does on it, run on demand (the run_tests tool).
 */
function ListField({ field, onEdit, ctx }) {
  const items = field.items
  const values = items.map((i) => i.value)
  const inline = items.length > 0 && SCALARS.includes(items[0].kind)
  const [open, setOpen] = useState(() => new Set(items.length <= 2 ? items.map((_, k) => k) : []))
  const [drag, setDrag] = useState(null)
  const [over, setOver] = useState(null)
  const put = (next) => onEdit(field.path, { set: next }, 'list')
  const run = field.tests ? ctx.tests?.of(field.path) : null
  const fold = (k) => setOpen((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n })
  const drop = (k) => {
    if (drag !== null && drag !== k) put(moved(values, drag, k))
    setDrag(null)
    setOver(null)
  }
  return (
    <div className={`field-list ${inline ? 'is-inline' : ''}`}>
      {(field.tests || (!inline && items.length > 2)) && (
        <div className="list-tools">
          {field.tests && ctx.tests && <button type="button" className="kit-btn is-label" onClick={() => ctx.tests.run(field.path)} disabled={run?.running}><Play size={13} aria-hidden="true" />{tr('运行参考解', 'Run the reference')}</button>}
          {run && !run.running && <TestsSum run={run} />}
          {run?.refused && <ul className="field-findings">{run.refused.map((r, k) => <li key={k}>{L(r)}</li>)}</ul>}
          {!inline && items.length > 2 && <button type="button" className="kit-btn is-label" onClick={() => setOpen(open.size ? new Set() : new Set(items.map((_, k) => k)))}>{open.size ? tr('全部收起', 'Fold all') : tr('全部展开', 'Unfold all')}</button>}
        </div>
      )}
      {items.map((item, k) => {
        const result = run?.tests?.length === items.length ? run.tests[k] : null
        const isOpen = inline || open.has(k)
        return (
          <div
            key={k} className={`li ${isOpen ? 'is-open' : ''} ${over === k ? 'is-over' : ''} ${drag === k ? 'is-dragging' : ''} ${result ? (result.pass ? 'is-pass' : result.pass === false ? 'is-fail' : '') : ''}`}
            onDragOver={(e) => { if (drag !== null) { e.preventDefault(); setOver(k) } }} onDrop={(e) => { e.preventDefault(); drop(k) }}
          >
            <div className="li-head">
              <button
                type="button" className="li-grip" draggable aria-label={tr(`第 ${k + 1} 项：拖动或 Alt+↑↓ 换位置`, `Item ${k + 1}: drag, or Alt+↑↓, to move it`)}
                onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(k)); setDrag(k) }} onDragEnd={() => { setDrag(null); setOver(null) }}
                onKeyDown={(e) => {
                  if (!e.altKey || !['ArrowUp', 'ArrowDown'].includes(e.key)) return
                  e.preventDefault()
                  const to = k + (e.key === 'ArrowUp' ? -1 : 1)
                  if (to >= 0 && to < items.length) put(moved(values, k, to))
                }}
              ><GripVertical size={13} aria-hidden="true" /><span>{k + 1}</span></button>
              {!inline && (
                <button type="button" className="li-fold" onClick={() => fold(k)} aria-expanded={isOpen}>
                  <ChevronRight size={13} aria-hidden="true" />
                  {!isOpen && <span className="li-sum">{summaryOf(item.value) || '—'}</span>}
                </button>
              )}
              {inline && <div className="li-body"><Field field={item} label={null} onEdit={onEdit} ctx={ctx} /></div>}
              {result && <TestMark result={result} />}
              <span className="li-tools">
                <button type="button" onClick={() => put([...values.slice(0, k + 1), structuredCopy(values[k]), ...values.slice(k + 1)])} aria-label={tr('复制这一项', 'Copy this item')}><Copy size={12} /></button>
                <button type="button" onClick={() => onEdit(item.path, { unset: true }, null)} aria-label={tr('去掉这一项', 'Remove this item')}><X size={13} /></button>
              </span>
            </div>
            {!inline && isOpen && (
              <div className="li-body">
                {result && <TestShows result={result} />}
                <Field field={item} label={null} onEdit={onEdit} ctx={ctx} />
              </div>
            )}
          </div>
        )
      })}
      {run?.tests && run.tests.length !== items.length && run.tests.map((t, k) => <TestShows key={k} result={t} />)}
      {run && !run.covered && !run.running && <p className="field-note">{L(run.why)}</p>}
      <button type="button" className="field-add" onClick={() => onEdit([...field.path, items.length], { set: items.length ? structuredCopy(values.at(-1)) : blank(field.of, ctx) }, field.of.type)} aria-label={tr('加一项', 'Add an item')}><Plus size={13} aria-hidden="true" /></button>
    </div>
  )
}

const structuredCopy = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)))

function TestsSum({ run }) {
  if (!run.covered) return null
  const passed = run.tests.filter((t) => t.pass).length
  return (
    <span className={`tests-sum ${run.pass ? 'is-pass' : 'is-fail'}`}>
      {run.refused ? tr('参考解读不进来', 'The reference does not read') : `${passed}/${run.tests.length}`}
      {run.hidden?.count ? ` · ${tr('隐藏', 'hidden')} ${run.hidden.count - (run.hidden.failed ?? 0)}/${run.hidden.count}` : ''}
    </span>
  )
}

const TestMark = ({ result }) => <span className={`test-mark ${result.pass ? 'is-pass' : result.pass === false ? 'is-fail' : ''}`}>{result.pass ? '✓' : result.pass === false ? '✗' : '·'}</span>

/** A test as the level's screen shows it (what it gives and what it expects), and what the run said. */
function TestShows({ result }) {
  return (
    <div className="test-shows">
      {result.label && <b>{L(result.label)}</b>}
      {result.shows && <pre>{L(result.shows)}</pre>}
      {result.says && <p>{L(result.says)}</p>}
    </div>
  )
}

function MapField({ field, onEdit, ctx }) {
  const [key, setKey] = useState('')
  return (
    <div className="field-list">
      {field.entries.map(({ key: k, field: f }) => <Field key={k} field={f} label={k} onEdit={onEdit} ctx={ctx} onRemove={() => onEdit(f.path, { unset: true }, null)} />)}
      <form className="field-row new-key" onSubmit={(e) => { e.preventDefault(); if (key) onEdit([...field.path, key], { set: blank(field.of, ctx) }, field.of.type); setKey('') }}>
        <input className="field-input is-key" value={key} onChange={(e) => setKey(e.target.value)} aria-label={tr('新的键', 'New key')} placeholder="+" />
      </form>
    </div>
  )
}

/** Kinds of value short enough to sit several to a row on a wide form. */
const SHORT = ['num', 'bool', 'str', 'choice', 'chips', 'numbers']
const isShort = (f) => SHORT.includes(f.kind) || (f.kind === 'call' && !f.params)

/** An object's fields (runs of short ones side by side), then a row of the optional ones it has not, to add. */
export function ObjField({ field, onEdit, ctx, keys = null }) {
  const tags = new Set((field.tags ?? []).map((t) => t.key))
  const mine = field.fields.filter((f) => !tags.has(f.key) && (!keys || keys.includes(f.key)))
  const absent = mine.filter((f) => !f.field && f.optional)
  const runs = []
  for (const f of mine.filter((x) => x.field)) {
    const short = isShort(f.field)
    if (short && runs.at(-1)?.short) runs.at(-1).fields.push(f)
    else runs.push({ short, fields: [f] })
  }
  const one = (f) => <Field key={f.key} field={{ ...f.field, about: f.about ?? f.field.about }} label={f.key} onEdit={onEdit} ctx={ctx} onRemove={f.optional ? () => onEdit(f.field.path, { unset: true }, null) : null} />
  return (
    <div className="field-obj">
      {runs.map((run) => (run.short && run.fields.length > 1 ? <div key={run.fields[0].key} className="field-grid">{run.fields.map(one)}</div> : run.fields.map(one)))}
      {absent.length > 0 && (
        <div className="field-absent">
          {absent.map((f) => (
            <button key={f.key} type="button" title={f.about ? L(f.about) : undefined} onClick={() => onEdit([...field.path, f.key], { set: blank(f.schema, ctx) }, f.schema.type)}>
              <Plus size={11} aria-hidden="true" />{f.key}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export { TextField }
