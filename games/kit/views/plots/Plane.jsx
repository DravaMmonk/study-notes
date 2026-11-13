import { createContext, useContext } from 'react'
import { numberText } from '../../engine/number.js'
import { columns, extentOf, frameOf, tips } from './plane.js'

// A grid of two rows as arrows in the plane (games/DESIGN.md 6.9, ./plane.js), over the faint integer grid, in the
// reading its view names:
//
//   plane     every column an arrow from the origin
//   carried   two columns, a 2 × 2 matrix: the whole grid drawn carried along with the two unit arrows and the unit
//             square's image shaded, tinted by its orientation (turned over, it is the other tint)
//   chain     the columns walked one after another, each arrow from the tip of the one before; their sum from the origin
//
// With `want`, the arrows wanted are dashed under the result, and an arrow of the result that misses its own (beyond
// `tolerance`) is marked. `card` draws a small one with no numbers.
//
// Values drawn together share a frame: a screen says how far they reach with <PlaneExtent.Provider value={far}>
// (extentOf of them all), so an arrow twice as long is drawn twice as long on every card; outside one, a drawing
// reaches as far as its own value needs.

export const PlaneExtent = createContext(0)

const missed = (got, want, tolerance) => !want || Math.abs(got[0] - want[0]) > tolerance || Math.abs(got[1] - want[1]) > tolerance

/** An arrow from `from` to `to`, in screen units; its head scaled to the drawing. */
function Arrow({ from = [0, 0], to, className, head }) {
  const [x, y] = to
  const len = Math.hypot(x - from[0], y - from[1])
  if (len < 1e-9) return <circle className={`pn-dot ${className}`} cx={x} cy={y} r={head * 0.45} />
  const [ux, uy] = [(x - from[0]) / len, (y - from[1]) / len]
  const h = Math.min(head, len * 0.6)
  const base = [x - ux * h, y - uy * h]
  const side = [-uy * h * 0.5, ux * h * 0.5]
  return (
    <g className={`pn-arrow ${className}`}>
      <line x1={from[0]} y1={from[1]} x2={base[0]} y2={base[1]} />
      <path d={`M${x},${y}L${base[0] + side[0]},${base[1] + side[1]}L${base[0] - side[0]},${base[1] - side[1]}Z`} />
    </g>
  )
}

/** The plane carried by the matrix whose columns are a and b: its grid lines, through k·a and k·b, in either direction. */
function Carried({ a, b, reach, step }) {
  const far = reach * 6
  const lines = []
  for (let k = -reach; k <= reach; k += step) {
    for (const [u, v, key] of [[a, b, 'a'], [b, a, 'b']]) {
      const len = Math.hypot(v[0], v[1]) || 1
      const [dx, dy] = [(v[0] / len) * far, (v[1] / len) * far]
      const [cx, cy] = [u[0] * k, u[1] * k]
      if (Math.hypot(cx, cy) > reach * 3) continue
      lines.push(<line key={`${key}${k}`} className={k === 0 ? 'pn-carried is-axis' : 'pn-carried'} x1={cx - dx} y1={cy - dy} x2={cx + dx} y2={cy + dy} />)
    }
  }
  return <g>{lines}</g>
}

const square = (cols) => `M0,0L${cols[0][0]},${cols[0][1]}L${cols[0][0] + cols[1][0]},${cols[0][1] + cols[1][1]}L${cols[1][0]},${cols[1][1]}Z`
const turned = (cols) => cols[0][0] * cols[1][1] - cols[0][1] * cols[1][0] < 0

/** What a reading draws under the arrows, and where each arrow starts. */
const READINGS = {
  plane: { tone: (j) => `is-c${j % 6}` },
  carried: {
    tone: (j) => ['is-i', 'is-j'][j],
    under: ({ got, wanted, reach, step }) => <>
      {got && <Carried a={got[0]} b={got[1]} reach={reach} step={step} />}
      {wanted && <path className="pn-want-square" d={square(wanted)} />}
      {got && <path className={`pn-square ${turned(got) ? 'is-turned' : ''}`} d={square(got)} />}
    </>,
  },
  chain: { tone: (j) => `is-c${j % 6}`, walked: true },
}

function Drawing({ reading, value, want, tolerance = 1e-9, card = false, size = 180 }) {
  const { tone, under, walked } = READINGS[reading]
  const { reach, step } = frameOf(Math.max(useContext(PlaneExtent), extentOf([value, want].filter(Boolean))))
  const got = value ? columns(value) : null
  const wanted = want ? columns(want) : null
  const scale = size / (2 * reach)
  const head = (card ? 7 : 10) / scale
  const grid = []
  for (let k = -reach; k <= reach; k += step) {
    grid.push(<line key={`x${k}`} className={k === 0 ? 'pn-axis' : 'pn-grid'} x1={k} y1={-reach} x2={k} y2={reach} />)
    grid.push(<line key={`y${k}`} className={k === 0 ? 'pn-axis' : 'pn-grid'} x1={-reach} y1={k} x2={reach} y2={k} />)
  }
  // Walked, an arrow starts where the one before it ends, and the sum is drawn from the origin over them.
  const arrows = (cols, classOf) => {
    const ends = walked ? tips(cols) : cols
    return cols.map((_, j) => <Arrow key={j} from={walked && j ? ends[j - 1] : [0, 0]} to={ends[j]} head={head} className={classOf(j)} />)
  }
  const sum = (cols, className) => walked && cols.length > 1 && <Arrow to={tips(cols).at(-1)} head={head} className={className} />
  const off = (j) => (wanted && missed(got[j], wanted[j], tolerance) ? 'is-miss' : '')
  return (
    <svg className={`pn ${card ? 'is-card' : ''}`} viewBox={`${-reach} ${-reach} ${2 * reach} ${2 * reach}`} width={size} height={size} role="img" style={{ '--pn-unit': 1 / scale }}>
      <title>{(value ?? want) && columns(value ?? want).map(([x, y]) => `(${numberText(x)}, ${numberText(y)})`).join(' ')}</title>
      <g transform="scale(1,-1)">
        {grid}
        {under?.({ got, wanted, reach, step })}
        {wanted && arrows(wanted, () => 'is-want')}
        {wanted && sum(wanted, 'is-want')}
        {got && arrows(got, (j) => `${tone(j)} ${off(j)}`)}
        {got && sum(got, `is-sum ${wanted && missed(tips(got).at(-1), tips(wanted).at(-1), tolerance) ? 'is-miss' : ''}`)}
      </g>
    </svg>
  )
}

export const Plane = (props) => <Drawing reading="plane" {...props} />
export const CarriedPlane = (props) => <Drawing reading="carried" {...props} />
export const Chain = (props) => <Drawing reading="chain" {...props} />
