// The studio's generic controls: one per kind of field (form.js), for any domain's content. A field's label is its
// key; its help is the vocabulary's `about`. What a field may hold comes from its schema alone: a choice lists the
// vocabulary's items or the game's levels, a call picks an item and gives its parameters' fields, a board is drawn
// (../circuit/svg.js) and edited as blueprint text or in the game's own circuit editor.
//
//   <Field field label onEdit ctx />   onEdit(path, { set } | { unset: true }, type)
//   ctx: { vocabulary, levels, onBoard(path) (edit a board in the game) }
import { useEffect, useRef, useState } from 'react'
import { Pencil, Plus, X } from 'lucide-react'
import { L, tr } from '../shell/i18n.js'
import { boardSvg } from '../circuit/svg.js'
import { blank, recast } from './form.js'

/** A value typed into a control, kept while the control has focus, so a preview coming back never undoes typing. */
function useDraft(value) {
  const [draft, setDraft] = useState(value)
  const focused = useRef(false)
  const text = JSON.stringify(value)
  useEffect(() => {
    if (!focused.current) setDraft(JSON.parse(text ?? 'null') ?? undefined)
  }, [text])
  const bind = { onFocus: () => { focused.current = true }, onBlur: () => { focused.current = false } }
  return [draft, setDraft, bind]
}

const Help = ({ about }) => (about ? <p className="field-help">{L(about)}</p> : null)

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

export function TextPair({ value, onSet, label }) {
  const pair = typeof value === 'string' ? { zh: value, en: value } : value ?? { zh: '', en: '' }
  const [draft, setDraft, bind] = useDraft(pair)
  // Only the side typed into: the operation says which side changed.
  const set = (side) => (v) => {
    setDraft({ ...draft, [side]: v })
    onSet({ [side]: v })
  }
  return (
    <div className="field-text">
      <Area value={draft?.zh ?? ''} onChange={set('zh')} bind={bind} lang="zh" aria-label={`${label} 中文`} />
      <Area value={draft?.en ?? ''} onChange={set('en')} bind={bind} lang="en" aria-label={`${label} English`} />
    </div>
  )
}

function NumberField({ field, onSet }) {
  const [draft, setDraft, bind] = useDraft(field.value)
  return (
    <input
      className="field-input is-num" type="number" value={draft ?? ''} min={field.min} max={field.max} step={field.int ? 1 : 'any'} {...bind}
      onChange={(e) => {
        setDraft(e.target.value)
        if (e.target.value !== '' && Number.isFinite(Number(e.target.value))) onSet(Number(e.target.value))
      }}
    />
  )
}

function StringField({ field, onSet }) {
  const [draft, setDraft, bind] = useDraft(field.value)
  return <input className="field-input" value={draft ?? ''} pattern={field.pattern} {...bind} onChange={(e) => { setDraft(e.target.value); onSet(e.target.value) }} />
}

