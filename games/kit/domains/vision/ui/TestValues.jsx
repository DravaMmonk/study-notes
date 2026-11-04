import { L, tr } from '../../../shell/i18n.js'
import { differs, isImage, pixel, show } from '../image.js'
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
  const wrong = got !== undefined && Boolean(differs(want, got, tolerance))
  return <section className="vi-test-output" data-different={wrong || undefined}>
    <h4>{label}</h4>
    {isImage(want) ? <div className="vi-test-pair">
      <ImageInspector value={want} label={tr('预期', 'Wanted')} fit dense inspectPixel={inspectPixel} />
      {isImage(got) && <ImageInspector value={got} label={tr('结果', 'Result')} showSize={!paired} fit dense cellClass={different} inspectPixel={inspectPixel} />}
      {got !== undefined && !isImage(got) && <figure className="vi-inspector vi-test-missing"><figcaption><strong>{tr('结果', 'Result')}</strong></figcaption><span className="vi-value">{show(got)}</span></figure>}
    </div> : <dl className="vi-test-scalars">
      <div><dt>{tr('预期', 'Wanted')}</dt><dd>{show(want)}</dd></div>
      <div><dt>{tr('结果', 'Result')}</dt><dd>{got === undefined ? '—' : show(got)}</dd></div>
    </dl>}
  </section>
}

/** Desktop lays one test's outputs out in a row, each output's wanted and result side by side; phones focus on one
 * selectable output. The inputs are on the board's input cards, not repeated here. The desktop's image view switch
 * sits in the results header (Screen.jsx); the phone's in its output row. */
export default function TestValues({ rows, phone, tolerance = 1e-5 }) {
  if (phone) return <MobileResults {...{ rows, tolerance }} />
  return <div className="vi-test">
    {rows.map(([label, want, got], k) => <Output key={k} label={L(label)} want={want} got={got} tolerance={tolerance} />)}
  </div>
}
