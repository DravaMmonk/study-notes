import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Trash2 } from 'lucide-react'
import { Dialog } from './Dialogs.jsx'
import { tr } from './i18n.js'

// Shared confirmation control. Callers provide the text for the work being cleared.
export default function ClearButton({ onClear, size = 14, title = null, lines = null }) {
  const [asking, setAsking] = useState(false)
  const close = () => setAsking(false)
  return (
    <>
      <button type="button" onClick={() => setAsking(true)} disabled={!onClear} aria-label={tr('清空')} title={tr('清空')}><Trash2 size={size} /></button>
      {/* On the page itself: the tools' blurred backing would otherwise hold the dialog inside it. */}
      {asking && createPortal(
        <Dialog
          title={title}
          lines={lines}
          actions={[[tr('取消'), close], [tr('清空'), () => { close(); onClear() }]]}
          onClose={close}
        />,
        document.body,
      )}
    </>
  )
}
