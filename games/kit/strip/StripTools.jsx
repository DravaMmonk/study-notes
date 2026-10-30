import { useEffect } from 'react'
import { Redo2, Undo2 } from 'lucide-react'
import ClearButton from '../circuit/ClearButton.jsx'
import { tr } from '../shell/i18n.js'

// The strip's row of tools, laid out as the circuit boards' (games/kit/circuit): clear on the left (it asks first),
// undo and redo on the right; ⌘/Ctrl+Z and ⇧⌘/Ctrl+Z (or Ctrl+Y) work too. `history` is the circuit's useHistory over
// whatever the strip builds.
export function StripTools({ history, onClear, empty }) {
  useEffect(() => {
    const key = (event) => {
      if (!(event.metaKey || event.ctrlKey) || /^(INPUT|TEXTAREA)$/.test(event.target.tagName)) return
      const k = event.key.toLowerCase()
      if (k !== 'z' && k !== 'y') return
      event.preventDefault()
      if (k === 'y' || event.shiftKey) history.redo()
      else history.undo()
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })
  return (
    <div className="ks-tools">
      <span className="ks-pill ks-clear">
        <ClearButton onClear={empty ? null : onClear} size={16} title={tr('清空整句？', 'Clear the whole sentence?')} lines={[tr('已填入的内容将全部移除，清空后仍可撤销。', 'Everything filled in will be removed. You can undo this.')]} />
      </span>
      <span className="ks-pill">
        <button type="button" onClick={history.undo} disabled={!history.canUndo} aria-label={tr('撤销', 'Undo')} title={tr('撤销（⌘/Ctrl+Z）', 'Undo (⌘/Ctrl+Z)')}><Undo2 size={16} /></button>
        <button type="button" onClick={history.redo} disabled={!history.canRedo} aria-label={tr('重做', 'Redo')} title={tr('重做（⇧⌘/Ctrl+Z）', 'Redo (⇧⌘/Ctrl+Z)')}><Redo2 size={16} /></button>
      </span>
    </div>
  )
}
