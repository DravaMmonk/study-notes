import { L, tr } from '../../../shell/i18n.js'
import { isImage, show } from '../image.js'
import ImageInspector from './ImageInspector.jsx'

function Cell({ value }) {
  if (value === undefined) return null
  if (!isImage(value)) return <span className="vi-value">{show(value)}</span>
  return <ImageInspector value={value} label={tr('读数', 'Readings')} />
}

/** Image outputs need their own readable rows on phones, rather than a clipped three-column table. */
export default function TestValues({ rows, given, phone }) {
  if (!phone) return <table className="vi-test">
    <thead><tr><th /><th>{tr('应当', 'Wanted')}</th><th>{tr('这块板', 'This board')}</th></tr></thead>
    <tbody>{rows.map(([label, want, got], k) => <tr key={k}><th>{L(label)}</th><td><Cell value={want} /></td><td><Cell value={got} /></td></tr>)}</tbody>
  </table>
  return <div className="vi-mobile-values">
    <div className="vi-given-values">{rows.slice(0, given).map(([label, value], k) => <figure key={k}>
      <figcaption>{L(label)}</figcaption><Cell value={value} />
    </figure>)}</div>
    {rows.slice(given).map(([label, want, got], k) => {
      const wide = isImage(want) && (want.w > 3 || want.c === 3 && want.w > 2)
      return <section className="vi-output-value" key={k}>
        <h3>{L(label)}</h3>
        <div className={`vi-output-pair ${wide ? 'is-wide' : ''}`}>
          <figure><figcaption>{tr('应当', 'Wanted')}</figcaption><Cell value={want} /></figure>
          <figure><figcaption>{tr('这块板', 'This board')}</figcaption>{got === undefined ? <span className="vi-error is-missing">{tr('待接线', 'Not wired')}</span> : <Cell value={got} />}</figure>
        </div>
      </section>
    })}
  </div>
}
