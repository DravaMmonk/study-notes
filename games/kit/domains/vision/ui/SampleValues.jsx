import { useEffect, useRef, useState } from 'react'
import { L, tr } from '../../../shell/i18n.js'
import { display, fmt, isImage, pixel, show } from '../image.js'

const text = (v) => (Array.isArray(v) ? v.map(fmt).join(', ') : fmt(v))

/** A large image as pixels on a canvas the width of its frame; a pointer on it picks the cell under it (`onAt`). */
function SamplePicture({ value, label, at, onAt }) {
  const canvas = useRef(null)
  useEffect(() => {
    const ctx = canvas.current.getContext('2d')
    const out = ctx.createImageData(value.w, value.h)
    for (let k = 0; k < value.w * value.h; k++) {
      const p = value.c === 3 ? value.data.slice(k * 3, k * 3 + 3) : [value.data[k], value.data[k], value.data[k]]
      p.forEach((v, ch) => { out.data[k * 4 + ch] = Math.round(display(v) * 255) })
      out.data[k * 4 + 3] = 255
    }
    ctx.putImageData(out, 0, 0)
  }, [value])
  const pick = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const x = Math.min(value.w - 1, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * value.w)))
    const y = Math.min(value.h - 1, Math.max(0, Math.floor(((e.clientY - r.top) / r.height) * value.h)))
    onAt({ x, y })
  }
  return (
    <figure className="vi-sample-picture">
      <figcaption>{label}</figcaption>
      <div className="vi-sample-frame" onClick={pick} onPointerMove={(e) => e.pointerType === 'mouse' && e.buttons && pick(e)}>
        <canvas ref={canvas} width={value.w} height={value.h} role="img" aria-label={`${L(label)} ${value.w} × ${value.h}`} />
        {at && at.x < value.w && at.y < value.h && <i className="vi-sample-mark" style={{ left: `${(at.x / value.w) * 100}%`, top: `${(at.y / value.h) * 100}%`, width: `${100 / value.w}%`, height: `${100 / value.h}%` }} />}
      </div>
    </figure>
  )
}

/**
 * The sample's results: each output's target (the reference board on the sample) and what the player's board gives,
 * side by side as pictures, never judged. Picking a cell on any picture marks it on all of them and reads both values
 * there; the board's cards show the sample's values, so a part's detail inspects them cell by cell.
 */
export default function SampleValues({ rows }) {
  const [at, setAt] = useState(null)
  return (
    <div className="vi-sample">
      {rows.map(([label, want, got], k) => (
        <section key={k} className="vi-sample-output">
          <h4>{L(label)}{isImage(want) && <small>{want.w} × {want.h}</small>}</h4>
          {isImage(want) ? (
            <>
              <div className="vi-sample-pair">
                <SamplePicture value={want} label={tr('目标', 'Target')} at={at} onAt={setAt} />
                {isImage(got) ? <SamplePicture value={got} label={tr('你的', 'Yours')} at={at} onAt={setAt} /> : <figure className="vi-sample-picture"><figcaption>{tr('你的', 'Yours')}</figcaption><span className="vi-value">{got === undefined ? '—' : show(got)}</span></figure>}
              </div>
              {at && at.x < want.w && at.y < want.h && <p className="vi-sample-read">({at.x}, {at.y}) {tr('目标', 'Target')} <b>{text(pixel(want, at.x, at.y))}</b>{isImage(got) && at.x < got.w && at.y < got.h && <> · {tr('你的', 'Yours')} <b>{text(pixel(got, at.x, at.y))}</b></>}</p>}
            </>
          ) : (
            <p className="vi-sample-read">{tr('目标', 'Target')} <b>{show(want)}</b> · {tr('你的', 'Yours')} <b>{got === undefined ? '—' : show(got)}</b></p>
          )}
        </section>
      ))}
    </div>
  )
}
