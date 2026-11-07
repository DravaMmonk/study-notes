import { createElement } from 'react'
import { Activity, ChartSpline, Grid3x3, Hash, Image, ListOrdered, Mountain, Navigation, Orbit, Rows3, ScanLine } from 'lucide-react'
import { VIEWS } from '../engine/views.js'
import { L, tr } from '../shell/i18n.js'

// The switch between the views a row may be drawn in (games/DESIGN.md 6.10), the one in force pressed.

const ICONS = { value: Hash, numbers: Grid3x3, pixels: Image, plot: ChartSpline, profile: ScanLine, surface: Mountain, slope: Navigation, spectrum: Orbit, centredBins: Orbit, wave: Activity, bands: Rows3, sequence: ListOrdered }

export default function ViewSwitch({ views, value, onChange, compact = false }) {
  const next = views[(views.indexOf(value) + 1) % views.length]
  return <span className="view-pick">
    <button type="button" aria-label={tr(`切换为${L(VIEWS[next].label)}`, `Switch to ${L(VIEWS[next].label)}`)} title={L(VIEWS[next].label)} onPointerDown={(e) => e.stopPropagation()} onClick={() => onChange(next)}>
      {createElement(ICONS[value], { size: 12, strokeWidth: 1.8 })}
      {!compact && <span>{L(VIEWS[value].label)}</span>}
    </button>
  </span>
}
