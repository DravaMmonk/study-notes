import { createElement } from 'react'
import { Activity, Grid3x3, Hash, Image, ListOrdered, Rows3 } from 'lucide-react'
import { VIEWS } from '../engine/views.js'
import { L } from '../shell/i18n.js'

// The switch between the views a row may be drawn in (games/DESIGN.md 6.10), the one in force pressed.

const ICONS = { value: Hash, numbers: Grid3x3, pixels: Image, wave: Activity, bands: Rows3, sequence: ListOrdered }

export default function ViewSwitch({ views, value, onChange, compact = false }) {
  return (
    <span className="view-pick" role="group">
      {views.map((v) => (
        <button key={v} type="button" aria-pressed={value === v} aria-label={L(VIEWS[v].label)} title={L(VIEWS[v].label)} onPointerDown={(e) => e.stopPropagation()} onClick={() => onChange(v)}>
          {createElement(ICONS[v], { size: 12, strokeWidth: 1.8 })}
          {!compact && <span>{L(VIEWS[v].label)}</span>}
        </button>
      ))}
    </span>
  )
}
