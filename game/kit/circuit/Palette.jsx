import Glyph from './Glyph.jsx'
import { Plus } from 'lucide-react'
import { L, tr } from '../shell/i18n.js'

// The desktop parts list, the same in every game: click a part to put it on the board (in the first free spot),
// then wire it from its dots.
export default function Palette({ items, onAdd }) {
  if (!items.length) return <p className="panel-note">{tr('这一关不需要元件。', 'This level needs no parts.')}</p>
  return (
    <div className="palette">
      {items.map((item) => (
        <button key={item.type} className="palette-item" data-family={item.family} style={item.style} onClick={() => onAdd(item.type)} title={L(item.desc)}>
          <i className="family-chip"><Glyph icon={item.icon} size={14} /></i>
          <span className="palette-text">
            <span>{L(item.label)}{item.fresh && <em className="pb-new">{tr('新', 'new')}</em>}</span>
            <small>{L(item.desc)}</small>
          </span>
          <Plus size={14} className="palette-add" />
        </button>
      ))}
    </div>
  )
}
