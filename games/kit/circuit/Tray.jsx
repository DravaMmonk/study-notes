import Glyph from './Glyph.jsx'
import { L, tr } from '../shell/i18n.js'

// The phone's parts tray, the same in every game: tap a part to drop it into the next free slot, or hold and drag
// it onto a slot. Dragging a placed block back onto the tray removes it ([data-trash]).
export default function Tray({ items, onPick }) {
  if (!items.length) return null
  return (
    <section className="pb-tray" data-trash aria-label={tr('元件托盘：点一下放进空格，按住拖到某一格', 'Parts tray: tap to drop into a free slot, or hold and drag onto a slot')}>
      {items.map((item) => (
        <button key={item.type} type="button" className="pb-part" data-tray={item.type} data-family={item.family} onClick={() => onPick(item.type)} title={L(item.desc)}>
          {item.icon && <i className="family-chip"><Glyph icon={item.icon} size={13} /></i>}
          <b>{L(item.label)}</b>
          {item.fresh && <em className="pb-new">{tr('新', 'new')}</em>}
        </button>
      ))}
    </section>
  )
}
