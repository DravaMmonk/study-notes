import { tr } from '../../../../shell/i18n.js'
import './attention-roles.css'

function Patch({ label, pixels, note }) {
  return <figure><figcaption>{label}</figcaption><div className="attention-pixels" role="img" aria-label={label}>
    {pixels.map((value, i) => <span key={i} style={{ background: `rgb(${Math.round(value * 255)}, ${Math.round(value * 255)}, ${Math.round(value * 255)})` }} />)}
  </div>{note && <small>{note}</small>}</figure>
}

export function AttentionRoles({ ctx }) {
  const { query, keys, values, weights, output } = ctx.view
  return <div className="attention-roles">
    <div className="attention-role-row"><Patch label={tr('查询 Q', 'Query Q')} pixels={query} /></div>
    <div className="attention-role-row">{keys.map((pixels, i) => <Patch key={i} label={`${tr('键', 'Key')} ${i ? 'B' : 'A'}`} pixels={pixels} note={`${tr('权重', 'Weight')} ${weights[i].toFixed(2)}`} />)}</div>
    <div className="attention-role-row">{values.map((pixels, i) => <Patch key={i} label={`${tr('值', 'Value')} ${i ? 'B' : 'A'}`} pixels={pixels} />)}</div>
    <div className="attention-role-row"><Patch label={tr('加权输出', 'Weighted output')} pixels={output} /></div>
  </div>
}
