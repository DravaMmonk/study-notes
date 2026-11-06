import { useEffect, useRef } from 'react'
import { cellNumber, display, pixel } from '../../../engine/grid.js'
import { AXIS, numberSize } from './layout.js'

// A grid value (../../../engine/grid.js) drawn cell by cell: each cell its grey or colour (values clipped to [0, 1] for
// the eye, the numbers written as they are), optionally its numbers in the cells and the x and y axes along the top
// and left. `mark` outlines one cell; `onPick(x, y)` makes the cells clickable.
//
//   <GridView value={grid} numbers axes mark={{ x, y }} onPick={…} cell={36} />
//
// A large grid (a rendered scene) is a GridPicture: its cells on a canvas, scaled up without smoothing.

const rgb = (p) => {
  const [r, g, b] = (Array.isArray(p) ? p : [p, p, p]).map((v) => Math.round(display(v) * 255))
  return { fill: `rgb(${r}, ${g}, ${b})`, light: 0.299 * r + 0.587 * g + 0.114 * b > 140 }
}

export default function GridView({ value, numbers = false, axes = false, grid = false, mark = null, onPick = null, onHover, onLeave, cell: given, className = '', label, cellLabel, cellClass }) {
  const { w, h } = value
  const cell = given ?? (numbers ? ((value.c ?? 1) === 3 ? 58 : 36) : Math.max(4, Math.floor(220 / Math.max(w, h))))
  const off = axes ? AXIS : 0
  const cells = []
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = pixel(value, x, y)
      const { fill, light } = rgb(p)
      cells.push(
        <g key={`${x},${y}`} transform={`translate(${off + x * cell} ${off + y * cell})`} onClick={onPick ? (e) => onPick(x, y, e) : undefined} onPointerEnter={onHover ? (e) => { if (e.pointerType === 'mouse') onHover(x, y, e) } : undefined} role={onPick ? 'button' : undefined} tabIndex={onPick ? 0 : undefined} aria-label={onPick ? cellLabel?.(x, y, p) ?? `(${x}, ${y})` : undefined} onKeyDown={onPick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(x, y, e) } } : undefined} className={[onPick ? 'gv-pick' : '',cellClass?.(x,y) ?? ''].filter(Boolean).join(' ') || undefined}>
          <rect width={cell} height={cell} fill={fill} />
          {numbers && <text x={cell / 2} y={cell / 2} className={`gv-num ${light ? 'is-dark' : 'is-light'}`} style={{ fontSize: numberSize(Array.isArray(p) ? `R ${p.map(cellNumber).reduce((a, b) => (b.length > a.length ? b : a))}` : cellNumber(p), cell) }}>{Array.isArray(p) ? p.map((v, k) => <tspan key={k} x={cell / 2} y={cell / 2 + (k - 1) * 14}>{'RGB'[k]} {cellNumber(v)}</tspan>) : cellNumber(p)}</text>}
        </g>,
      )
    }
  }
  const W = off + w * cell
  const H = off + h * cell
  return (
    <svg className={`gv-image ${className}`} viewBox={`0 0 ${W} ${H}`} width={W} height={H} role={onPick ? 'group' : 'img'} aria-label={label ?? `${w} × ${h}`} onPointerLeave={onLeave}>
      {axes && Array.from({ length: w }, (_, x) => <text key={`x${x}`} className="gv-axis" x={off + x * cell + cell / 2} y={AXIS / 2}>{x}</text>)}
      {axes && Array.from({ length: h }, (_, y) => <text key={`y${y}`} className="gv-axis" x={AXIS / 2} y={off + y * cell + cell / 2}>{y}</text>)}
      {cells}
      {(numbers || grid) && <g className="gv-lines" pointerEvents="none">{Array.from({ length: w + 1 }, (_, x) => <line key={`v${x}`} x1={off + x * cell} x2={off + x * cell} y1={off} y2={H} />)}{Array.from({ length: h + 1 }, (_, y) => <line key={`h${y}`} y1={off + y * cell} y2={off + y * cell} x1={off} x2={W} />)}</g>}
      {mark && <rect className="gv-mark" pointerEvents="none" x={off + mark.x * cell + 1.5} y={off + mark.y * cell + 1.5} width={Math.max(1, cell - 3)} height={Math.max(1, cell - 3)} />}
    </svg>
  )
}

/** A grid's cells on a canvas, `scale` screen pixels to a cell. */
export function GridPicture({ value, scale = 5, label }) {
  const canvas = useRef(null)
  useEffect(() => {
    const ctx = canvas.current.getContext('2d')
    const out = ctx.createImageData(value.w, value.h)
    for (let k = 0; k < value.w * value.h; k++) {
      const p = (value.c ?? 1) === 3 ? value.data.slice(k * 3, k * 3 + 3) : [value.data[k], value.data[k], value.data[k]]
      p.forEach((v, ch) => { out.data[k * 4 + ch] = Math.round(display(v) * 255) })
      out.data[k * 4 + 3] = 255
    }
    ctx.putImageData(out, 0, 0)
  }, [value])
  return <canvas ref={canvas} className="gv-picture" width={value.w} height={value.h} style={{ width: value.w * scale, height: value.h * scale }} role="img" aria-label={label ?? `${value.w} × ${value.h}`} />
}
