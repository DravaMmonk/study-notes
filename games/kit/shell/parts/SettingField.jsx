import { useId } from 'react'
import { X } from 'lucide-react'
import Choice from '../../circuit/Choice.jsx'
import { TreeButton } from '../../strip/TreePick.jsx'
import NumberField from '../NumberField.jsx'
import { L, T, tr } from '../i18n.js'
import { iconOf } from './icons.js'
import { numberText } from '../../engine/number.js'

// One setting of a part, the same in every game (games/DESIGN.md 6.8): a part definition names one of the kernel controls
// and the kernel draws it — compact on a desktop card, roomy in a sheet (`roomy`) and on a phone. The value a control
// gives is what parts.json says (../../engine/parts/define.js coerce): a word for a select or buttons, a number for a
// number or a slider, true or false for a toggle, the values picked in order for a list, the text of a tree (a sentence
// in the language the screen gives, `language`: the strip's builder, ../../strip/TreePick.jsx); a custom control is the
// domain's widget (`widgets[name]`).
//
//   setting   the setting, resolved (its preset filled in, options worked out)        value    its value now
//   onChange(value)    allowed   the option values the course offers here (null: all)    readOnly   shown only

const stop = (e) => e.stopPropagation()
const optionsOf = (setting, allowed) => setting.options.filter((o) => !allowed || allowed.includes(o.value))
const numberOf = (raw) => (raw === '' || raw === '-' || Number.isNaN(Number(raw)) ? raw : Number(raw))

/** The values picked, in order: × takes one off, the menu after them adds one. */
function ListControl({ options, value, onChange, readOnly, label }) {
  const kept = (value ?? []).filter((v) => options.some((o) => String(o.value) === v))
  const rest = options.filter((o) => !kept.includes(String(o.value)))
  const labelOf = (v) => L(options.find((o) => String(o.value) === v).label ?? v)
  return (
    <span className="pf-list" role="group" aria-label={label} onPointerDown={stop}>
      {kept.map((v) => (
        <span key={v} className="pf-list-item">
          <code>{labelOf(v)}</code>
          {!readOnly && <button type="button" aria-label={tr(`去掉「${labelOf(v)}」`, `Take off “${labelOf(v)}”`)} onClick={() => onChange(kept.filter((x) => x !== v))}><X size={12} /></button>}
        </span>
      ))}
      {rest.length > 0 && !readOnly && (
        <select value="" aria-label={label} onChange={(e) => e.target.value && onChange([...kept, e.target.value])}>
          <option value="">＋</option>
          {rest.map((o) => <option key={o.value} value={o.value}>{L(o.label ?? o.value)}</option>)}
        </select>
      )}
    </span>
  )
}

