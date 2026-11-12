import { L } from '../../shell/i18n.js'

// A chart of a scene: two axes from zero, straight lines, and one point that moves, all in the scene's own units. A
// domain says what is there and the chart draws it the same way in every game:
//
//   x, y     { name, max }                       the axes, named at their ends
//   lines    [{ from: [x, y], to: [x, y], kind }]   'curve' a relation (solid), 'bound' a limit (dashed)
//   labels   [{ at: [x, y], text, under? }]      a line's name by it; `under`, below the x axis at its x
//   trail    [[x, y]]                            where the point has been, oldest first
//   point    { at: [x, y], reads }               where it is now; `reads` written at the y axis at its height
//   gap      { from: [x, y], to: [x, y] }        a stretch the point is off by
//   state    'over' | 'under' | 'met'            how the point stands, the colour of the point, `reads` and the gap
//
// The point slides to where it goes next and a line that moves slides too (where the browser animates them), so a run
// stepped through reads as one motion. Drawn one unit a screen pixel at its natural size.

const [W, H, LEFT, BASE, TOP, RIGHT] = [236, 156, 42, 136, 18, 224]

export default function Chart({ label, x: across, y: up, lines = [], labels = [], trail = [], point, gap, state }) {
  const x = (v) => LEFT + ((RIGHT - LEFT) * Math.min(v, across.max)) / across.max
  const y = (v) => BASE - ((BASE - TOP) * Math.min(v, up.max)) / up.max
  const d = ({ from, to }) => `M${x(from[0])} ${y(from[1])}L${x(to[0])} ${y(to[1])}`
  return (
    <svg className="ch" width={W} viewBox={`0 0 ${W} ${H}`} data-state={state} role="img" aria-label={L(label)}>
      <path className="ch-axis" d={`M${LEFT} ${TOP - 6}V${BASE}H${RIGHT + 6}`} />
      <text className="ch-name" x={LEFT - 4} y={TOP - 10}>{L(up.name)}</text>
      <text className="ch-name" x={RIGHT + 6} y={BASE + 13} textAnchor="end">{L(across.name)}</text>
      {lines.map((line, k) => <path key={k} className={`ch-line is-${line.kind}`} d={d(line)} />)}
      {labels.map((l, k) => <text key={k} className="ch-name" x={x(l.at[0]) + (l.under ? 0 : 4)} y={l.under ? BASE + 13 : y(l.at[1]) - 5} textAnchor={l.under ? 'middle' : 'start'}>{L(l.text)}</text>)}
      {trail.map(([px, py], k) => <circle key={k} className="ch-was" cx={x(px)} cy={y(py)} r="2.2" opacity={0.2 + (0.6 * (k + 1)) / (trail.length + 1)} />)}
      {point && (
        <>
          <path className="ch-level" d={`M${LEFT} ${y(point.at[1])}H${x(Math.max(point.at[0], gap?.from[0] ?? 0))}`} />
          {gap && <path className="ch-gap" d={d(gap)} />}
          <circle className="ch-now" cx={x(point.at[0])} cy={y(point.at[1])} r="4" />
          <text className="ch-reads" x={LEFT - 6} y={y(point.at[1]) + 3.5} textAnchor="end">{point.reads}</text>
        </>
      )}
    </svg>
  )
}
