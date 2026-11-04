import './parts.css'
import { L } from '../i18n.js'
import { evalSettings, failedCheck, shows } from '../../engine/parts/define.js'
import SettingField, { valueWords } from './SettingField.jsx'

// One face of a defined part (games/DESIGN.md 6.9): the desktop card's body, the phone tile, or the detail both
// share, as parts.json's `views` lays it out in blocks (the default where it says nothing). The kernel draws every
// block but the part's value and the domain's widgets, which the domain gives (`defined.value`, `defined.widgets`).
//
//   def       the part, resolved (../../engine/parts/define.js)      face   'card' | 'tile' | 'detail'
//   node, ctx the node and its board (shell/CircuitLevel.jsx ctx)    set(patch, changed)  new settings for the node
//   defined   { ops, value(node, ctx, output, face), widgets?, allowed?(type, key) }: value draws an output's value
//             (output null: the part's, or all its outputs; the domain says what each face shows, null for nothing)
//   blocks    the blocks to draw instead of the face's (a phone tile draws its value and the rest apart)
//   mark(path) → props: what the studio's part page puts on each block and setting to pick it (data-pf…)

export const DEFAULT_VIEWS = {
  card: [{ show: 'settings' }, { show: 'value' }],
  tile: [{ show: 'value' }, { show: 'summary' }],
  detail: [{ show: 'desc' }, { show: 'settings' }, { show: 'value' }],
}

/** A face's blocks: parts.json's, or the default; the path each has in parts.json (null for a default one). */
export const blocksOf = (def, face) => (def.views?.[face] ? def.views[face].map((b, k) => [b, ['views', face, k]]) : DEFAULT_VIEWS[face].map((b) => [b, null]))

const optionCount = (s, allowed) => (s.options ? s.options.filter((o) => !allowed || allowed.includes(o.value)).length : Infinity)

/** The settings a node shows: their `when` holds, and the course offers more than one value of an option setting. */
export function visibleSettings(def, params, defined) {
  return def.settings.map((s, k) => [s, k]).filter(([s]) => shows(s, def, params, defined.ops) && optionCount(s, defined.allowed?.(def.type, s.key)) > 1)
}

const fmt = (v, digits) => (typeof v === 'number' ? (digits === undefined ? String(Number(v.toFixed(6))) : v.toFixed(digits)) : v === true ? '✓' : v === false ? '✗' : String(v ?? '—'))

export default function PartFace({ def, face, node, ctx, set, defined, phone = false, roomy = false, blocks: given, mark = () => ({}) }) {
  const params = node.params ?? {}
  const readOnly = Boolean(ctx?.readOnly) || !set
  const shown = visibleSettings(def, params, defined)
  const list = given ?? blocksOf(def, face)
  const words = (s) => valueWords(s, params[s.key] ?? s.default ?? s.options?.[0]?.value)
  const setting = (s, k) => (
    <div key={s.key} className="pf-slot" {...mark(['settings', k])}>
      <SettingField setting={s} value={params[s.key] ?? s.default} allowed={defined.allowed?.(def.type, s.key) ?? null} readOnly={readOnly} roomy={roomy} phone={phone} widgets={defined.widgets} onChange={(v) => set({ [s.key]: v }, s.key)} />
    </div>
  )
  const block = (b, path, key) => {
    const at = path ? mark(path) : {}
    switch (b.show) {
      case 'value': {
        const v = defined.value(node, ctx, b.output ?? null, face)
        return v ? <div key={key} className="pf-value" {...at}>{v}</div> : null
      }
      case 'settings': {
        const keys = b.keys ? shown.filter(([s]) => b.keys.includes(s.key)) : shown
        return keys.length ? <div key={key} className="pf-settings" {...at}>{keys.map(([s, k]) => setting(s, k))}</div> : null
      }
      case 'setting': {
        const hit = shown.find(([s]) => s.key === b.key)
        if (!hit) return null
        return b.as === 'label' ? <span key={key} className="pf-words" {...at}>{words(hit[0])}</span> : <div key={key} {...at}>{setting(...hit)}</div>
      }
      case 'summary': {
        const text = b.text ? L(b.text).replace(/\{([^}]*)\}/g, (_, k) => (def.setting[k] ? words(def.setting[k]) : '')) : shown.map(([s]) => words(s)).join(' · ')
        return text ? <span key={key} className="pf-summary" {...at}>{text}</span> : null
      }
      case 'readout': {
        const v = evalSettings(b.expr, def, params, defined.ops)
        return <span key={key} className="pf-readout" {...at}><span>{L(b.label)}</span><output>{fmt(v, b.digits)}{b.unit ? ` ${L(b.unit)}` : ''}</output></span>
      }
      case 'action': {
        const next = Object.fromEntries(Object.entries(b.set).map(([k, text]) => [k, evalSettings(text, def, params, defined.ops)]))
        const ready = !readOnly && Object.values(next).every((v) => v !== undefined && !(typeof v === 'number' && !Number.isFinite(v))) && (!b.when || Boolean(evalSettings(b.when, def, params, defined.ops)))
        return <button key={key} type="button" className="pf-action" disabled={!ready} onPointerDown={(e) => e.stopPropagation()} onClick={() => set(next, null)} {...at}>{L(b.label)}</button>
      }
      case 'text':
        return <p key={key} className="pf-text" {...at}>{L(b.text)}</p>
      case 'desc':
        return <p key={key} className="pf-desc" {...at}>{L(def.desc)}</p>
      case 'ports':
        return (
          <dl key={key} className="pf-ports" {...at}>
            {def.inputs.map((p) => <div key={`in-${p.name}`}><dt>{L(p.label ?? p.name)}</dt><dd>{p.about ? L(p.about) : ''}</dd></div>)}
            {(def.outputs ?? []).map((p) => <div key={`out-${p.name}`} className="is-out"><dt>{L(p.label ?? p.name)}</dt><dd>{p.about ? L(p.about) : ''}</dd></div>)}
          </dl>
        )
      case 'widget': {
        const Widget = defined.widgets?.[b.widget]
        return Widget ? <div key={key} {...at}><Widget node={node} ctx={ctx} params={b.params} settings={params} /></div> : null
      }
      case 'row':
        return <div key={key} className="pf-row" {...at}>{b.blocks.map((x, k) => block(x, path ? [...path, 'blocks', k] : null, k))}</div>
      default:
        return null
    }
  }
  const drawn = list.map(([b, path], k) => block(b, path, k)).filter(Boolean)
  const failed = !list.some(([b]) => b.show === 'value') && face !== 'tile' ? failedCheck(def, params, defined.ops) : null
  if (!drawn.length && !failed) return null
  return <div className={`pf-face is-${face}`}>{drawn}{failed && <p className="pf-check">{L(failed)}</p>}</div>
}
