import { tr } from '../../../../shell/i18n.js'
import './attention-roles.css'

function Patch({ label, pixels, note }) {
  return <figure><figcaption>{label}</figcaption><div className="attention-pixels" role="img" aria-label={label}>
    {pixels.map((value, i) => <span key={i} style={{ background: `rgb(${Math.round(value * 255)}, ${Math.round(value * 255)}, ${Math.round(value * 255)})` }} />)}
  </div>{note && <small>{note}</small>}</figure>
}

export function AttentionRoles({ ctx }) {
  const { query, keys, values, weights, output, sources, target, projection, loss, steps } = ctx.view
  return <div className="attention-roles">
    {sources && <div className="attention-role-row">{sources.map((pixels, i) => <Patch key={i} label={`${tr('输入', 'Input')} ${i ? 'B' : 'A'}`} pixels={pixels} />)}</div>}
    <div className="attention-role-row"><Patch label={tr('查询 Q', 'Query Q')} pixels={query} /></div>
    <div className="attention-role-row">{keys.map((pixels, i) => <Patch key={i} label={`${tr('键', 'Key')} ${i ? 'B' : 'A'}`} pixels={pixels} note={`${tr('权重', 'Weight')} ${weights[i].toFixed(2)}`} />)}</div>
    <div className="attention-role-row">{values.map((pixels, i) => <Patch key={i} label={`${tr('值', 'Value')} ${i ? 'B' : 'A'}`} pixels={pixels} />)}</div>
    <div className="attention-role-row">{target && <Patch label={tr('目标', 'Target')} pixels={target} />}<Patch label={tr('加权输出', 'Weighted output')} pixels={output} /></div>
    {projection && <p>{tr('投影参数', 'Projection weights')}: Q {projection[0].toFixed(3)} · K {projection[1].toFixed(3)} · V {projection[2].toFixed(3)}<br />{tr('训练误差', 'Training loss')}: {loss.toFixed(4)} · {tr('步数', 'Steps')}: {steps}<br />{tr('图块亮度按 0–1 显示，超过 1 显示为白色。', 'Patch brightness is displayed on a 0–1 scale; values above 1 appear white.')}</p>}
  </div>
}
