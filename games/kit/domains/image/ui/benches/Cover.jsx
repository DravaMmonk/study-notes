import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { pixelUrl, svgPoint, useWidth } from './matchDraw.js'
import { L, tr } from '../../../../shell/i18n.js'
import './match.css'

// The book-cover bench's pictures (bench model `cover`): pair a point on the cover with the same point in the photo
// (drag from one to the other, or tap one and then the other) into the knob `pairs`; three pairs give an affine map,
// four a homography, and the cover is warped onto the photo with it. The pairs made are listed with a delete button
// each. A drag between two pictures is an interaction no knob control can stand in for.

const S = 3 // svg units per image pixel
const PAD = 14 // svg margin around each picture, room for armed rings and tags
// Marker radius, tag size and snap distance (svg units) so that each reads at about the same screen
// size: the cover and photo are drawn at different scales, and smaller on a phone.
const SIZES = {
  wide: { rCover: 6, rPhoto: 6, fsCover: 12, fsPhoto: 12, snapCover: 22, snapPhoto: 20 },
  phone: { rCover: 8, rPhoto: 10, fsCover: 15, fsPhoto: 21, snapCover: 34, snapPhoto: 40 },
}

function toClient(svg, [x, y]) {
  const point = svg.createSVGPoint()
  point.x = x
  point.y = y
  const at = point.matrixTransform(svg.getScreenCTM())
  return [at.x, at.y]
}

