import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, FlaskConical, Lock, PanelLeftClose, Workflow } from 'lucide-react'
import { L, tr } from '../i18n.js'
import { CHAPTERS, LEVELS, isOpen } from '../levels/index.js'

// The level list beside a level: every chapter, the current one open, each level with its state.
// Picking a level switches to it directly, without going back to the map.
export default function LevelRail({ current, solved, all, onOpen, onClose, overlay }) {
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
        {CHAPTERS.map((chapter) => {
          const levels = LEVELS.filter((level) => level.chapter === chapter.id)
          if (!levels.length) return null
          const finished = levels.filter((level) => solved.has(level.id)).length
          const expanded = openChapters.has(chapter.id)
          return (
            <section key={chapter.id} className={`rail-chapter ${chapter.id === chapterOf ? 'is-current' : ''}`}>
              <button className="rail-chapter-head" onClick={() => toggle(chapter.id)} aria-expanded={expanded}>
                <span className="rail-chapter-index">{chapter.id}</span>
                <span className="rail-chapter-title">{L(chapter.title)}</span>
                <span className="rail-chapter-count">{finished}/{levels.length}</span>
                <ChevronDown size={14} className="rail-chevron" />
              </button>
              {expanded && (
                <ol>
                  {levels.map((level) => {
                    const open = isOpen(level, solved, all)
                    const won = solved.has(level.id)
                    const here = level.id === current
                    return (
                      <li key={level.id}>
                        <button
                          className={`rail-level ${won ? 'is-solved' : open ? 'is-open' : 'is-locked'} ${here ? 'is-here' : ''}`}
                          disabled={!open && !won}
                          aria-current={here ? 'page' : undefined}
                          title={open || won ? `${level.id} ${L(level.title)}` : tr(`${level.id} ${L(level.title)}：先通过 ${level.requires.filter((id) => !solved.has(id)).join('、')}`, `${level.id} ${L(level.title)}: first pass ${level.requires.filter((id) => !solved.has(id)).join(', ')}`)}
                          onClick={() => onOpen(level.id)}
                        >
                          <span className="rail-pad" aria-hidden="true">{won ? <Check size={11} strokeWidth={2.6} /> : open ? null : <Lock size={10} />}</span>
                          <span className="rail-id">{level.id}</span>
                          <span className="rail-title">{L(level.title)}</span>
                          {level.kind === 'graph' ? <Workflow size={12} className="rail-kind" /> : <FlaskConical size={12} className="rail-kind" />}
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
