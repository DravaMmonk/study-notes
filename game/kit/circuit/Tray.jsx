import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import Glyph from './Glyph.jsx'
import { L, tr } from '../shell/i18n.js'

// The phone's parts tray, the same in every game: tap a part to drop it into the next free slot, or hold and drag
// it onto a slot. Dragging a placed block back onto the tray removes it ([data-trash]). `folded` parts wait behind a
// 「更多」 chip at the end, as in the desktop Palette.
export default function Tray({ items, folded = [], onPick }) {
  const [more, setMore] = useState(false)
  if (!items.length && !folded.length) return null
  return (
    <section className="pb-tray" data-trash aria-label={tr('元件托盘：点一下放进空格，按住拖到某一格', 'Parts tray: tap to drop into a free slot, or hold and drag onto a slot')}>
      {[...items, ...(more ? folded.map((item) => ({ ...item, folded: true })) : [])].map((item) => (
        <button key={item.type} type="button" className={`pb-part ${item.folded ? 'is-folded' : ''} ${item.packed ? 'is-packed' : ''}`} data-tray={item.type} data-family={item.family} onClick={() => onPick(item.type)} title={L(item.desc)}>
          {item.icon && <i className="family-chip"><Glyph icon={item.icon} size={13} /></i>}
          <b>{L(item.label)}</b>
          {item.fresh && <em className="pb-new">{tr('新', 'new')}</em>}
        </button>
      ))}
      {folded.length > 0 && (
        <button type="button" className={`pb-part pb-more ${more ? 'is-open' : ''}`} onClick={() => setMore(!more)} aria-expanded={more}>
          <b>{more ? tr('收起', 'Fewer') : tr(`更多 ${folded.length}`, `${folded.length} more`)}</b>
          <ChevronRight size={14} />
        </button>
      )}
    </section>
  )
}
