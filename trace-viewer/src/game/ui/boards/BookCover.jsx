import { useMemo, useRef, useState } from 'react'
import { RotateCcw, X } from 'lucide-react'
import { pixelUrl, svgPoint, useSolveOnce } from './matchDraw.js'
import './MatchBoards.css'

// 6-5 书封面: drag from a point on the cover to the same point in the photo. Three pairs give an
// affine map, four give a homography (solved by DLT); the cover is warped onto the photo with it.

const S = 3
const COVER_AT = [0, 40]
const PHOTO_X = 250
const SNAP = 16

export default function BookCover({ level, onSolve }) {
  const m = level.model
  const [pairs, setPairs] = useState([])
  const [armed, setArmed] = useState(null)
  const [draft, setDraft] = useState(null)
  const [message, setMessage] = useState('')
  const [overlay, setOverlay] = useState(true)
  const svg = useRef(null)

  const fit = useMemo(() => m.fit(pairs), [m, pairs])
  const done = pairs.length === 4 && fit.error < m.tol
  useSolveOnce(done, onSolve)

  const coverUrl = useMemo(() => pixelUrl(m.COVER.w, m.COVER.h, m.renderCover), [m])
  const photoUrl = useMemo(() => pixelUrl(m.PHOTO.w, m.PHOTO.h, (t) => m.renderPhoto(t)), [m])
  const warpUrl = useMemo(() => (fit.model ? pixelUrl(m.PHOTO.w, m.PHOTO.h, (t) => m.renderPhoto(t, fit.model, { desk: false })) : null), [m, fit.model])

  const coverXY = ([x, y]) => [COVER_AT[0] + x * S, COVER_AT[1] + y * S]
  const photoXY = ([u, v]) => [PHOTO_X + u * S, v * S]

  const addPair = (cover, photo) => {
    const rest = pairs.filter((p) => p.cover !== cover && p.photo !== photo)
    if (rest.length >= 4) {
      setMessage('最多 4 对点。先删掉一对。')
      return
    }
    setMessage('')
    setPairs([...rest, { cover, photo }])
  }

  const nearestPhoto = ([x, y]) => {
    let best = -1
    let bestD = SNAP
    m.photoPoints.forEach((p, i) => {
      const [px, py] = photoXY(p.at)
      const d = Math.hypot(px - x, py - y)
      if (d < bestD) {
        best = i
        bestD = d
      }
    })
    return best
  }

  const beginDrag = (event, cover) => {
    event.preventDefault()
    event.stopPropagation()
    setArmed(cover)
    setDraft(svgPoint(svg.current, event))
    const move = (e) => setDraft(svgPoint(svg.current, e))
    const up = (e) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      setDraft(null)
      const target = nearestPhoto(svgPoint(svg.current, e))
      if (target >= 0) {
        addPair(cover, target)
        setArmed(null)
      }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const clickPhoto = (event, photo) => {
    event.stopPropagation()
    if (armed === null) return
    addPair(armed, photo)
    setArmed(null)
  }

  const usedCover = new Set(pairs.map((p) => p.cover))
  const usedPhoto = new Set(pairs.map((p) => p.photo))
  const quad = fit.model ? [[0, 0], [m.COVER.w, 0], [m.COVER.w, m.COVER.h], [0, m.COVER.h]].map(([x, y]) => photoXY(m.project(fit.model, x, y))) : null
  const errorOk = fit.error < m.tol

  let status = '至少连 3 对点，才能把封面贴上去。'
  if (pairs.length === 3) status = fit.model ? '3 对点 → 仿射变换（6 个自由度）' : '这 3 对点在一条线上，定不出变换。'
  if (pairs.length === 4) status = fit.model ? '4 对点 → 单应变换，用 DLT 求解（8 个自由度）' : '这 4 对点太集中或共线，定不出 H。'

  return (
    <div className="mb mb-cover" onPointerDown={() => setArmed(null)}>
      <svg ref={svg} className="mb-stage" viewBox={`-8 -26 ${PHOTO_X + m.PHOTO.w * S + 16} ${m.PHOTO.h * S + 34}`} role="img" aria-label="封面和照片">
        <text className="mb-caption" x={COVER_AT[0]} y={-10}>封面</text>
        <text className="mb-caption" x={PHOTO_X} y={-10}>照片</text>
        <image className="mb-pixels" href={coverUrl} x={COVER_AT[0]} y={COVER_AT[1]} width={m.COVER.w * S} height={m.COVER.h * S} preserveAspectRatio="none" />
        <rect className="mb-frame" x={COVER_AT[0]} y={COVER_AT[1]} width={m.COVER.w * S} height={m.COVER.h * S} />
        <image className="mb-pixels" href={photoUrl} x={PHOTO_X} y={0} width={m.PHOTO.w * S} height={m.PHOTO.h * S} preserveAspectRatio="none" />
        {overlay && warpUrl && <image className="mb-pixels" href={warpUrl} x={PHOTO_X} y={0} width={m.PHOTO.w * S} height={m.PHOTO.h * S} preserveAspectRatio="none" opacity={0.6} />}
        <rect className="mb-frame" x={PHOTO_X} y={0} width={m.PHOTO.w * S} height={m.PHOTO.h * S} />
        {quad && (
          <svg x={PHOTO_X} y={0} width={m.PHOTO.w * S} height={m.PHOTO.h * S} viewBox={`${PHOTO_X} 0 ${m.PHOTO.w * S} ${m.PHOTO.h * S}`} overflow="hidden">
            <polygon className={`mb-quad ${errorOk ? '' : 'is-bad'}`} points={quad.map((p) => p.join(',')).join(' ')} />
          </svg>
        )}

        {pairs.map((p, i) => {
          const [x1, y1] = coverXY(m.coverPoints[p.cover])
          const [x2, y2] = photoXY(m.photoPoints[p.photo].at)
          return (
            <g key={`${p.cover}-${p.photo}`}>
              <line className="mb-pair-line" x1={x1} y1={y1} x2={x2} y2={y2} />
              <text className="mb-pair-tag" x={x2 + 7} y={y2 - 6}>{i + 1}</text>
              <text className="mb-pair-tag" x={x1 + 7} y={y1 - 6}>{i + 1}</text>
            </g>
          )
        })}
        {armed !== null && draft && <line className="mb-pair-line is-draft" x1={coverXY(m.coverPoints[armed])[0]} y1={coverXY(m.coverPoints[armed])[1]} x2={draft[0]} y2={draft[1]} />}

        {m.photoPoints.map((p, i) => {
          const [x, y] = photoXY(p.at)
          return (
            <g key={`p${i}`} data-photo={i} onPointerDown={(e) => clickPhoto(e, i)} style={{ cursor: 'pointer' }}>
              <circle cx={x} cy={y} r={SNAP / 1.6} fill="transparent" />
              <circle className={`mb-photo-key ${usedPhoto.has(i) ? 'is-used' : ''}`} cx={x} cy={y} r={4} />
            </g>
          )
        })}
        {m.coverPoints.map((p, i) => {
          const [x, y] = coverXY(p)
          return (
            <g key={`c${i}`} data-cover={i} onPointerDown={(e) => beginDrag(e, i)}>
              <circle cx={x} cy={y} r={11} fill="transparent" style={{ cursor: 'grab' }} />
              <circle className={`mb-cover-key ${usedCover.has(i) ? 'is-used' : ''} ${armed === i ? 'is-armed' : ''}`} cx={x} cy={y} r={5} />
            </g>
          )
        })}
      </svg>

      <div className="mb-row">
        <section className="mb-panel">
          <p className="mb-label">变换</p>
          <p className="mb-note">{status}</p>
          <p className="mb-readout">
            平均误差 <b className={Number.isFinite(fit.error) ? (errorOk ? 'mb-ok' : 'mb-bad') : ''}>{Number.isFinite(fit.error) ? `${fit.error.toFixed(2)} px` : '—'}</b> · 目标 &lt; {m.tol} px
          </p>
          {message && <p className="mb-warn">{message}</p>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="mb-button" onPointerDown={(e) => e.stopPropagation()} onClick={() => setOverlay((v) => !v)}>{overlay ? '隐藏贴图' : '显示贴图'}</button>
            <button className="mb-button" onPointerDown={(e) => e.stopPropagation()} onClick={() => { setPairs([]); setMessage('') }}><RotateCcw size={13} /> 清空</button>
          </div>
        </section>
        <section className="mb-panel">
          <p className="mb-label">点对 {pairs.length} / 4</p>
          {pairs.length ? (
            <ol className="mb-pairs">
              {pairs.map((p, i) => {
                const [x, y] = m.coverPoints[p.cover]
                const [u, v] = m.photoPoints[p.photo].at
                return (
                  <li key={`${p.cover}-${p.photo}`}>
                    <span>{i + 1}. ({x}, {y}) → ({u.toFixed(0)}, {v.toFixed(0)})</span>
                    <button aria-label={`删掉第 ${i + 1} 对`} onPointerDown={(e) => e.stopPropagation()} onClick={() => setPairs((all) => all.filter((_, j) => j !== i))}><X size={13} /></button>
                  </li>
                )
              })}
            </ol>
          ) : (
            <p className="mb-note">按住封面上的圆点，拖到照片里同一个位置的圆点上松开。</p>
          )}
        </section>
      </div>
    </div>
  )
}
