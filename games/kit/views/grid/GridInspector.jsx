import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { tr } from '../../shell/i18n.js'
import { cellNumber, pixel, pixelText } from '../../engine/grid.js'
import { useElementSize } from '../useElementSize.js'
import { usePointerSession } from '../usePointerSession.js'
import GridView from './GridView.jsx'
import { denseCell, fitFrame, inspectorCell, thumbCell } from './layout.js'

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

/**
 * A grid in a frame sized by the screen, whatever its dimensions, as the view `numbers` or `pixels` (../Show.jsx and
 * ../Results.jsx pick it): pixels scales the whole grid to fit; numbers draws numbered cells at their readable size,
 * unscaled, every cell selectable. Pointing at a cell reads it (`inspectPixel` says what, by
 * default its value; `explainPixel` adds how it came about). The frame pans by dragging. With `fit` the frame shrinks
 * to what the grid needs (fitFrame), the screen's frame its largest; `dense` (with `fit`) draws narrower numbered cells.
 */
export default function GridInspector({ value, label, note, view, showSize = true, explainPixel, mark, onPick, cellClass, inspectPixel, fit = false, dense = false }) {
  const root = useRef(null)
  const frame = useRef(null)
  const size = useElementSize(frame)
  const pan = usePan(frame)
  const [point, setPoint] = useState(null)
  useEffect(() => {
    if (!point) return undefined
    const dismiss = () => setPoint(null)
    const moved = () => {
      const box = point.anchor.getBoundingClientRect()
      if (!point.anchor.isConnected || box.left !== point.box.left || box.top !== point.box.top) dismiss()
    }
    const outside = (event) => { if (!root.current?.contains(event.target)) dismiss() }
    window.addEventListener('scroll', moved, true)
    window.addEventListener('resize', dismiss)
    document.addEventListener('pointerdown', outside, true)
    return () => {
      window.removeEventListener('scroll', moved, true)
      window.removeEventListener('resize', dismiss)
      document.removeEventListener('pointerdown', outside, true)
    }
  }, [point])
  const cellOf = fit && dense ? denseCell : inspectorCell
  const cell = cellOf(value)
  const info = view === 'numbers'
  const max = useFrameMax(root, fit)
  const frameSize = fit && max ? fitFrame(value, info, max, cellOf) : null
  // A frame not laid out yet (measured inside something still hidden or opening) draws the thumbnail size meanwhile.
  const scale = size && size.width > 2 && size.height > 2 ? Math.min((size.width - 2) / value.w, (size.height - 2) / value.h) : thumbCell(value)
  const range = value.data.reduce(([lo, hi], v) => [Math.min(lo, v), Math.max(hi, v)], [Infinity, -Infinity])
  const select = (x, y, event, pinned) => {
    const anchor = event.currentTarget
    const box = anchor.getBoundingClientRect()
    const width = Math.min(220, window.innerWidth - 24)
    const left = Math.max(12, Math.min(window.innerWidth - width - 12, box.left + (box.width - width) / 2))
    const above = box.bottom + 190 > window.innerHeight - 12 && box.top > 190
    setPoint((p) => {
      if (p?.pinned && !pinned) return p
      if (p?.pinned && p.anchor === anchor) return null
      return { x, y, anchor, box, pinned, width, left, top: above ? box.top : box.bottom, above }
    })
  }
  const active = point && point.x < value.w && point.y < value.h ? point : null
  const meta = [showSize && `${value.w} × ${value.h}${value.c === 3 ? ' · RGB' : ''}`, note].filter(Boolean).join(' · ')
  return <figure className="gv-inspector" ref={root} style={frameSize ? { width: `min(100%, ${frameSize.w}px)` } : undefined}>
    <figcaption>
      <strong>{label}</strong>
      <span className="gv-inspect-meta" title={tr(`数值范围 ${cellNumber(range[0])} … ${cellNumber(range[1])}`, `Value range ${cellNumber(range[0])} … ${cellNumber(range[1])}`)}>{meta}</span>
    </figcaption>
    <div ref={frame} className={`gv-frame ${info ? 'is-info' : 'is-overview'}`} style={frameSize ? { height: frameSize.h } : undefined} {...pan}>
      <div className="gv-frame-canvas">
        <GridView value={value} numbers={info} axes={info} grid={info || frameSize !== null && scale >= 6} cell={info ? cell : scale} mark={mark ?? active} label={label}
          cellLabel={(x, y, p) => `(${x}, ${y}): ${pixelText(p)}`} cellClass={cellClass}
          onPick={(x, y, e) => { select(x, y, e, true); onPick?.(x, y) }}
          onHover={(x, y, e) => select(x, y, e, false)}
          onLeave={() => setPoint((p) => p?.pinned ? p : null)} />
      </div>
    </div>
    {active && createPortal(<div className={`gv-popover ${active.above ? 'is-above' : ''}`} role="status" style={{ left: active.left, top: active.top, width: active.width }}>
      <strong>({active.x}, {active.y})</strong>
      {inspectPixel?inspectPixel(active.x,active.y):<><span>{pixelText(pixel(value, active.x, active.y))}</span>
      {explainPixel && <span className="gv-popover-calc">{explainPixel(active.x, active.y)}</span>}</>}
      {(range[0] < 0 || range[1] > 1) && <small>{tr('显示亮度限制为 0–1，数值保持原样。')}</small>}
    </div>,document.body)}
  </figure>
}
