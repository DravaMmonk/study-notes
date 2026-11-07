import { createElement } from 'react'
import { L, tr } from '../../../../shell/i18n.js'
import { viewsIn } from './views.js'

// Pick how 2-D values are drawn (see IMAGE_VIEWS), among the views the level has brought in (`shows`); a view new in
// this level (`fresh`) is marked. With only pixels so far there is nothing to pick.
export default function ViewSwitch({ value, onChange, compact, shows, fresh = [] }) {
  const views = viewsIn(shows)
  if (views.length < 2) return null
  return (
    <span className="view-switch" role="group" aria-label={tr('显示方式', 'Display')}>
      {views.map(([key, { label, icon, hint }]) => (
        <button key={key} className={fresh.includes(key) ? 'is-new' : ''} aria-pressed={value === key} title={tr(`${L(label)}：${L(hint)}${fresh.includes(key) ? '（新）' : ''}`, `${L(label)}: ${L(hint)}${fresh.includes(key) ? ' (new)' : ''}`)} aria-label={L(label)} onPointerDown={(e) => e.stopPropagation()} onClick={() => onChange(key)}>
          {createElement(icon, { size: 12, strokeWidth: 1.8 })}
          {!compact && L(label)}
        </button>
      ))}
    </span>
  )
}
