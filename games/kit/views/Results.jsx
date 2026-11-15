import { useContext, useState } from 'react'
import { cellError, isGrid, pixel, pixelText, readCell, relativeIndex, sameGridShape } from '../engine/grid.js'
import { numberError, withinTolerance } from '../engine/number.js'
import { VIEWS } from '../engine/views.js'
import { L, T } from '../shell/i18n.js'
import Timeline from '../shell/Timeline.jsx'
import { WORDS } from '../shell/words.js'
import { ViewScope, useViewPicks } from './choice.js'
import GridInspector from './grid/GridInspector.jsx'
import { DRAWN, SIZE, overlays, sized } from './plots/drawn.js'
import { frequency, readFrequency, spectrumOf } from './plots/spectrum.js'
import ViewSwitch from './ViewSwitch.jsx'

// A results area (games/DESIGN.md 6.9): the verdict first, then the rows content laid out (../../engine/views.js
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
function same(a, b, tolerance = 0) {
  if (typeof a === 'number' && typeof b === 'number') return withinTolerance(numberError(a, b), tolerance)
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, k) => same(v, b[k], tolerance))
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const keys = Object.keys(a)
    return keys.length === Object.keys(b).length && keys.every((k) => same(a[k], b[k], tolerance))
  }
  return a === b
}

const isOutput = (entry) => !('given' in entry)
const wrong = (entry) => isOutput(entry) && (entry.pass === undefined ? entry.got !== undefined && entry.want !== undefined && !TRACK.has(entry.shape) && !same(entry.got, entry.want, entry.tolerance) : entry.pass === false)

/** One value on a line: its label, then the value given, or the result against the value wanted. */
function Chip({ entry, text }) {
  const { label, given, got, want } = entry
  const t = (v) => L(text(v))
  let shown
  if (!isOutput(entry)) shown = t(given)
  else if (got === undefined) shown = <i className="rv-want">{t(want)}</i>
  else if (want === undefined) shown = t(got)
  else if (entry.pass === null) shown = <>{t(got)}<i className="rv-want">{L(WORDS.wanted)} {t(want)}</i></>
  else shown = wrong(entry) ? <><span className="is-fail">{t(got)}</span><i className="rv-want">{L(WORDS.wanted)} {t(want)}</i></> : <span className="is-pass">{t(got)}</span>
  return <span className="rv-chip"><b>{L(label)}</b>{shown}</span>
}

function readingsOf(rows) {
  return rows.flatMap(({ entry, view }, k) => {
    const label = L(entry.label)
    const series = isOutput(entry)
      ? [[`${label} · ${L(WORDS.wanted)}`, entry.want], [`${label} · ${L(WORDS.result)}`, entry.got]]
      : [[label, entry.given]]
    return series.flatMap(([label, grid], i) => isGrid(grid) ? [{ key: `${k}:${i}`, label, grid, view }] : [])
  })
}

function LinkedReading({ point, readings }) {
  if (!point) return null
  const { source, x, y, mode, scan } = point
  const spectrum = mode === 'spectrum' || mode === 'spectrum-rows'
  const header = spectrum ? `(${frequency(x, source.w)}, ${mode === 'spectrum' ? frequency(y, source.h) : y})` : `(${x}, ${y})`
  const visible = spectrum ? readings.filter(({ view, grid }) => view === 'spectrum' && (grid.h <= 2) === (mode === 'spectrum-rows')) : readings
  return <><span>{header}</span>{visible.map(({ key, label, grid }) => {
    if (spectrum) {
      const value = readFrequency(point, spectrumOf(grid))
      return <span key={key}>{label} <b>{value === undefined ? '—' : pixelText(value)}</b></span>
    }
    const reading = mode === 'profile'
      ? { x: relativeIndex(x, source.w, grid.w), y: Math.floor(scan * grid.h) }
      : readCell(point, source, grid)
    const at = grid.w === source.w && grid.h === source.h ? '' : ` (${reading.x}, ${reading.y})`
    const value = mode === 'profile' ? pixel(grid, reading.x, reading.y) : reading.value
    return <span key={key}>{label}{at} <b>{pixelText(value)}</b></span>
  })}</>
}

