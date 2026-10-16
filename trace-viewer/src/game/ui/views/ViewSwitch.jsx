import { createElement } from 'react'
import { L, tr } from '../../../../../games/kit/shell/i18n.js'
import { IMAGE_VIEWS } from './views.js'

// Pick how 2-D values are drawn (see IMAGE_VIEWS).
export default function ViewSwitch({ value, onChange, compact }) {
  return (
    <span className="view-switch" role="group" aria-label={tr('显示方式', 'Display')}>
      {Object.entries(IMAGE_VIEWS).map(([key, { label, icon, hint }]) => (
        <button key={key} aria-pressed={value === key} title={tr(`${L(label)}：${L(hint)}`, `${L(label)}: ${L(hint)}`)} aria-label={L(label)} onPointerDown={(e) => e.stopPropagation()} onClick={() => onChange(key)}>
          {createElement(icon, { size: 12, strokeWidth: 1.8 })}
          {!compact && L(label)}
        </button>
      ))}
    </span>
  )
}
