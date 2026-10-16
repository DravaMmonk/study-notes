import { L, tr } from '../shell/i18n.js'

// The phone board's one line of feedback, the same in every game: while a dot is picked, what to tap next (with
// Cancel); otherwise the last change's note (with Undo).
export default function Notice({ editing }) {
  if (editing.pickNote) {
    return (
      <div className="pb-banner" role="status">
        <span>{editing.pickNote}</span>
        <button onClick={editing.unpick}>{tr('取消', 'Cancel')}</button>
      </div>
    )
  }
  if (!editing.toast) return null
  return (
    <div className="ph-toast pb-toast" role="status">
      <span>{L(editing.toast)}</span>
      {editing.canUndo && <button onClick={editing.undo}>{tr('撤销', 'Undo')}</button>}
    </div>
  )
}
