import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { tr } from '../../i18n.js'
import { cellNumber, pixel } from '../../../engine/grid.js'
import { numberText } from '../../../engine/number.js'
import { useViewChoice } from '../choice.js'
import GridView from './GridView.jsx'
import { denseCell, fitFrame, inspectorCell, thumbCell } from './layout.js'

// A cell's value as its reading writes it: the number in full, up to four decimals.
const raw = (value) => (Array.isArray(value) ? value.map((v, k) => `${'RGB'[k]} ${numberText(v)}`).join(' · ') : numberText(value))

/** The frame's inner size, kept current as the screen changes it. */
function useFrameSize(frame) {
  const [size, setSize] = useState(null)
  useLayoutEffect(() => {
    const el = frame.current
    const measure = () => setSize((s) => s?.w === el.clientWidth && s?.h === el.clientHeight ? s : { w: el.clientWidth, h: el.clientHeight })
    measure()
    // A frame inside a dialog that is still opening can measure 0 at first; measure again once it is laid out.
    const later = requestAnimationFrame(measure)
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => { cancelAnimationFrame(later); observer.disconnect() }
  }, [frame])
  return size
}

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
  const drag = useRef(null)
  const onPointerDown = (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return
    const el = frame.current
    if (el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight) return
    drag.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop, moved: false }
    const move = (m) => {
      const d = drag.current
      if (!d.moved && Math.hypot(m.clientX - d.x, m.clientY - d.y) < 4) return
      d.moved = true
      el.scrollLeft = d.left - (m.clientX - d.x)
      el.scrollTop = d.top - (m.clientY - d.y)
    }
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  const onClickCapture = (e) => {
    if (drag.current?.moved) { e.stopPropagation(); e.preventDefault() }
    drag.current = null
  }
  return { onPointerDown, onClickCapture }
}

/**
 * A grid in a frame sized by the screen, whatever its dimensions, as the view `numbers` or `pixels` (by default the
 * one the player picked for grids, ../choice.js): pixels scales the whole grid to fit; numbers draws numbered cells at
 * their readable size, unscaled, every cell selectable. Pointing at a cell reads it (`inspectPixel` says what, by
 * default its value; `explainPixel` adds how it came about). The frame pans by dragging. With `fit` the frame shrinks
 * to what the grid needs (fitFrame), the screen's frame its largest; `dense` (with `fit`) draws narrower numbered cells.
 */
export default function GridInspector({ value, label, note, view, showSize = true, explainPixel, mark, onPick, cellClass, inspectPixel, fit = false, dense = false }) {
  const root = useRef(null)
  const frame = useRef(null)
  const size = useFrameSize(frame)
  const pan = usePan(frame)
  const [point, setPoint] = useState(null)
  useEffect(()=>{
    if(!point)return
    const dismiss=()=>setPoint(null)
    const outside=(event)=>{if(!root.current?.contains(event.target))dismiss()}
    window.addEventListener('scroll',dismiss,true)
    window.addEventListener('resize',dismiss)
    document.addEventListener('pointerdown',outside,true)
    return ()=>{window.removeEventListener('scroll',dismiss,true);window.removeEventListener('resize',dismiss);document.removeEventListener('pointerdown',outside,true)}
  },[point])
  const cellOf = fit && dense ? denseCell : inspectorCell
  const cell = cellOf(value)
  const [picked] = useViewChoice('grid')
  const info = (view ?? picked) === 'numbers'
  const max = useFrameMax(root, fit)
  const frameSize = fit && max ? fitFrame(value, info, max, cellOf) : null
  // A frame not laid out yet (measured inside something still hidden or opening) draws the thumbnail size meanwhile.
  const scale = size && size.w > 2 && size.h > 2 ? Math.min((size.w - 2) / value.w, (size.h - 2) / value.h) : thumbCell(value)
  const range = value.data.reduce(([lo, hi], v) => [Math.min(lo, v), Math.max(hi, v)], [Infinity, -Infinity])
  const select = (x, y, event, pinned) => {
    const cell = event.currentTarget.getBoundingClientRect()
    const width = Math.min(220, window.innerWidth-24)
    const left = Math.max(12,Math.min(window.innerWidth-width-12,cell.left+cell.width/2-width/2))
    const above=cell.bottom+190>window.innerHeight-12&&cell.top>190
    setPoint((p) => pinned && p?.pinned && p.x === x && p.y === y ? null : { x, y, pinned, width, left, top: above?cell.top:cell.bottom, above })
  }
  const active = point && point.x < value.w && point.y < value.h ? point : null
  const meta = [showSize && `${value.w} × ${value.h}${value.c === 3 ? ' · RGB' : ''}`, note].filter(Boolean).join(' · ')
  return <figure className="gv-inspector" ref={root} style={frameSize ? { width: frameSize.w } : undefined}>
    <figcaption>
      <strong>{label}</strong>
      <span className="gv-inspect-meta" title={tr(`数值范围 ${cellNumber(range[0])} … ${cellNumber(range[1])}`, `Value range ${cellNumber(range[0])} … ${cellNumber(range[1])}`)}>{meta}</span>
    </figcaption>
    <div ref={frame} className={`gv-frame ${info ? 'is-info' : 'is-overview'}`} style={frameSize ? { height: frameSize.h } : undefined} {...pan}>
      <div className="gv-frame-canvas">
        <GridView value={value} numbers={info} axes={info} grid={info || frameSize !== null && scale >= 6} cell={info ? cell : scale} mark={mark ?? active} label={label}
          cellLabel={(x, y, p) => `(${x}, ${y}): ${raw(p)}`} cellClass={cellClass}
          onPick={(x, y, e) => { select(x, y, e, true); onPick?.(x, y) }}
          onHover={(x, y, e) => select(x, y, e, false)}
          onLeave={() => setPoint((p) => p?.pinned ? p : null)} />
      </div>
    </div>
    {active && createPortal(<div className={`gv-popover ${active.above ? 'is-above' : ''}`} role="status" style={{ left: active.left, top: active.top, width: active.width }}>
      <strong>({active.x}, {active.y})</strong>
      {inspectPixel?inspectPixel(active.x,active.y):<><span>{raw(pixel(value, active.x, active.y))}</span>
      {explainPixel && <span className="gv-popover-calc">{explainPixel(active.x, active.y)}</span>}</>}
      {(range[0] < 0 || range[1] > 1) && <small>{tr('显示亮度限制为 0–1，数值保持原样。', 'Display brightness is limited to 0–1; values are unchanged.')}</small>}
    </div>,document.body)}
  </figure>
}
