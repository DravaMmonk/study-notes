import { isGrid, pixel } from '../engine/grid.js'
import { numberText } from '../engine/number.js'
import { L } from '../shell/i18n.js'
import Timeline from '../shell/Timeline.jsx'
import { WORDS } from '../shell/words.js'
import { useViewPicks } from './choice.js'
import GridInspector from './grid/GridInspector.jsx'
import { DRAWN, SIZE, overlays } from './plots/drawn.js'
import ViewSwitch from './ViewSwitch.jsx'

// A results area (games/DESIGN.md 6.10): the verdict first, then the rows content laid out (../../engine/views.js
// rowsOf), each in the view kept for its value (./picks.js: an input's or output's, the one its card and detail draw),
// switched in the row's head. Rows of values a tick (bits, ticks) share one
// time axis; one-value rows (scalar) run on one line; a grid or a list is a row of its own. An output shows the
// board's result against the value wanted, what differs marked; before a run, only the value wanted.
//
//   <Results rows={rows} text={show} verdict={[line…]} at={tick} count={ticks} marks={[tick…]} />
//
// text(value) is a value in words (the domain's); `at` the tick shown (−1 none), `count` how many ticks, `marks` the
// ticks that went wrong.

const TRACK = new Set(['bits', 'ticks'])

/** Whether two values are the same, numbers within `tolerance`. */
export function same(a, b, tolerance = 0) {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= tolerance
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, k) => same(v, b[k], tolerance))
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const keys = Object.keys(a)
    return keys.length === Object.keys(b).length && keys.every((k) => same(a[k], b[k], tolerance))
  }
  return a === b
}

const isOutput = (entry) => !('given' in entry)
const wrong = (entry) => isOutput(entry) && entry.got !== undefined && entry.want !== undefined && !TRACK.has(entry.shape) && !same(entry.got, entry.want, entry.tolerance)

/** One value on a line: its label, then the value given, or the result against the value wanted. */
function Chip({ entry, text }) {
  const { label, given, got, want } = entry
  const t = (v) => L(text(v))
  let shown
  if (!isOutput(entry)) shown = t(given)
  else if (got === undefined) shown = <i className="rv-want">{t(want)}</i>
  else if (want === undefined) shown = t(got)
  else shown = wrong(entry) ? <><span className="is-fail">{t(got)}</span><i className="rv-want">{L(WORDS.wanted)} {t(want)}</i></> : <span className="is-pass">{t(got)}</span>
  return <span className="rv-chip"><b>{L(label)}</b>{shown}</span>
}

const cellText = (p) => (Array.isArray(p) ? p.map((v, k) => `${'RGB'[k]} ${numberText(v)}`).join(' · ') : numberText(p))

/** A grid: the value given, or the result beside the value wanted, the cells that differ marked on the result. */
function GridRow({ entry, view, text, tool }) {
  const { label, given, got, want, tolerance = 0 } = entry
  const shown = !isOutput(entry) ? [[null, given]] : got === undefined ? [[WORDS.wanted, want]] : [[WORDS.result, got], [WORDS.wanted, want]]
  const paired = isGrid(got) && isGrid(want) && got.w === want.w && got.h === want.h && (got.c ?? 1) === (want.c ?? 1)
  // One size for the row when its grids share it, written once beside its label.
  const grids = shown.map(([, v]) => v).filter(isGrid)
  const size = grids.length && grids.every((g) => g.w === grids[0].w && g.h === grids[0].h && (g.c ?? 1) === (grids[0].c ?? 1)) ? `${grids[0].w} × ${grids[0].h}${(grids[0].c ?? 1) === 3 ? ' · RGB' : ''}` : null
  const differs = paired ? (x, y) => (same(pixel(got, x, y), pixel(want, x, y), tolerance) ? '' : 'is-different') : undefined
  const read = paired ? (x, y) => <><span>{L(WORDS.result)} {cellText(pixel(got, x, y))}</span><span>{L(WORDS.wanted)} {cellText(pixel(want, x, y))}</span></> : undefined
  const plain = (word, v, k) => <figure key={k} className="rv-plain"><figcaption>{word && L(word)}</figcaption><b>{v === undefined ? '—' : L(text(v))}</b></figure>
  // A plot draws the result and the value wanted on one set of axes; other drawn views and the cells side by side.
  const Drawn = DRAWN[view]
  const body = Drawn && overlays(view, grids[0])
    ? <Drawn value={!isOutput(entry) ? given : isGrid(got) && (paired || !isGrid(want)) ? got : undefined} want={isOutput(entry) && isGrid(want) ? want : undefined} tolerance={tolerance} />
    : shown.map(([word, v], k) => (!isGrid(v) ? plain(word, v, k)
      : Drawn ? <figure key={k} className="rv-drawn"><figcaption>{word && L(word)}</figcaption><Drawn value={v} size={SIZE.results} /></figure>
      : <GridInspector key={k} value={v} label={word && L(word)} view={view} fit dense showSize={!size} cellClass={word === WORDS.result ? differs : undefined} inspectPixel={read} />))
  return (
    <section className="rv-row" data-fail={wrong(entry) || undefined}>
      <h4>{L(label)}{size && <small>{size}</small>}{tool}</h4>
      <div className="rv-pair">{body}</div>
    </section>
  )
}

