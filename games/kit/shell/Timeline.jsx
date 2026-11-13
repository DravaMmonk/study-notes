import { useEffect, useRef } from 'react'
import { L, tr } from './i18n.js'

// A run laid out tick by tick, like a logic analyzer: one lane per thing that changes over time, a column per tick,
// the tick a run is on marked and kept in view, the ticks that went wrong marked. Shared by the games run on the tick
// world (../engine/ticks.js).
//
// lanes: [{ key, label: { zh, en } | string, kind: 'wave' | 'value' | 'terms' | 'dots', ticks: [value per tick],
//          want?: [value per tick] (dots), text?(value) → string, tool? (drawn beside the label) }]
//   wave   a line that is 0 (low) or 1 (high) at each tick; anything else draws no line (nothing on it yet)
//   value  a band per run of equal values, written along it when there is room (again every few ticks on a long one),
//          or just after it when the ticks after are empty (`text`, default String); null is empty
//   terms  every tick's value written in its own column, as a row of a table
//   dots   a sequence plot in a taller lane: a dot a tick at its value's height, the values `want` as rings on the
//          same scale, zero drawn when it is in range
// A timeline with a terms or dots lane widens its columns to fit the longest value written.
// at: the tick shown (−1: none); count: how many ticks there are; marks: ticks to mark as wrong.

const CELL = 14
const LANE = 26
const PLOT = 64
const RULER = 18
const CHAR = 7
const heightOf = (lane) => (lane.kind === 'dots' ? PLOT : LANE)
const finite = (v) => typeof v === 'number' && Number.isFinite(v)
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

function Wave({ ticks, count, cell }) {
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
    path += path ? `L${t * cell},${y(v)}L${(t + 1) * cell},${y(v)}` : `M${t * cell},${y(v)}L${(t + 1) * cell},${y(v)}`
  }
  if (path) parts.push(path)
  return parts.map((d, k) => <path key={k} d={d} className="tl-wave" />)
}

function Bands({ ticks, count, cell, text = String }) {
  const runs = runsOf(ticks, count)
  return runs.map((r, k) => {
    if (r.value === null || r.value === undefined) return null
    const w = (r.to - r.from) * cell
    // A label may run on over the empty ticks after its band, up to the next value.
    const next = runs.slice(k + 1).find((n) => n.value !== null && n.value !== undefined)
    const room = ((next ? next.from : count) - r.from) * cell
    const label = text(r.value)
    const fits = label.length * CHAR + 6 <= w
    return (
      <g key={r.from} transform={`translate(${r.from * cell},3)`}>
        <rect className="tl-band" width={w - 1} height={LANE - 6} rx={3} />
        {fits
          ? Array.from({ length: Math.max(1, Math.floor((w - label.length * 7) / REPEAT) + 1) }, (_, j) => <text key={j} className="tl-band-text" x={4 + j * REPEAT} y={(LANE - 6) / 2}>{label}</text>)
          : label.length * CHAR + 4 <= room - w && <text className="tl-band-text" x={w + 3} y={(LANE - 6) / 2}>{label}</text>}
      </g>
    )
  })
}

function Terms({ ticks, count, cell, text = String }) {
  return Array.from({ length: count }, (_, t) => {
    const v = ticks[t]
    if (v === null || v === undefined) return null
    return <text key={t} className="tl-term" x={t * cell + cell / 2} y={LANE / 2}>{text(v)}</text>
  })
}

function Dots({ ticks, want = [], count, cell }) {
  const values = [0, ...ticks.slice(0, count), ...want.slice(0, count)].filter(finite)
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const y = (v) => (hi === lo ? PLOT / 2 : 6 + ((hi - v) / (hi - lo)) * (PLOT - 12))
  const x = (t) => t * cell + cell / 2
  return (
    <>
      {lo < 0 && hi > 0 && <line className="tl-zero" x1={0} x2={count * cell} y1={y(0)} y2={y(0)} />}
      {want.slice(0, count).map((v, t) => finite(v) && <circle key={`w${t}`} className="tl-ring" cx={x(t)} cy={y(v)} r={4.5} />)}
      {ticks.slice(0, count).map((v, t) => finite(v) && <circle key={t} className="tl-dot" cx={x(t)} cy={y(v)} r={3} />)}
    </>
  )
}

const LANES = { wave: Wave, value: Bands, terms: Terms, dots: Dots }

export default function Timeline({ lanes, count, at = -1, marks = [] }) {
  const box = useRef(null)
  const widened = lanes.some((lane) => lane.kind === 'terms' || lane.kind === 'dots')
  const longest = widened ? Math.max(1, ...lanes.flatMap((lane) => [...lane.ticks, ...(lane.want ?? [])].filter((v) => v !== null && v !== undefined).map((v) => (lane.text ?? String)(v).length))) : 0
  const cell = widened ? Math.max(24, longest * CHAR + 10) : CELL
  const width = Math.max(1, count) * cell
  const tops = lanes.reduce((at, lane) => [...at, at.at(-1) + heightOf(lane)], [RULER])
  const height = tops.at(-1)
  // Keep the tick shown in the middle of the box; scroll the box only, never the page.
  useEffect(() => {
    const el = box.current
    if (!el || at < 0) return
    el.scrollLeft = Math.max(0, at * cell - el.clientWidth / 2)
  }, [at, cell])
  const every = widened ? 5 : 10
  return (
    <div className="timeline">
      <div className="tl-labels" style={{ paddingTop: RULER }}>
        {lanes.map((lane) => <span key={lane.key} style={{ height: heightOf(lane) }}>{L(lane.label)}{lane.tool}</span>)}
      </div>
      <div className="tl-scroll" ref={box}>
        <svg width={width} height={height} role="img" aria-label={tr('逐拍波形')}>
          {marks.map((t) => <rect key={`m${t}`} className="tl-mark" x={t * cell} y={0} width={cell} height={height} />)}
          {at >= 0 && <rect className="tl-at" x={at * cell} y={0} width={cell} height={height} />}
          {Array.from({ length: Math.ceil(count / every) }, (_, k) => <text key={`r${k}`} className="tl-ruler" x={k * every * cell + 2} y={12}>{k * every}</text>)}
          {lanes.map((lane, k) => {
            const Lane = LANES[lane.kind] ?? Bands
            const h = heightOf(lane)
            return (
              <g key={lane.key} transform={`translate(0,${tops[k]})`} className={`tl-lane is-${lane.kind}`}>
                <line className="tl-base" x1={0} x2={width} y1={h - 0.5} y2={h - 0.5} />
                <Lane ticks={lane.ticks} want={lane.want} count={count} cell={cell} text={lane.text} />
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
