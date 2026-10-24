import { useEffect } from 'react'
import { Redo2, Undo2 } from 'lucide-react'
import ClearButton from '../circuit/ClearButton.jsx'
import { tr } from '../shell/i18n.js'

// The strip's row of tools, laid out as the circuit boards' (games/kit/circuit): clear on the left (it asks first),
// the strip's note beside it, undo and redo on the right; ⌘/Ctrl+Z and ⇧⌘/Ctrl+Z (or Ctrl+Y) work too. `history` is the circuit's useHistory over
// whatever the strip builds.
export function StripTools({ history, onClear, empty, note = null }) {
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
      <span className={`ks-pill ks-clear ${empty ? 'is-idle' : ''}`}>
        <ClearButton onClear={onClear} size={16} title={tr('清空整句？', 'Clear it all?')} lines={[tr('已经填进去的都会拿掉。清空以后还可以撤销。', 'Everything put in goes. Undo brings it back.')]} />
      </span>
      <div className="ks-tools-note">{note}</div>
      <span className="ks-pill">
        <button type="button" onClick={history.undo} disabled={!history.canUndo} aria-label={tr('撤销', 'Undo')} title={tr('撤销（⌘/Ctrl+Z）', 'Undo (⌘/Ctrl+Z)')}><Undo2 size={16} /></button>
        <button type="button" onClick={history.redo} disabled={!history.canRedo} aria-label={tr('重做', 'Redo')} title={tr('重做（⇧⌘/Ctrl+Z）', 'Redo (⇧⌘/Ctrl+Z)')}><Redo2 size={16} /></button>
      </span>
    </div>
  )
}
