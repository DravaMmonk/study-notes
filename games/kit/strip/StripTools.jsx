import { useRef } from 'react'
import { Redo2, Undo2 } from 'lucide-react'
import ClearButton from '../circuit/ClearButton.jsx'
import { tr } from '../shell/i18n.js'
import { historyKey } from '../shell/useHistory.js'
import { useWorkspaceKeys } from '../shell/useOverlay.js'

// The strip's row of tools, laid out as the circuit boards' (games/kit/circuit): clear on the left (it asks first),
// undo and redo on the right; ⌘/Ctrl+Z and ⇧⌘/Ctrl+Z (or Ctrl+Y) work too. `history` is the shared useHistory over
// whatever the strip builds.
export function StripTools({ history, onClear, empty }) {
  const root = useRef(null)
  useWorkspaceKeys((event) => historyKey(event, history), { allowOverlay: (_, overlay) => overlay.contains(root.current) })
  return (
    <div className="ks-tools" ref={root}>
      <span className="ks-pill ks-clear">
        <ClearButton onClear={empty ? null : onClear} size={16} title={tr('清空整句？')} lines={[tr('已填入的内容将全部移除，清空后仍可撤销。')]} />
      </span>
      <span className="ks-pill">
        <button type="button" onClick={history.undo} disabled={!history.canUndo} aria-label={tr('撤销')} title={tr('撤销（⌘/Ctrl+Z）')}><Undo2 size={16} /></button>
        <button type="button" onClick={history.redo} disabled={!history.canRedo} aria-label={tr('重做')} title={tr('重做（⇧⌘/Ctrl+Z）')}><Redo2 size={16} /></button>
      </span>
    </div>
  )
}
