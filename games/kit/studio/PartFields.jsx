// The studio's controls for a part definition's own fields (games/DESIGN.md 6.7, 6.8): an expression — what a part
// computes, a rule's or a check's logic, a readout — and an icon of the kernel's table. An expression is code over the
// engine's resources and nothing else: it is read and checked as it is typed (where it is wrong, the resources, inputs
// and settings it may name), and a list beside it offers every resource of the domain (and the kernel's builtins), the
// part's inputs and its settings, each put in at the caret with a click.
import { useMemo, useRef, useState } from 'react'
import { L, tr } from '../shell/i18n.js'
import { ExprError, parse, problemsOf } from '../engine/parts/expr.js'
import { resolveSetting } from '../engine/parts/define.js'
import { BUILTIN_ITEMS } from '../engine/parts/builtins.js'
import { ICON_NAMES } from '../engine/parts/icons.js'
import { validate } from '../engine/schema.js'
import { ICONS } from '../shell/parts/icons.js'
import { useDraft } from './draft.js'

/** The part an expression at `path` belongs to in parts.json, and whether it may read the part's inputs. */
function partAt(file, path) {
  if (path[0] !== 'parts' || !file?.parts?.[path[1]]) return null
  const raw = file.parts[path[1]]
  const settings = Object.fromEntries((raw.settings ?? []).map((s) => resolveSetting(s, file.presets)).filter(Boolean).map((s) => [s.key, s]))
  return { inputs: path[2] === 'compute' ? raw.inputs.map((p) => p.name) : [], settings }
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
  const [query, setQuery] = useState('')
  const shown = ICON_NAMES.filter((name) => name.toLowerCase().includes(query.toLowerCase()))
  return (
    <div className="field-icon">
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={field.value ?? ''} aria-label={label} spellCheck={false} />
      <div className="icon-grid" role="radiogroup" aria-label={label}>
        {shown.map((name) => {
          const Icon = ICONS[name]
          return <button key={name} type="button" role="radio" aria-checked={field.value === name} className={field.value === name ? 'is-on' : ''} title={name} onClick={() => onSet(name)}><Icon size={15} aria-hidden="true" /></button>
        })}
      </div>
    </div>
  )
}
