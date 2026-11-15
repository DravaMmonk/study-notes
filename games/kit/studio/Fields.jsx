// The studio's generic controls: one per kind of field (form.js), for any domain's content. A field's label is its
// key; the vocabulary's `about` is the title's native tooltip. What a field may hold comes from its schema alone: a
// choice offers the vocabulary's items or the game's levels (searchable, each with what it is), a call picks an item
// and gives its parameters' fields, a number steps (and slides where its range is known), a list folds its items into
// one-line summaries and reorders them by dragging, cells and ticks are edited as cells (Cells.jsx), text as text with
// its links as chips (TextField.jsx), and a board is drawn (../circuit/svg.js) and edited as blueprint text or in the
// game's own circuit editor. On a wide form a field's label sits beside it, and runs of short fields sit several to a row.
//
//   <Field field label onEdit ctx />   onEdit(path, { set } | { unset: true }, type)
//   ctx: { vocabulary, levels, levelOptions, names, onBoard(path), findings: Map(showPath → [says]),
//          before(path) → [had, value] (the field before the pending changes) }
import { useEffect, useRef, useState } from 'react'
import { ChevronRight, Copy, GripVertical, Minus, Pencil, Plus, RotateCcw, X } from 'lucide-react'
import { getLang, L, tr } from '../shell/i18n.js'
import { stepNumber } from '../shell/number-entry.js'
import { boardSvg } from '../circuit/svg.js'
import { copyWithoutTextKeys } from '../engine/catalogs.js'
import { textIn, textKey } from '../engine/i18n.js'
import { showPath } from '../engine/ops/edit.js'
import { creationChoices, moved, revertOf, summaryOf, taskOptionsOf } from './form.js'
import { AddKey, AddMenu, Chips, Picker } from './Picker.jsx'
import { TextField } from './TextField.jsx'
import { GridField, NumbersField, TableField, TicksField, WaveField } from './Cells.jsx'
import { AddFields, AttachSetting, ExprField, IconField } from './PartFields.jsx'
import { useDraft } from './draft.js'
import { confirmDelete } from './delete.js'


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
  const put = (value) => {
    const round = field.int ? Math.round(value) : Number(value.toFixed(6))
    setDraft(round)
    onSet(round)
  }
  const now = Number(draft)
  const current = Number.isFinite(now) ? now : 0
  const before = stepNumber(current, -1, field)
  const after = stepNumber(current, 1, field)
  return (
    <div className="num">
      <button type="button" className="num-step" onClick={() => put(before)} aria-label={tr('减')} disabled={before === null}><Minus size={12} /></button>
      <input
        className="field-input is-num" type="number" value={draft ?? ''} min={field.min} max={field.max} step={field.int ? 1 : 'any'} aria-label={label} {...bind}
        onChange={(e) => {
          setDraft(e.target.value)
          if (e.target.value !== '' && Number.isFinite(Number(e.target.value))) onSet(Number(e.target.value))
        }}
      />
      <button type="button" className="num-step" onClick={() => put(after)} aria-label={tr('加', 'More')} disabled={after === null}><Plus size={12} /></button>
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
    wrong = tr(error.zh, error.en) ?? error.message
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
      <button type="button" className={`kit-btn is-label board-text ${text ? 'is-on' : ''}`} onClick={() => setText(!text)}>{tr('蓝图文本')}</button>
      {text && <Area className="is-code" value={draft} aria-label={label} spellCheck={false} bind={{ ...bind, onBlur: () => { bind.onBlur(); if (draft !== lines.join('\n')) onSet(draft.replace(/\n+$/, '').split('\n')) } }} onChange={setDraft} />}
    </div>
  )
}

const CONTAINERS = ['list', 'map', 'obj', 'call']

