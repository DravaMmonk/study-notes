import { L, tr } from '../shell/i18n.js'

// The phone board's one line of feedback, the same in every game: while a dot is picked, what to tap next (with
// Cancel). Partition prompts use the same banner; otherwise show the last change's note (with Undo).
export default function Notice({ editing, prompt = null }) {
  if (prompt || editing.pickNote) {
    return (
      <div className="pb-banner" role="status">
        <span>{prompt?.text ?? editing.pickNote}</span>
        <button onClick={prompt?.cancel ?? editing.unpick}>{tr('取消')}</button>
      </div>
    )
  }
  if (!editing.toast) return null
  return (
    <div className="ph-toast pb-toast" role="status">
      <span>{L(editing.toast)}</span>
      {editing.history.canUndo && <button onClick={editing.history.undo}>{tr('撤销')}</button>}
    </div>
  )
}
