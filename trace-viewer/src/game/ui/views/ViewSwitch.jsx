import { createElement } from 'react'
import { IMAGE_VIEWS } from './views.js'

// Pick how 2-D values are drawn (see IMAGE_VIEWS).
export default function ViewSwitch({ value, onChange, compact }) {
  return (
    <span className="view-switch" role="group" aria-label="显示方式">
      {Object.entries(IMAGE_VIEWS).map(([key, { label, icon, hint }]) => (
        <button key={key} aria-pressed={value === key} title={`${label}：${hint}`} aria-label={label} onPointerDown={(e) => e.stopPropagation()} onClick={() => onChange(key)}>
          {createElement(icon, { size: 12, strokeWidth: 1.8 })}
          {!compact && label}
        </button>
      ))}
    </span>
  )
}
