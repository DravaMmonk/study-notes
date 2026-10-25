import { useState } from 'react'
import { createPortal } from 'react-dom'
import Sheet from '../../../shell/Sheet.jsx'
import { L, tr } from '../../../shell/i18n.js'
import { parseTerm, printTerm } from '../pterm.js'
import { complete } from '../termTree.js'
import TermEditor from './TermEditor.jsx'

// A proof term written on a card (the proof board's proof-term card, proof.js `exact`): the card shows the term, and
// tapping it opens a sheet to build it from chips (TermEditor.jsx). A whole term is kept on the card as text.
export default function TermField({ label, value = '', onChange, scope, title }) {
  const [open, setOpen] = useState(false)
  const [tree, setTree] = useState(() => (value ? parseTerm(value) : null))
  const change = (next) => {
    setTree(next)
    onChange(complete(next) ? printTerm(next) : '')
  }
  return (
    <div className="lg-field" onPointerDown={(e) => e.stopPropagation()}>
      <label>
        <span>{L(label)}</span>
        <button type="button" className="lg-termfield" onClick={() => setOpen(true)}>{value ? <code className="lg-term">{value}</code> : tr('写一个', 'Write one')}</button>
      </label>
      {open && createPortal(
        <Sheet title={L(title)} onClose={() => setOpen(false)}>
          <div className="fo-level tm-level lg-termsheet">
            <TermEditor tree={tree} onChange={change} scope={scope} history={`sheet:${title?.zh ?? ''}`} />
          </div>
        </Sheet>,
        document.body,
      )}
    </div>
  )
}
