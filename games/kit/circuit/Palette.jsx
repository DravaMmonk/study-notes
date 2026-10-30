import { useState } from 'react'
import Glyph from './Glyph.jsx'
import { ChevronRight, Plus } from 'lucide-react'
import { L, tr } from '../shell/i18n.js'

// The desktop parts list, the same in every game: click a part to put it on the board (in the first free spot),
// then wire it from its dots. `compact` shows each part as one line (its icon, name and short tag) with what it does
// in a tooltip, for a floating window over the board. `folded` parts (still usable, but not what this level's puzzle is
// about: ../course.js offer) wait behind a 「更多」 button at the end. A packed part (`packed`: one that runs a circuit the
// player built) has a solid family chip, as on the board.
export default function Palette({ items, folded = [], onAdd, compact = false }) {
  const [more, setMore] = useState(false)
  // A tooltip opens to the right of its part, or to the left when the right would run past the board (or the window).
  const aim = (event) => {
    const item = event.currentTarget
    const tip = item.querySelector('.palette-tip')
    if (!tip) return
    const edge = (item.closest('.kit-board') ?? document.documentElement).getBoundingClientRect().right
    item.dataset.tip = item.getBoundingClientRect().right + 12 + tip.offsetWidth > edge ? 'left' : 'right'
  }
  if (!items.length && !folded.length) return <p className="panel-note">{tr('这一关不需要元件。', 'This level needs no parts.')}</p>
  return (
    <div className={`palette ${compact ? 'is-compact' : ''}`}>
      {[...items, ...(more ? folded.map((item) => ({ ...item, folded: true })) : [])].map((item) => (
        <button key={item.type} className={`palette-item ${item.folded ? 'is-folded' : ''} ${item.packed ? 'is-packed' : ''}`} data-family={item.family} style={item.style} onClick={() => onAdd(item.type)} title={compact ? undefined : L(item.desc)} onPointerEnter={compact ? aim : undefined} onFocus={compact ? aim : undefined} aria-description={compact ? L(item.desc) : undefined}>
          <i className="family-chip"><Glyph icon={item.icon} size={14} /></i>
          <span className="palette-text">
            <span>{L(item.label)}{item.fresh && <em className="pb-new">{tr('新', 'new')}</em>}</span>
            {compact ? item.tag && <small>{L(item.tag)}</small> : <small>{L(item.desc)}</small>}
          </span>
          <Plus size={14} className="palette-add" />
          {compact && item.desc && <span className="palette-tip" role="tooltip">{L(item.desc)}</span>}
        </button>
      ))}
      {folded.length > 0 && (
        <button type="button" className={`palette-more ${more ? 'is-open' : ''}`} onClick={() => setMore(!more)} aria-expanded={more} title={tr('这一关不必用到、但可以使用的元件', 'Parts this level does not need but you may use')}>
          <span>{more ? tr('收起', 'Show fewer') : tr(`更多 ${folded.length}`, `${folded.length} more`)}</span>
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  )
}
