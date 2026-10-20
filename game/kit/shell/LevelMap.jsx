import { createElement, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useEscape } from './Dialogs.jsx'
import { ArrowRight, BookMarked, Check, Lock, LockOpen, Package, RotateCcw } from 'lucide-react'
import { L, tr } from './i18n.js'
import { PHONE, useMedia } from './useMedia.js'

// The level map: a hero (the game's kicker, title, lede and illustration), progress, the unlock-all switch and a
// "continue" button, then each chapter's level tree, as in Turing Complete: levels are buttons joined by wires. A
// chapter's `track` (games/kit/course.js layout) gives the tree: the main path runs down the middle, a set of required
// branches stands side by side and joins again, and optional topics and challenges (dashed) branch off to either side
// of the level they follow.

// Tree geometry in px: node size and the gaps between columns and rows; compact for a phone or the level drawer.
// The gap under a level holds what passing it unlocks (UnlockChip).
const SIZE = { full: { w: 224, h: 52, col: 28, gap: 34 }, compact: { w: 114, h: 62, col: 12, gap: 30 } }
const R = 8

// Places a track as columns ("tracks"), each a run of rows on one lane: a main-path level, a parallel branch (kept to
// the set's full depth, so a shorter branch keeps its room until the join), or an optional branch. A branch stays in
// one column. An optional branch starts one row below its anchor, lower if a row there already holds three, on the
// free lane nearest its anchor on the side with fewer levels in those rows (on a tie, the nearer side, then the anchor's
// side, then the side with fewer optional branches so far). Lanes only order things left to right;
// center() sets the columns.
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
    while (!room(rows())) start += 1
    const nearest = (step) => {
      let lane = anchor.t.lane + step
      while (!free(lane, rows())) lane += step
      return lane
    }
    const right = nearest(1), left = nearest(-1)
    const beside = tracks.filter((t) => overlaps(t, rows()))
    const weight = beside.filter((t) => t.lane > 0).length - beside.filter((t) => t.lane < 0).length
    const dr = right - anchor.t.lane, dl = anchor.t.lane - left
    const lean = Math.sign(weight) || Math.sign(dr - dl) || -Math.sign(anchor.t.lane) || Math.sign(tilt)
    const lane = lean > 0 ? left : right
    tilt += Math.sign(lane)
    lay(branch.levels, lane, start, from, 'optional')
  }
  return { at, edges, tracks }
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
  return { at: new Map([...at].map(([id, p]) => [id, { col: p.t.x, row: p.row }])), edges }
}

/**
 * A chapter's level tree, on the map and in the level drawer: a button for each level (byId: the chapter's levels)
 * joined by wires. current: the level being played (marked); next: the one to play next (its pad pulses).
 */
