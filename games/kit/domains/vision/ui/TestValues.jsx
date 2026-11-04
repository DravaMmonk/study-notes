import { L, tr } from '../../../shell/i18n.js'
import { isImage, show } from '../image.js'
import ImageInspector from './ImageInspector.jsx'
import MobileResults from './MobileResults.jsx'

/** A missing result keeps the wanted value's footprint (an image's frame) so the row does not jump when a run lands. */
const Empty = ({ like }) => <div className="vi-empty-value" style={isImage(like) ? undefined : { width: 96, height: 28 }}>{tr('暂无结果', 'No result yet')}</div>

function Item({ label, value, like }) {
  if (isImage(value)) return <ImageInspector value={value} label={label} />
  return <figure className="vi-inspector">
    <figcaption><strong>{label}</strong></figcaption>
    {value === undefined ? <Empty like={like} /> : <span className="vi-value">{show(value)}</span>}
  </figure>
}

const Group = ({ title, children }) => <section className="vi-test-group"><h4>{title}</h4><div>{children}</div></section>

/** Desktop lays one test out in a single row — inputs, wanted, result; phones focus on one selectable output. The
 * desktop's image view switch sits in the results header (Screen.jsx); the phone's in its output row. */
export default function TestValues({ rows, given, phone, tolerance = 1e-5 }) {
  if (phone) return <MobileResults {...{ rows, given, tolerance }} />
  const inputs = rows.slice(0, given), outputs = rows.slice(given)
  return <div className="vi-test">
    <Group title={tr('输入', 'Inputs')}>{inputs.map(([label, v], k) => <Item key={k} label={L(label)} value={v} />)}</Group>
    <Group title={tr('预期', 'Wanted')}>{outputs.map(([label, want], k) => <Item key={k} label={L(label)} value={want} />)}</Group>
    <Group title={tr('结果', 'Result')}>{outputs.map(([label, want, got], k) => <Item key={k} label={L(label)} value={got} like={want} />)}</Group>
  </div>
}
