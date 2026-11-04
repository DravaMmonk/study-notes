import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { tr } from '../../../shell/i18n.js'
import { fmt, pixel } from '../image.js'
import ImageView from './ImageView.jsx'
import { inspectorCell } from './image-layout.js'

const raw = (value) => Array.isArray(value) ? value.map((v, k) => `${'RGB'[k]} ${v}`).join(' · ') : String(value)

/** A compact inspectable image; numeric cells retain their original values and never stretch its pixels. */
export default function ImageInspector({ value, label, explainPixel, mark, onPick, caption = true, cellClass, inspectPixel }) {
  const root = useRef(null)
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
  const range = value.data.reduce(([lo, hi], v) => [Math.min(lo, v), Math.max(hi, v)], [Infinity, -Infinity])
  const select = (x, y, event, pinned) => {
    const cell = event.currentTarget.getBoundingClientRect()
    const width = Math.min(220, window.innerWidth-24)
    const left = Math.max(12,Math.min(window.innerWidth-width-12,cell.left+cell.width/2-width/2))
    const above=cell.bottom+190>window.innerHeight-12&&cell.top>190
    setPoint((p) => pinned && p?.pinned && p.x === x && p.y === y ? null : { x, y, pinned, width, left, top: above?cell.top:cell.bottom, above })
  }
  const active = point && point.x < value.w && point.y < value.h ? point : null
  return <figure className="vi-inspector" ref={root} aria-label={caption?undefined:label}>
    {caption&&<figcaption><strong>{label}</strong><span title={tr(`数值范围 ${fmt(range[0])} … ${fmt(range[1])}`, `Value range ${fmt(range[0])} … ${fmt(range[1])}`)}>{value.w} × {value.h}{value.c===3?' · RGB':''}</span></figcaption>}
    <div className="vi-inspect-scroll">
      <div className="vi-inspect-canvas">
        <ImageView value={value} numbers axes grid cell={inspectorCell(value)} mark={mark ?? active} label={label}
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
