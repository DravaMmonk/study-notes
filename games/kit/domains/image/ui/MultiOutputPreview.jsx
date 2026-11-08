import { L } from '../../../shell/i18n.js'
import ValueView from './views/ValueView.jsx'
import './multi-output.css'

export default function MultiOutputPreview({ node, outputs, values, view, theme, size = 62, compact = false }) {
  return <div className={`image-multi-output ${compact ? 'is-compact' : ''}`}>{outputs.map(({ key, label }) => (
    <figure key={key}>
      <ValueView img={values?.get(`${node.id}#${key}`)} view={view} size={size} theme={theme} />
      {!compact && <figcaption>{L(label)}</figcaption>}
    </figure>
  ))}</div>
}
