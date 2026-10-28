import { Move, Pencil, Trash2 } from 'lucide-react'
import { tr } from '../shell/i18n.js'

/**
 * The foot of a part's sheet on a phone, in every game: edit a part the player built (go to the level that builds it),
 * move the part to another slot (the next slot tapped takes it, useSlotEditing startMove), or delete it. Pass only the
 * actions the part has.
 */
export default function PartActions({ onEdit, onMove, onRemove }) {
  return (
    <div className="sheet-actions">
      {onEdit && <button type="button" className="sheet-edit" onClick={onEdit}><Pencil size={15} />{tr('编辑', 'Edit')}</button>}
      {onMove && <button type="button" className="sheet-move" onClick={onMove}><Move size={15} />{tr('移动', 'Move')}</button>}
      {onRemove && <button type="button" className="sheet-remove" onClick={onRemove}><Trash2 size={15} />{tr('删除', 'Delete')}</button>}
    </div>
  )
}