/** A few values in order: the values given, or the result over the values wanted. */
function ListRow({ entry, text, tool }) {
  const line = (values) => (values?.length ? values.map((v) => L(text(v))).join(' ') : '—')
  const { label, given, got, want } = entry
  return (
    <section className="rv-row" data-fail={wrong(entry) || undefined}>
      <h4>{L(label)}{tool}</h4>
      {!isOutput(entry) ? <p className="rv-seq">{line(given)}</p> : <>
        {got !== undefined && <p className="rv-seq">{line(got)}</p>}
        <p className="rv-seq rv-want">{L(WORDS.wanted)} {line(want)}</p>
      </>}
    </section>
  )
}

/** Rows of values a tick, on one time axis: a lane a value given, or a result and the values wanted under it. */
function Track({ rows, text, at, count, marks }) {
  const lanes = rows.flatMap(({ entry, view, tool }) => {
    const kind = view === 'wave' ? 'wave' : 'value'
    if (!isOutput(entry)) return [{ key: entry.of, label: entry.label, kind, ticks: entry.given, tool }]
    return [
      { key: entry.of, label: entry.label, kind, ticks: entry.got ?? [], tool },
      ...(Array.isArray(entry.want) ? [{ key: `${entry.of}:want`, label: WORDS.wanted, kind, ticks: entry.want.map((v) => (v === undefined ? null : v)) }] : []),
    ]
  })
  return (
    <>
      <Timeline lanes={lanes.map((lane) => ({ text: (v) => L(text(v)), ...lane }))} count={count} at={at} marks={marks} />
      {rows.filter((r) => r.entry.order).map(({ entry }) => (
        <p key={entry.of} className="rv-order"><b>{L(entry.label)}</b> · {L(entry.order.words)}: {entry.order.values.map((v) => L(text(v))).join(' ') || '—'}</p>
      ))}
    </>
  )
}

/** Consecutive rows that go together: those a tick on one axis, one-value rows on one line. */
function groups(rows) {
  const kind = (r) => (TRACK.has(r.entry.shape) ? 'track' : r.entry.shape === 'scalar' ? 'line' : 'rows')
  const out = []
  for (const r of rows) {
    const last = out.at(-1)
    if (last?.kind === kind(r)) last.rows.push(r)
    else out.push({ kind: kind(r), rows: [r] })
  }
  return out
}

export default function Results({ rows, text, verdict = [], at = -1, count = 0, marks = [] }) {
  const picks = useViewPicks()
  const drawn = rows.map((r) => {
    const view = picks.of(r.entry.of, r.views)
    const pick = r.views.length > 1 && picks.pick(r.entry.of)
    return { ...r, view, tool: pick && <ViewSwitch views={r.views} value={view} onChange={pick} compact /> }
  })
  return (
    <div className="rv">
      {verdict.filter(Boolean).map((line, k) => <p key={k} className="rv-verdict is-fail">{L(line)}</p>)}
      {groups(drawn).map((g, k) => {
        if (g.kind === 'track') return <Track key={k} rows={g.rows} text={text} at={at} count={count} marks={marks} />
        if (g.kind === 'line') return <p key={k} className="rv-line">{g.rows.map((r) => <Chip key={r.entry.of} entry={r.entry} text={text} />)}</p>
        return <div key={k} className="rv-rows">{g.rows.map((r) => (r.entry.shape === 'grid' ? <GridRow key={r.entry.of} entry={r.entry} view={r.view} text={text} tool={r.tool} /> : <ListRow key={r.entry.of} entry={r.entry} text={text} tool={r.tool} />))}</div>
      })}
    </div>
  )
}
