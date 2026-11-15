// The studio's controls for a part definition's own fields (games/DESIGN.md 6.7, 6.8): an expression — what a part
// computes, a rule's or a check's logic, a readout — and an icon of the kernel's table. An expression is code over the
// engine's resources and nothing else: it is read and checked as it is typed (where it is wrong, the resources, inputs
// and settings it may name), and a list beside it offers every resource of the domain (and the kernel's builtins), the
// part's inputs and its settings, each put in at the caret with a click.
import { useMemo, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { L, tr } from '../shell/i18n.js'
import { ExprError, parse, problemsOf } from '../engine/parts/expr.js'
import { resolveSettings, settingReferences } from '../engine/pieces.js'
import { BUILTIN_ITEMS } from '../engine/parts/builtins.js'
import { ICON_NAMES } from '../engine/parts/icons.js'
import { validate } from '../engine/schema.js'
import { ICONS } from '../shell/parts/icons.js'
import { creationChoices, formOf } from './form.js'
import { AddMenu, usePickerPopup } from './Picker.jsx'
import { useDraft } from './draft.js'

/** The part an expression at `path` belongs to in pieces.json, and whether it may read the part's inputs. */
function partAt(file, path) {
  if (path[0] !== 'parts' || !file?.parts?.[path[1]]) return null
  const raw = file.parts[path[1]]
  const settings = Object.fromEntries(resolveSettings(file, raw).map((s) => [s.key, s]))
  return { inputs: path[2] === 'compute' ? (raw.inputs ?? []).map((p) => p.name) : [], settings }
}

export function ExprField({ field, onSet, ctx, label }) {
  const [draft = '', setDraft, bind] = useDraft(field.value ?? '')
  const box = useRef(null)
  const [open, setOpen] = useState(false)
  const ops = useMemo(() => ({ ...(ctx.vocabulary?.kinds.op ?? {}), ...BUILTIN_ITEMS }), [ctx.vocabulary])
  const part = partAt(ctx.partDefs, field.path)
  const said = useMemo(() => {
    try {
      const tree = parse(draft)
      if (!part) return { ok: true }
      const fits = (schema, v) => validate(schema, v, { vocabulary: ctx.vocabulary }).length === 0
      const problems = problemsOf(tree, { ops, inputs: part.inputs, settings: part.settings, fits })
      return problems.length ? { problems } : { ok: true }
    } catch (error) {
      if (error instanceof ExprError) return { at: error.at, problems: [error.message] }
      throw error
    }
  }, [draft, ops, part, ctx.vocabulary])
  const put = (text) => {
    const el = box.current
    const [a, b] = el ? [el.selectionStart, el.selectionEnd] : [draft.length, draft.length]
    const next = `${draft.slice(0, a)}${text}${draft.slice(b)}`
    setDraft(next)
    onSet(next)
    window.setTimeout(() => { el?.focus(); el?.setSelectionRange(a + text.length, a + text.length) })
  }
  const call = (name, op) => `${name}(${op.args.map((x) => x.name).join(', ')}${op.params ? `${op.args.length ? ', ' : ''}${Object.keys(op.params.fields).map((k) => `${k}=`).join(', ')}` : ''})`
  return (
    <div className={`field-expr ${said.ok ? '' : 'is-bad'}`}>
      <div className="expr-line">
        <input ref={box} className={`field-input is-code ${said.ok ? '' : 'is-bad'}`} value={draft ?? ''} spellCheck={false} aria-label={label} {...bind} onChange={(e) => { setDraft(e.target.value); onSet(e.target.value) }} />
        <button type="button" className={`kit-btn expr-toggle ${open ? 'is-on' : ''}`} onClick={() => setOpen(!open)} title={tr('引擎资源、输入、设置')}>ƒ</button>
      </div>
      {said.at !== undefined && <pre className="expr-caret" aria-hidden="true">{`${' '.repeat(said.at)}^`}</pre>}
      {said.problems && <ul className="field-findings">{said.problems.map((p) => <li key={p}>{p}</li>)}</ul>}
      {open && (
        <div className="expr-menu">
          {part && part.inputs.length > 0 && <div className="expr-group">{part.inputs.map((name) => <button key={name} type="button" onClick={() => put(name)}><code>{name}</code></button>)}</div>}
          {part && Object.keys(part.settings).length > 0 && <div className="expr-group">{Object.values(part.settings).map((s) => <button key={s.key} type="button" onClick={() => put(`$${s.key}`)} title={s.label ? L(s.label) : undefined}><code>${s.key}</code></button>)}</div>}
          <div className="expr-ops">
            {Object.entries(ops).map(([name, op]) => (
              <button key={name} type="button" onClick={() => put(call(name, op))} className={BUILTIN_ITEMS[name] ? 'is-builtin' : ''}>
                <code>{call(name, op)}</code><small>{L(op.about)}</small>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function IconField({ field, onSet, label }) {
  const [open, setOpen] = useState(false)
  const anchor = useRef(null)
  const icon = field.value
  const Selected = ICONS[icon]
  const name = label || tr('图标', 'Icon')
  const close = () => {
    setOpen(false)
    anchor.current?.querySelector('button')?.focus()
  }
  return (
    <div className="pick" ref={anchor}>
      <button type="button" className="pick-button" aria-haspopup="dialog" aria-expanded={open} aria-label={name}
        onClick={() => setOpen(!open)} onKeyDown={(event) => {
          if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true) }
        }}>
        {Selected && <Selected size={15} aria-hidden="true" />}
        <span className="pick-name"><b>{icon || '—'}</b></span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && <IconOptions anchor={anchor} icon={icon} label={name} onClose={close} onOutside={() => setOpen(false)}
        onPick={(value) => { onSet(value); close() }} />}
    </div>
  )
}

function IconOptions({ anchor, icon, label, onClose, onOutside, onPick }) {
  const [query, setQuery] = useState('')
  const overlay = usePickerPopup(anchor, onClose, { onOutside })
  const shown = ICON_NAMES.filter((name) => name.toLowerCase().includes(query.toLowerCase()))
  return (
    <div className="pick-pop is-floating field-icon" ref={overlay} role="dialog" aria-label={label}>
      <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={icon ?? ''} aria-label={tr('搜索', 'Search')} spellCheck={false} />
      <div className="icon-grid" role="radiogroup" aria-label={label}>
        {shown.map((name) => {
          const Icon = ICONS[name]
          return <button key={name} type="button" role="radio" aria-checked={icon === name} className={icon === name ? 'is-on' : ''} title={name} onClick={() => onPick(name)}><Icon size={15} aria-hidden="true" /></button>
        })}
      </div>
    </div>
  )
}

/** Bind a setting definition to a unique local key on this piece. */
export function AttachSetting({ field, ctx, onAttach }) {
  const options = formOf(field.of.fields.setting, undefined, ctx).options
  const label = tr('引用设置', 'Attach setting')
  const pick = (setting) => {
    const keys = new Set(field.items.map(({ value }) => value.key))
    let key = setting
    for (let n = 2; keys.has(key); n += 1) key = `${setting}${n}`
    onAttach({ key, setting })
  }
  return options.length
    ? <AddMenu options={options} onPick={pick} label={label} />
    : <button className="kit-btn is-label" type="button" onClick={ctx.onSettings}>{tr('打开设置管理', 'Open settings manager')}</button>
}

/** Show which pieces will see edits to this setting, with a link to each reference. */
export function SettingUsers({ file, id, onPiece }) {
  const uses = settingReferences(file, id)
  if (!uses.length) return null
  return <div className="setting-users">
    <span>{tr('引用此设置的件', 'Pieces using this setting')}</span>
    {uses.map(({ piece, key }) => <button key={`${piece}:${key}`} type="button" onClick={() => onPiece(piece)}>{piece}.{key}</button>)}
  </div>
}

/** Add an optional field offered by the current engine schema. */
export function AddFields({ fields, ctx, onAdd }) {
  const label = tr('添加字段', 'Add field')
  const entries = new Map()
  const options = fields.flatMap((field) => {
    const choices = creationChoices(field.schema, ctx)
    if (!choices.length) return []
    const { key, about } = field
    if (choices.length === 1) {
      entries.set(key, { field, make: choices[0].make })
      return [{ value: key, about }]
    }
    const children = choices.map((choice) => {
      const value = `${key}:${choice.value}`
      entries.set(value, { field, make: choice.make })
      return { ...choice, value }
    })
    return [{ value: key, about, children }]
  })
  return <AddMenu options={options} onPick={(key) => {
    const { field, make } = entries.get(key)
    onAdd(field, make())
  }} label={label} />
}
