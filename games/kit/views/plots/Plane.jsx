import { numberText } from '../../engine/number.js'

// A grid of two rows as arrows in the plane (the view `plane`, games/DESIGN.md 6.9): each column a vector from the
// origin over the faint integer grid. Two columns are a 2 × 2 matrix, the landing places of the two unit arrows: the
// whole grid is drawn carried along with them and the unit square's image shaded, tinted by its orientation (turned
// over, it is the other tint). With `want`, the arrows wanted are dashed under the result, and an arrow of the result
// that misses its own (beyond `tolerance`) is marked. `card` draws a small one with no numbers.
//
// The frame is square and centred on the origin, as wide as the arrows (and those wanted) need, at least two units
// from the origin; grid lines one unit apart until there would be too many, then every few units.

const MIN_REACH = 2
const LINES = 8

/** The columns of a two-row grid, as [x, y] pairs. */
const columns = (g) => Array.from({ length: g.w }, (_, j) => [g.data[j], g.data[g.w + j]])

/** How far the frame reaches from the origin, and the step between its grid lines. */
function frameOf(grids) {
  let far = 0
  for (const g of grids) {
    const cols = columns(g)
    const corners = g.w === 2 ? [...cols, [cols[0][0] + cols[1][0], cols[0][1] + cols[1][1]]] : cols
    for (const [x, y] of corners) far = Math.max(far, Math.abs(x), Math.abs(y))
  }
  const reach = Math.max(MIN_REACH, Math.ceil(far * 1.15))
  const step = Math.max(1, Math.ceil(reach / LINES))
  return { reach: Math.ceil(reach / step) * step, step }
}

const missed = (got, want, tolerance) => !want || Math.abs(got[0] - want[0]) > tolerance || Math.abs(got[1] - want[1]) > tolerance

/** An arrow from the origin to (x, y), in screen units; its head scaled to the drawing. */
function Arrow({ to, className, head }) {
  const [x, y] = to
  const len = Math.hypot(x, y)
  if (len < 1e-9) return <circle className={`pn-dot ${className}`} cx={0} cy={0} r={head * 0.45} />
  const [ux, uy] = [x / len, y / len]
  const h = Math.min(head, len * 0.6)
  const base = [x - ux * h, y - uy * h]
  const side = [-uy * h * 0.5, ux * h * 0.5]
  return (
    <g className={`pn-arrow ${className}`}>
      <line x1={0} y1={0} x2={base[0]} y2={base[1]} />
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

export default function Plane({ value, want, tolerance = 1e-9, card = false, size = 180 }) {
  const shown = [value, want].filter(Boolean)
  const { reach, step } = frameOf(shown)
  const got = value ? columns(value) : null
  const wanted = want ? columns(want) : null
  const scale = size / (2 * reach)
  const head = (card ? 7 : 10) / scale
  const grid = []
  for (let k = -reach; k <= reach; k += step) {
    grid.push(<line key={`x${k}`} className={k === 0 ? 'pn-axis' : 'pn-grid'} x1={k} y1={-reach} x2={k} y2={reach} />)
    grid.push(<line key={`y${k}`} className={k === 0 ? 'pn-axis' : 'pn-grid'} x1={-reach} y1={k} x2={reach} y2={k} />)
  }
  const square = (cols) => cols.length === 2 && `M0,0L${cols[0][0]},${cols[0][1]}L${cols[0][0] + cols[1][0]},${cols[0][1] + cols[1][1]}L${cols[1][0]},${cols[1][1]}Z`
  const turned = (cols) => cols[0][0] * cols[1][1] - cols[0][1] * cols[1][0] < 0
  const tone = (j, n) => (n === 2 ? ['is-i', 'is-j'][j] : `is-c${j % 6}`)
  return (
    <svg className={`pn ${card ? 'is-card' : ''}`} viewBox={`${-reach} ${-reach} ${2 * reach} ${2 * reach}`} width={size} height={size} role="img" style={{ '--pn-unit': 1 / scale }}>
      <title>{(value ?? want) && columns(value ?? want).map(([x, y]) => `(${numberText(x)}, ${numberText(y)})`).join(' ')}</title>
      <g transform="scale(1,-1)">
        {grid}
        {got?.length === 2 && <Carried a={got[0]} b={got[1]} reach={reach} step={step} />}
        {wanted?.length === 2 && <path className="pn-want-square" d={square(wanted)} />}
        {got?.length === 2 && <path className={`pn-square ${turned(got) ? 'is-turned' : ''}`} d={square(got)} />}
        {wanted?.map((w, j) => <Arrow key={`w${j}`} to={w} head={head} className="is-want" />)}
        {got?.map((g, j) => <Arrow key={`g${j}`} to={g} head={head} className={`${tone(j, got.length)} ${wanted && missed(g, wanted[j], tolerance) ? 'is-miss' : ''}`} />)}
      </g>
    </svg>
  )
}
