import { L, tr } from '../../../shell/i18n.js'
import { differs, isImage, pixel, show } from '../image.js'
import { denseCell } from './image-layout.js'
import ImageInspector from './ImageInspector.jsx'
import MobileResults from './MobileResults.jsx'

const sampleText = (value) => Array.isArray(value) ? value.map((v, k) => `${'RGB'[k]} ${v}`).join(' · ') : String(value)
const sameShape = (a, b) => isImage(a) && isImage(b) && a.w === b.w && a.h === b.h && a.c === b.c
const changed = (a, b, tolerance) => Array.isArray(a) ? a.some((v, k) => Math.abs(v - b[k]) > tolerance) : Math.abs(a - b) > tolerance

/** One output: its wanted value and what the board gave, side by side, the cells that differ marked on the result. */
function Output({ label, want, got, tolerance }) {
  const paired = sameShape(want, got)
  const different = paired ? (x, y) => changed(pixel(want, x, y), pixel(got, x, y), tolerance) ? 'is-different' : '' : undefined
  const inspectPixel = paired ? (x, y) => <><span>{tr('预期', 'Wanted')} {sampleText(pixel(want, x, y))}</span><span>{tr('结果', 'Result')} {sampleText(pixel(got, x, y))}</span></> : undefined
  const cell = isImage(want) ? Math.max(denseCell(want), isImage(got) ? denseCell(got) : 0) : undefined
  const wrong = got !== undefined && Boolean(differs(want, got, tolerance))
  return <section className="vi-test-output" data-different={wrong || undefined}>
    <h4>{label}</h4>
    {isImage(want) ? <div className="vi-test-pair">
      <ImageInspector value={want} label={tr('预期', 'Wanted')} fit dense cell={cell} inspectPixel={inspectPixel} />
      {isImage(got) && <ImageInspector value={got} label={tr('结果', 'Result')} showSize={!paired} fit dense cell={cell} cellClass={different} inspectPixel={inspectPixel} />}
      {got !== undefined && !isImage(got) && <figure className="vi-inspector vi-test-missing"><figcaption><strong>{tr('结果', 'Result')}</strong></figcaption><span className="vi-value">{show(got)}</span></figure>}
    </div> : <dl className="vi-test-scalars">
      <div><dt>{tr('预期', 'Wanted')}</dt><dd>{show(want)}</dd></div>
      <div><dt>{tr('结果', 'Result')}</dt><dd>{got === undefined ? '—' : show(got)}</dd></div>
    </dl>}
  </section>
}

/** Desktop lays one test out in a single row: image inputs, the number inputs in one column, then each output's
 * wanted and result. Phones focus on one selectable output. The desktop's image view switch sits in the results
 * header (Screen.jsx); the phone's in its output row. */
export default function TestValues({ rows, given, phone, tolerance = 1e-5 }) {
  if (phone) return <MobileResults {...{ rows, given, tolerance }} />
  const inputs = rows.slice(0, given), outputs = rows.slice(given)
  const numbers = inputs.filter(([, v]) => !isImage(v))
  return <div className="vi-test">
    {inputs.filter(([, v]) => isImage(v)).map(([label, v], k) => <ImageInspector key={k} value={v} label={L(label)} fit dense />)}
    {numbers.length > 0 && <dl className="vi-test-scalars">{numbers.map(([label, v], k) => <div key={k}><dt>{L(label)}</dt><dd>{show(v)}</dd></div>)}</dl>}
    {outputs.map(([label, want, got], k) => <Output key={k} label={L(label)} want={want} got={got} tolerance={tolerance} />)}
  </div>
}
