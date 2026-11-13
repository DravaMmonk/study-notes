import { L } from '../../shell/i18n.js'

// A chart of a scene: two axes, straight lines, dots, and one point that moves, all in the scene's own units. A
// domain says what is there and the chart draws it the same way in every game:
//
//   x, y     { name, min?, max }                 the axes, named at their ends; from zero unless `min` says lower (a
//                                                faint line then marks zero)
//   lines    [{ from: [x, y], to: [x, y], kind }]   'curve' a relation (solid), 'bound' a limit (dashed)
//   labels   [{ at: [x, y], text, under? }]      a line's name by it; `under`, below the x axis at its x
//   series   [{ points: [[x, y]], kind }]        dots: 'was' where the point has been, oldest first (fading back);
//                                                'given' what the scene was handed (joined faintly); 'want' where
//                                                the point is wanted (rings)
//   point    { at: [x, y], reads }               where it is now; `reads` written at the y axis at its height
//   gap      { from: [x, y], to: [x, y] }        a stretch the point is off by
//   state    'over' | 'under' | 'met'            how the point stands, the colour of the point, `reads` and the gap
//
// The point slides to where it goes next and a line that moves slides too (where the browser animates them), so a run
// stepped through reads as one motion. Drawn one unit a screen pixel at its natural size.

const [W, H, LEFT, BASE, TOP, RIGHT] = [246, 156, 52, 136, 18, 234]

const DOT = { was: 2.2, given: 1.8, want: 3.4 }

export default function Chart({ label, x: across, y: up, lines = [], labels = [], series = [], point, gap, state }) {
  const along = ({ min = 0, max }, v) => (Math.min(max, Math.max(min, v)) - min) / (max - min || 1)
  const x = (v) => LEFT + (RIGHT - LEFT) * along(across, v)
  const y = (v) => BASE - (BASE - TOP) * along(up, v)
  const d = ({ from, to }) => `M${x(from[0])} ${y(from[1])}L${x(to[0])} ${y(to[1])}`
  return (
    <svg className="ch" width={W} viewBox={`0 0 ${W} ${H}`} data-state={state} role="img" aria-label={L(label)}>
      <path className="ch-axis" d={`M${LEFT} ${TOP - 6}V${BASE}H${RIGHT + 6}`} />
      {up.min < 0 && <path className="ch-level" d={`M${LEFT} ${y(0)}H${RIGHT}`} />}
      <text className="ch-name" x={LEFT - 4} y={TOP - 10}>{L(up.name)}</text>
      <text className="ch-name" x={RIGHT + 6} y={BASE + 13} textAnchor="end">{L(across.name)}</text>
      {lines.map((line, k) => <path key={k} className={`ch-line is-${line.kind}`} d={d(line)} />)}
      {labels.map((l, k) => <text key={k} className="ch-name" x={x(l.at[0]) + (l.under ? 0 : 4)} y={l.under ? BASE + 13 : y(l.at[1]) - 5} textAnchor={l.under ? 'middle' : 'start'}>{L(l.text)}</text>)}
      {series.map(({ points, kind }, s) => (
        <g key={s} className={`ch-dots is-${kind}`}>
          {kind === 'given' && points.length > 1 && <path d={points.map(([px, py], k) => `${k ? 'L' : 'M'}${x(px)} ${y(py)}`).join('')} />}
          {points.map(([px, py], k) => <circle key={k} cx={x(px)} cy={y(py)} r={DOT[kind]} opacity={kind === 'was' ? 0.2 + (0.6 * (k + 1)) / (points.length + 1) : undefined} />)}
        </g>
      ))}
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
