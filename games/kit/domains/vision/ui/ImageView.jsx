import { useEffect, useRef } from 'react'
import { display, pixel } from '../image.js'
import { AXIS, imageNumber } from './image-layout.js'

// An image value drawn as its grid (../image.js): each cell its grey or colour (values clipped to [0, 1] for the eye,
// the numbers written as they are), optionally its numbers in the cells and the x and y axes along the top and left.
// `mark` outlines one cell; `onPick(x, y)` makes the cells clickable.
//
//   <ImageView value={img} numbers axes mark={{ x, y }} onPick={…} cell={36} />
//
// A larger image (a rendered scene) is a Picture: its pixels on a canvas, scaled up without smoothing.

const rgb = (p) => {
  const [r, g, b] = (Array.isArray(p) ? p : [p, p, p]).map((v) => Math.round(display(v) * 255))
  return { fill: `rgb(${r}, ${g}, ${b})`, light: 0.299 * r + 0.587 * g + 0.114 * b > 140 }
}

export default function ImageView({ value, numbers = false, axes = false, grid = false, mark = null, onPick = null, onHover, onLeave, cell: given, className = '', label, cellLabel, cellClass }) {
  const { w, h } = value
  const cell = given ?? (numbers ? (value.c === 3 ? 58 : 36) : Math.max(4, Math.floor(220 / Math.max(w, h))))
  const off = axes ? AXIS : 0
  const cells = []
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = pixel(value, x, y)
      const { fill, light } = rgb(p)
      cells.push(
        <g key={`${x},${y}`} transform={`translate(${off + x * cell} ${off + y * cell})`} onClick={onPick ? (e) => onPick(x, y, e) : undefined} onPointerEnter={onHover ? (e) => { if (e.pointerType === 'mouse') onHover(x, y, e) } : undefined} role={onPick ? 'button' : undefined} tabIndex={onPick ? 0 : undefined} aria-label={onPick ? cellLabel?.(x, y, p) ?? `(${x}, ${y})` : undefined} onKeyDown={onPick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(x, y, e) } } : undefined} className={[onPick ? 'vi-pick' : '',cellClass?.(x,y) ?? ''].filter(Boolean).join(' ') || undefined}>
          <rect width={cell} height={cell} fill={fill} />
          {numbers && <text x={cell / 2} y={cell / 2} className={`vi-num ${light ? 'is-dark' : 'is-light'}`}>{Array.isArray(p) ? p.map((v, k) => <tspan key={k} x={cell / 2} y={cell / 2 + (k - 1) * 14}>{'RGB'[k]} {imageNumber(v)}</tspan>) : imageNumber(p)}</text>}
        </g>,
      )
    }
  }
  const W = off + w * cell
  const H = off + h * cell
  return (
    <svg className={`vi-image ${className}`} viewBox={`0 0 ${W} ${H}`} width={W} height={H} role={onPick ? 'group' : 'img'} aria-label={label ?? `${w} × ${h}`} onPointerLeave={onLeave}>
      {axes && Array.from({ length: w }, (_, x) => <text key={`x${x}`} className="vi-axis" x={off + x * cell + cell / 2} y={AXIS / 2}>{x}</text>)}
      {axes && Array.from({ length: h }, (_, y) => <text key={`y${y}`} className="vi-axis" x={AXIS / 2} y={off + y * cell + cell / 2}>{y}</text>)}
      {cells}
      {(numbers || grid) && <g className="vi-lines" pointerEvents="none">{Array.from({ length: w + 1 }, (_, x) => <line key={`v${x}`} x1={off + x * cell} x2={off + x * cell} y1={off} y2={H} />)}{Array.from({ length: h + 1 }, (_, y) => <line key={`h${y}`} y1={off + y * cell} y2={off + y * cell} x1={off} x2={W} />)}</g>}
      {mark && <rect className="vi-mark" pointerEvents="none" x={off + mark.x * cell + 1.5} y={off + mark.y * cell + 1.5} width={cell - 3} height={cell - 3} />}
    </svg>
  )
}

/** An image's pixels on a canvas, `scale` screen pixels to one of its own. */
export function Picture({ value, scale = 5, label }) {
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
  return <canvas ref={canvas} className="vi-picture" width={value.w} height={value.h} style={{ width: value.w * scale, height: value.h * scale }} role="img" aria-label={label ?? `${value.w} × ${value.h}`} />
}
