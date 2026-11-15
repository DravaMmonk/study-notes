import { Text } from './Layout.jsx'
import { GAMES } from '../../games.js'
import { dependencyLayers } from '../course.js'
import { fileMark } from './edit.js'
import { createElement, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useOverlay } from './useOverlay.js'
import { ArrowRight, BookMarked, Check, CircuitBoard, Lock, LockOpen, Package, RotateCcw, X } from 'lucide-react'
import { L, tr } from './i18n.js'
import { PHONE, useMedia } from './useMedia.js'

// The player's map draws chapter-local prerequisite wires. Cross-chapter gates appear in the prerequisite prompt.
// Tree geometry in px: node size, the gap between columns, and the gap under a level: `gap` when a chip sits on its
// wire (the parts it brings in and what passing it unlocks, UnlockChip), `plain` when none does. A level that is not a
// milestone (game.core) is drawn smaller, `minor`, centred on its column.
const SIZE = { full: { w: 224, h: 52, col: 28, gap: 34, plain: 16, minor: { w: 180, h: 40 } }, compact: { w: 114, h: 62, col: 12, gap: 30, plain: 12, minor: { w: 100, h: 50 } } }
const R = 8
const CLEAR = 6 // how far a wire's turn keeps from a level it passes

function plot(track, byId) {
  const ids = track.filter((id) => byId.has(id))
  const requires = new Map(ids.map((id) => [id, (byId.get(id).requires ?? []).filter((from) => byId.has(from))]))
  const at = new Map()
  let row = 0
  for (const layer of dependencyLayers(ids, requires)) {
    for (let i = 0; i < layer.length; i += 3) {
      const band = layer.slice(i, i + 3)
      band.forEach((id, col) => at.set(id, { row, col: col - (band.length - 1) / 2 }))
      row += 1
    }
  }
  const edges = [...requires].flatMap(([to, from]) => from.map((id) => ({ from: id, to, join: from.length > 1 })))
  return { at, edges }
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
  const late = (e) => e.join || at.get(e.to).row - at.get(e.from).row > 1
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
  const height = Math.max(0, ...ids.map((id) => bottom(id) + (below.chip(id) ? below(id) : 0)))
  return { top, turn, height }
}

/**
 * A chapter's levels, on the map and in the level drawer: a button for each level (byId: the chapter's levels), joined
 * by wires into its tree; a notes edition (game.notes, games/DESIGN.md 12.1) opens every level and lists them in
 * order, with no tree. current: the level being played (marked); next: the one to play next (its pad pulses).
 */
export function LevelTree(props) {
  return props.game.notes ? <LevelList {...props} /> : <Tree {...props} />
}

function LevelList({ game, track, byId, solved, all, best = () => null, current, next, compact, onOpen }) {
  const { w, h } = compact ? SIZE.compact : SIZE.full
  return (
    <div className={`map-list ${compact ? 'is-compact' : ''}`} style={{ '--node-w': `${w}px` }}>
      {track.map((id) => byId.get(id) && <LevelButton key={id} game={game} level={byId.get(id)} style={{ height: h }} solved={solved} all={all} best={best} current={current} next={next} compact={compact} onOpen={onOpen} />)}
    </div>
  )
}

/** A level's button on the map: its number, title and kind (or best score), how it stands, and opening it. */
function LevelButton({ game, level, style, solved, all, best, current, next, needed = null, compact, onOpen }) {
  const open = game.isOpen(level, solved, all)
  const won = solved.has(level.id)
  const state = won ? 'is-solved' : open ? 'is-open' : 'is-locked'
  const kind = game.kinds[level.kind]
  const score = won && best(level.id) && game.bestLabel?.(best(level.id))
  const here = level.id === current
  return (
    <button data-level={level.id} style={style} title={L(level.title)} aria-current={here ? 'page' : undefined} className={`map-node ${state} ${game.core(level) ? '' : 'is-minor'} ${level.optional ? 'is-optional' : ''} ${next?.id === level.id ? 'is-next' : ''} ${here ? 'is-here' : ''} ${needed?.ids.has(level.id) ? 'is-needed' : ''} ${needed?.asked === level.id ? 'is-asked' : ''}`} aria-disabled={!open} onClick={() => (open ? onOpen(level.id) : needed?.ask(level.id))}>
      <span className="map-pad" aria-hidden="true">{won ? <Check size={11} strokeWidth={2.6} /> : open ? null : <Lock size={9} />}</span>
      <span className="map-node-number">
        <span className="map-node-id">{game.levelLabel(level)}</span>
      </span>
      <span className="map-node-title">{L(level.title)}</span>
      {score ? <span className="map-node-best">{score}</span> : kind?.icon && !compact && <span className="map-node-kind" aria-label={L(kind.label)}>{createElement(kind.icon, { size: game.core(level) ? 13 : 12 })}</span>}
    </button>
  )
}

