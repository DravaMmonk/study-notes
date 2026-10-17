import Glyph from './Glyph.jsx'
import { Plus } from 'lucide-react'
import { L, tr } from '../shell/i18n.js'

// The desktop parts list, the same in every game: click a part to put it on the board (in the first free spot),
// then wire it from its dots. `compact` shows each part as one line (its icon, name and short tag) with what it does
// in a tooltip, for a floating window over the board.
export default function Palette({ items, onAdd, compact = false }) {
  // A tooltip opens to the right of its part, or to the left when the right would run past the board (or the window).
  const aim = (event) => {
    const item = event.currentTarget
    const tip = item.querySelector('.palette-tip')
    if (!tip) return
    const edge = (item.closest('.kit-board') ?? document.documentElement).getBoundingClientRect().right
    item.dataset.tip = item.getBoundingClientRect().right + 12 + tip.offsetWidth > edge ? 'left' : 'right'
  }
  if (!items.length) return <p className="panel-note">{tr('这一关不需要元件。', 'This level needs no parts.')}</p>
  return (
    <div className={`palette ${compact ? 'is-compact' : ''}`}>
      {items.map((item) => (
        <button key={item.type} className="palette-item" data-family={item.family} style={item.style} onClick={() => onAdd(item.type)} title={compact ? undefined : L(item.desc)} onPointerEnter={compact ? aim : undefined} onFocus={compact ? aim : undefined} aria-description={compact ? L(item.desc) : undefined}>
          <i className="family-chip"><Glyph icon={item.icon} size={14} /></i>
          <span className="palette-text">
            <span>{L(item.label)}{item.fresh && <em className="pb-new">{tr('新', 'new')}</em>}</span>
            {compact ? item.tag && <small>{L(item.tag)}</small> : <small>{L(item.desc)}</small>}
          </span>
          <Plus size={14} className="palette-add" />
          {compact && item.desc && <span className="palette-tip" role="tooltip">{L(item.desc)}</span>}
        </button>
      ))}
    </div>
  )
}
