import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Check, RotateCcw, X } from 'lucide-react'
import { pixelUrl, svgPoint, useSolveOnce, useWidth } from './matchDraw.js'
import { PHONE, useMedia } from '../../../../../games/kit/shell/useMedia.js'
import { L, tr } from '../../../../../games/kit/shell/i18n.js'
import './MatchBoards.css'

// 6-5 书封面: pair a point on the cover with the same point in the photo (drag from one to the other,
// or tap one and then the other). Three pairs give an affine map, four give a homography (solved by
// DLT); the cover is warped onto the photo with it.

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

export default function BookCover({ level, onSolve }) {
  const m = level.model
  const phone = useMedia(PHONE)
  const [pairs, setPairs] = useState([])
  const [armed, setArmed] = useState(null) // { side: 'cover' | 'photo', index }
  const [message, setMessage] = useState('') // '' or a { zh, en } pair, resolved at render
  const [overlay, setOverlay] = useState(true)
  const coverSvg = useRef(null)
  const photoSvg = useRef(null)
  const stage = useRef(null)
  const links = useRef(null)
  const draft = useRef(null)
  const stageWidth = useWidth(stage)

  const fit = useMemo(() => m.fit(pairs), [m, pairs])
  const done = pairs.length === 4 && fit.error < m.tol
  useSolveOnce(done, onSolve)

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
      setMessage({ zh: '最多 4 对点。先删掉一对。', en: 'At most 4 pairs. Delete one first.' })
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
  const hasError = Number.isFinite(fit.error)
  const errorOk = fit.error < m.tol
  const cw = m.COVER.w * S
  const ch = m.COVER.h * S
  const pw = m.PHOTO.w * S
  const ph = m.PHOTO.h * S

  let status = tr('至少连 3 对点，才能把封面贴上去。', 'Join at least 3 pairs before the cover can be pasted on.')
  if (pairs.length === 3) status = fit.model ? tr('3 对点 → 仿射变换（6 个自由度）。', '3 pairs → affine transform (6 degrees of freedom).') : tr('这 3 对点在一条线上，定不出变换。', 'These 3 pairs lie on one line and cannot fix a transform.')
  if (pairs.length === 4) status = fit.model ? tr('4 对点 → 单应变换，用 DLT 求解（8 个自由度）。', '4 pairs → homography, solved with DLT (8 degrees of freedom).') : tr('这 4 对点太集中或共线，定不出 H。', 'These 4 pairs are too bunched up or collinear to fix H.')
  const prompt =
    armed?.side === 'cover'
      ? tr('已选封面上的点 → 再点照片里同一个点。', 'Cover point selected → now click the same point in the photo.')
      : armed?.side === 'photo'
        ? tr('已选照片里的点 → 再点封面上对应的点。', 'Photo point selected → now click the matching point on the cover.')
        : tr('点封面上的一个圆点，再点照片里同一个位置的圆点；也可以直接拖过去。', 'Click a dot on the cover, then the dot at the same place in the photo; or just drag across.')

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

  const goal = (
    <ul className="bk-goals">
      <li className={`bk-goal ${pairs.length === 4 ? 'is-pass' : ''}`}>
        {pairs.length === 4 ? <Check size={16} /> : <X size={16} />}
        <span>{tr('点对', 'Pairs')}</span>
        <b>{pairs.length} / 4</b>
      </li>
      <li className={`bk-goal ${hasError && errorOk ? 'is-pass' : ''}`}>
        {hasError && errorOk ? <Check size={16} /> : <X size={16} />}
        <span>{tr('误差', 'Error')} <small>&lt; {m.tol} px</small></span>
        <b className={hasError ? (errorOk ? 'mb-ok' : 'mb-bad') : ''}>{hasError ? `${fit.error.toFixed(2)} px` : '—'}</b>
      </li>
    </ul>
  )

  return (
    <div className="bk mb mb-cover" onPointerDown={() => setArmed(null)}>
      <div className="bk-stage mb-cover-stage" ref={stage}>
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
            {goal}
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

      <section className="bk-panel mb-cover-details">
        <div className="mb-cover-controls">
          <span className="bk-label">{tr('变换', 'Transform')}</span>
          <p className="bk-note mb-status">{status}</p>
          {message && <p className="bk-verdict is-fail">{L(message)}</p>}
          <div className="bk-row">
            <label className="bk-check" onPointerDown={(e) => e.stopPropagation()}>
              <input type="checkbox" checked={overlay} onChange={(e) => setOverlay(e.target.checked)} /> {tr('显示贴图', 'Show the pasted cover')}
            </label>
            <button className="bk-btn" onClick={() => { setPairs([]); setArmed(null); setMessage('') }} disabled={!pairs.length}><RotateCcw size={14} /> {tr('清空', 'Clear')}</button>
          </div>
        </div>
        <div>
          <span className="bk-label">{tr('点对 · 封面 → 照片', 'Pairs · cover → photo')}</span>
          {pairs.length ? (
            <ol className="mb-pairs">
              {pairs.map((p, i) => {
                const [x, y] = m.coverPoints[p.cover]
                const [u, v] = m.photoPoints[p.photo].at
                return (
                  <li key={`${p.cover}-${p.photo}`}>
                    <i>{i + 1}</i>
                    <span>({x}, {y}) → ({u.toFixed(0)}, {v.toFixed(0)})</span>
                    <button aria-label={tr(`删掉第 ${i + 1} 对`, `Delete pair ${i + 1}`)} onPointerDown={(e) => e.stopPropagation()} onClick={() => setPairs((all) => all.filter((_, j) => j !== i))}><X size={15} /></button>
                  </li>
                )
              })}
            </ol>
          ) : (
            <p className="bk-note">{tr('还没有点对。', 'No pairs yet.')}</p>
          )}
        </div>
      </section>
    </div>
  )
}
