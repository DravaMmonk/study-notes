import { useRef, useState } from 'react'
import { tr } from '../../../shell/i18n.js'
import { fmt, pixel } from '../image.js'
import ImageView from './ImageView.jsx'

const raw = (value) => Array.isArray(value) ? value.map((v, k) => `${'RGB'[k]} ${v}`).join(' · ') : String(value)

/** A compact inspectable image; numeric cells retain their original values and never stretch its pixels. */
export default function ImageInspector({ value, label, explainPixel, mark, onPick }) {
  const root = useRef(null)
  const [point, setPoint] = useState(null)
  const range = value.data.reduce(([lo, hi], v) => [Math.min(lo, v), Math.max(hi, v)], [Infinity, -Infinity])
  const select = (x, y, event, pinned) => {
    const cell = event.currentTarget.getBoundingClientRect()
    const box = root.current.getBoundingClientRect()
    const visible = root.current.closest('.ph-sheet-body, .pl-scroll')?.getBoundingClientRect() ?? { top: 0, left: 16, right: window.innerWidth - 16, width: window.innerWidth - 32 }
    const width = Math.min(220, visible.width - 16)
    const left = Math.max(visible.left + 8 - box.left, Math.min(visible.right - 8 - box.left - width, cell.left + cell.width / 2 - box.left - width / 2))
    setPoint((p) => pinned && p?.pinned && p.x === x && p.y === y ? null : { x, y, pinned, width, left, top: (cell.top - visible.top > 130 ? cell.top : cell.bottom) - box.top, above: cell.top - visible.top > 130 })
  }
  const active = point && point.x < value.w && point.y < value.h ? point : null
  return <figure className="vi-inspector" ref={root}>
    <figcaption><strong>{label}</strong><span title={tr(`数值范围 ${fmt(range[0])} … ${fmt(range[1])}`, `Value range ${fmt(range[0])} … ${fmt(range[1])}`)}>{value.w} × {value.h} · {value.c === 3 ? 'RGB' : tr('灰度', 'Grey')}</span></figcaption>
    <div className="vi-inspect-scroll" onScroll={() => setPoint(null)}>
      <div className="vi-inspect-canvas">
        <ImageView value={value} numbers axes grid cell={value.c === 3 ? 64 : value.data.reduce((w,v)=>Math.max(w,Math.min(72,8+fmt(v).length*7)),44)} mark={mark ?? active} label={label}
          cellLabel={(x, y, p) => `(${x}, ${y}): ${raw(p)}`}
          onPick={(x, y, e) => { select(x, y, e, true); onPick?.(x, y) }}
          onHover={(x, y, e) => select(x, y, e, false)}
          onLeave={() => setPoint((p) => p?.pinned ? p : null)} />
      </div>
    </div>
    {active && <div className={`vi-pixel-popover ${active.above ? 'is-above' : ''}`} role="status" style={{ left: active.left, top: active.top, width: active.width }}>
      <strong>{tr('格子位置', 'Cell position')} ({active.x}, {active.y})</strong>
      <span>{tr('存储值', 'Stored value')} {raw(pixel(value, active.x, active.y))}</span>
      {explainPixel && <span className="vi-pixel-calculation">{explainPixel(active.x, active.y)}</span>}
      {(range[0] < 0 || range[1] > 1) && <small>{tr('显示亮度限制为 0–1，数值保持原样。', 'Display brightness is limited to 0–1; values are unchanged.')}</small>}
    </div>}
  </figure>
}
