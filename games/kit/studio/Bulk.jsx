// A bulk edit of the levels picked in the tree (bulk.js): set a field on all of them (its control from the schema, as
// the form would draw it), remove it, patch several fields by a JSON merge patch, add or take parts from what they
// bring in, or move them together (the tree's slots). Each makes one operation a level, shown — with the levels it
// skips and why — before it goes into the pending changeset.
import { useMemo, useState } from 'react'
import { ArrowRightLeft, Check } from 'lucide-react'
import { tr } from '../shell/i18n.js'
import { getAt, showPath } from '../engine/ops/edit.js'
import { blank, formOf } from './form.js'
import { bulkAdds, bulkPatch, bulkSet, bulkUnset, commonFields } from './bulk.js'
import { Field } from './Fields.jsx'
import { Chips } from './Picker.jsx'

export default function Bulk({ content, vocabulary, ids, ctx, onAdd, onMove, onSelect }) {
  const levels = useMemo(() => ids.map((id) => content.levels.find((l) => l.id === id)).filter(Boolean), [ids, content])
  const fields = useMemo(() => commonFields(vocabulary, levels).filter((f) => f.schema.type !== 'board'), [vocabulary, levels])
  const [key, setKey] = useState('')
  const field = fields.find((f) => f.key === key) ?? null
  const [value, setValue] = useState(undefined)
  const [patch, setPatch] = useState('')
  const [parts, setParts] = useState({ add: [], remove: [] })
  const [plan, setPlan] = useState(null) // { ops, skipped }
  const pickField = (k) => {
    setKey(k)
    const f = fields.find((x) => x.key === k)
    setValue(f ? levels.find((l) => l[k] !== undefined)?.[k] ?? blank(f.schema, ctx) : undefined)
    setPlan(null)
  }
  const adds = fields.find((f) => f.key === 'adds')
  const partOptions = adds?.schema.of?.kind ? Object.entries(vocabulary.kinds[adds.schema.of.kind] ?? {}).map(([v, it]) => ({ value: v, about: it.about })) : null
  let patchValue = null
  try {
    patchValue = patch.trim() ? JSON.parse(patch) : null
  } catch {
    patchValue = undefined
  }
  const form = field ? formOf(field.schema, value, { vocabulary, levels: content.levels.map((l) => l.id) }, [key]) : null
  return (
    <article className="editor bulk">
      <header className="editor-head">
        <h1>{tr(`${levels.length} 关`, `${levels.length} levels`)}</h1>
        <div className="bulk-ids">{levels.map((l) => <button key={l.id} type="button" className="chip" onClick={() => onSelect({ level: l.id })}>{l.id}</button>)}</div>
        <span className="kit-spacer" />
        <button type="button" className="kit-btn is-label" onClick={() => onMove(levels.map((l) => l.id))} title={tr('一起移动：点树上的槽位')}><ArrowRightLeft size={14} aria-hidden="true" /></button>
      </header>
      <section className="bulk-step">
        <select value={key} onChange={(e) => pickField(e.target.value)} aria-label={tr('字段')}>
          <option value="">{tr('字段……')}</option>
          {fields.map((f) => <option key={f.key} value={f.key}>{f.key}</option>)}
        </select>
        {form && <Field field={form} label={null} onEdit={(path, edit, type) => setValue((v) => setDeep(v, path.slice(1), type === 'text' && edit.set ? { set: { ...getAt(v, path.slice(1)), ...edit.set } } : edit))} ctx={ctx} />}
        {field && (
          <div className="bulk-go">
            <button type="button" className="kit-btn is-label is-solid" onClick={() => setPlan(bulkSet(vocabulary, levels, [key], value))}>{tr('全部设成这样')}</button>
            <button type="button" className="kit-btn is-label" onClick={() => setPlan(bulkUnset(levels, [key]))}>{tr('全部去掉')}</button>
          </div>
        )}
      </section>
      {partOptions && (
        <section className="bulk-step">
          <span className="field-key">+ adds</span><Chips options={partOptions} values={parts.add} onSet={(add) => setParts((p) => ({ ...p, add }))} label="+" />
          <span className="field-key">− adds</span><Chips options={partOptions} values={parts.remove} onSet={(remove) => setParts((p) => ({ ...p, remove }))} label="−" />
          <div className="bulk-go"><button type="button" className="kit-btn is-label is-solid" disabled={!parts.add.length && !parts.remove.length} onClick={() => setPlan(bulkAdds(vocabulary, levels, parts))}>adds</button></div>
        </section>
      )}
      <section className="bulk-step">
        <textarea className={`field-area is-code ${patchValue === undefined ? 'is-bad' : ''}`} rows={2} value={patch} onChange={(e) => setPatch(e.target.value)} placeholder='{ "field": value, "gone": null }' aria-label="JSON merge patch" spellCheck={false} />
        <div className="bulk-go"><button type="button" className="kit-btn is-label is-solid" disabled={!patchValue || typeof patchValue !== 'object' || Array.isArray(patchValue)} onClick={() => setPlan(bulkPatch(levels, patchValue))}>patch</button></div>
      </section>
      {plan && (
        <section className="bulk-plan">
          <ol className="review-ops">{plan.ops.map((op, k) => <li key={k}><code>{op.op}</code><span>{op.level} {op.path ? showPath(op.path) : ''}{op.add ? ` +${op.add.join(' +')}` : ''}{op.remove ? ` −${op.remove.join(' −')}` : ''}{op.fields ? ` ${Object.keys(op.fields).join(', ')}` : ''}</span></li>)}</ol>
          {plan.skipped.length > 0 && <ul className="bulk-skipped">{plan.skipped.map((s) => <li key={s.level}><code>{s.level}</code> {s.why}</li>)}</ul>}
          <button type="button" className="kit-btn is-label is-solid review-apply" disabled={!plan.ops.length} onClick={() => { onAdd(plan.ops); setPlan(null) }}><Check size={14} aria-hidden="true" />{tr(`加入变更集（${plan.ops.length}）`, `Into the changeset (${plan.ops.length})`)}</button>
        </section>
      )}
    </article>
  )
}

/** `value` with an edit ({ set } or { unset }) at `path` inside it. */
function setDeep(value, path, edit) {
  if (!path.length) return edit.unset ? undefined : edit.set
  const [k, ...rest] = path
  const out = Array.isArray(value) ? [...value] : { ...(value ?? {}) }
  const next = setDeep(out[k], rest, edit)
  if (next === undefined) {
    if (Array.isArray(out)) out.splice(k, 1)
    else delete out[k]
  } else out[k] = next
  return out
}
