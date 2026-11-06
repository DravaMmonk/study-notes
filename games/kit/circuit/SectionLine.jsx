import { useState } from 'react'
import { ChevronDown, ChevronRight, GripVertical, MoreHorizontal, Trash2 } from 'lucide-react'
import { L, tr } from '../shell/i18n.js'

// A divider occupies a grid gap. Editing its note or fold state changes layout metadata, never the circuit.
export default function SectionLine({ section, count, onEdit, onDrag, children }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const Icon = section.folded ? ChevronRight : ChevronDown
  const commit = () => { if (editing) { onEdit({ note: draft }); setEditing(false) } }
  return <div className={`section-divider ${section.folded ? 'is-folded' : ''}`} data-section-row={section.row}>
    <button type="button" className="section-handle" aria-label={tr('移动分割线', 'Move divider')} onPointerDown={onDrag}><GripVertical size={14} /></button>
    <button type="button" className="section-fold" aria-expanded={!section.folded} aria-label={tr(section.folded ? '展开这一节' : '折起这一节', section.folded ? 'Expand section' : 'Fold section')} onClick={() => onEdit({ folded: !section.folded })}><Icon size={14} /></button>
    {editing ? <input className="section-note-input" autoFocus value={draft} aria-label={tr('分节批注', 'Section note')} onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }} /> : <button type="button" className="section-note" aria-label={tr('编辑批注', 'Edit note')} onClick={() => { setDraft(L(section.note) || ''); setEditing(true) }}>{L(section.note) || tr('批注', 'Note')}</button>}
    {section.folded && <small>{tr(`${count} 个元件`, `${count} parts`)}</small>}
    <details className="section-menu"><summary aria-label={tr('分割线菜单', 'Divider menu')}><MoreHorizontal size={14} /></summary><button type="button" onClick={() => onEdit(null)}><Trash2 size={14} />{tr('删除分割线', 'Delete divider')}</button></details>
    {children}
  </div>
}
