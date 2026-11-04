import { L, tr } from '../../../shell/i18n.js'
import { isImage, show } from '../image.js'
import ImageInspector from './ImageInspector.jsx'
import MobileResults from './MobileResults.jsx'

function Cell({ value, label }) {
  if (value === undefined) return null
  if (!isImage(value)) return <span className="vi-value">{show(value)}</span>
  return <ImageInspector value={value} label={label} caption={false} />
}

/** Desktop reference table; phones focus on one selectable output and disclose supporting inputs. */
export default function TestValues({ rows, given, phone, tolerance = 1e-5 }) {
  if (!phone) return <table className="vi-test">
    <thead><tr><th /><th>{tr('应当', 'Wanted')}</th><th>{tr('这块板', 'This board')}</th></tr></thead>
    <tbody>{rows.map(([label, want, got], k) => <tr key={k}><th>{L(label)}</th><td><Cell value={want} label={L(label)} /></td><td><Cell value={got} label={L(label)} /></td></tr>)}</tbody>
  </table>
  return <MobileResults {...{rows,given,tolerance}} />
}
