import { useEffect, useRef } from 'react'
import { display, pixel, pixelLabels } from '../../engine/grid.js'
import { paintPixels } from '../canvas.js'
import { AXIS, numberSize } from './layout.js'

// A grid value (../../../engine/grid.js) drawn cell by cell: each cell its grey or colour (values clipped to [0, 1] for
// the eye, the numbers written as they are), optionally its numbers in the cells and the x and y axes along the top
// and left. `mark` outlines one cell; `onPick(x, y)` makes the cells clickable.
//
//   <GridView value={grid} numbers axes mark={{ x, y }} onPick={…} cell={36} />
//
// A large grid (a rendered scene) is a GridPicture: its cells on a canvas, scaled up without smoothing.

const byte = (number, lo, hi) => Math.round(display((number - lo) / (hi - lo || 1)) * 255)

const rgb = (p, lo, hi) => {
  const [r, g, b] = Array.isArray(p) ? p.map((v) => byte(v, 0, 1)) : Array(3).fill(byte(p, lo, hi))
  return { fill: `rgb(${r}, ${g}, ${b})`, light: 0.299 * r + 0.587 * g + 0.114 * b > 140 }
}

export default function GridView({ value, numbers = false, axes = false, grid = false, mark = null, onPick = null, onHover, onLeave, cell: given, className = '', label, cellLabel, cellClass, range }) {
  const { w, h } = value
  const cell = given ?? (numbers ? ((value.c ?? 1) === 3 ? 58 : 36) : Math.max(4, Math.floor(220 / Math.max(w, h))))
  const off = axes ? AXIS : 0
  const cells = []
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = pixel(value, x, y)
      const { fill, light } = rgb(p, range?.lo ?? 0, range?.hi ?? 1)
      const labels = numbers ? pixelLabels(p) : null
      const longest = labels?.reduce((a, b) => b.length > a.length ? b : a, '')
      cells.push(
        <g key={`${x},${y}`} transform={`translate(${off + x * cell} ${off + y * cell})`} onClick={onPick ? (e) => onPick(x, y, e) : undefined} onPointerEnter={onHover ? (e) => { if (e.pointerType === 'mouse') onHover(x, y, e) } : undefined} role={onPick ? 'button' : undefined} tabIndex={onPick ? 0 : undefined} aria-label={onPick ? cellLabel?.(x, y, p) ?? `(${x}, ${y})` : undefined} onKeyDown={onPick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(x, y, e) } } : undefined} className={[onPick ? 'gv-pick' : '',cellClass?.(x,y) ?? ''].filter(Boolean).join(' ') || undefined}>
          <rect width={cell} height={cell} fill={fill} />
          {labels && <text x={cell / 2} y={cell / 2} className={`gv-num ${light ? 'is-dark' : 'is-light'}`} style={{ fontSize: numberSize(longest, cell) }}>
            {labels.length > 1 ? labels.map((label, k) => <tspan key={k} x={cell / 2} y={cell / 2 + (k - 1) * 14}>{label}</tspan>) : labels[0]}
          </text>}
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

/** A grid's cells on a canvas, with `scale` screen pixels per cell or CSS sizing when `scale` is null. */
export function GridPicture({ value, scale = 5, label, range, decorative = false }) {
  const canvas = useRef(null)
  const lo = range?.lo ?? 0
  const hi = range?.hi ?? 1
  useEffect(() => paintPixels(canvas.current, (pixels) => {
    const colour = value.c === 3
    for (let k = 0; k < value.w * value.h; k++) {
      const i = k * 4
      const v = colour ? byte(value.data[k * 3], 0, 1) : byte(value.data[k], lo, hi)
      pixels[i] = v
      pixels[i + 1] = colour ? byte(value.data[k * 3 + 1], 0, 1) : v
      pixels[i + 2] = colour ? byte(value.data[k * 3 + 2], 0, 1) : v
      pixels[i + 3] = 255
    }
  }), [value, lo, hi])
  const style = scale === null ? undefined : { width: value.w * scale, height: value.h * scale }
  return <canvas ref={canvas} className="gv-picture" width={value.w} height={value.h} style={style}
    role={decorative ? undefined : 'img'} aria-hidden={decorative || undefined} aria-label={decorative ? undefined : label ?? `${value.w} × ${value.h}`} />
}