/** A grid: the value given, or the result beside the value wanted, the cells that differ marked on the result. */
function GridRow({ entry, view, text, tool, inspection, imageView }) {
  const { label, given, got, want, tolerance = 0 } = entry
  const shown = isOutput(entry) ? [[WORDS.wanted, want]] : [[null, given]]
  if (isOutput(entry) && got !== undefined) shown.push([WORDS.result, got])
  const paired = sameGridShape(got, want)
  // One size for the row when its grids share it, written once beside its label; arrows in the plane show it as they are.
  const grids = shown.map(([, v]) => v).filter(isGrid)
  const size = sized(view) && grids.length && grids.every((g) => sameGridShape(g, grids[0])) ? `${grids[0].w} × ${grids[0].h}${(grids[0].c ?? 1) === 3 ? ' · RGB' : ''}` : null
  const error = paired && entry.difference && !overlays(view, got) && {
    w: got.w, h: got.h,
    data: Array.from({ length: got.w * got.h }, (_, i) => cellError(got, want, i)),
  }
  const differenceAt = (i) => error ? error.data[i] : cellError(got, want, i)
  const differs = paired && entry.pass !== null
    ? (x, y) => withinTolerance(differenceAt(y * got.w + x), tolerance) ? '' : 'is-different'
    : undefined
  const plain = (word, v, k) => <figure key={k} className="rv-plain"><figcaption>{word && L(word)}</figcaption><b>{v === undefined ? '—' : L(text(v))}</b></figure>
  // A plot draws the result and the value wanted on one set of axes; other drawn views and the cells side by side.
  const Drawn = DRAWN[view]
  const drawSize = imageView ? SIZE.image : SIZE.results
  const drawnInspection = view === 'profile' || view === 'spectrum' ? inspection : undefined
  const body = Drawn && overlays(view, grids[0])
    ? <Drawn value={!isOutput(entry) ? given : isGrid(got) && (paired || !isGrid(want)) ? got : undefined} want={isOutput(entry) && isGrid(want) ? want : undefined} tolerance={tolerance} size={imageView ? drawSize : undefined} inspection={drawnInspection} />
    : shown.map(([word, v], k) => (!isGrid(v) ? plain(word, v, k)
      : Drawn ? <figure key={k} className="rv-drawn"><Drawn value={v} size={drawSize} inspection={drawnInspection} />{word && <figcaption>{L(word)}</figcaption>}</figure>
      : <GridInspector key={k} value={v} label={word && L(word)} view={view} dense showSize={!size} cellClass={word === WORDS.result ? differs : undefined} inspection={inspection} />))
  return (
    <section className={`rv-row${(view === 'pixels' || imageView) && isGrid(given) ? ' is-picture-input' : ''}`} data-fail={wrong(entry) || undefined}>
      <h4>{L(label)}{size && <small>{size}</small>}{tool}</h4>
      <div className="rv-pair">{body}{error && <GridInspector value={error} view="pixels" label={L(T('误差'))} dense showSize={!size} cellClass={differs} inspection={inspection} />}</div>
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
    const kind = VIEWS[view]?.lane ?? 'value'
    const format = entry.text ? { text: (value) => L(entry.text(value)) } : {}
    if (!isOutput(entry)) return [{ key: entry.of, label: entry.label, kind, ticks: entry.given, tool, ...format }]
    // A plot draws the values wanted as rings on the result's own lane, one scale for both.
    if (kind === 'dots') return [{ key: entry.of, label: entry.label, kind, ticks: entry.got ?? [], want: Array.isArray(entry.want) ? entry.want : undefined, tool, ...format }]
    return [
      { key: entry.of, label: entry.label, kind, ticks: entry.got ?? [], tool, ...format },
      ...(Array.isArray(entry.want) ? [{ key: `${entry.of}:want`, label: WORDS.wanted, kind, ticks: entry.want.map((v) => (v === undefined ? null : v)), ...format }] : []),
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
  const { controls, authoring } = useContext(ViewScope)
  const inspection = useState(null)
  const [point, setPoint] = inspection
  const selectable = rows.map((r) => ({
    ...r,
    view: picks.of(r.entry.of, r.views),
    pick: r.views.length > 1 ? picks.pick(r.entry.of) : null,
  }))
  const switchable = selectable.filter((r) => r.pick)
  const choices = switchable[0]?.views ?? []
  const together = controls && !authoring && switchable.length > 1 && choices.every((view) => view in controls.options) &&
    switchable.every((r) => r.views.length === choices.length && choices.every((view) => r.views.includes(view)))
  const change = (targets, view) => {
    setPoint(null)
    targets.forEach((r) => r.pick(view))
  }
  const drawn = selectable.map((r) => ({
    ...r,
    tool: !together && r.pick && <ViewSwitch views={r.views} value={r.view} onChange={(next) => change([r], next)} compact />,
  }))
  const linked = controls || rows.some(({ entry }) => entry.difference) ? readingsOf(drawn) : []
  return (
    <div className="rv">
      {verdict.filter(Boolean).map((line, k) => <p key={k} className="rv-verdict is-fail">{L(line)}</p>)}
      {together && <div><ViewSwitch views={choices} value={choices.find((view) => switchable.every((r) => r.view === view))}
        onChange={(view) => change(switchable, view)} compact /></div>}
      {groups(drawn).map((g, k) => {
        if (g.kind === 'track') return <Track key={k} rows={g.rows} text={text} at={at} count={count} marks={marks} />
        if (g.kind === 'line') return <p key={k} className="rv-line">{g.rows.map((r) => <Chip key={r.entry.of} entry={r.entry} text={text} />)}</p>
        return <div key={k} className="rv-rows">{g.rows.map((r, index) => (r.entry.shape === 'grid' ? <GridRow key={`${r.entry.of}:${index}`} entry={r.entry} view={r.view} text={text} tool={r.tool} inspection={linked.length ? inspection : undefined} imageView={controls && r.view in controls.options} /> : <ListRow key={r.entry.of} entry={r.entry} text={text} tool={r.tool} />))}</div>
      })}
      {linked.length > 0 && <p className="gv-reading" role="status">
        <LinkedReading point={point} readings={linked} />
      </p>}
    </div>
  )
}
