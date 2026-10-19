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

// Tree geometry in px: node size and the gaps between columns and rows.
const SIZE = { desk: { w: 224, h: 44, col: 28, gap: 22 }, phone: { w: 114, h: 56, col: 12, gap: 16 } }
const R = 8

// Places a track on a grid: the main path down column 0, a parallel set's branches side by side around it, and each
// optional branch, one row below its anchor, down the nearest column (right first, then left) that is free for the
// branch's whole length. Columns can be halves, so two nodes clash when they are less than one column apart.
function plot(track) {
  const at = new Map(), edges = [], busy = []
  const free = (col, rows) => !busy.some((b) => rows.includes(b.row) && Math.abs(b.col - col) < 1)
  const chain = (levels, col, row, from, kind) => levels.forEach((id, k) => {
    at.set(id, { col, row: row + k })
    busy.push({ col, row: row + k })
    for (const f of k ? [levels[k - 1]] : from) edges.push({ from: f, to: id, kind: k ? null : kind })
  })
  let row = 0
  let prev = []
  for (const entry of track) {
    if (entry.level) {
      chain([entry.level], 0, row, prev, prev.length > 1 ? 'join' : null)
      prev = [entry.level]
      row += 1
      continue
    }
    const { parallel } = entry
    const depth = Math.max(...parallel.map((b) => b.levels.length))
    parallel.forEach((branch, k) => {
      const col = k - (parallel.length - 1) / 2
      chain(branch.levels, col, row, prev)
      for (let d = branch.levels.length; d < depth; d++) busy.push({ col, row: row + d })
    })
    prev = parallel.map((b) => b.levels.at(-1))
    row += depth
  }
  for (const branch of track.flatMap((entry) => entry.branches)) {
    const from = branch.after.filter((id) => at.has(id))
    const anchor = from.map((id) => at.get(id)).reduce((a, b) => (b.row > a.row ? b : a), { col: 0, row: -1 })
    const rows = branch.levels.map((_, k) => anchor.row + 1 + k)
    let d = 1
    while (!free(anchor.col + d, rows)) d = d > 0 ? -d : 1 - d
    chain(branch.levels, anchor.col + d, rows[0], from, 'optional')
  }
  return { at, edges }
}

function Tree({ track, byId, node, phone, solved }) {
  const { w, h, col, gap } = phone ? SIZE.phone : SIZE.desk
  const { at, edges } = useMemo(() => plot(track), [track])
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
  // gap, next to the source when it branches out and next to the target when branches join.
  const wire = (a, b, kind) => {
    const x1 = x(a.col) + w / 2, y1 = y(a.row) + h, x2 = x(b.col) + w / 2, y2 = y(b.row)
    if (x1 === x2) return `M${x1} ${y1}V${y2}`
    const yb = kind === 'join' ? y2 - gap / 2 : y1 + gap / 2
    const s = Math.sign(x2 - x1)
    return `M${x1} ${y1}V${yb - R}Q${x1} ${yb} ${x1 + s * R} ${yb}H${x2 - s * R}Q${x2} ${yb} ${x2} ${yb + R}V${y2}`
  }
  return (
    <div className="map-tree-scroll" ref={scroll}>
      <div className="map-tree" style={{ width, height }}>
        <svg className="map-wires" width={width} height={height} aria-hidden="true">
          {edges.map((e) => <path key={`${e.from}-${e.to}`} className={`${optional.has(e.to) ? 'is-optional' : ''} ${solved.has(e.from) ? 'is-lit' : ''}`} d={wire(at.get(e.from), at.get(e.to), e.kind)} />)}
        </svg>
        {[...at].map(([id, p]) => node(byId.get(id), { left: x(p.col), top: y(p.row), width: w, height: h }, optional.has(id)))}
      </div>
    </div>
  )
}

export default function LevelMap({ game, progress, solved, onAll, onOpen, onReset, onParts, partsNew = 0, onWiki, unread = 0, theme }) {
  const levels = game.levels
  const done = levels.filter((level) => solved.has(level.id)).length
  const next = levels.find((level) => !solved.has(level.id) && game.isOpen(level, solved, progress.all))
  const [progressOpen, setProgressOpen] = useState(false)
  const phone = useMedia(PHONE)

  // One level's button on the tree.
  const node = (level, style, optional) => {
    if (!level) return null
    const open = game.isOpen(level, solved, progress.all)
    const won = solved.has(level.id)
    const state = won ? 'is-solved' : open ? 'is-open' : 'is-locked'
    const kind = game.kinds[level.kind]
    const best = won && progress.best[level.id] && game.bestLabel?.(progress.best[level.id])
    return (
      <button key={level.id} style={style} title={L(level.title)} className={`map-node ${state} ${optional ? 'is-optional' : ''} ${next?.id === level.id ? 'is-next' : ''}`} disabled={!open} onClick={() => onOpen(level.id)}>
        <span className="map-pad" aria-hidden="true">{won ? <Check size={11} strokeWidth={2.6} /> : open ? null : <Lock size={9} />}</span>
        <span className="map-node-id">{game.levelLabel(level)}</span>
        <span className="map-node-title">{L(level.title)}</span>
        {best ? <span className="map-node-best">{best}</span> : kind?.icon && !phone && <span className="map-node-kind" aria-label={L(kind.label)}>{createElement(kind.icon, { size: 13 })}</span>}
      </button>
    )
  }
  return (
    <main className="level-map">
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
              <Tree track={chapter.track} byId={byId} node={node} phone={phone} solved={solved} />
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
