import { createElement, useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Lock, PanelLeftClose } from 'lucide-react'
import { L, tr } from './i18n.js'

// The level list beside a level: every chapter, the current one open, each level with its state.
// Picking a level switches to it directly, without going back to the map.
// A chapter's levels in the rail: in its track's order (games/kit/course.js layout), each branch under a small heading
// and indented; without a track, in play order.
function rows(chapter, levels) {
  const byId = new Map(levels.map((level) => [level.id, level]))
  if (!chapter.track) return levels.map((level) => ({ level }))
  const titleOf = (branch) => L(branch.title ?? byId.get(branch.levels.at(-1))?.title)
  const list = (ids) => ids.filter((id) => byId.has(id)).map((id) => ({ level: byId.get(id), branch: true }))
  return chapter.track.flatMap((entry) => [
    ...(entry.level ? (byId.has(entry.level) ? [{ level: byId.get(entry.level) }] : []) : entry.parallel.flatMap((b) => [{ head: entry.parallel.length > 1 ? tr(`并行 · ${titleOf(b)}`, `Parallel · ${titleOf(b)}`) : titleOf(b), key: `p-${b.id}`, kind: 'parallel' }, ...list(b.levels)])),
    ...entry.branches.flatMap((b) => [{ head: b.kind === 'topic' ? tr(`专题 · ${titleOf(b)} · 可选`, `Topic · ${titleOf(b)} · optional`) : tr('挑战 · 可选', 'Challenge · optional'), key: `s-${b.id}`, kind: b.kind }, ...list(b.levels)]),
  ])
}

export default function LevelRail({ game, current, solved, all, onOpen, onClose, overlay }) {
  const LEVELS = game.levels
  const chapterOf = LEVELS.find((level) => level.id === current)?.chapter
  const [openChapters, setOpenChapters] = useState(() => new Set([chapterOf]))
  const list = useRef(null)

  // Keep the current level in view, and its chapter open, when the level changes.
  const [shownFor, setShownFor] = useState(current)
  if (shownFor !== current) {
    setShownFor(current)
    setOpenChapters((open) => new Set([...open, chapterOf]))
  }
  useEffect(() => {
    list.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest' })
  }, [current])

  const toggle = (id) =>
    setOpenChapters((open) => {
      const next = new Set(open)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <nav className={`level-rail ${overlay ? 'is-overlay' : ''}`} aria-label={tr('关卡列表', 'Level list')}>
      <header className="rail-head">
        <span>{tr('关卡', 'Levels')}</span>
        <small>{LEVELS.filter((level) => solved.has(level.id)).length} / {LEVELS.length}</small>
        <button className="rail-close" onClick={onClose} aria-label={tr('收起关卡列表', 'Hide level list')} title={tr('收起关卡列表', 'Hide level list')}><PanelLeftClose size={16} /></button>
      </header>
      <div className="rail-list" ref={list}>
        {game.chapters.map((chapter) => {
          const levels = LEVELS.filter((level) => level.chapter === chapter.id)
          if (!levels.length) return null
          const finished = levels.filter((level) => solved.has(level.id)).length
          const expanded = openChapters.has(chapter.id)
          return (
            <section key={chapter.id} className={`rail-chapter ${chapter.id === chapterOf ? 'is-current' : ''}`}>
              <button className="rail-chapter-head" onClick={() => toggle(chapter.id)} aria-expanded={expanded}>
                <span className="rail-chapter-index">{chapter.number ?? chapter.id}</span>
                <span className="rail-chapter-title">{L(chapter.title)}</span>
                <span className="rail-chapter-count">{finished}/{levels.length}</span>
                <ChevronDown size={14} className="rail-chevron" />
              </button>
              {expanded && (
                <ol>
                  {rows(chapter, levels).map((entry) => {
                    if (entry.head) return <li key={entry.key} className={`rail-branch-head is-${entry.kind}`}>{entry.head}</li>
                    const level = entry.level
                    const open = game.isOpen(level, solved, all)
                    const kind = game.kinds[level.kind]
                    const won = solved.has(level.id)
                    const here = level.id === current
                    return (
                      <li key={level.id}>
                        <button
                          className={`rail-level ${won ? 'is-solved' : open ? 'is-open' : 'is-locked'} ${here ? 'is-here' : ''} ${entry.branch ? 'is-branch' : ''}`}
                          disabled={!open && !won}
                          aria-current={here ? 'page' : undefined}
                          title={open || won ? `${game.levelLabel(level)} ${L(level.title)}` : `${game.levelLabel(level)} ${L(level.title)}${tr('：先通过 ', ': first pass ')}${game.missing(level, solved).map(game.levelLabel).join(tr('、', ', '))}`}
                          onClick={() => onOpen(level.id)}
                        >
                          <span className="rail-pad" aria-hidden="true">{won ? <Check size={11} strokeWidth={2.6} /> : open ? null : <Lock size={10} />}</span>
                          <span className="rail-id">{game.levelLabel(level)}</span>
                          <span className="rail-title">{L(level.title)}</span>
                          {kind?.icon && createElement(kind.icon, { size: 12, className: 'rail-kind' })}
                        </button>
                      </li>
                    )
                  })}
                </ol>
              )}
            </section>
          )
        })}
      </div>
    </nav>
  )
}
