// The override audit (games/PACKAGES.md 4, 8): every override a layer can see — its own and those of the packages it
// loads on — one row each: what was overridden, by which layer, and the fields before and after. A row opens the
// object it overrides; the layer's own overrides can be taken back.
import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, RotateCcw } from 'lucide-react'
import { tr } from '../shell/i18n.js'
import { fieldDiff } from './diff.js'
import { DiffFields } from './DiffView.jsx'
import { confirmDelete } from './delete.js'

const KINDS = { level: ['关卡', 'Level'], piece: ['件', 'Piece'], setting: ['设置', 'Setting'], entry: ['词条', 'Entry'], tag: ['标签', 'Tag'], relation: ['关系', 'Relation'], layout: ['布局', 'Layout'], i18n: ['文案', 'Copy'] }

/** The overrides visible from `layer`, in load order: its own and those of every layer it loads on. */
export function visibleOverrides(content, layer) {
  const seen = new Set()
  const visit = (id) => { if (seen.has(id)) return; seen.add(id); for (const dep of content?.layerUses?.[id] ?? []) visit(dep) }
  visit(layer)
  const order = content?.layerOrder ?? []
  return (content?.overrideHistory ?? []).filter((event) => seen.has(event.layer)).sort((a, b) => order.indexOf(a.layer) - order.indexOf(b.layer))
}

/** `layer`: the layer the workspace edits; `onOpen(event)` opens the object overridden. */
export default function OverrideAudit({ content, layer, pending, onOpen, onOps }) {
  const events = useMemo(() => visibleOverrides(content, layer), [content, layer])
  const [open, setOpen] = useState(null)
  const [filter, setFilter] = useState('all')
  const shown = events.filter((event) => filter === 'all' || (filter === 'own' ? event.layer === layer : event.layer !== layer))
  const key = (event) => `${event.layer} ${event.kind} ${event.name}`
  const takeBack = (event) => {
    if (pending || !confirmDelete(`${event.layer}: ${event.name}`)) return
    onOps([{ op: 'override.remove', layer, kind: event.kind, name: event.name }])
  }
  return (
    <article className="editor is-wide override-audit">
      <header className="arrange-bar">
        <nav className="studio-modes" role="tablist" aria-label={tr('覆盖', 'Overrides')}>
          {[['all', '全部', 'All'], ['own', '本层', 'This layer'], ['below', '依赖的包', 'Dependencies']].map(([id, zh, en]) => (
            <button key={id} type="button" role="tab" aria-selected={filter === id} className={`studio-tab ${filter === id ? 'is-on' : ''}`} onClick={() => setFilter(id)}>{tr(zh, en)}</button>
          ))}
        </nav>
        <strong>{shown.length}</strong>
      </header>
      <ul className="override-list">
        {shown.map((event) => {
          const k = key(event), expanded = open === k
          return (
            <li key={k} className={event.layer === layer ? 'is-own' : ''}>
              <div className="override-row">
                <button type="button" className="kit-btn editor-tool" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : k)}>
                  {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </button>
                <small className="override-kind">{tr(...KINDS[event.kind] ?? [event.kind, event.kind])}</small>
                <button type="button" className="override-name" onClick={() => onOpen?.(event)}><code>{event.name}</code></button>
                <span className="override-layer">{event.layer}</span>
                {event.layer === layer && event.kind !== 'i18n' && <button type="button" className="kit-btn editor-tool" disabled={pending} title={tr('撤掉这个覆盖', 'Take this override back')} onClick={() => takeBack(event)}><RotateCcw size={13} /></button>}
              </div>
              {expanded && <DiffFields rows={fieldDiff(event.before, event.after)} />}
            </li>
          )
        })}
      </ul>
    </article>
  )
}