export function CoverPairs({ ctx, children }) {
  const m = ctx.model
  const { phone } = ctx
  const { pairs, overlay } = ctx.values
  const setPairs = (next) => ctx.set('pairs', next)
  const setMessage = (message) => ctx.setUi({ message })
  const [armed, setArmed] = useState(null) // { side: 'cover' | 'photo', index }
  const coverSvg = useRef(null)
  const photoSvg = useRef(null)
  const stage = useRef(null)
  const links = useRef(null)
  const draft = useRef(null)
  const stageWidth = useWidth(stage)

  const { fit } = ctx.view

  const coverUrl = useMemo(() => pixelUrl(m.COVER.w, m.COVER.h, m.renderCover), [m])
  const photoUrl = useMemo(() => pixelUrl(m.PHOTO.w, m.PHOTO.h, (t) => m.renderPhoto(t)), [m])
  const warpUrl = useMemo(() => (fit.model ? pixelUrl(m.PHOTO.w, m.PHOTO.h, (t) => m.renderPhoto(t, fit.model, { desk: false })) : null), [m, fit.model])

  const Z = phone ? SIZES.phone : SIZES.wide
  const coverXY = ([x, y]) => [x * S, y * S]
  const photoXY = ([u, v]) => [u * S, v * S]

  // On a wide screen the pairs are joined by lines across the gap between the two pictures. The
  // overlay is measured after layout and written directly, so a resize only moves the lines.
  useLayoutEffect(() => {
    const svg = links.current
    if (!svg || !stage.current || !coverSvg.current || !photoSvg.current) return
    const box = stage.current.getBoundingClientRect()
    svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`)
    svg.querySelectorAll('line[data-pair]').forEach((line) => {
      const p = pairs[Number(line.dataset.pair)]
      if (!p) return
      const [x1, y1] = toClient(coverSvg.current, [m.coverPoints[p.cover][0] * S, m.coverPoints[p.cover][1] * S])
      const [x2, y2] = toClient(photoSvg.current, [m.photoPoints[p.photo].at[0] * S, m.photoPoints[p.photo].at[1] * S])
      line.setAttribute('x1', x1 - box.left)
      line.setAttribute('y1', y1 - box.top)
      line.setAttribute('x2', x2 - box.left)
      line.setAttribute('y2', y2 - box.top)
    })
  }, [pairs, stageWidth, phone, m])

  const addPair = (cover, photo) => {
    const rest = pairs.filter((p) => p.cover !== cover && p.photo !== photo)
    if (rest.length >= 4) {
      setMessage({ zh: '最多 4 对点，请先删除一对。', en: 'At most 4 pairs. Delete one first.' })
      return
    }
    setMessage('')
    setPairs([...rest, { cover, photo }])
  }

  const nearest = (points, toXY, [x, y], snap) => {
    let best = -1
    let bestD = snap
    points.forEach((p, i) => {
      const [px, py] = toXY(p)
      const d = Math.hypot(px - x, py - y)
      if (d < bestD) {
        best = i
        bestD = d
      }
    })
    return best
  }
  const coverAt = (event) => nearest(m.coverPoints, coverXY, svgPoint(coverSvg.current, event), Z.snapCover)
  const photoAt = (event) => nearest(m.photoPoints, (p) => photoXY(p.at), svgPoint(photoSvg.current, event), Z.snapPhoto)

  // The dashed line that follows a drag, drawn straight into the overlay (no re-render per move).
  const drawDraft = (from, event) => {
    const line = draft.current
    if (!line || !stage.current) return
    if (!event) {
      line.setAttribute('visibility', 'hidden')
      return
    }
    const box = stage.current.getBoundingClientRect()
    line.setAttribute('x1', from[0] - box.left)
    line.setAttribute('y1', from[1] - box.top)
    line.setAttribute('x2', event.clientX - box.left)
    line.setAttribute('y2', event.clientY - box.top)
    line.setAttribute('visibility', 'visible')
  }

  // Press on the cover: arm the nearest cover point and follow the pointer. Releasing over a photo
  // point pairs them (a drag); releasing anywhere else keeps the point armed for a tap on the photo.
  const pressCover = (event) => {
    event.stopPropagation()
    const cover = coverAt(event)
    if (cover < 0) {
      setArmed(null)
      return
    }
    if (armed?.side === 'photo') {
      addPair(cover, armed.index)
      setArmed(null)
      return
    }
    event.preventDefault()
    const wasArmed = armed?.side === 'cover' && armed.index === cover
    const start = [event.clientX, event.clientY]
    const from = toClient(coverSvg.current, coverXY(m.coverPoints[cover]))
    setArmed({ side: 'cover', index: cover })
    const move = (e) => drawDraft(from, e)
    const up = (e) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      drawDraft(from, null)
      const moved = Math.hypot(e.clientX - start[0], e.clientY - start[1]) > 6
      const target = e.type === 'pointerup' ? photoAt(e) : -1
      if (target >= 0) {
        addPair(cover, target)
        setArmed(null)
      } else if (!moved && wasArmed) {
        setArmed(null)
      }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  // Tap on the photo: pair with the armed cover point, or arm the photo point and wait for the cover.
  const tapPhoto = (event) => {
    event.stopPropagation()
    const photo = photoAt(event)
    if (photo < 0) {
      setArmed(null)
      return
    }
    if (armed?.side === 'cover') {
      addPair(armed.index, photo)
      setArmed(null)
    } else {
      setArmed(armed?.side === 'photo' && armed.index === photo ? null : { side: 'photo', index: photo })
    }
  }

  const usedCover = new Map(pairs.map((p, i) => [p.cover, i]))
  const usedPhoto = new Map(pairs.map((p, i) => [p.photo, i]))
  const quad = fit.model ? [[0, 0], [m.COVER.w, 0], [m.COVER.w, m.COVER.h], [0, m.COVER.h]].map(([x, y]) => photoXY(m.project(fit.model, x, y))) : null
  const errorOk = fit.error < m.tol
  const cw = m.COVER.w * S
  const ch = m.COVER.h * S
  const pw = m.PHOTO.w * S
  const ph = m.PHOTO.h * S

  const prompt =
    armed?.side === 'cover'
      ? tr('已选封面上的点 → 再点击照片中的同一点。', 'Cover point selected → now click the same point in the photo.')
      : armed?.side === 'photo'
        ? tr('已选照片中的点 → 再点击封面上的对应点。', 'Photo point selected → now click the matching point on the cover.')
        : tr('点击封面上的一个圆点，再点击照片中同一位置的圆点；也可以直接拖动连接。', 'Click a dot on the cover, then the dot at the same spot in the photo, or drag from one to the other.')

  const marker = (side, i, [x, y], used, r, fs) => {
    const isArmed = armed?.side === side && armed.index === i
    return (
      <g key={`${side}${i}`} data-cover={side === 'cover' ? i : undefined} data-photo={side === 'photo' ? i : undefined}>
        {isArmed && <circle className="mb-armed" cx={x} cy={y} r={r * 2.1} />}
        <circle className={`mb-${side}-key ${used.has(i) ? 'is-used' : ''} ${isArmed ? 'is-armed' : ''}`} cx={x} cy={y} r={r} />
        {used.has(i) && <text className="mb-pair-tag" x={x + r + 2} y={y - r - 2} style={{ fontSize: fs }}>{used.get(i) + 1}</text>}
      </g>
    )
  }

  return (
    <div className="mb mb-cover" onPointerDown={() => setArmed(null)}>
      <div className="mb-cover-stage" ref={stage}>
        <div className="mb-cover-grid">
          <figure className="mb-cover-fig">
            <span className="bk-label">{tr('封面', 'Cover')}</span>
            <svg ref={coverSvg} className="mb-svg mb-drag" viewBox={`${-PAD} ${-PAD} ${cw + 2 * PAD} ${ch + 2 * PAD}`} role="img" aria-label={tr('封面', 'Cover')} onPointerDown={pressCover}>
              <rect className="mb-hit" x={-PAD} y={-PAD} width={cw + 2 * PAD} height={ch + 2 * PAD} />
              <image className="mb-pixels" href={coverUrl} x={0} y={0} width={cw} height={ch} preserveAspectRatio="none" />
              <rect className="mb-frame" x={0} y={0} width={cw} height={ch} />
              <g pointerEvents="none">{m.coverPoints.map((p, i) => marker('cover', i, coverXY(p), usedCover, Z.rCover, Z.fsCover))}</g>
            </svg>
          </figure>
          <div className="mb-cover-aside">
            {children}
            <p className={`bk-note mb-prompt ${armed ? 'is-armed' : ''}`}>{prompt}</p>
          </div>
          <figure className="mb-photo-fig">
            <span className="bk-label">{tr('照片', 'Photo')}</span>
            <svg ref={photoSvg} className="mb-svg" viewBox={`${-PAD} ${-PAD} ${pw + 2 * PAD} ${ph + 2 * PAD}`} role="img" aria-label={tr('照片', 'Photo')} onClick={tapPhoto} onPointerDown={(e) => e.stopPropagation()}>
              <defs>
                <clipPath id="mb-photo-clip"><rect x={0} y={0} width={pw} height={ph} /></clipPath>
              </defs>
              <rect className="mb-hit" x={-PAD} y={-PAD} width={pw + 2 * PAD} height={ph + 2 * PAD} />
              <image className="mb-pixels" href={photoUrl} x={0} y={0} width={pw} height={ph} preserveAspectRatio="none" />
              {warpUrl && <image className={`mb-pixels mb-warp ${overlay ? '' : 'is-hidden'}`} href={warpUrl} x={0} y={0} width={pw} height={ph} preserveAspectRatio="none" />}
              {quad && <polygon className={`mb-quad ${errorOk ? '' : 'is-bad'}`} clipPath="url(#mb-photo-clip)" points={quad.map((p) => p.join(',')).join(' ')} />}
              <rect className="mb-frame" x={0} y={0} width={pw} height={ph} />
              <g pointerEvents="none">{m.photoPoints.map((p, i) => marker('photo', i, photoXY(p.at), usedPhoto, Z.rPhoto, Z.fsPhoto))}</g>
            </svg>
          </figure>
        </div>
        {!phone && (
          <svg ref={links} className="mb-links" aria-hidden="true">
            {pairs.map((p, i) => <line key={`${p.cover}-${p.photo}`} data-pair={i} className="mb-pair-line" />)}
            <line ref={draft} className="mb-pair-line is-draft" visibility="hidden" />
          </svg>
        )}
      </div>

    </div>
  )
}

export function CoverPairList({ ctx }) {
  const m = ctx.model
  const { pairs } = ctx.values
  const { message } = ctx.ui
  return (
    <div className="mb">
      {message && <p className="bk-verdict is-fail">{L(message)}</p>}
      {pairs.length ? (
        <ol className="mb-pairs">
          {pairs.map((p, i) => {
            const [x, y] = m.coverPoints[p.cover]
            const [u, v] = m.photoPoints[p.photo].at
            return (
              <li key={`${p.cover}-${p.photo}`}>
                <i>{i + 1}</i>
                <span>({x}, {y}) → ({u.toFixed(0)}, {v.toFixed(0)})</span>
                <button aria-label={tr(`删除第 ${i + 1} 对`, `Delete pair ${i + 1}`)} onClick={() => ctx.set('pairs', pairs.filter((_, j) => j !== i))}><X size={15} /></button>
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="bk-note">{tr('还没有点对。', 'No pairs yet.')}</p>
      )}
    </div>
  )
}