/** A field's control, title tooltip, findings, and undo. */
export function Field({ field, label, onEdit, ctx, onRemove = null }) {
  const set = (value) => onEdit(field.path, { set: value }, field.kind)
  const key = showPath(field.path)
  const found = ctx.findings?.get(key) ?? []
  const [had, before] = ctx.before?.(field.path) ?? [false, undefined]
  const lang = ctx.lang ?? getLang()
  const localeEdit = field.kind === 'text' && textKey(field.value) && textKey(before) === textKey(field.value)
  const changed = ctx.before && field.kind !== 'fixed' && !CONTAINERS.includes(field.kind)
    && (localeEdit ? textIn(before, lang) !== textIn(field.value, lang) : JSON.stringify(had ? before : undefined) !== JSON.stringify(field.value))
  const revert = () => onEdit(field.path, localeEdit ? { set: textIn(before, lang), lang } : revertOf(had ? before : undefined), field.kind)
  const name = label ?? ''
  const body = (() => {
    switch (field.kind) {
      case 'text': return <TextField key={lang} lang={lang} value={field.value}
        onSet={(value) => onEdit(field.path, { set: value, lang: typeof field.value === 'string' ? undefined : lang }, 'text')}
        label={name} field={ctx.textField?.(field.path) ?? ''} names={ctx.names} findings={found} />
      case 'num': return <NumberField field={field} onSet={set} label={name} />
      case 'bool': return <input type="checkbox" className="field-check" checked={Boolean(field.value)} onChange={(e) => set(e.target.checked)} aria-label={name} />
      case 'str': return <StringField field={field} onSet={set} label={name} />
      case 'expr': return <ExprField field={field} onSet={set} ctx={ctx} label={name} />
      case 'icon': return <IconField field={field} onSet={set} label={name} />
      case 'choice':
        if (field.of === 'setting') return <div className="expr-line">
          <Picker options={field.options} value={field.value} onPick={set} label={tr('已有设置', 'Existing setting')} />
          <button type="button" className="kit-btn is-label" onClick={() => ctx.onSetting(field.value)} disabled={!ctx.onSetting || !field.options.some((o) => o.value === field.value)}>{tr('编辑设置', 'Edit setting')}</button>
        </div>
        return <Picker options={field.of === 'level' && ctx.levelOptions ? ctx.levelOptions : field.of === 'task' && ctx.levelOptions ? taskOptionsOf(ctx.levelOptions) : field.options} value={field.value} onPick={set} label={name} />
      case 'chips': return <Chips options={field.of === 'level' && ctx.levelOptions ? ctx.levelOptions : field.options} values={Array.isArray(field.value) ? field.value : []} onSet={set} label={name} />
      case 'board': return <BoardField field={field} onSet={set} ctx={ctx} label={name} />
      case 'grid': return <GridField field={field} onSet={set} label={name} />
      case 'numbers': return <NumbersField field={field} onSet={set} label={name} />
      case 'table': return <TableField field={field} onSet={set} label={name} />
      case 'ticks': return <TicksField field={field} onSet={set} label={name} />
      case 'wave': return <WaveField field={field} onEdit={onEdit} label={name} />
      case 'fixed': return <code className="field-key">{String(field.value)}</code>
      case 'call': return <>
        <code className="field-key">{field.item}</code>
        {field.params && <Field field={field.params} label={null} onEdit={onEdit} ctx={ctx} />}
      </>
      case 'list': return <ListField field={field} onEdit={onEdit} ctx={ctx} />
      case 'map': return <MapField field={field} onEdit={onEdit} ctx={ctx} />
      case 'obj': return <ObjField field={field} onEdit={onEdit} ctx={ctx} />
      default: return <AnyField field={field} onSet={set} label={name} />
    }
  })()
  const head = (label !== null || onRemove || field.tags || changed) && (
    <div className="field-head">
      {label !== null && <span className="field-key" title={field.about ? L(field.about) : undefined}>{label}</span>}
      {field.tags && <FieldTags tags={field.tags} />}
      {changed && <button type="button" className="field-undo" onClick={revert} title={tr('改回去')} aria-label={tr(`把 ${name} 改回去`, `Put ${name} back`)}><RotateCcw size={12} /></button>}
      {onRemove && <button type="button" className="field-x" onClick={() => { if (confirmDelete(key)) onRemove() }} aria-label={tr('去掉')}><X size={13} /></button>}
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

/** The discriminators of an existing configuration are read-only. */
export function FieldTags({ tags }) {
  return (
    <span className="field-tag">
      {tags.map(({ key, value }) => <code className="field-key" key={key} title={key}>{String(value ?? '—')}</code>)}
    </span>
  )
}

const SCALARS = ['text', 'num', 'bool', 'str', 'choice', 'chips', 'numbers', 'ticks', 'board', 'any']

/**
 * A list: each item with a handle to drag it elsewhere (or Alt+↑ / Alt+↓), a copy and a remove. Items that are
 * objects fold into a one-line summary.
 */
function ListField({ field, onEdit, ctx }) {
  const items = field.items
  const values = items.map((i) => i.value)
  const inline = field.bindings || items.length > 0 && SCALARS.includes(items[0].kind)
  const choices = field.bindings ? [] : creationChoices(field.of, ctx)
  const tasks = field.path.length === 1 && field.path[0] === 'tasks'
  const [open, setOpen] = useState(() => new Set(items.length <= 2 ? items.map((_, k) => k) : []))
  const [drag, setDrag] = useState(null)
  const [over, setOver] = useState(null)
  const put = (next) => onEdit(field.path, { set: next }, 'list')
  const remove = (item, index) => {
    if (!confirmDelete(item.value?.id ?? showPath(item.path))) return
    if (tasks) put(values.filter((_, k) => k !== index))
    else onEdit(item.path, { unset: true }, null)
  }
  const duplicate = (item) => {
    const draft = copyWithoutTextKeys(item)
    if (tasks) delete draft.id
    return draft
  }
  const fold = (k) => setOpen((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n })
  const drop = (k) => {
    if (drag !== null && drag !== k) put(moved(values, drag, k))
    setDrag(null)
    setOver(null)
  }
  return (
    <div className={`field-list ${inline ? 'is-inline' : ''}`}>
      {(!inline && items.length > 2) && (
        <div className="list-tools">
          <button type="button" className="kit-btn is-label" onClick={() => setOpen(open.size ? new Set() : new Set(items.map((_, k) => k)))}>{open.size ? tr('全部收起') : tr('全部展开')}</button>
        </div>
      )}
      {items.map((item, k) => {
        const isOpen = inline || open.has(k)
        return (
          <div
            key={k} className={`li ${isOpen ? 'is-open' : ''} ${over === k ? 'is-over' : ''} ${drag === k ? 'is-dragging' : ''}`}
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
              <span className="li-tools">
                {!field.bindings && <button type="button" onClick={() => put([...values.slice(0, k + 1), duplicate(values[k]), ...values.slice(k + 1)])} aria-label={tr('复制这一项')}><Copy size={12} /></button>}
                <button type="button" disabled={tasks && values.length === 1}
                  onClick={() => remove(item, k)}
                  aria-label={tr('去掉这一项')}><X size={13} /></button>
              </span>
            </div>
            {!inline && isOpen && (
              <div className="li-body">
                <Field field={item} label={null} onEdit={onEdit} ctx={ctx} />
              </div>
            )}
          </div>
        )
      })}
      {field.bindings ? <AttachSetting field={field} ctx={ctx} onAttach={(binding) => put([...values, binding])} /> : <AddMenu
        options={[...choices, ...(items.length ? [{ value: 'copy', label: tr('复制最后一项', 'Duplicate last item') }] : [])]}
        onPick={(action) => {
          setOpen((current) => new Set([...current, items.length]))
          const item = action === 'copy' ? duplicate(values.at(-1)) : choices[action].make()
          if (tasks) {
            const { id: _, ...draft } = item
            put([...values, draft])
          } else {
            onEdit([...field.path, items.length], { set: item }, field.of.type)
          }
        }} />}
    </div>
  )
}

function MapField({ field, onEdit, ctx }) {
  const choices = creationChoices(field.of, ctx)
  return (
    <div className="field-list">
      {field.entries.map(({ key: k, field: f }) => <Field key={k} field={f} label={k} onEdit={onEdit} ctx={ctx} onRemove={() => onEdit(f.path, { unset: true }, null)} />)}
      <AddKey taken={field.entries.map((entry) => entry.key)} options={choices.length === 1 ? undefined : choices}
        onAdd={(key, type = 0) => onEdit([...field.path, key], { set: choices[type].make() }, field.of.type)} />
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
      {absent.length > 0 && <AddFields fields={absent} ctx={ctx} onAdd={(f, value) => onEdit([...field.path, f.key], { set: value }, f.schema.type)} />}
    </div>
  )
}

export { TextField }
