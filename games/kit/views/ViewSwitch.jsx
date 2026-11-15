import { createElement, useContext } from 'react'
import { Activity, ChartScatter, ChartSpline, Grid3x3, Hash, Image, ListOrdered, Mountain, MoveUpRight, Navigation, Orbit, Rows3, Scaling, ScanLine, Table2, Waypoints } from 'lucide-react'
import { ViewScope } from './choice.js'
import { VIEWS } from '../engine/views.js'
import { L, tr } from '../shell/i18n.js'

// The switch between the views a row may be drawn in (games/DESIGN.md 6.9), the one in force pressed.

const ICONS = { value: Hash, numbers: Grid3x3, pixels: Image, plane: MoveUpRight, carried: Scaling, chain: Waypoints, plot: ChartSpline, profile: ScanLine, surface: Mountain, slope: Navigation, spectrum: Orbit, centredBins: Orbit, wave: Activity, bands: Rows3, terms: Table2, dots: ChartScatter, sequence: ListOrdered }

export default function ViewSwitch({ views, value, onChange, compact = false }) {
  const { controls } = useContext(ViewScope)
  if (controls && views.every((view) => view in controls.options)) {
    return <span className="view-pick is-direct" role="group" aria-label={tr('显示方式', 'Display')}>
      {Object.entries(controls.options).filter(([view]) => views.includes(view)).map(([view, option]) => {
        const label = L(option.label ?? VIEWS[view].label)
        const fresh = controls.fresh.includes(view)
        const name = fresh ? tr(`${label}（新）`, `${label} (new)`) : label
        return <button key={view} type="button" className={fresh ? 'is-new' : undefined} aria-pressed={value === view} aria-label={name}
          title={`${name} · ${L(option.hint)}`} onPointerDown={(event) => event.stopPropagation()} onClick={() => onChange(view)}>
          {createElement(view === 'pixels' ? Grid3x3 : ICONS[view], { size: 12, strokeWidth: 1.8 })}
          {!compact && <span>{label}</span>}
        </button>
      })}
    </span>
  }
  const next = views[(views.indexOf(value) + 1) % views.length]
  return <span className="view-pick">
    <button type="button" aria-label={tr(`切换为${L(VIEWS[next].label)}`, `Switch to ${L(VIEWS[next].label)}`)} title={L(VIEWS[next].label)} onPointerDown={(e) => e.stopPropagation()} onClick={() => onChange(next)}>
      {createElement(ICONS[value], { size: 12, strokeWidth: 1.8 })}
      {!compact && <span>{L(VIEWS[value].label)}</span>}
    </button>
  </span>
}
