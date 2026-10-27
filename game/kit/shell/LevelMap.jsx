import { createElement, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useEscape } from './Dialogs.jsx'
import { ArrowRight, BookMarked, Check, Lock, LockOpen, Package, RotateCcw, X } from 'lucide-react'
import { L, tr } from './i18n.js'
import { PHONE, useMedia } from './useMedia.js'

// The level map: a hero (the game's kicker, title, lede and illustration), progress, the unlock-all switch and a
// "continue" button, then each chapter's level tree, as in Turing Complete: levels are buttons joined by wires. A
// chapter's `track` (games/kit/course.js layout) gives the tree: the main path runs down the middle, a set of required
// branches stands side by side and joins again, and optional topics and challenges (dashed) branch off to either side
// of the level they follow.

// Tree geometry in px: node size, the gap between columns, and the gap under a level: `gap` when a chip sits on its
// wire (the parts it brings in and what passing it unlocks, UnlockChip), `plain` when none does. A level that is not a
// milestone (game.core) is drawn smaller, `minor`, centred on its column.
const SIZE = { full: { w: 224, h: 52, col: 28, gap: 34, plain: 16, minor: { w: 180, h: 40 } }, compact: { w: 114, h: 62, col: 12, gap: 30, plain: 12, minor: { w: 100, h: 50 } } }
const R = 8
const CLEAR = 6 // how far a wire's turn keeps from a level it passes

// Places a track as columns ("tracks"), each a run of rows on one lane: a main-path level, a parallel branch (kept to
// the set's full depth, so a shorter branch keeps its room until the join), or an optional branch. A branch stays in
// one column. The tree is never more than three columns wide, so no row holds more than three levels: an optional
// branch starts one row below its anchor, or lower, at the first rows where it fits beside what is there without
// widening the tree past three; it need not stick out as a column of its own. It goes on the free lane nearest its
// anchor on the side with fewer levels in those rows (on a tie, the nearer side, then the anchor's side, then the side
// with fewer optional branches so far), or the other side when that one is too wide. Lanes only order things left to
// right; center() sets the columns.
const MAX_ROW = 3
function plot(track) {
  const at = new Map(), edges = [], tracks = []
  const overlaps = (t, rows) => t.rows.some((r) => rows.includes(r))
  const free = (lane, rows) => !tracks.some((t) => Math.abs(t.lane - lane) < 1 && overlaps(t, rows))
  const room = (rows) => rows.every((r) => tracks.filter((t) => t.rows.includes(r)).length < MAX_ROW)
  const lay = (levels, lane, row, from, kind, depth = levels.length) => {
    const t = { lane, rows: Array.from({ length: depth }, (_, k) => row + k), band: kind === 'optional' || kind === 'parallel' }
    tracks.push(t)
    levels.forEach((id, k) => {
      at.set(id, { t, row: row + k })
      for (const f of k ? [levels[k - 1]] : from) edges.push({ from: f, to: id, kind: k ? null : kind })
    })
  }
  let row = 0
  let prev = []
  for (const entry of track) {
    if (entry.level) {
      lay([entry.level], 0, row, prev, prev.length > 1 ? 'join' : null)
      prev = [entry.level]
      row += 1
      continue
    }
    const { parallel } = entry
    const depth = Math.max(...parallel.map((b) => b.levels.length))
    parallel.forEach((branch, k) => lay(branch.levels, k - (parallel.length - 1) / 2, row, prev, 'parallel', depth))
    prev = parallel.map((b) => b.levels.at(-1))
    row += depth
  }
  let tilt = 0 // optional branches placed right minus left, to balance the tree
  for (const branch of track.flatMap((entry) => entry.branches)) {
    const from = branch.after.filter((id) => at.has(id))
    const anchor = from.map((id) => at.get(id)).reduce((a, b) => (b.row > a.row ? b : a))
    let start = anchor.row + 1
    const rows = () => branch.levels.map((_, k) => start + k)
    const nearest = (step) => {
      let lane = anchor.t.lane + step
      while (!free(lane, rows())) lane += step
      return lane
    }
    // The lane it would take at `start`, preferred side first, then the other; null when neither keeps three columns.
    const pick = () => {
      if (!room(rows())) return null
      const right = nearest(1), left = nearest(-1)
      const beside = tracks.filter((t) => overlaps(t, rows()))
      const weight = beside.filter((t) => t.lane > 0).length - beside.filter((t) => t.lane < 0).length
      const dr = right - anchor.t.lane, dl = anchor.t.lane - left
      const lean = Math.sign(weight) || Math.sign(dr - dl) || -Math.sign(anchor.t.lane) || Math.sign(tilt)
      return (lean > 0 ? [left, right] : [right, left]).find((lane) => columns([...tracks, { lane, rows: rows(), band: true }]) <= MAX_ROW) ?? null
    }
    let lane = pick()
    while (lane === null) {
      start += 1
      lane = pick()
    }
    tilt += Math.sign(lane)
    lay(branch.levels, lane, start, from, 'optional')
  }
  return { at, edges, tracks }
}

