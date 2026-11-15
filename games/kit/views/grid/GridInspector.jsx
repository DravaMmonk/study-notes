import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { tr } from '../../shell/i18n.js'
import { cellNumber, pixel, pixelText } from '../../engine/grid.js'
import { finiteExtent } from '../../engine/number.js'
import { usePointerSession } from '../usePointerSession.js'
import GridView from './GridView.jsx'
import { denseCell, fitFrame, inspectorCell } from './layout.js'

/** The largest frame the screen allows (--gv-frame-w, --gv-frame-h on the figure), kept current as it changes. */
function useFrameMax(root, on) {
  const [max, setMax] = useState(null)
  useLayoutEffect(() => {
    if (!on) return
    const measure = () => {
      const css = getComputedStyle(root.current)
      const w = parseFloat(css.getPropertyValue('--gv-frame-w')), h = parseFloat(css.getPropertyValue('--gv-frame-h'))
      setMax((m) => m?.w === w && m?.h === h ? m : { w, h })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [root, on])
  return max
}

/** Mouse drags pan the frame; a drag never ends as a cell click. Touch pans by native scrolling. */
function usePan(frame) {
  const { track } = usePointerSession()
  const dragged = useRef(false)
  const onPointerDown = (event) => {
    dragged.current = false
    if (event.pointerType !== 'mouse' || event.button !== 0) return
    const el = frame.current
    if (el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight) return
    const start = { x: event.clientX, y: event.clientY, left: el.scrollLeft, top: el.scrollTop }
    track(event, {
      move(next) {
        const dx = next.clientX - start.x
        const dy = next.clientY - start.y
        if (!dragged.current && Math.hypot(dx, dy) < 4) return
        dragged.current = true
        el.scrollLeft = start.left - dx
        el.scrollTop = start.top - dy
      },
      finish(commit) { if (!commit) dragged.current = false },
    })
  }
  const onClickCapture = (event) => {
    if (dragged.current && event.detail > 0) {
      event.stopPropagation()
      event.preventDefault()
    }
    dragged.current = false
  }
  return { onPointerDown, onClickCapture }
}

/** Draw pixels at their own aspect ratio, or keep numbered cells readable in a scrollable frame. */
export default function GridInspector({ value, label, view, showSize = true, explainPixel, mark, onPick, cellClass, inspection, dense = false }) {
  const id = useId()
  const root = useRef(null)
  const frame = useRef(null)
  const pan = usePan(frame)
  const local = useState(null)
  const [point, setPoint] = inspection ?? local
  const active = point?.id === id && point.x < value.w && point.y < value.h ? point : null
  useEffect(() => {
    if (!active) return
    const dismiss = (event) => {
      if (!root.current?.contains(event.target)) setPoint((p) => p?.id === id ? null : p)
    }
    document.addEventListener('pointerdown', dismiss, true)
    return () => document.removeEventListener('pointerdown', dismiss, true)
  }, [active, id, setPoint])

  const numbers = view === 'numbers'
  const cellOf = dense ? denseCell : inspectorCell
  const pictureSize = dense ? 132 : 320
  const cell = numbers ? cellOf(value) : pictureSize / Math.max(value.w, value.h)
  const max = useFrameMax(root, numbers)
  const frameSize = max && numbers ? fitFrame(value, max, cellOf) : null
  const range = finiteExtent([value.data])
  const select = (x, y, pinned) => setPoint((p) => {
    if (!pinned && p?.pinned) return p
    if (pinned && p?.pinned && p.id === id && p.x === x && p.y === y) return null
    return { id, x, y, pinned, source: value }
  })
  const meta = showSize && `${value.w} × ${value.h}${value.c === 3 ? ' · RGB' : ''}`
  const width = frameSize?.w ?? (numbers ? undefined : cell * value.w)
  const grid = <GridView value={value} numbers={numbers} axes={numbers} grid={numbers || cell >= 6} cell={cell} mark={mark ?? active} label={label}
    cellLabel={(x, y, p) => `(${x}, ${y}): ${pixelText(p)}`} cellClass={cellClass}
    onPick={(x, y) => { select(x, y, true); onPick?.(x, y) }}
    onHover={(x, y) => select(x, y, false)}
    onLeave={() => setPoint((p) => p?.id === id && !p.pinned ? null : p)} />
  return <figure className={`gv-inspector${numbers ? '' : ' is-picture'}`} ref={root} style={width ? { width: `min(100%, ${width}px)` } : undefined}>
    {numbers
      ? <div ref={frame} className="gv-frame" style={frameSize ? { height: frameSize.h } : undefined} {...pan}><div className="gv-frame-canvas">{grid}</div></div>
      : grid}
    {(label || meta) && <figcaption>
      {label && <strong>{label}</strong>}
      {meta && <span className="gv-inspect-meta" title={range ? tr(`数值范围 ${cellNumber(range.lo)} … ${cellNumber(range.hi)}`, `Value range ${cellNumber(range.lo)} … ${cellNumber(range.hi)}`) : undefined}>{meta}</span>}
    </figcaption>}
    {!inspection && active && <div className="gv-reading" role="status">
      <span>({active.x}, {active.y}) <b>{pixelText(pixel(value, active.x, active.y))}</b></span>
      {explainPixel && <span className="gv-reading-calc">{explainPixel(active.x, active.y)}</span>}
    </div>}
  </figure>
}