export function LevelTree({ game, track, byId, solved, all, best = () => null, current, next, compact, onOpen }) {
  const { w, h, col, gap } = compact ? SIZE.compact : SIZE.full
  const { at, edges } = useMemo(() => center(plot(track)), [track])
  const scroll = useRef(null)
  const spots = [...at.values()]
  const rows = Math.max(...spots.map((p) => p.row)) + 1
  const half = Math.max(...spots.map((p) => Math.abs(p.col)))
  const x = (c) => (c + half) * (w + col)
  const y = (r) => r * (h + gap)
  const width = x(half) + w
  const height = y(rows) - gap
  const optional = new Set()
  for (const e of edges) if (e.kind === 'optional' || optional.has(e.from)) optional.add(e.to)
  // Start a tree wider than the screen on its main path.
  useLayoutEffect(() => {
    const el = scroll.current
    el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2
  }, [width])
  // A wire leaves the bottom middle of one node and enters the top middle of the next; between columns it turns in the
  // gap, next to the source when it branches out, and next to the target when branches join or it spans several rows
  // (its own lane is clear below the source).
  const wire = (a, b, kind) => {
    const x1 = x(a.col) + w / 2, y1 = y(a.row) + h, x2 = x(b.col) + w / 2, y2 = y(b.row)
    if (x1 === x2) return `M${x1} ${y1}V${y2}`
    const yb = kind === 'join' || b.row - a.row > 1 ? y2 - gap / 2 : y1 + gap / 2
    const s = Math.sign(x2 - x1)
    return `M${x1} ${y1}V${yb - R}Q${x1} ${yb} ${x1 + s * R} ${yb}H${x2 - s * R}Q${x2} ${yb} ${x2} ${yb + R}V${y2}`
  }
  const node = (level, style, optional) => {
    if (!level) return null
    const open = game.isOpen(level, solved, all)
    const won = solved.has(level.id)
    const state = won ? 'is-solved' : open ? 'is-open' : 'is-locked'
    const kind = game.kinds[level.kind]
    const score = won && best(level.id) && game.bestLabel?.(best(level.id))
    const here = level.id === current
    return (
      <button key={level.id} data-level={level.id} style={style} title={L(level.title)} aria-current={here ? 'page' : undefined} className={`map-node ${state} ${optional ? 'is-optional' : ''} ${next?.id === level.id ? 'is-next' : ''} ${here ? 'is-here' : ''}`} disabled={!open} onClick={() => onOpen(level.id)}>
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
          {edges.map((e) => <path key={`${e.from}-${e.to}`} className={`${optional.has(e.to) ? 'is-optional' : ''} ${solved.has(e.from) ? 'is-lit' : ''}`} d={wire(at.get(e.from), at.get(e.to), e.kind)} />)}
        </svg>
        {[...at].map(([id, p]) => node(byId.get(id), { left: x(p.col), top: y(p.row), width: w, height: h }, optional.has(id)))}
        {[...at].map(([id, p]) => byId.get(id) && <UnlockChip key={`u-${id}`} items={game.unlocked(byId.get(id))} open={all || solved.has(id)} style={{ left: x(p.col) + w / 2, top: y(p.row) + h + gap / 2, maxWidth: w + col }} />)}
      </div>
    </div>
  )
}

/**
 * What passing a level unlocks, on the wire just under it: the parts (or options) it gives, locked until the level is
 * passed. Once unlocked a part stays usable in every level after it (../course.js offer).
 */
function UnlockChip({ items, open, style }) {
  if (!items.length) return null
  const names = items.map((item) => L(item.label))
  return (
    <span className={`map-unlock ${open ? 'is-open' : 'is-locked'}`} style={style} title={open ? tr(`已解锁：${names.join('、')}`, `Unlocked: ${names.join(', ')}`) : tr(`通过上一关解锁：${names.join('、')}`, `Pass the level above to unlock: ${names.join(', ')}`)}>
      {open ? <Package size={11} /> : <Lock size={10} />}
      <span>{names[0]}</span>
      {names.length > 1 && <b>+{names.length - 1}</b>}
    </span>
  )
}

export default function LevelMap({ game, progress, solved, onAll, onOpen, focus, onReset, onParts, partsNew = 0, onWiki, unread = 0, theme }) {
  const levels = game.levels
  const done = levels.filter((level) => solved.has(level.id)).length
  const next = levels.find((level) => !solved.has(level.id) && game.isOpen(level, solved, progress.all))
  const [progressOpen, setProgressOpen] = useState(false)
  const phone = useMedia(PHONE)
  const root = useRef(null)
  // Back from a level, the map opens on that level's node, and keeps it there while the page above settles (the hero's
  // illustration loads late) until the player scrolls.
  useLayoutEffect(() => {
    const el = root.current.querySelector(`[data-level="${focus}"]`)
    if (!el) return undefined
    const keep = () => el.scrollIntoView({ block: 'center', inline: 'center' })
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
              <LevelTree game={game} track={chapter.track} byId={byId} solved={solved} all={progress.all} best={(id) => progress.best[id]} next={next} compact={phone} onOpen={onOpen} />
            </section>
          )
        })}
      </div>
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
