import { useRef, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import Glyph from './Glyph.jsx'
import { L, tr } from '../shell/i18n.js'
import TrayMenu, { trayItemCount } from './TrayMenu.jsx'

// The phone's parts tray, the same in every game: tap a part to drop it into the next free slot, or hold and drag
// it onto a slot. Dragging a placed block back onto the tray removes it ([data-trash]). `folded` parts wait behind a
// 「更多」 chip at the end, as in the desktop Palette.
export default function Tray({ items, folded = [], onPick, start }) {
  const [more, setMore] = useState(false)
  const host = useRef(null)
  const part = (item) => (
    <button key={item.type} type="button" className={`pb-part ${item.folded ? 'is-folded' : ''} ${item.packed ? 'is-packed' : ''}`} data-tray={item.onPick ? undefined : item.type} data-family={item.family} onClick={item.onPick ?? (() => onPick(item.type))} title={L(item.desc)}>
      {item.icon && <i className="family-chip"><Glyph icon={item.icon} size={13} /></i>}
      <b>{L(item.label)}</b>
      {item.fresh && <em className="pb-new">{tr('新')}</em>}
    </button>
  )
  const entry = (item, hidden = false) => item.children
    ? <TrayMenu key={item.menu} entry={item} className="pb-part" phoneHost={host} renderPart={(child) => part({ ...child, folded: hidden })} />
    : part({ ...item, folded: hidden })
  const count = trayItemCount(folded)
  if (!start && !items.length && !folded.length) return null
  return (
    <div ref={host} className="pb-tray-wrap">
      <section className="pb-tray" data-trash aria-label={tr('元件托盘：点击放入空格，或按住拖到指定格子')}>
        {start && <div className="pb-tray-start">{start}</div>}
        <div className="pb-tray-parts">
          {items.map((item) => entry(item))}
          {more && folded.map((item) => entry(item, true))}
          {folded.length > 0 && (
            <button type="button" className={`pb-part pb-more ${more ? 'is-open' : ''}`} onClick={() => setMore(!more)} aria-expanded={more}>
              <b>{more ? tr('收起', 'Show fewer') : tr(`更多 ${count}`, `${count} more`)}</b>
              <ChevronRight size={14} />
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