/** JSON, for a value the schema says nothing more about: written when it reads as JSON. */
function AnyField({ field, onSet }) {
  const [draft, setDraft, bind] = useDraft(JSON.stringify(field.value, null, 1))
  const [bad, setBad] = useState(false)
  return (
    <Area
      className={`is-code ${bad ? 'is-bad' : ''}`} value={draft ?? ''} bind={bind}
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

function Choice({ field, onSet }) {
  const known = field.options.some((o) => o.value === field.value)
  const picked = field.options.find((o) => o.value === field.value)
  return (
    <>
      <select className="field-input" value={known ? String(field.value) : ''} onChange={(e) => onSet(field.options.find((o) => String(o.value) === e.target.value).value)}>
        {!known && <option value="">{field.value === undefined ? '—' : String(field.value)}</option>}
        {field.options.map((o) => <option key={String(o.value)} value={String(o.value)}>{String(o.value)}</option>)}
      </select>
      {picked?.about && <p className="field-help">{L(picked.about)}</p>}
    </>
  )
}

function BoardField({ field, onSet, ctx }) {
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
      {svg && <div className="board-svg" dangerouslySetInnerHTML={{ __html: svg }} />}
      {wrong && <p className="field-bad">{wrong}</p>}
      <div className="field-row">
        {ctx.onBoard && <button type="button" className="kit-btn is-label is-solid" onClick={() => ctx.onBoard(field.path)}><Pencil size={13} aria-hidden="true" />{tr('在电路编辑器里改', 'Edit in the circuit editor')}</button>}
        <button type="button" className={`kit-btn is-label ${text ? 'is-on' : ''}`} onClick={() => setText(!text)}>{tr('蓝图文本', 'Blueprint text')}</button>
      </div>
      {text && <Area className="is-code" value={draft} bind={{ ...bind, onBlur: () => { bind.onBlur(); if (draft !== lines.join('\n')) onSet(draft.replace(/\n+$/, '').split('\n')) } }} onChange={setDraft} spellCheck={false} />}
    </div>
  )
}

/** A field's control, its label and its help; nested fields inside it. */
export function Field({ field, label, onEdit, ctx, onRemove = null }) {
  const set = (value) => onEdit(field.path, { set: value }, field.kind)
  const head = (label !== null || onRemove || field.tag || field.shapes?.length > 1) && (
    <div className="field-head">
      {label !== null && <span className="field-key">{label}</span>}
      {field.tag && <TagChoice field={field} onEdit={onEdit} ctx={ctx} />}
      {field.shapes?.length > 1 && <Shapes field={field} onEdit={onEdit} ctx={ctx} />}
      {onRemove && <button type="button" className="field-x" onClick={onRemove} aria-label={tr('去掉', 'Remove')}><X size={13} /></button>}
    </div>
  )
  const body = (() => {
    switch (field.kind) {
      case 'text': return <TextPair value={field.value} onSet={set} label={label ?? ''} />
      case 'num': return <NumberField field={field} onSet={set} />
      case 'bool': return <input type="checkbox" className="field-check" checked={Boolean(field.value)} onChange={(e) => set(e.target.checked)} />
      case 'str': return <StringField field={field} onSet={set} />
      case 'choice': return <Choice field={field} onSet={set} />
      case 'board': return <BoardField field={field} onSet={set} ctx={ctx} />
      case 'call': return <CallField field={field} onEdit={onEdit} ctx={ctx} />
      case 'list': return <ListField field={field} onEdit={onEdit} ctx={ctx} />
      case 'map': return <MapField field={field} onEdit={onEdit} ctx={ctx} />
      case 'obj': return <ObjField field={field} onEdit={onEdit} ctx={ctx} />
      default: return <AnyField field={field} onSet={set} />
    }
  })()
  const nested = ['list', 'map', 'obj', 'call'].includes(field.kind)
  return (
    <div className={`field is-${field.kind} ${nested ? 'is-nested' : ''}`} data-path={field.path.join('.')}>
      {head}
      {label !== null && <Help about={field.about} />}
      {body}
    </div>
  )
}

/** A by's shape (a level's kind, say): picking another keeps the fields the shapes share. */
function TagChoice({ field, onEdit, ctx }) {
  return (
    <select className="field-tag" value={field.tag.value ?? ''} onChange={(e) => onEdit(field.path, { set: recast(field.tag, field.value, e.target.value, ctx) }, 'obj')}>
      {field.tag.options.map((o) => <option key={o.value} value={o.value}>{field.tag.key}: {o.value}</option>)}
    </select>
  )
}

/** An either's shapes, when it has several: switching starts the other shape blank. */
function Shapes({ field, onEdit, ctx }) {
  return (
    <span className="field-shapes">
      {field.shapes.map((shape, k) => (
        <button key={k} type="button" className={k === field.shape ? 'is-on' : ''} onClick={() => k !== field.shape && onEdit(field.path, { set: blank(shape, ctx) }, null)}>{shape.type}</button>
      ))}
    </span>
  )
}

function CallField({ field, onEdit, ctx }) {
  const choose = (item) => {
    const it = ctx.vocabulary.kinds[field.of][item]
    onEdit(field.path, { set: it.params ? { [item]: blank(it.params, ctx) } : item }, 'call')
  }
  const picked = field.options.find((o) => o.value === field.item)
  return (
    <>
      <select className="field-input" value={field.item ?? ''} onChange={(e) => choose(e.target.value)}>
        {!field.item && <option value="">—</option>}
        {field.options.map((o) => <option key={o.value} value={o.value}>{o.value}</option>)}
      </select>
      {picked?.about && <p className="field-help">{L(picked.about)}</p>}
      {field.params && <Field field={field.params} label={null} onEdit={onEdit} ctx={ctx} />}
    </>
  )
}

function ListField({ field, onEdit, ctx }) {
  const items = field.items
  return (
    <div className="field-list">
      {items.map((item, k) => (
        <Field
          key={k} field={item} label={`${k + 1}`} onEdit={onEdit} ctx={ctx}
          onRemove={() => onEdit(item.path, { unset: true }, null)}
        />
      ))}
      <button type="button" className="field-add" onClick={() => onEdit([...field.path, items.length], { set: blank(field.of, ctx) }, field.of.type)}><Plus size={13} aria-hidden="true" /></button>
    </div>
  )
}

function MapField({ field, onEdit, ctx }) {
  const [key, setKey] = useState('')
  return (
    <div className="field-list">
      {field.entries.map(({ key: k, field: f }) => <Field key={k} field={f} label={k} onEdit={onEdit} ctx={ctx} onRemove={() => onEdit(f.path, { unset: true }, null)} />)}
      <form className="field-row" onSubmit={(e) => { e.preventDefault(); if (key) onEdit([...field.path, key], { set: blank(field.of, ctx) }, field.of.type); setKey('') }}>
        <input className="field-input is-key" value={key} onChange={(e) => setKey(e.target.value)} aria-label={tr('新的键', 'New key')} />
        <button type="submit" className="field-add" disabled={!key}><Plus size={13} aria-hidden="true" /></button>
      </form>
    </div>
  )
}

function ObjField({ field, onEdit, ctx }) {
  const absent = field.fields.filter((f) => !f.field && f.optional)
  return (
    <div className="field-obj">
      {field.fields.filter((f) => f.field && f.key !== field.tag?.key).map((f) => (
        <Field key={f.key} field={{ ...f.field, about: f.about ?? f.field.about }} label={f.key} onEdit={onEdit} ctx={ctx} onRemove={f.optional ? () => onEdit(f.field.path, { unset: true }, null) : null} />
      ))}
      {absent.length > 0 && (
        <div className="field-absent">
          {absent.map((f) => (
            <button key={f.key} type="button" title={f.about ? L(f.about) : undefined} onClick={() => onEdit([...field.path, f.key], { set: blank(f.schema, ctx) }, f.schema.type)}>
              <Plus size={12} aria-hidden="true" />{f.key}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
