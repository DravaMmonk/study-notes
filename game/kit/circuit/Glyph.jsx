import { createElement } from 'react'
import { L } from '../shell/i18n.js'

// A part's icon: a React component (an icon set's, say) or text (a glyph such as ∑, or a { zh, en } pair).
const isComponent = (icon) => typeof icon === 'function' || (icon !== null && typeof icon === 'object' && '$$typeof' in icon)

export default function Glyph({ icon, size = 12, strokeWidth = 1.8 }) {
  if (!icon) return null
  return isComponent(icon) ? createElement(icon, { size, strokeWidth }) : <span className="glyph-text">{String(L(icon))}</span>
}