function Control({ setting: s, value, onChange, allowed, readOnly, roomy, phone, widgets, language, id }) {
  const label = s.label ? L(s.label) : s.about ? L(s.about) : s.key
  switch (s.control) {
    case 'select':
      return (
        <select id={id} value={String(value ?? '')} disabled={readOnly} onPointerDown={stop} onChange={(e) => onChange(e.target.value)} aria-label={label}>
          {!optionsOf(s, allowed).some((o) => String(o.value) === String(value ?? '')) && <option value="">—</option>}
          {optionsOf(s, allowed).map((o) => <option key={o.value} value={o.value} title={o.about ? L(o.about) : undefined}>{L(o.label ?? o.value)}</option>)}
        </select>
      )
    case 'buttons':
      return <Choice label={label} value={String(value)} onChange={onChange} layout={s.layout ?? 'row'} roomy={roomy} disabled={readOnly} options={optionsOf(s, allowed).map((o) => [o.value, o.label ?? o.value, iconOf(o.icon), o.about])} />
    case 'number': {
      const step = s.step ?? (s.integer ? 1 : 'any')
      const nudge = (d) => onChange(Math.min(s.max ?? Infinity, Math.max(s.min ?? -Infinity, Number(value) + d * (typeof step === 'number' ? step : 1))))
      const field = <NumberField label={label} value={value ?? ''} phone={phone} readOnly={readOnly} min={s.min} max={s.max} step={step} onChange={(v) => onChange(numberOf(v))} />
      if (!s.stepper) return field
      return (
        <span className="pf-stepper" onPointerDown={stop}>
          <button type="button" disabled={readOnly || (s.min !== undefined && Number(value) <= s.min)} onClick={() => nudge(-1)} aria-label={`${label} −`}>−</button>
          {field}
          <button type="button" disabled={readOnly || (s.max !== undefined && Number(value) >= s.max)} onClick={() => nudge(1)} aria-label={`${label} +`}>+</button>
        </span>
      )
    }
    case 'slider':
      return (
        <span className="pf-slider" onPointerDown={stop}>
          <input id={id} type="range" min={s.min} max={s.max} step={s.step ?? 'any'} value={Number(value)} disabled={readOnly} list={s.marks ? `${id}-marks` : undefined} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} />
          {s.marks && <datalist id={`${id}-marks`}>{s.marks.map((m) => <option key={m} value={m} />)}</datalist>}
          <output htmlFor={id}>{value}{s.unit ? ` ${L(s.unit)}` : ''}</output>
        </span>
      )
    case 'toggle':
      return (
        <button id={id} type="button" role="switch" className="pf-toggle" aria-checked={Boolean(value)} disabled={readOnly} onPointerDown={stop} onClick={() => onChange(!value)} aria-label={label}>
          <i aria-hidden="true" />
          {(s.on || s.off) && <span>{L(value ? s.on ?? '' : s.off ?? '')}</span>}
        </button>
      )
    case 'list':
      return <ListControl options={optionsOf(s, allowed)} value={value} onChange={onChange} readOnly={readOnly} label={label} />
    case 'tree':
      return language
        ? <TreeButton value={value ?? ''} onChange={onChange} build={language} title={s.label ?? s.key} placeholder={s.optional ? '—' : T('拼一句')} scope={id} disabled={readOnly} clearable={Boolean(s.optional)} />
        : <code>{value || '—'}</code>
    case 'custom': {
      const Widget = widgets?.[s.widget]
      return Widget ? <Widget setting={s} params={s.params} value={value} onChange={onChange} readOnly={readOnly} roomy={roomy} phone={phone} /> : null
    }
    default:
      return null
  }
}

/** A setting with its label: beside the control on a card, over it in a sheet. */
export default function SettingField({ setting, value, onChange, allowed = null, readOnly = false, roomy = false, phone = false, widgets, language }) {
  const id = useId()
  const fixed = readOnly || setting.fixed
  const unit = setting.unit && setting.control === 'number' ? <small className="pf-unit">{L(setting.unit)}</small> : null
  return (
    <div className={`pf-setting is-${setting.control} ${roomy ? 'is-roomy' : ''}`} title={setting.about ? L(setting.about) : undefined} onPointerDown={stop}>
      {setting.label && <label className="pf-label" htmlFor={id}>{L(setting.label)}</label>}
      <span className="pf-control"><Control setting={setting} value={value} onChange={onChange} allowed={allowed} readOnly={fixed} roomy={roomy} phone={phone} widgets={widgets} language={language} id={id} />{unit}</span>
      {roomy && setting.about && <small className="pf-about">{L(setting.about)}</small>}
    </div>
  )
}

/** The words for a setting's value: its option's label, a number (rounded as the kit writes numbers) with its unit, the side of a toggle. */
export function valueWords(setting, value) {
  if (setting.control === 'list') return (value ?? []).map((v) => L(setting.options?.find((x) => String(x.value) === v)?.label ?? v)).join(' ')
  if (setting.options) {
    const o = setting.options.find((x) => String(x.value) === String(value))
    return o ? L(o.label ?? o.value) : String(value ?? '')
  }
  if (setting.control === 'toggle') return L(value ? setting.on ?? '✓' : setting.off ?? '✗')
  const n = setting.control === 'number' && value !== '' && value !== null ? Number(value) : NaN
  return `${Number.isFinite(n) ? numberText(n) : value ?? ''}${setting.unit ? ` ${L(setting.unit)}` : ''}`
}
