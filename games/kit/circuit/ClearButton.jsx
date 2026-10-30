import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Trash2 } from 'lucide-react'
import { Dialog } from '../shell/Dialogs.jsx'
import { tr } from '../shell/i18n.js'

// The board's clear button, in each editor's own row of tools (the desktop board's corner, the phone board's top
// row, a strip's row): it asks first, since a whole board is a lot to lose, though undo brings it back. A strip says
// what it clears in its own words (`title`, `lines`). Without `onClear` it is greyed out: there is nothing to clear.
export default function ClearButton({ onClear, size = 14, title = null, lines = null }) {
  const [asking, setAsking] = useState(false)
  const close = () => setAsking(false)
  return (
    <>
      <button type="button" onClick={() => setAsking(true)} disabled={!onClear} aria-label={tr('清空', 'Clear')} title={tr('清空', 'Clear')}><Trash2 size={size} /></button>
      {/* On the page itself: the tools' blurred backing would otherwise hold the dialog inside it. */}
      {asking && createPortal(
        <Dialog
          title={title ?? tr('清空整块板？', 'Clear the whole board?')}
          lines={lines ?? [tr('板上的元件和连线将全部移除，清空后仍可撤销。', 'All parts and wires on the board will be removed. You can undo this.')]}
          actions={[[tr('取消', 'Cancel'), close], [tr('清空', 'Clear'), () => { close(); onClear() }]]}
          onClose={close}
        />,
        document.body,
      )}
    </>
  )
}