function Tree({ game, track, byId, solved, all, best = () => null, current, next, compact, onOpen, needed = null }) {
  const { w, h, col, gap, plain, minor } = compact ? SIZE.compact : SIZE.full
  const { at, edges } = useMemo(() => plot(track, byId), [track, byId])
  const scroll = useRef(null)
  const spots = [...at.values()]
  const half = Math.max(0, ...spots.map((p) => Math.abs(p.col)))
  const x = (c) => (c + half) * (w + col)
  const width = x(half) + w
  // What sits on the wire under a level: the primitives it brings in (once it opens) and what passing it unlocks, less
  // what a level before it unlocked already (an upgrade of a part shows no chip of its own).
  const firstUnlocks = (level) => ({ ...level, unlocks: (level.unlocks ?? []).filter((flag) => !game.unlocksBefore(level).includes(flag)) })
  const chipOf = (level) => [...game.introduced(level).map((part) => ({ label: part.name, fresh: true, open: all || game.isOpen(level, solved) })), ...game.unlocked(firstUnlocks(level)).map((part) => ({ label: part.label, open: all || solved.has(level.id) }))]
  // A level's own box: full size, or smaller; and the gap under it.
  const box = (id) => (byId.get(id) && !game.core(byId.get(id)) ? minor : { w, h })
  const chip = (id) => Boolean(byId.get(id) && chipOf(byId.get(id)).length)
  const below = Object.assign((id) => (chip(id) ? gap : plain), { chip })
  const { top, turn, height } = stack({ at, edges, box, below, x, w, join: plain / 2 })
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
  const node = (level, p) => {
    if (!level) return null
    const size = box(level.id)
    const style = { left: x(p.col) + (w - size.w) / 2, top: top.get(level.id), width: size.w, height: size.h }
    return <LevelButton key={level.id} game={game} level={level} style={style} solved={solved} all={all} best={best} current={current} next={next} needed={needed} compact={compact} onOpen={onOpen} />
  }
  return (
    <div className="map-tree-scroll" ref={scroll}>
      <div className={`map-tree ${compact ? 'is-compact' : ''}`} style={{ width, height }}>
        <svg className="map-wires" width={width} height={height} aria-hidden="true">
          {edges.map((e) => <path key={`${e.from}-${e.to}`} className={`${byId.get(e.to)?.optional ? 'is-optional' : ''} ${solved.has(e.from) ? 'is-lit' : ''}`} d={wire(e)} />)}
        </svg>
        {[...at].map(([id, p]) => node(byId.get(id), p))}
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
  const title = [fresh.length && tr(`这一关新带来：${fresh.join('、')}`, `New in this level: ${fresh.join(', ')}`), built.length && tr(`已解锁：${built.join('、')}`, `Unlocked: ${built.join(', ')}`), items.some((item) => !item.open) && tr('进入或通过这一关后可见')].filter(Boolean).join('\n')
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
  const external = asked && !all ? game.externalNeeded?.(game.byId[asked], solved) ?? [] : []
  return { asked, ids, ready, external, ask: (id) => setAsked(id === asked ? null : id), clear: () => setAsked(null) }
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
  const count = needed.ids.size + needed.external.length
  return (
    <div className="map-needed" role="status">
      <p>
        {tr(`${game.levelLabel(level)}「${L(level.title)}」还需先通过 ${count} 关。`, `${game.levelLabel(level)} “${L(level.title)}” needs ${count} more level${count === 1 ? '' : 's'} passed first.`)}
        {needed.ready.length > 0 && <>{tr('现在可以进行：')}{needed.ready.map((r) => <button key={r.id} type="button" onClick={() => { needed.clear(); onOpen(r.id) }}>{game.levelLabel(r)} {L(r.title)}</button>)}</>}
        {needed.external.map(({ game: id, level }) => {
          const entry = GAMES.find(({ id: candidate }) => candidate === id)
          return <a key={`${id}:${level}`} href={`../${entry?.href ?? `${id}/index.html`}?level=${encodeURIComponent(level)}`}>{L({ zh: entry?.title ?? id, en: entry?.en ?? id })} · {level}</a>
        })}
      </p>
      <button type="button" className="map-needed-close" onClick={needed.clear} aria-label={tr('关闭')}><X size={14} /></button>
    </div>
  )
}

export default function LevelMap({ game, progress, solved, onAll, onOpen, focus, onReset, onParts, onWorkshop, partsNew = 0, onWiki, unread = 0, theme, edit = null }) {
  const levels = game.levels
  const done = levels.filter((level) => solved.has(level.id)).length
  const next = levels.find((level) => !level.optional && !solved.has(level.id) && game.isOpen(level, solved, progress.all)) ?? levels.find((level) => !solved.has(level.id) && game.isOpen(level, solved, progress.all))
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
          <p className="map-kicker" {...fileMark(edit, 'game', ['kicker'])}>{L(game.kicker)}</p>
          <h1 {...fileMark(edit, 'game', ['title'])}>{L(game.title)}</h1>
          <Text className="map-lede" text={game.lede} mark={fileMark(edit, 'game', ['lede'])} />
          <div className="map-progress" aria-label={tr(`已通过 ${done} / ${levels.length} 关`, `${done} of ${levels.length} levels passed`)}>
            <span className="map-progress-bar"><i style={{ width: `${(done / levels.length) * 100}%` }} /></span>
            <span>{tr(`${done} / ${levels.length} 关`, `${done} / ${levels.length} levels`)}</span>
          </div>
          {next && (
            <button className="map-continue" onClick={() => onOpen(next.id)}>
              <span>{done ? tr('继续') : tr('开始')}</span>
              <b>{game.levelLabel(next)} · {L(next.title)}</b>
              <ArrowRight size={16} />
            </button>
          )}
          <div className="map-tools">
            {onWorkshop && <button className="kit-btn is-label" onClick={onWorkshop}><CircuitBoard size={15} /><span>{tr('元件工坊', 'Component workshop')}</span></button>}
            {onParts && <button className="kit-btn is-label wiki-button" onClick={onParts}><Package size={15} /><span>{tr('元件箱')}</span><b>{partsNew > 0 ? tr(`新增 ${partsNew} 个`, `${partsNew} new`) : `${game.parts.earned(progress).length}/${game.parts.all.length}`}</b></button>}
            {onWiki && <button className="kit-btn is-label wiki-button" onClick={onWiki}><BookMarked size={15} /><span>{tr('百科')}</span>{unread > 0 && <b>{tr(`新增 ${unread} 条`, `${unread} new`)}</b>}</button>}
            <button className={`kit-btn is-label map-reset ${progress.all ? 'is-all' : ''}`} onClick={() => setProgressOpen(true)} aria-haspopup="dialog">
              <RotateCcw size={14} /><span>{tr('清空进度')}</span>{progress.all && <b>{tr('已全部解锁')}</b>}
            </button>
          </div>
        </div>
        {game.Hero && <div className="map-hero-art" aria-hidden="true">{createElement(game.Hero, { theme })}</div>}
      </header>

      <div className="map-chapters">
        {game.chapters.map((chapter, k) => {
          const inChapter = levels.filter((level) => level.chapter === chapter.id)
          if (!inChapter.length) return null
          const byId = new Map(inChapter.map((level) => [level.id, level]))
          const finished = inChapter.filter((level) => solved.has(level.id)).length
          return (
            <section key={chapter.id} className={`map-chapter ${finished === inChapter.length ? 'is-complete' : ''}`}>
              <header {...fileMark(edit, 'game', ['eras', k])}>
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
  const overlay = useOverlay(onClose)
  return (
    <div ref={overlay} className="dialog-scrim" onClick={onClose}>
      <div className="dialog progress-dialog" role="dialog" aria-modal="true" aria-label={tr('进度')} onClick={(event) => event.stopPropagation()}>
        <h2>{tr('进度')}</h2>
        <div className="map-all">
          {progress.all
            ? <strong role="status"><LockOpen size={14} />{tr('已全部解锁')}</strong>
            : <button type="button" className="kit-btn is-label" onClick={onAll}><Lock size={14} />{tr('全部解锁')}</button>}
          <small>{progress.all
            ? tr('所有关卡、任务、元件和百科均已开放，进度照常记录。')
            : tr('开放所有关卡、任务、元件和百科。开启后不能关闭。')}</small>
        </div>
        <div className="progress-clear">
          <p>{tr('清空后，这台设备上已通过的关卡、搭建的电路和获得的元件将全部删除，无法恢复。')}</p>
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
            <RotateCcw size={14} />{armed ? tr('再次点击即清空全部进度') : tr('清空全部进度')}
          </button>
        </div>
        <div className="dialog-actions">
          <button className="is-primary" onClick={onClose} autoFocus>{tr('完成')}</button>
        </div>
      </div>
    </div>
  )
}
