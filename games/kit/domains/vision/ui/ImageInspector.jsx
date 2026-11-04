import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Hash, Image as Pixels } from 'lucide-react'
import { tr } from '../../../shell/i18n.js'
import { fmt, pixel } from '../image.js'
import ImageView from './ImageView.jsx'
import { AXIS, inspectorCell } from './image-layout.js'

const raw = (value) => Array.isArray(value) ? value.map((v, k) => `${'RGB'[k]} ${v}`).join(' · ') : String(value)

/** The frame's inner size, kept current as the screen changes it. */
function useFrameSize(frame) {
  const [size, setSize] = useState(null)
  useLayoutEffect(() => {
    const el = frame.current
    const measure = () => setSize((s) => s?.w === el.clientWidth && s?.h === el.clientHeight ? s : { w: el.clientWidth, h: el.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [frame])
  return size
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
 * An image in a fixed frame sized by the screen, whatever its dimensions, in one of two views: overview scales the
 * whole image to fit, pixels only; information draws numbered cells at their readable size, unscaled, every cell
 * selectable. The frame pans by dragging. It opens on information when the whole image fits, else on overview.
 */
export default function ImageInspector({ value, label, note, showSize = true, explainPixel, mark, onPick, cellClass, inspectPixel }) {
  const root = useRef(null)
  const frame = useRef(null)
  const size = useFrameSize(frame)
  const pan = usePan(frame)
  const [chosen, setChosen] = useState(null)
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
  const cell = inspectorCell(value)
  const fits = !size || (AXIS + value.w * cell + 2 <= size.w && AXIS + value.h * cell + 2 <= size.h)
  const view = chosen ?? (fits ? 'info' : 'overview')
  const info = view === 'info'
  const scale = size ? Math.min((size.w - 2) / value.w, (size.h - 2) / value.h) : 1
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
  return <figure className="vi-inspector" ref={root}>
    <figcaption>
      <strong>{label}</strong>
      <span className="vi-inspect-meta" title={tr(`数值范围 ${fmt(range[0])} … ${fmt(range[1])}`, `Value range ${fmt(range[0])} … ${fmt(range[1])}`)}>{meta}</span>
      <button type="button" className="vi-frame-view" onClick={() => setChosen(info ? 'overview' : 'info')}
        aria-label={info ? tr('切换到简略视图', 'Switch to overview') : tr('切换到信息视图', 'Switch to information view')}
        title={info ? tr('简略：整张图缩放进窗口', 'Overview: the whole image scaled to fit') : tr('信息：每格写出数值', 'Information: values in every cell')}>
        {info ? <Pixels size={13} /> : <Hash size={13} />}
      </button>
    </figcaption>
    <div ref={frame} className={`vi-frame ${info ? 'is-info' : 'is-overview'}`} {...pan}>
      <div className="vi-frame-canvas">
        <ImageView value={value} numbers={info} axes={info} grid={info} cell={info ? cell : scale} mark={mark ?? active} label={label}
          cellLabel={(x, y, p) => `(${x}, ${y}): ${raw(p)}`} cellClass={cellClass}
          onPick={(x, y, e) => { select(x, y, e, true); onPick?.(x, y) }}
          onHover={(x, y, e) => select(x, y, e, false)}
          onLeave={() => setPoint((p) => p?.pinned ? p : null)} />
      </div>
    </div>
    {active && createPortal(<div className={`vi-pixel-popover ${active.above ? 'is-above' : ''}`} role="status" style={{ left: active.left, top: active.top, width: active.width }}>
      <strong>({active.x}, {active.y})</strong>
      {inspectPixel?inspectPixel(active.x,active.y):<><span>{raw(pixel(value, active.x, active.y))}</span>
      {explainPixel && <span className="vi-pixel-calculation">{explainPixel(active.x, active.y)}</span>}</>}
      {(range[0] < 0 || range[1] > 1) && <small>{tr('显示亮度限制为 0–1，数值保持原样。', 'Display brightness is limited to 0–1; values are unchanged.')}</small>}
    </div>,document.body)}
  </figure>
}
