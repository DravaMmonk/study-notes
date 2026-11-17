// The row under a build list's tools (games/DESIGN.md 6.7): what the list is grouped by, a new group of that kind
// (a tag, a tray, a relation, a section), and every group folded or unfolded at once.
import { ChevronsDownUp, ChevronsUpDown, Plus } from 'lucide-react'
import { tr } from '../shell/i18n.js'
import { editorForType } from './editors.js'
import { AddMenu } from './Picker.jsx'

export const GROUP_WORDS = { tag: ['标签', 'Tags'], relation: ['关系', 'Relations'], section: ['分组', 'Sections'] }
const NEW_WORDS = { tag: ['新的标签', 'New tag'], relation: ['新的关系', 'New relation'], section: ['新的分组', 'New section'] }

/**
 * `groupings`: what the list can be grouped by; `by` the one shown; `newOptions`: the kinds a new group can be (a
 * relation's kind), or null for one kind; `onNew(option)`; `folded`: every group folded; `onFoldAll(fold)`.
 */
export default function GroupingBar({ groupings, by, onBy, newOptions = null, onNew, folded, onFoldAll }) {
  const [zh, en] = editorForType(by)?.group?.createLabel ?? NEW_WORDS[by] ?? [by, by]
  return (
    <div className="list-grouping">
      <nav className="studio-modes" role="tablist" aria-label={tr('分组', 'Group by')}>
        {groupings.map((id) => (
          <button key={id} type="button" role="tab" aria-selected={by === id} className={`studio-tab ${by === id ? 'is-on' : ''}`} onClick={() => onBy(id)}>{tr(...(editorForType(id)?.group?.name ?? GROUP_WORDS[id] ?? [id, id]))}</button>
        ))}
      </nav>
      <span className="kit-spacer" />
      {onNew && (newOptions
        ? <AddMenu searchable={false} icon={Plus} options={newOptions} label={tr(zh, en)} onPick={onNew} />
        : <button type="button" className="kit-btn editor-tool" title={tr(zh, en)} aria-label={tr(zh, en)} onClick={() => onNew(null)}><Plus size={14} aria-hidden="true" /></button>)}
      <button type="button" className="kit-btn editor-tool" onClick={() => onFoldAll(!folded)} title={folded ? tr('全部展开', 'Unfold all') : tr('全部收起', 'Fold all')} aria-label={folded ? tr('全部展开', 'Unfold all') : tr('全部收起', 'Fold all')}>
        {folded ? <ChevronsUpDown size={14} aria-hidden="true" /> : <ChevronsDownUp size={14} aria-hidden="true" />}
      </button>
    </div>
  )
}
