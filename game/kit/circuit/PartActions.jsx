import { Move, Trash2 } from 'lucide-react'
import { tr } from '../shell/i18n.js'

/**
 * The foot of a part's sheet on a phone, in every game: move the part to another slot (the next slot tapped takes it,
 * useSlotEditing startMove), or delete it. Pass only the actions the part has.
 */
export default function PartActions({ onMove, onRemove }) {
  return (
    <div className="sheet-actions">
      {onMove && <button type="button" className="sheet-move" onClick={onMove}><Move size={15} />{tr('移动', 'Move')}</button>}
      {onRemove && <button type="button" className="sheet-remove" onClick={onRemove}><Trash2 size={15} />{tr('删除', 'Delete')}</button>}
    </div>
  )
}
