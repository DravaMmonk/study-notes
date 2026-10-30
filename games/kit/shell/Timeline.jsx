import { useEffect, useRef } from 'react'
import { L, tr } from './i18n.js'

// A run laid out tick by tick, like a logic analyzer: one lane per thing that changes over time, a column per tick,
// the tick a run is on marked and kept in view, the ticks that went wrong marked. Shared by the games run on the tick
// world (../engine/ticks.js).
//
// lanes: [{ key, label: { zh, en } | string, kind: 'wave' | 'value', ticks: [value per tick], text?(value) → string }]
//   wave   a line that is 0 (low) or 1 (high) at each tick; anything else draws no line (nothing on it yet)
//   value  a band per run of equal values, written along it when there is room (again every few ticks on a long one),
//          or just after it when the ticks after are empty (`text`, default String); null is empty
// at: the tick shown (−1: none); count: how many ticks there are; marks: ticks to mark as wrong.

const CELL = 14
const LANE = 26
const RULER = 18
// A long band repeats its label this often, so some of it is always in view.
const REPEAT = 12 * CELL

// Runs of equal values in a lane: [{ from, to, value }], to exclusive.
function runsOf(ticks, count) {
  const runs = []
  for (let t = 0; t < count; t++) {
    const v = ticks[t]
    const last = runs.at(-1)
    if (last && last.value === v) last.to = t + 1
    else runs.push({ from: t, to: t + 1, value: v })
  }
  return runs
}

function Wave({ ticks, count }) {
  const y = (v) => (v === 1 ? 5 : LANE - 5)
  const parts = []
  let path = ''
  for (let t = 0; t < count; t++) {
    const v = ticks[t]
    if (v !== 0 && v !== 1) {
      if (path) parts.push(path)
      path = ''
      continue
    }
    path += path ? `L${t * CELL},${y(v)}L${(t + 1) * CELL},${y(v)}` : `M${t * CELL},${y(v)}L${(t + 1) * CELL},${y(v)}`
  }
  if (path) parts.push(path)
  return parts.map((d, k) => <path key={k} d={d} className="tl-wave" />)
}

function Bands({ ticks, count, text = String }) {
  const runs = runsOf(ticks, count)
  return runs.map((r, k) => {
    if (r.value === null || r.value === undefined) return null
    const w = (r.to - r.from) * CELL
    // A label may run on over the empty ticks after its band, up to the next value.
    const next = runs.slice(k + 1).find((n) => n.value !== null && n.value !== undefined)
    const room = ((next ? next.from : count) - r.from) * CELL
    const label = text(r.value)
    const fits = label.length * 7 + 6 <= w
    return (
      <g key={r.from} transform={`translate(${r.from * CELL},3)`}>
        <rect className="tl-band" width={w - 1} height={LANE - 6} rx={3} />
        {fits
          ? Array.from({ length: Math.max(1, Math.floor((w - label.length * 7) / REPEAT) + 1) }, (_, j) => <text key={j} className="tl-band-text" x={4 + j * REPEAT} y={(LANE - 6) / 2}>{label}</text>)
          : label.length * 7 + 4 <= room - w && <text className="tl-band-text" x={w + 3} y={(LANE - 6) / 2}>{label}</text>}
      </g>
    )
  })
}

export default function Timeline({ lanes, count, at = -1, marks = [] }) {
  const box = useRef(null)
  const width = Math.max(1, count) * CELL
  const height = RULER + lanes.length * LANE
  const top = RULER
  // Keep the tick shown in the middle of the box; scroll the box only, never the page.
  useEffect(() => {
    const el = box.current
    if (!el || at < 0) return
    el.scrollLeft = Math.max(0, at * CELL - el.clientWidth / 2)
  }, [at])
  return (
    <div className="timeline">
      <div className="tl-labels" style={{ paddingTop: top }}>
        {lanes.map((lane) => <span key={lane.key} style={{ height: LANE }}>{L(lane.label)}</span>)}
      </div>
      <div className="tl-scroll" ref={box}>
        <svg width={width} height={height} role="img" aria-label={tr('逐拍的波形', 'The run, tick by tick')}>
          {marks.map((t) => <rect key={`m${t}`} className="tl-mark" x={t * CELL} y={0} width={CELL} height={height} />)}
          {at >= 0 && <rect className="tl-at" x={at * CELL} y={0} width={CELL} height={height} />}
          {Array.from({ length: Math.ceil(count / 10) }, (_, k) => <text key={`r${k}`} className="tl-ruler" x={k * 10 * CELL + 2} y={12}>{k * 10}</text>)}
          {lanes.map((lane, k) => (
            <g key={lane.key} transform={`translate(0,${top + k * LANE})`} className={`tl-lane is-${lane.kind}`}>
              <line className="tl-base" x1={0} x2={width} y1={LANE - 0.5} y2={LANE - 0.5} />
              {lane.kind === 'wave' ? <Wave ticks={lane.ticks} count={count} /> : <Bands ticks={lane.ticks} count={count} text={lane.text} />}
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}