// How many columns the tracks take once centered (on copies, the tracks untouched).
const columns = (tracks) => {
  const placed = center({ at: new Map(), edges: [], tracks: tracks.map((t) => ({ ...t })) }).tracks
  return Math.max(...placed.map((t) => t.x)) - Math.min(...placed.map((t) => t.x)) + 1
}

// Sets the columns. Rows that a parallel set or an optional branch spans form one band. In a band the tracks keep their
// lanes' left-to-right order, each one column right of every overlapping track to its left; then each moves as near the
// middle as its overlapping neighbours allow, so side-by-side levels stand centered and a lone level sits in the middle.
function center({ at, edges, tracks }) {
  const spans = tracks.filter((t) => t.band).map((t) => [t.rows[0], t.rows.at(-1)]).sort((a, b) => a[0] - b[0])
  const band = []
  let open = null
  for (const [from, to] of spans) {
    if (open && from <= open.to) open.to = Math.max(open.to, to)
    else open = { from, to }
    for (let r = open.from; r <= open.to; r++) band[r] = open.from
  }
  const groups = new Map()
  for (const t of tracks) {
    const key = band[t.rows[0]] ?? `row ${t.rows[0]}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(t)
  }
  const meets = (a, b) => a.rows.some((r) => b.rows.includes(r))
  for (const group of groups.values()) {
    group.sort((a, b) => a.lane - b.lane)
    group.forEach((t, i) => { t.x = Math.max(0, ...group.slice(0, i).filter((u) => meets(t, u)).map((u) => u.x + 1)) })
    const middle = Math.max(...group.map((t) => t.x)) / 2
    group.forEach((t) => { t.x -= middle })
    for (let pass = 0; pass < 3; pass++) {
      for (const t of group) {
        const near = group.filter((u) => u !== t && meets(t, u))
        const lo = Math.max(-Infinity, ...near.filter((u) => u.lane < t.lane).map((u) => u.x + 1))
        const hi = Math.min(Infinity, ...near.filter((u) => u.lane > t.lane).map((u) => u.x - 1))
        t.x = Math.min(Math.max(0, lo), hi)
      }
    }
  }
  return { at: new Map([...at].map(([id, p]) => [id, { col: p.t.x, row: p.row }])), edges, tracks }
}

/**
 * Heights on the tree. Rows order the levels, but each level goes only as low as it has to: below the levels its wires
 * come from and the level above it in its column, each with its own gap under it, and clear of the turns of wires
 * that cross its column. So a column with no chips stays tight however many chips the next column has.
 * at: id → { col, row }; edges: [{ from, to, kind }]; box(id) → { w, h }; below(id) → the gap under it;
 * x(col) → the column's left edge. Returns { top: id → px, turn: edge → px (where it runs across), height }.
 */
function stack({ at, edges, box, below, x, w, join }) {
  const top = new Map(), turn = new Map()
  const bottom = (id) => top.get(id) + box(id).h
  const centre = (id) => x(at.get(id).col) + w / 2
  const crosses = (id, e) => {
    const [l, r] = [centre(id) - box(id).w / 2, centre(id) + box(id).w / 2]
    const [a, b] = [centre(e.from), centre(e.to)].sort((p, q) => p - q)
    return e.from !== id && e.to !== id && r > a && l < b
  }
  const turns = (e) => centre(e.from) !== centre(e.to)
  // A wire that joins branches, or skips rows, turns just above its target; any other just below its source.
  const late = (e) => e.kind === 'join' || at.get(e.to).row - at.get(e.from).row > 1
  const into = (id) => edges.filter((e) => e.to === id)
  const rows = [...new Set([...at.values()].map((p) => p.row))].sort((a, b) => a - b)
  for (const row of rows) {
    // Levels whose wires turn just above them go first, so the others in the row keep clear of those turns.
    const ids = [...at.keys()].filter((id) => at.get(id).row === row).sort((a, b) => Number(into(b).some(late)) - Number(into(a).some(late)))
    // Early turns into this row: below their source's gap, and below any level they run across.
    for (const e of edges.filter((e) => ids.includes(e.to) && turns(e) && !late(e) && top.has(e.from))) {
      let ty = bottom(e.from) + below(e.from) / 2
      // A level it crosses with a chip under it: the turn runs through that chip's middle, as its own wires do.
      for (const o of top.keys()) if (crosses(o, e)) ty = Math.max(ty, bottom(o) + (below.chip(o) ? below(o) / 2 : CLEAR))
      turn.set(e, ty)
    }
    for (const id of ids) {
      const p = at.get(id)
      let y = 0
      for (const e of into(id).filter((e) => top.has(e.from))) {
        y = Math.max(y, bottom(e.from) + below(e.from))
        if (turn.has(e)) y = Math.max(y, turn.get(e) + join)
      }
      // The level above it in its column, and every turn already placed that runs across it.
      for (const [o, t] of top) if (Math.abs(at.get(o).col - p.col) < 1) y = Math.max(y, t + box(o).h + below(o))
      for (const [e, ty] of turn) if (crosses(id, e)) y = Math.max(y, ty + CLEAR)
      // Its own late turns run above it, clear of the levels they cross.
      const mine = into(id).filter((e) => turns(e) && late(e))
      for (const e of mine) for (const o of top.keys()) if (crosses(o, e)) y = Math.max(y, bottom(o) + (below.chip(o) ? below(o) : CLEAR) + join)
      top.set(id, y)
      for (const e of mine) turn.set(e, y - join)
    }
  }
  const ids = [...at.keys()]
  const height = Math.max(...ids.map((id) => bottom(id) + (below.chip(id) ? below(id) : 0)))
  return { top, turn, height }
}

/**
 * A chapter's level tree, on the map and in the level drawer: a button for each level (byId: the chapter's levels)
 * joined by wires. current: the level being played (marked); next: the one to play next (its pad pulses).
 */
export function LevelTree({ game, track, byId, solved, all, best = () => null, current, next, compact, onOpen, needed = null }) {
  const { w, h, col, gap, plain, minor } = compact ? SIZE.compact : SIZE.full
  const { at, edges } = useMemo(() => center(plot(track)), [track])
  const scroll = useRef(null)
  const spots = [...at.values()]
  const half = Math.max(...spots.map((p) => Math.abs(p.col)))
  const x = (c) => (c + half) * (w + col)
  const width = x(half) + w
  // What sits on the wire under a level: the primitives it brings in (once it opens) and what passing it unlocks.
  const chipOf = (level) => [...game.introduced(level).map((part) => ({ label: part.name, fresh: true, open: all || game.isOpen(level, solved) })), ...game.unlocked(level).map((part) => ({ label: part.label, open: all || solved.has(level.id) }))]
  // A level's own box: full size, or smaller; and the gap under it.
  const box = (id) => (byId.get(id) && !game.core(byId.get(id)) ? minor : { w, h })
  const chip = (id) => Boolean(byId.get(id) && chipOf(byId.get(id)).length)
  const below = Object.assign((id) => (chip(id) ? gap : plain), { chip })
  const { top, turn, height } = stack({ at, edges, box, below, x, w, join: plain / 2 })
  const optional = new Set()
  for (const e of edges) if (e.kind === 'optional' || optional.has(e.from)) optional.add(e.to)
  // Start a tree wider than the screen on its main path.
  useLayoutEffect(() => {
    const el = scroll.current
    el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2
  }, [width])
  // The levels a vertical line at xl would run through between y1 and y2 (other than the wire's own two).
  const span = (id) => { const size = box(id), left = x(at.get(id).col) + (w - size.w) / 2; return { left, right: left + size.w, top: top.get(id), bottom: top.get(id) + size.h } }
  const through = (e, xl, y1, y2) => [...at.keys()].filter((o) => o !== e.from && o !== e.to).map(span).filter((r) => r.left < xl && r.right > xl && r.top < y2 && r.bottom > y1)
  // A wire leaves the bottom middle of one node and enters the top middle of the next, turning where stack() says.
  // One whose drop would run through a level steps aside first, into the nearest gap clear of every level on the way
  // (the side it is heading for first), and comes back in at its turn.
  const wire = (e) => {
    const a = at.get(e.from), b = at.get(e.to)
    const x1 = x(a.col) + w / 2, y1 = top.get(e.from) + box(e.from).h, x2 = x(b.col) + w / 2, y2 = top.get(e.to)
    const yb = x1 === x2 ? y2 - plain / 2 : turn.get(e)
    const hit = through(e, x1, y1, yb)
    if (hit.length) {
      const toward = Math.sign(x2 - x1) || 1
      const lanes = hit.flatMap((r) => [r.left - col / 2, r.right + col / 2]).filter((xl) => !through(e, xl, y1, yb).length)
      const lane = lanes.sort((p, q) => (Math.sign(q - x1) === toward) - (Math.sign(p - x1) === toward) || Math.abs(p - x1) - Math.abs(q - x1))[0]
      if (lane !== undefined) return `M${x1} ${y1}V${y1 + below(e.from) / 2}H${lane}V${yb}H${x2}V${y2}`
    }
    if (x1 === x2) return `M${x1} ${y1}V${y2}`
    const s = Math.sign(x2 - x1), r = Math.max(0, Math.min(R, yb - y1, y2 - yb))
    return `M${x1} ${y1}V${yb - r}Q${x1} ${yb} ${x1 + s * r} ${yb}H${x2 - s * r}Q${x2} ${yb} ${x2} ${yb + r}V${y2}`
  }
  const node = (level, p, optional) => {
    if (!level) return null
    const size = box(level.id)
    const style = { left: x(p.col) + (w - size.w) / 2, top: top.get(level.id), width: size.w, height: size.h }
    const open = game.isOpen(level, solved, all)
    const won = solved.has(level.id)
    const state = won ? 'is-solved' : open ? 'is-open' : 'is-locked'
    const kind = game.kinds[level.kind]
    const score = won && best(level.id) && game.bestLabel?.(best(level.id))
    const here = level.id === current
    return (
      <button key={level.id} data-level={level.id} style={style} title={L(level.title)} aria-current={here ? 'page' : undefined} className={`map-node ${state} ${game.core(level) ? '' : 'is-minor'} ${optional ? 'is-optional' : ''} ${next?.id === level.id ? 'is-next' : ''} ${here ? 'is-here' : ''} ${needed?.ids.has(level.id) ? 'is-needed' : ''} ${needed?.asked === level.id ? 'is-asked' : ''}`} aria-disabled={!open} onClick={() => (open ? onOpen(level.id) : needed?.ask(level.id))}>
        <span className="map-pad" aria-hidden="true">{won ? <Check size={11} strokeWidth={2.6} /> : open ? null : <Lock size={9} />}</span>
        <span className="map-node-id">{game.levelLabel(level)}</span>
        <span className="map-node-title">{L(level.title)}</span>
        {score ? <span className="map-node-best">{score}</span> : kind?.icon && !compact && <span className="map-node-kind" aria-label={L(kind.label)}>{createElement(kind.icon, { size: 13 })}</span>}
      </button>
    )
  }
  return (
    <div className="map-tree-scroll" ref={scroll}>
      <div className={`map-tree ${compact ? 'is-compact' : ''}`} style={{ width, height }}>
        <svg className="map-wires" width={width} height={height} aria-hidden="true">
          {edges.map((e) => <path key={`${e.from}-${e.to}`} className={`${optional.has(e.to) ? 'is-optional' : ''} ${solved.has(e.from) ? 'is-lit' : ''}`} d={wire(e)} />)}
        </svg>
        {[...at].map(([id, p]) => node(byId.get(id), p, optional.has(id)))}
        {[...at].map(([id, p]) => byId.get(id) && <UnlockChip key={`u-${id}`} items={chipOf(byId.get(id))} style={{ left: x(p.col) + w / 2, top: top.get(id) + box(id).h + gap / 2, maxWidth: w + col }} />)}
      </div>
    </div>
  )
}

/**
 * What a level brings, on the wire just under it: the primitives it brings in (fresh, named once the level opens) and
 * the parts (or options) passing it gives (named once it is passed), ？？？ until then. Once there, a part stays usable
 * in every level after it (../course.js offer).
 */
function UnlockChip({ items, style }) {
  if (!items.length) return null
  const names = items.map((item) => (item.open ? L(item.label) : '？？？'))
  const [first] = items
  const fresh = items.filter((item) => item.fresh && item.open).map((item) => L(item.label))
  const built = items.filter((item) => !item.fresh && item.open).map((item) => L(item.label))
  const title = [fresh.length && tr(`这一关新带来：${fresh.join('、')}`, `New in this level: ${fresh.join(', ')}`), built.length && tr(`已解锁：${built.join('、')}`, `Unlocked: ${built.join(', ')}`), items.some((item) => !item.open) && tr('打开或通过这一关就能看到', 'Open or pass this level to see it')].filter(Boolean).join('\n')
  return (
    <span className={`map-unlock ${first.open ? 'is-open' : 'is-locked'} ${first.fresh ? 'is-fresh' : ''}`} style={style} title={title}>
      {first.open ? <Package size={11} /> : <Lock size={10} />}
      <span>{names[0]}</span>
      {names.length > 1 && <b>+{names.length - 1}</b>}
    </span>
  )
}

/**
 * A locked level asks what it waits for: tapping it lights up every level still to pass before it (on every tree that
 * shows them) and says which of those can be played now. Returns { asked, ids, ask(id), clear(), first }.
 */
export function useNeeded(game, solved, all) {
  const [asked, setAsked] = useState(null)
  const ids = new Set(asked ? game.needed(game.byId[asked], solved).map((level) => level.id) : [])
  const ready = asked ? game.needed(game.byId[asked], solved).filter((level) => game.isOpen(level, solved, all)) : []
  return { asked, ids, ready, ask: (id) => setAsked(id === asked ? null : id), clear: () => setAsked(null) }
}

/** What a locked level waits for, in a note over the trees: the levels to pass, and the ones open now, each a link. */
export function NeededNote({ game, needed, onOpen }) {
  useEffect(() => {
    if (!needed.asked) return undefined
    // The first level open now comes into view, so the player sees where to go.
    const first = needed.ready[0]
    document.querySelector(`.map-node[data-level="${first?.id ?? [...needed.ids][0]}"]`)?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' })
    return undefined
  }, [needed.asked])
  if (!needed.asked) return null
  const level = game.byId[needed.asked]
  return (
    <div className="map-needed" role="status">
      <p>
        {tr(`${game.levelLabel(level)}「${L(level.title)}」还要先通过 ${needed.ids.size} 关（已高亮）。`, `${game.levelLabel(level)} “${L(level.title)}” needs ${needed.ids.size} more level${needed.ids.size === 1 ? '' : 's'} passed first (lit up).`)}
        {needed.ready.length > 0 && <>{tr('现在就能做：', ' Open now: ')}{needed.ready.map((r) => <button key={r.id} type="button" onClick={() => { needed.clear(); onOpen(r.id) }}>{game.levelLabel(r)} {L(r.title)}</button>)}</>}
      </p>
      <button type="button" className="map-needed-close" onClick={needed.clear} aria-label={tr('关掉', 'Close')}><X size={14} /></button>
    </div>
  )
}

export default function LevelMap({ game, progress, solved, onAll, onOpen, focus, onReset, onParts, partsNew = 0, onWiki, unread = 0, theme }) {
  const levels = game.levels
  const done = levels.filter((level) => solved.has(level.id)).length
  const next = levels.find((level) => !solved.has(level.id) && game.isOpen(level, solved, progress.all))
  const [progressOpen, setProgressOpen] = useState(false)
  const phone = useMedia(PHONE)
  const needed = useNeeded(game, solved, progress.all)
  const root = useRef(null)
  // Back from a level, the map opens on that level's node, and keeps it there while the page above settles (the hero's
  // illustration loads late) until the player scrolls. It jumps there, whatever a game's page CSS says about smooth scrolling.
  useLayoutEffect(() => {
    const el = root.current.querySelector(`[data-level="${focus}"]`)
    if (!el) return undefined
    const keep = () => el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' })
    keep()
    const resize = new ResizeObserver(keep)
    resize.observe(root.current)
    const stop = () => resize.disconnect()
    const events = ['wheel', 'touchstart', 'keydown', 'pointerdown']
    events.forEach((type) => window.addEventListener(type, stop, { once: true, passive: true }))
    const timer = window.setTimeout(stop, 2000)
    return () => {
      stop()
      window.clearTimeout(timer)
      events.forEach((type) => window.removeEventListener(type, stop))
    }
  }, [focus])

  return (
    <main className="level-map" ref={root}>
      <header className="map-hero">
        <div className="map-hero-text">
          <p className="map-kicker">{L(game.kicker)}</p>
          <h1>{L(game.title)}</h1>
          <p className="map-lede">{L(game.lede)}</p>
          <div className="map-progress" aria-label={tr(`已通过 ${done} / ${levels.length} 关`, `${done} of ${levels.length} levels passed`)}>
            <span className="map-progress-bar"><i style={{ width: `${(done / levels.length) * 100}%` }} /></span>
            <span>{tr(`${done} / ${levels.length} 关`, `${done} / ${levels.length} levels`)}</span>
          </div>
          {next && (
            <button className="map-continue" onClick={() => onOpen(next.id)}>
              <span>{done ? tr('继续', 'Continue') : tr('开始', 'Start')}</span>
              <b>{game.levelLabel(next)} · {L(next.title)}</b>
              <ArrowRight size={16} />
            </button>
          )}
          <div className="map-tools">
            {onParts && <button className="kit-btn is-label wiki-button" onClick={onParts}><Package size={15} /><span>{tr('元件箱', 'Components')}</span><b>{partsNew > 0 ? tr(`${partsNew} 个新`, `${partsNew} new`) : `${game.parts.earned(progress).length}/${game.parts.all.length}`}</b></button>}
            {onWiki && <button className="kit-btn is-label wiki-button" onClick={onWiki}><BookMarked size={15} /><span>{tr('百科', 'Encyclopedia')}</span>{unread > 0 && <b>{tr(`${unread} 条新`, `${unread} new`)}</b>}</button>}
            <button className={`kit-btn is-label map-reset ${progress.all ? 'is-all' : ''}`} onClick={() => setProgressOpen(true)} aria-haspopup="dialog">
              <RotateCcw size={14} /><span>{tr('清空进度', 'Clear progress')}</span>{progress.all && <b>{tr('已全部解锁', 'All unlocked')}</b>}
            </button>
          </div>
        </div>
        {game.Hero && <div className="map-hero-art" aria-hidden="true">{createElement(game.Hero, { theme })}</div>}
      </header>

      <div className="map-chapters">
        {game.chapters.map((chapter) => {
          const inChapter = levels.filter((level) => level.chapter === chapter.id)
          if (!inChapter.length) return null
          const byId = new Map(inChapter.map((level) => [level.id, level]))
          const finished = inChapter.filter((level) => solved.has(level.id)).length
          return (
            <section key={chapter.id} className={`map-chapter ${finished === inChapter.length ? 'is-complete' : ''}`}>
              <header>
                <span className="chapter-index">{chapter.kicker ? L(chapter.kicker) : tr(`第 ${chapter.number ?? chapter.id} 章`, `Chapter ${chapter.number ?? chapter.id}`)}{chapter.label ? <> · {L(chapter.label)}</> : null}</span>
                <h2>{L(chapter.title)}</h2>
                {chapter.question && <p>{L(chapter.question)}</p>}
                <span className="chapter-meter"><i style={{ width: `${(finished / inChapter.length) * 100}%` }} /></span>
              </header>
              <LevelTree game={game} track={chapter.track} byId={byId} solved={solved} all={progress.all} best={(id) => progress.best[id]} next={next} compact={phone} onOpen={onOpen} needed={needed} />
            </section>
          )
        })}
      </div>
      <NeededNote game={game} needed={needed} onOpen={onOpen} />
      {progressOpen && <ProgressDialog progress={progress} onAll={onAll} onReset={onReset} onClose={() => setProgressOpen(false)} />}
    </main>
  )
}

/** The progress dialog behind 清空进度: unlock every level (and with it every part and encyclopedia entry), or clear
 *  all progress, which asks twice. */
function ProgressDialog({ progress, onAll, onReset, onClose }) {
  const [armed, setArmed] = useState(false)
  useEscape(onClose)
  return (
    <div className="dialog-scrim" onClick={onClose}>
      <div className="dialog progress-dialog" role="dialog" aria-modal="true" aria-label={tr('进度', 'Progress')} onClick={(event) => event.stopPropagation()}>
        <h2>{tr('进度', 'Progress')}</h2>
        <label className="map-all">
          <input type="checkbox" checked={Boolean(progress.all)} onChange={(event) => onAll(event.target.checked)} />
          <span className="map-all-switch" aria-hidden="true"><i /></span>
          {progress.all ? <LockOpen size={14} /> : <Lock size={14} />}
          <span>{tr('全部解锁', 'Unlock all')}<small>{progress.all ? tr('任意一关都能直接玩，元件箱和百科也全部打开；进度照常记录', 'Any level can be played, and the components box and encyclopedia are open in full; progress is still recorded') : tr('打开后不用按顺序，任意一关都能直接玩，元件箱和百科也全部打开', 'Turn on to play any level in any order, with the components box and encyclopedia open in full')}</small></span>
        </label>
        <div className="progress-clear">
          <p>{tr('清空后，通过的关卡、搭好的电路、拿到的元件都会从这台设备上删掉，不能恢复。', 'Clearing removes the levels passed, the circuits built and the components earned from this device, for good.')}</p>
          <button
            type="button"
            className={`progress-clear-btn ${armed ? 'is-armed' : ''}`}
            onClick={() => {
              if (!armed) {
                setArmed(true)
                window.setTimeout(() => setArmed(false), 2600)
                return
              }
              onReset()
              onClose()
            }}
          >
            <RotateCcw size={14} />{armed ? tr('再点一次，清空全部进度', 'Click again to clear all progress') : tr('清空全部进度', 'Clear all progress')}
          </button>
        </div>
        <div className="dialog-actions">
          <button className="is-primary" onClick={onClose} autoFocus>{tr('完成', 'Done')}</button>
        </div>
      </div>
    </div>
  )
}
